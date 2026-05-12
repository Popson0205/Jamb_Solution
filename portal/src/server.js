const express = require('express');
const session = require('express-session');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 4000;
const API = process.env.API_URL || 'https://jamb-allocator-api.onrender.com';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'jamb-portal-secret-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 } // 30 days
}));

// ── Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.token) return res.redirect('/login');
  next();
}

// ── API helper with retry (handles Render cold starts)
async function api(method, path, data, token, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios({
        method, url: `${API}${path}`, data,
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        timeout: 30000, // 30s — enough for Render cold start
      });
      return { ok: true, data: res.data };
    } catch (err) {
      const isNetwork = !err.response;
      const isServer = err.response?.status >= 500;
      if ((isNetwork || isServer) && i < retries - 1) {
        console.log(`API call failed (attempt ${i+1}), retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      const msg = err.response?.data?.error || err.message;
      return { ok: false, error: msg, status: err.response?.status };
    }
  }
}

// ── Wake-up middleware — ping API before serving pages
// This ensures the API is warm before we try to fetch data
let apiWarm = false;
let lastPing = 0;

async function ensureAPIWarm() {
  const now = Date.now();
  if (apiWarm && now - lastPing < 4 * 60 * 1000) return true; // warm within 4 min
  try {
    await axios.get(`${API}/health`, { timeout: 35000 });
    apiWarm = true;
    lastPing = now;
    return true;
  } catch {
    apiWarm = false;
    return false;
  }
}

// Warm the API on portal startup
ensureAPIWarm().then(ok => console.log(`API warm: ${ok}`));

// Keep API warm every 4 minutes from portal side too
setInterval(() => ensureAPIWarm(), 4 * 60 * 1000);

// ── LOGIN
app.get('/login', (req, res) => {
  if (req.session.token) return res.redirect('/');
  res.render('pages/login', { error: null });
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const result = await api('post', '/api/admin/auth/login', { email, password });
  if (!result.ok) return res.render('pages/login', { error: 'Invalid email or password' });
  req.session.token = result.data.token;
  req.session.user = result.data.user;
  res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// ── DASHBOARD
app.get('/', requireAuth, async (req, res) => {
  const result = await api('get', '/api/admin/dashboard/summary', null, req.session.token);
  const summary = result.ok ? result.data : { total_students: 0, total_allocations: 0, total_centres: 0, batch_breakdown: [], top_centres_by_fill: [] };
  res.render('pages/dashboard', { user: req.session.user, summary, page: 'dashboard' });
});

// ── ALLOCATIONS
app.get('/allocations', requireAuth, async (req, res) => {
  const { search = '', exam_date = '', batch_number = '', state = '', page = 1 } = req.query;
  const result = await api('get', `/api/admin/students?search=${search}&exam_date=${exam_date}&batch_number=${batch_number}&state=${state}&page=${page}&limit=50`, null, req.session.token);
  const data = result.ok ? result.data : { data: [], total: 0 };
  res.render('pages/allocations', {
    user: req.session.user, allocations: data.data || [], total: data.total || 0,
    filters: { search, exam_date, batch_number, state }, currentPage: parseInt(page), page: 'allocations'
  });
});

// ── REASSIGN
app.post('/allocations/:id/reassign', requireAuth, async (req, res) => {
  const { centre_id, exam_date, batch_number, notes } = req.body;
  await api('patch', `/api/admin/allocations/${req.params.id}/reassign`, { centre_id, exam_date: exam_date || undefined, batch_number: parseInt(batch_number), notes }, req.session.token);
  res.redirect('/allocations?' + new URLSearchParams(req.query).toString());
});

// ── CENTRES
app.get('/centres', requireAuth, async (req, res) => {
  const { search = '', state = '' } = req.query;
  const result = await api('get', '/api/admin/centres', null, req.session.token);
  let centres = result.ok ? result.data : [];
  if (search) centres = centres.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()) || c.lga?.toLowerCase().includes(search.toLowerCase()));
  if (state) centres = centres.filter(c => c.state === state);
  const states = [...new Set((result.ok ? result.data : []).map(c => c.state))].sort();
  res.render('pages/centres', { user: req.session.user, centres, states, filters: { search, state }, total: result.ok ? result.data.length : 0, page: 'centres' });
});

// ── STUDENT SEARCH
app.get('/students/search', requireAuth, async (req, res) => {
  const { q } = req.query;
  if (!q) return res.json({ data: [] });
  const result = await api('get', `/api/admin/students?search=${q}&limit=10`, null, req.session.token);
  res.json(result.ok ? result.data : { data: [] });
});

// ── EXPORT CSV
app.get('/allocations/export', requireAuth, async (req, res) => {
  const { search = '', exam_date = '', batch_number = '', state = '' } = req.query;
  const result = await api('get', `/api/admin/students?search=${search}&exam_date=${exam_date}&batch_number=${batch_number}&state=${state}&limit=10000`, null, req.session.token);
  if (!result.ok) return res.status(500).send('Export failed');

  const rows = result.data.data || [];
  const headers = ['Reg Number', 'Full Name', 'Phone', 'Email', 'State', 'LGA', 'Centre', 'Exam Date', 'Batch', 'Arrival', 'Exam Start', 'Exam End', 'Distance (km)'];
  const csv = [
    headers.join(','),
    ...rows.map(r => [
      r.reg_number, `"${r.full_name}"`, r.phone || '', r.email || '',
      r.state || '', r.lga || '', `"${r.centre_name || ''}"`,
      r.exam_date ? r.exam_date.split('T')[0] : '',
      r.batch_number, (r.arrival_time || '').substring(0,5),
      (r.exam_start || '').substring(0,5), (r.exam_end || '').substring(0,5),
      r.distance_km || ''
    ].join(','))
  ].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="jamb_allocations_${Date.now()}.csv"`);
  res.send(csv);
});

// ── API CENTRES (for reassign modal)
app.get('/api/centres', requireAuth, async (req, res) => {
  const result = await api('get', '/api/admin/centres', null, req.session.token);
  res.json(result.ok ? result.data : []);
});

app.listen(PORT, () => console.log(`🏛️ JAMB Portal v2 running on port ${PORT}`));
