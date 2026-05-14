"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateStudent = allocateStudent;
const db_1 = require("../db");
const RADIUS_RINGS = [3000, 10000, 20000, 25000, 30000];
const MAX_DAYS_AHEAD = 30;
function isFriday(date) { return date.getDay() === 5; }
function isSunday(date) { return date.getDay() === 0; }
function nextExamDay(from) {
    const d = new Date(from);
    d.setDate(d.getDate() + 1);
    while (isSunday(d))
        d.setDate(d.getDate() + 1);
    return d;
}
function formatDate(d) { return d.toISOString().split('T')[0]; }
async function findCentresInRadius(lat, lon, radiusMetres) {
    const rows = await db_1.db.raw(`
    SELECT id, name, address, state, lga, latitude, longitude, capacity_per_batch,
      ROUND((ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
    FROM centres
    WHERE is_active = TRUE
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
    ORDER BY distance_km ASC
  `, [lon, lat, lon, lat, radiusMetres]);
    return rows.rows;
}
async function countAllocations(centreId, examDate, batchNumber) {
    const result = await (0, db_1.db)('allocations').where({ centre_id: centreId, exam_date: examDate, batch_number: batchNumber }).count('id as cnt').first();
    return Number(result?.cnt ?? 0);
}
async function tryAllocate(studentId, centres, date, batches) {
    const dateStr = formatDate(date);
    const friday = isFriday(date);
    const availableBatches = batches.filter((b) => !friday || b.applies_on_friday);
    for (const centre of centres) {
        for (const batch of availableBatches) {
            const allocated = await countAllocations(centre.id, dateStr, batch.batch_number);
            if (allocated < centre.capacity_per_batch) {
                const [allocation] = await (0, db_1.db)('allocations').insert({
                    student_id: studentId, centre_id: centre.id, exam_date: dateStr,
                    batch_number: batch.batch_number, arrival_time: batch.arrival_time,
                    exam_start: batch.exam_start, exam_end: batch.exam_end, distance_km: centre.distance_km,
                }).returning('*');
                return { allocation, centre, batch: { number: batch.batch_number, arrival_time: batch.arrival_time, arrival: batch.arrival_time, exam_start: batch.exam_start, exam_end: batch.exam_end }, exam_date: dateStr, distance_km: centre.distance_km };
            }
        }
    }
    return null;
}
async function allocateStudent(input) {
    const existing = await (0, db_1.db)('students').where('reg_number', input.reg_number).first();
    let studentId;
    if (existing) {
        studentId = existing.id;
        const existingAlloc = await (0, db_1.db)('allocations').where('student_id', studentId).first();
        if (existingAlloc) {
            const centre = await (0, db_1.db)('centres').where('id', existingAlloc.centre_id).first();
            const batchRow = await (0, db_1.db)('batches').where('batch_number', existingAlloc.batch_number).first();
            return {
                status: 'already_allocated',
                allocation: existingAlloc,
                centre,
                batch: {
                    number: existingAlloc.batch_number,
                    arrival_time: batchRow?.arrival_time || existingAlloc.arrival_time,
                    arrival: batchRow?.arrival_time || existingAlloc.arrival_time,
                    exam_start: batchRow?.exam_start || existingAlloc.exam_start,
                    exam_end: batchRow?.exam_end || existingAlloc.exam_end,
                },
                exam_date: existingAlloc.exam_date,
                distance_km: existingAlloc.distance_km,
            };
        }
    }
    else {
        const [student] = await (0, db_1.db)('students').insert({
            ...input,
            location: db_1.db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography`, [input.longitude, input.latitude]),
        }).returning('id');
        studentId = student.id;
    }
    const batches = await (0, db_1.db)('batches').orderBy('batch_number');
    let startDate = new Date();
    if (isSunday(startDate))
        startDate = nextExamDay(startDate);
    for (let dayOffset = 0; dayOffset < MAX_DAYS_AHEAD; dayOffset++) {
        let examDate;
        if (dayOffset === 0) {
            examDate = startDate;
        }
        else {
            examDate = new Date(startDate);
            for (let i = 0; i < dayOffset; i++)
                examDate = nextExamDay(examDate);
        }
        for (const radius of RADIUS_RINGS) {
            const centres = await findCentresInRadius(input.latitude, input.longitude, radius);
            if (!centres.length)
                continue;
            const result = await tryAllocate(studentId, centres, examDate, batches);
            if (result)
                return { status: 'allocated', ...result };
        }
    }
    return { status: 'unallocated', message: 'No available slots found within 30 days. Flagged for manual assignment.' };
}
