"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const allocationEngine_1 = require("../services/allocationEngine");
const verificationService_1 = require("../services/verificationService");
const notificationService_1 = require("../services/notificationService");
const db_1 = require("../db");
const router = (0, express_1.Router)();
// POST /api/student/register
router.post('/register', async (req, res) => {
    try {
        const { reg_number, full_name, phone, email, state, lga, ward, latitude, longitude } = req.body;
        if (!reg_number || !full_name || !latitude || !longitude) {
            return res.status(400).json({
                error: 'reg_number, full_name, latitude, and longitude are required.',
            });
        }
        // ── Step 1: Verify candidate exists in JAMB records
        const verification = await (0, verificationService_1.verifyCandidate)(reg_number, full_name);
        if (!verification.verified) {
            return res.status(403).json({
                error: 'verification_failed',
                message: verification.reason,
            });
        }
        // ── Step 2: Allocate centre
        const result = await (0, allocationEngine_1.allocateStudent)({
            reg_number: reg_number.trim().toUpperCase(),
            full_name: full_name.trim().toUpperCase(),
            phone, email, state, lga, ward,
            latitude: Number(latitude),
            longitude: Number(longitude),
        });
        // ── Step 3: Fire notifications (non-blocking)
        // Fires for both new allocations AND re-requests from already-allocated students
        if (result.status === 'allocated' || result.status === 'already_allocated') {
            (0, notificationService_1.sendAllocationNotifications)({
                student: { full_name, email, phone, reg_number },
                centre: result.centre,
                batch: result.batch,
                exam_date: result.exam_date,
                distance_km: result.distance_km,
            }).catch(console.error);
        }
        return res.json(result);
    }
    catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Allocation failed', details: err.message });
    }
});
// GET /api/student/allocation/:regNumber
router.get('/allocation/:regNumber', async (req, res) => {
    try {
        const student = await (0, db_1.db)('students').where('reg_number', req.params.regNumber.toUpperCase()).first();
        if (!student)
            return res.status(404).json({ error: 'Student not found' });
        const allocation = await (0, db_1.db)('allocations').where('student_id', student.id).first();
        if (!allocation)
            return res.status(404).json({ error: 'No allocation found for this student' });
        const centre = await (0, db_1.db)('centres').where('id', allocation.centre_id).first();
        return res.json({ student, allocation, centre });
    }
    catch (err) {
        return res.status(500).json({ error: err.message });
    }
});
exports.default = router;
