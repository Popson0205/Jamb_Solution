import { Router, Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../db';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// POST /api/admin/auth/login
router.post('/auth/login', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const user = await db('admin_users').where('email', email).first();
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET!, { expiresIn: '8h' });
  return res.json({ token, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role } });
});

// All routes below require auth
router.use(authMiddleware);

// GET /api/admin/students
router.get('/students', async (req: Request, res: Response) => {
  const { centre_id, exam_date, batch_number, lga, state, search, page = 1, limit = 50 } = req.query;
  let query = db('students as s')
    .join('allocations as a', 's.id', 'a.student_id')
    .join('centres as c', 'a.centre_id', 'c.id')
    .select('s.*', 'a.exam_date', 'a.batch_number', 'a.arrival_time', 'a.exam_start', 'a.exam_end', 'a.distance_km', 'a.is_reassigned', 'a.id as allocation_id', 'c.name as centre_name', 'c.address as centre_address');
  if (centre_id) query = query.where('a.centre_id', centre_id as string);
  if (exam_date) query = query.where('a.exam_date', exam_date as string);
  if (batch_number) query = query.where('a.batch_number', Number(batch_number));
  if (lga) query = query.where('s.lga', lga as string);
  if (state) query = query.where('s.state', state as string);
  if (search) query = query.where(function() { this.where('s.full_name', 'ilike', `%${search}%`).orWhere('s.reg_number', 'ilike', `%${search}%`) });
  const offset = (Number(page) - 1) * Number(limit);
  const [data, [{ count }]] = await Promise.all([query.clone().limit(Number(limit)).offset(offset), query.clone().count('s.id as count')]);
  return res.json({ data, total: Number(count), page: Number(page), limit: Number(limit) });
});

// PATCH /api/admin/allocations/:id/reassign
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

// GET /api/admin/dashboard/summary
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
  return res.json({ total_students: Number(students?.count), total_allocations: Number(allocations?.count), total_centres: Number(centres?.count), batch_breakdown: batchBreakdown, top_centres_by_fill: fillRates });
});

// GET /api/admin/centres
router.get('/centres', async (req: Request, res: Response) => {
  const centres = await db('centres').where('is_active', true).orderBy('state').orderBy('name');
  return res.json(centres);
});

export default router;
