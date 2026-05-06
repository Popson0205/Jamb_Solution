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

interface BatchRow {
  id: number;
  batch_number: number;
  arrival_time: string;
  exam_start: string;
  exam_end: string;
  applies_on_friday: boolean;
}

interface CentreCandidate {
  id: string;
  name: string;
  address: string;
  state: string;
  lga: string;
  latitude: number;
  longitude: number;
  capacity_per_batch: number;
  distance_km: number;
}

// Expanding radius rings in metres
const RADIUS_RINGS = [3000, 10000, 20000, 25000, 30000];
const MAX_DAYS_AHEAD = 30;

function isFriday(date: Date): boolean {
  return date.getDay() === 5;
}

function isSunday(date: Date): boolean {
  return date.getDay() === 0;
}

function nextExamDay(from: Date): Date {
  const d = new Date(from);
  d.setDate(d.getDate() + 1);
  while (isSunday(d)) {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

async function findCentresInRadius(
  lat: number,
  lon: number,
  radiusMetres: number
): Promise<CentreCandidate[]> {
  const rows = await db.raw(`
    SELECT
      id, name, address, state, lga,
      latitude, longitude, capacity_per_batch,
      ROUND((ST_Distance(
        location,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography
      ) / 1000.0)::numeric, 2) AS distance_km
    FROM centres
    WHERE
      is_active = TRUE
      AND ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography,
        ?
      )
    ORDER BY distance_km ASC
  `, [lon, lat, lon, lat, radiusMetres]);
  return rows.rows;
}

async function countAllocations(
  centreId: string,
  examDate: string,
  batchNumber: number
): Promise<number> {
  const result = await db('allocations')
    .where({ centre_id: centreId, exam_date: examDate, batch_number: batchNumber })
    .count('id as cnt')
    .first();
  return Number(result?.cnt ?? 0);
}

async function tryAllocate(
  studentId: string,
  centres: CentreCandidate[],
  date: Date,
  batches: BatchRow[]
): Promise<object | null> {
  const dateStr = formatDate(date);
  const friday = isFriday(date);
  const availableBatches = batches.filter(b => !friday || b.applies_on_friday);

  for (const centre of centres) {
    for (const batch of availableBatches) {
      const allocated = await countAllocations(centre.id, dateStr, batch.batch_number);
      if (allocated < centre.capacity_per_batch) {
        // ✅ Slot found — write allocation
        const [allocation] = await db('allocations')
          .insert({
            student_id: studentId,
            centre_id: centre.id,
            exam_date: dateStr,
            batch_number: batch.batch_number,
            arrival_time: batch.arrival_time,
            exam_start: batch.exam_start,
            exam_end: batch.exam_end,
            distance_km: centre.distance_km,
          })
          .returning('*');
        return {
          allocation,
          centre: {
            id: centre.id,
            name: centre.name,
            address: centre.address,
            state: centre.state,
            lga: centre.lga,
            latitude: centre.latitude,
            longitude: centre.longitude,
          },
          batch: {
            number: batch.batch_number,
            arrival: batch.arrival_time,
            exam_start: batch.exam_start,
            exam_end: batch.exam_end,
          },
          exam_date: dateStr,
          distance_km: centre.distance_km,
        };
      }
    }
  }
  return null;
}

export async function allocateStudent(input: StudentInput): Promise<object> {
  // 1. Upsert student
  const existing = await db('students').where('reg_number', input.reg_number).first();
  let studentId: string;

  if (existing) {
    studentId = existing.id;
    // Check if already allocated
    const existingAlloc = await db('allocations').where('student_id', studentId).first();
    if (existingAlloc) {
      const centre = await db('centres').where('id', existingAlloc.centre_id).first();
      return { status: 'already_allocated', allocation: existingAlloc, centre };
    }
  } else {
    const [student] = await db('students')
      .insert({
        ...input,
        location: db.raw(`ST_SetSRID(ST_MakePoint(?, ?), 4326)::geography`, [input.longitude, input.latitude]),
      })
      .returning('id');
    studentId = student.id;
  }

  // 2. Load batch schedule
  const batches: BatchRow[] = await db('batches').orderBy('batch_number');

  // 3. Expanding radius search
  let startDate = new Date();
  if (isSunday(startDate)) startDate = nextExamDay(startDate);

  for (let dayOffset = 0; dayOffset < MAX_DAYS_AHEAD; dayOffset++) {
    const examDate = dayOffset === 0 ? startDate : nextExamDay(
      new Date(startDate.getTime() + (dayOffset - 1) * 86400000)
    );

    // Try each radius ring
    for (const radius of RADIUS_RINGS) {
      const centres = await findCentresInRadius(input.latitude, input.longitude, radius);
      if (centres.length === 0) continue;

      const result = await tryAllocate(studentId, centres, examDate, batches);
      if (result) return { status: 'allocated', ...result as object };
    }
  }

  return { status: 'unallocated', message: 'No available slots found within 30 days. Flagged for manual assignment.' };
}
