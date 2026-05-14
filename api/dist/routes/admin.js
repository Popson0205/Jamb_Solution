"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const bcrypt_1 = __importDefault(require("bcrypt"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const db_1 = require("../db");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.post('/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await (0, db_1.db)('admin_users').where('email', email).first();
    if (!user)
        return res.status(401).json({ error: 'Invalid credentials' });
    const valid = await bcrypt_1.default.compare(password, user.password_hash);
    if (!valid)
        return res.status(401).json({ error: 'Invalid credentials' });
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
});
// POST /api/admin/auth/refresh — get a fresh token using existing valid token
router.post('/auth/refresh', auth_1.authMiddleware, async (req, res) => {
    const user = req.user;
    const token = jsonwebtoken_1.default.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '30d' });
    return res.json({ token });
});
router.use(auth_1.authMiddleware);
router.get('/students', async (req, res) => {
    const { centre_id, exam_date, batch_number, lga, state, search, page = 1, limit = 50 } = req.query;
    let query = (0, db_1.db)('students as s').join('allocations as a', 's.id', 'a.student_id').join('centres as c', 'a.centre_id', 'c.id')
        .select('s.id', 's.reg_number', 's.full_name', 's.phone', 's.email', 's.state', 's.lga', 's.ward', 's.latitude', 's.longitude', 's.created_at', 'a.exam_date', 'a.batch_number', 'a.arrival_time', 'a.exam_start', 'a.exam_end', 'a.distance_km', 'a.is_reassigned', db_1.db.raw('a.id as allocation_id'), 'c.name as centre_name', 'c.address as centre_address');
    if (centre_id)
        query = query.where('a.centre_id', centre_id);
    if (exam_date)
        query = query.where('a.exam_date', exam_date);
    if (batch_number)
        query = query.where('a.batch_number', Number(batch_number));
    if (lga)
        query = query.where('s.lga', lga);
    if (state)
        query = query.where('s.state', state);
    if (search)
        query = query.where(function () { this.where('s.full_name', 'ilike', `%${search}%`).orWhere('s.reg_number', 'ilike', `%${search}%`); });
    const offset = (Number(page) - 1) * Number(limit);
    const [data, countResult] = await Promise.all([query.clone().limit(Number(limit)).offset(offset), query.clone().clearSelect().clearOrder().count('s.id as count')]);
    return res.json({ data, total: Number(countResult[0].count), page: Number(page), limit: Number(limit) });
});
router.patch('/allocations/:id/reassign', async (req, res) => {
    const { centre_id, exam_date, batch_number, notes } = req.body;
    const user = req.user;
    const batch = await (0, db_1.db)('batches').where('batch_number', batch_number).first();
    if (!batch)
        return res.status(400).json({ error: 'Invalid batch number' });
    const [updated] = await (0, db_1.db)('allocations').where('id', req.params.id)
        .update({ centre_id, exam_date, batch_number, arrival_time: batch.arrival_time, exam_start: batch.exam_start, exam_end: batch.exam_end, is_reassigned: true, reassigned_by: user.id, reassigned_at: db_1.db.fn.now(), notes })
        .returning('*');
    return res.json(updated);
});
router.get('/dashboard/summary', async (req, res) => {
    const [students, allocations, centres, batchBreakdown, fillRates] = await Promise.all([
        (0, db_1.db)('students').count('id as count').first(),
        (0, db_1.db)('allocations').count('id as count').first(),
        (0, db_1.db)('centres').where('is_active', true).count('id as count').first(),
        (0, db_1.db)('allocations').select('batch_number').count('id as count').groupBy('batch_number').orderBy('batch_number'),
        (0, db_1.db)('centres as c').leftJoin((0, db_1.db)('allocations').select('centre_id').count('id as allocated').groupBy('centre_id').as('a'), 'c.id', 'a.centre_id')
            .select('c.id', 'c.name', 'c.state', 'c.capacity_per_batch', db_1.db.raw('COALESCE(a.allocated, 0) as allocated'))
            .orderBy(db_1.db.raw('COALESCE(a.allocated, 0)'), 'desc').limit(10),
    ]);
    return res.json({ total_students: Number(students?.count), total_allocations: Number(allocations?.count), total_centres: Number(centres?.count), batch_breakdown: batchBreakdown, top_centres_by_fill: fillRates });
});
router.get('/centres', async (req, res) => {
    const centres = await (0, db_1.db)('centres').where('is_active', true).orderBy('state').orderBy('name');
    return res.json(centres);
});
exports.default = router;
// ── Candidates management
// GET /api/admin/candidates — list with search
router.get('/candidates', async (req, res) => {
    const { search, page = 1, limit = 50 } = req.query;
    let query = (0, db_1.db)('candidates').orderBy('full_name');
    if (search) {
        query = query.where(function () {
            this.where('full_name', 'ilike', `%${search}%`)
                .orWhere('reg_number', 'ilike', `%${search}%`);
        });
    }
    const offset = (Number(page) - 1) * Number(limit);
    const [data, countResult] = await Promise.all([
        query.clone().limit(Number(limit)).offset(offset),
        query.clone().clearSelect().clearOrder().count('id as count'),
    ]);
    return res.json({ data, total: Number(countResult[0].count), page: Number(page), limit: Number(limit) });
});
// POST /api/admin/candidates — add a single candidate
router.post('/candidates', async (req, res) => {
    const { reg_number, full_name } = req.body;
    if (!reg_number || !full_name)
        return res.status(400).json({ error: 'reg_number and full_name are required' });
    try {
        const [candidate] = await (0, db_1.db)('candidates')
            .insert({ reg_number: reg_number.trim().toUpperCase(), full_name: full_name.trim().toUpperCase(), is_verified: true })
            .returning('*');
        return res.json(candidate);
    }
    catch (err) {
        if (err.code === '23505')
            return res.status(409).json({ error: 'Registration number already exists' });
        return res.status(500).json({ error: err.message });
    }
});
// PATCH /api/admin/candidates/:id — toggle verified status
router.patch('/candidates/:id', async (req, res) => {
    const { is_verified } = req.body;
    const [updated] = await (0, db_1.db)('candidates').where('id', req.params.id).update({ is_verified }).returning('*');
    return res.json(updated);
});
// ── Request Logs
// GET /api/admin/logs
router.get('/logs', async (req, res) => {
    const { level = '', path: filterPath = '', status = '', limit = 100, offset = 0, from = '', to = '', } = req.query;
    let query = (0, db_1.db)('request_logs').orderBy('created_at', 'desc');
    if (level)
        query = query.where('level', level);
    if (filterPath)
        query = query.where('path', 'ilike', `%${filterPath}%`);
    if (status)
        query = query.where('status_code', Number(status));
    if (from)
        query = query.where('created_at', '>=', from);
    if (to)
        query = query.where('created_at', '<=', to);
    const [logs, countResult] = await Promise.all([
        query.clone().limit(Number(limit)).offset(Number(offset)),
        query.clone().clearSelect().clearOrder().count('id as count'),
    ]);
    // Summary stats
    const stats = await (0, db_1.db)('request_logs')
        .select(db_1.db.raw('level, COUNT(*) as count'))
        .groupBy('level');
    const topEndpoints = await (0, db_1.db)('request_logs')
        .select('path')
        .count('id as hits')
        .groupBy('path')
        .orderBy('hits', 'desc')
        .limit(10);
    const avgResponse = await (0, db_1.db)('request_logs')
        .avg('duration_ms as avg_ms')
        .first();
    return res.json({
        logs,
        total: Number(countResult[0].count),
        stats,
        top_endpoints: topEndpoints,
        avg_response_ms: Math.round(Number(avgResponse?.avg_ms) || 0),
    });
});
// DELETE /api/admin/logs — clear old logs
router.delete('/logs', async (req, res) => {
    const { days = 30 } = req.query;
    const deleted = await (0, db_1.db)('request_logs')
        .where('created_at', '<', db_1.db.raw(`NOW() - INTERVAL '${Number(days)} days'`))
        .delete();
    return res.json({ deleted, message: `Cleared logs older than ${days} days` });
});
