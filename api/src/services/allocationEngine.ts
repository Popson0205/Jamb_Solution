import { db } from '../db';

export interface StudentInput {
  reg_number: string;
  full_name: string;
  phone?: string;
  email?: string;
  state: string;
  lga: string;
  ward?: string;
  latitude: number;
  longitude: number;
}

const RADIUS_RINGS = [3000, 10000, 20000, 25000, 30000];
const MAX_DAYS_AHEAD = 30;

function isFriday(date: Date): boolean { return date.getDay() === 5; }
function isSunday(date: Date): boolean { return date.getDay() === 0; }

function nextExamDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (isSunday(d)) d.setDate(d.getDate() + 1);
  return d;
}

function formatDate(d: Date): string { return d.toISOString().split('T')[0]; }

async function findCentresInRadius(lat: number, lon: number, radiusMetres: number) {
  const rows = await db.raw(`
    SELECT id, name, address, state, lga, latitude, longitude, capacity_per_batch,
      ROUND((ST_Distance(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography) / 1000.0)::numeric, 2) AS distance_km
    FROM centres
    WHERE is_active = TRUE
      AND ST_DWithin(location, ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography, ?)
    ORDER BY distance_km ASC
  `, [lon, lat, lon, lat, radiusMetres]);
  return rows.rows;
}

async function countAllocations(centreId: string, examDate: string, batchNumber: number): Promise<number> {
  const result = await db('allocations').where({ centre_id: centreId, exam_date: examDate, batch_number: batchNumber }).count('id as cnt').first();
  return Number(result?.cnt ?? 0);
}

async function tryAllocate(studentId: string, centres: any[], date: Date, batches: any[]) {
  const dateStr = formatDate(date);
  const friday = isFriday(date);
  const availableBatches = batches.filter((b: any) => !friday || b.applies_on_friday);

  for (const centre of centres) {
    for (const batch of availableBatches) {
      const allocated = await countAllocations(centre.id, dateStr, batch.batch_number);
      if (allocated < centre.capacity_per_batch) {
        const [allocation] = await db('allocations').insert({
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

export async function allocateStudent(input: StudentInput) {
  const existing = await db('students').where('reg_number', input.reg_number).first();
  let studentId: string;

  if (existing) {
    studentId = existing.id;
    const existingAlloc = await db('allocations').where('student_id', studentId).first();
    if (existingAlloc) {
      const centre = await db('centres').where('id', existingAlloc.centre_id).first();
      const batchRow = await db('batches').where('batch_number', existingAlloc.batch_number).first();
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
  } else {
    const [student] = await db('students').insert({
      ...input,
      location: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography`, [input.longitude, input.latitude]),
    }).returning('id');
    studentId = student.id;
  }

  const batches = await db('batches').orderBy('batch_number');
  let startDate = new Date();
  if (isSunday(startDate)) startDate = nextExamDay(startDate);

  for (let dayOffset = 0; dayOffset < MAX_DAYS_AHEAD; dayOffset++) {
    let examDate: Date;
    if (dayOffset === 0) { examDate = startDate; }
    else {
      examDate = new Date(startDate);
      for (let i = 0; i < dayOffset; i++) examDate = nextExamDay(examDate);
    }
    for (const radius of RADIUS_RINGS) {
      const centres = await findCentresInRadius(input.latitude, input.longitude, radius);
      if (!centres.length) continue;
      const result = await tryAllocate(studentId, centres, examDate, batches);
      if (result) return { status: 'allocated', ...result };
    }
  }
  return { status: 'unallocated', message: 'No available slots found within 30 days. Flagged for manual assignment.' };
}
