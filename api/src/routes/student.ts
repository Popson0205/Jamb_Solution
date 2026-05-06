import { Router, Request, Response } from 'express';
import { allocateStudent } from '../services/allocationEngine';
import { verifyCandidate } from '../services/verificationService';
import { sendAllocationNotifications } from '../services/notificationService';
import { db } from '../db';

const router = Router();

// POST /api/student/register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { reg_number, full_name, phone, email, state, lga, ward, latitude, longitude } = req.body;

    if (!reg_number || !full_name || !latitude || !longitude) {
      return res.status(400).json({
        error: 'reg_number, full_name, latitude, and longitude are required.',
      });
    }

    // ── Step 1: Verify candidate exists in JAMB records
    const verification = await verifyCandidate(reg_number, full_name);

    if (!verification.verified) {
      return res.status(403).json({
        error: 'verification_failed',
        message: verification.reason,
      });
    }

    // ── Step 2: Allocate centre
    const result: any = await allocateStudent({
      reg_number: reg_number.trim().toUpperCase(),
      full_name: full_name.trim().toUpperCase(),
      phone, email, state, lga, ward,
      latitude: Number(latitude),
      longitude: Number(longitude),
    });

    // ── Step 3: Fire notifications (non-blocking)
    if (result.status === 'allocated') {
      sendAllocationNotifications({
        student: { full_name, email, phone, reg_number },
        centre: result.centre,
        batch: result.batch,
        exam_date: result.exam_date,
        distance_km: result.distance_km,
      }).catch(console.error);
    }

    return res.json(result);
  } catch (err: any) {
    console.error(err);
    return res.status(500).json({ error: 'Allocation failed', details: err.message });
  }
});

// GET /api/student/allocation/:regNumber
router.get('/allocation/:regNumber', async (req: Request, res: Response) => {
  try {
    const student = await db('students').where('reg_number', req.params.regNumber.toUpperCase()).first();
    if (!student) return res.status(404).json({ error: 'Student not found' });
    const allocation = await db('allocations').where('student_id', student.id).first();
    if (!allocation) return res.status(404).json({ error: 'No allocation found for this student' });
    const centre = await db('centres').where('id', allocation.centre_id).first();
    return res.json({ student, allocation, centre });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

export default router;
