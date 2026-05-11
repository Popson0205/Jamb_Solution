import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await db('admin_users').where('email', email).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  return res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
});


// POST /api/admin/auth/refresh — get a fresh token using existing valid token
router.post('/auth/refresh', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '30d' });
  return res.json({ token });
});

router.use(authMiddleware);

router.get('/students', async (req: Request, res: Response) => {
  const { centre_id, exam_date, batch_number, lga, state, search, page = 1, limit = 50 } = req.query;
  let query = db('students as s').join('allocations as a', 's.id', 'a.student_id').join('centres as c', 'a.centre_id', 'c.id')
    .select('s.*', 'a.exam_date', 'a.batch_number', 'a.arrival_time', 'a.exam_start', 'a.exam_end', 'a.distance_km', 'a.is_reassigned', 'a.id as allocation_id', 'c.name as centre_name', 'c.address as centre_address');
  if (centre_id) query = query.where('a.centre_id', centre_id as string);
  if (exam_date) query = query.where('a.exam_date', exam_date as string);
  if (batch_number) query = query.where('a.batch_number', Number(batch_number));
  if (lga) query = query.where('s.lga', lga as string);
  if (state) query = query.where('s.state', state as string);
  if (search) query = query.where(function() { this.where('s.full_name', 'ilike', `%${search}%`).orWhere('s.reg_number', 'ilike', `%${search}%`); });
  const offset = (Number(page) - 1) * Number(limit);
  const [data, countResult] = await Promise.all([query.clone().limit(Number(limit)).offset(offset), query.clone().count('s.id as count')]);
  return res.json({ data, total: Number((countResult[0] as any).count), page: Number(page), limit: Number(limit) });
});

router.patch('/allocations/:id/reassign', async (req: Request, res: Response) => {
  const { centre_id, exam_date, batch_number, notes } = req.body;
  const user = (req as any).user;
  const batch = await db('batches').where('batch_number', batch_number).first();
  if (!batch) return res.status(400).json({ error: 'Invalid batch number' });
  const [updated] = await db('allocations').where('id', req.params.id)
    .update({ centre_id, exam_date, batch_number, arrival_time: batch.arrival_time, exam_start: batch.exam_start, exam_end: batch.exam_end, is_reassigned: true, reassigned_by: user.id, reassigned_at: db.fn.now(), notes })
    .returning('*');
  return res.json(updated);
});

router.get('/dashboard/summary', async (req: Request, res: Response) => {
  const [students, allocations, centres, batchBreakdown, fillRates] = await Promise.all([
    db('students').count('id as count').first(),
    db('allocations').count('id as count').first(),
    db('centres').where('is_active', true).count('id as count').first(),
    db('allocations').select('batch_number').count('id as count').groupBy('batch_number').orderBy('batch_number'),
    db('centres as c').leftJoin(db('allocations').select('centre_id').count('id as allocated').groupBy('centre_id').as('a'), 'c.id', 'a.centre_id')
      .select('c.id', 'c.name', 'c.state', 'c.capacity_per_batch', db.raw('COALESCE(a.allocated, 0) as allocated'))
      .orderBy(db.raw('COALESCE(a.allocated, 0)'), 'desc').limit(10),
  ]);
  return res.json({ total_students: Number((students as any)?.count), total_allocations: Number((allocations as any)?.count), total_centres: Number((centres as any)?.count), batch_breakdown: batchBreakdown, top_centres_by_fill: fillRates });
});

router.get('/centres', async (req: Request, res: Response) => {
  const centres = await db('centres').where('is_active', true).orderBy('state').orderBy('name');
  return res.json(centres);
});

export default router;

// ── Candidates management
// GET /api/admin/candidates — list with search
router.get('/candidates', async (req: Request, res: Response) => {
  const { search, page = 1, limit = 50 } = req.query;
  let query = db('candidates').orderBy('full_name');
  if (search) {
    query = query.where(function() {
      this.where('full_name', 'ilike', `%${search}%`)
          .orWhere('reg_number', 'ilike', `%${search}%`);
    });
  }
  const offset = (Number(page) - 1) * Number(limit);
  const [data, countResult] = await Promise.all([
    query.clone().limit(Number(limit)).offset(offset),
    query.clone().count('id as count'),
  ]);
  return res.json({ data, total: Number((countResult[0] as any).count), page: Number(page), limit: Number(limit) });
});

// POST /api/admin/candidates — add a single candidate
router.post('/candidates', async (req: Request, res: Response) => {
  const { reg_number, full_name } = req.body;
  if (!reg_number || !full_name) return res.status(400).json({ error: 'reg_number and full_name are required' });
  try {
    const [candidate] = await db('candidates')
      .insert({ reg_number: reg_number.trim().toUpperCase(), full_name: full_name.trim().toUpperCase(), is_verified: true })
      .returning('*');
    return res.json(candidate);
  } catch (err: any) {
    if (err.code === '23505') return res.status(409).json({ error: 'Registration number already exists' });
    return res.status(500).json({ error: err.message });
  }
});

// PATCH /api/admin/candidates/:id — toggle verified status
router.patch('/candidates/:id', async (req: Request, res: Response) => {
  const { is_verified } = req.body;
  const [updated] = await db('candidates').where('id', req.params.id).update({ is_verified }).returning('*');
  return res.json(updated);
});
