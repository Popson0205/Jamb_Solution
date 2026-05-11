import twilio from 'twilio';
import nodemailer from 'nodemailer';

interface AllocationDetails {
  student: { full_name: string; email?: string; phone?: string; reg_number: string };
  centre: { name: string; address: string; state: string; lga: string };
  batch: { number: number; arrival: string; exam_start: string; exam_end: string };
  exam_date: string;
  distance_km: number;
}

async function sendSMS(phone: string, message: string): Promise<void> {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !phone) return;
  try {
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const to = phone.startsWith('+') ? phone : `+234${phone.replace(/^0/, '')}`;
    await client.messages.create({
      body: message,
      from: process.env.TWILIO_FROM_NUMBER!,
      to,
    });
    console.log(`SMS sent to ${to}`);
  } catch (err: any) {
    console.error('Twilio SMS error:', err.message);
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !to) return;
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net', port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
    await transporter.sendMail({
      from: `"${process.env.SENDGRID_FROM_NAME || 'JAMB CBT'}" <${process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng'}>`,
      to, subject, html,
    });
  } catch (err: any) { console.error('Email error:', err.message); }
}

function buildEmailHTML(d: AllocationDetails): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e0e0e0;border-radius:8px">
    <div style="background:#006400;color:white;padding:16px 24px;border-radius:6px 6px 0 0;text-align:center"><h1 style="margin:0;font-size:22px">JAMB CBT Exam Allocation</h1></div>
    <div style="padding:24px"><p>Dear <strong>${d.student.full_name}</strong>,</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0">
      <tr style="background:#f5f5f5"><td style="padding:10px;font-weight:bold;width:40%">Reg Number</td><td style="padding:10px">${d.student.reg_number}</td></tr>
      <tr><td style="padding:10px;font-weight:bold">Centre</td><td style="padding:10px">${d.centre.name}</td></tr>
      <tr style="background:#f5f5f5"><td style="padding:10px;font-weight:bold">Address</td><td style="padding:10px">${d.centre.address}, ${d.centre.lga}, ${d.centre.state}</td></tr>
      <tr><td style="padding:10px;font-weight:bold">Date</td><td style="padding:10px">${new Date(d.exam_date).toDateString()}</td></tr>
      <tr style="background:#f5f5f5"><td style="padding:10px;font-weight:bold">Batch</td><td style="padding:10px">Batch ${d.batch.number}</td></tr>
      <tr><td style="padding:10px;font-weight:bold">Arrival</td><td style="padding:10px">${d.batch.arrival}</td></tr>
      <tr style="background:#f5f5f5"><td style="padding:10px;font-weight:bold">Exam Start</td><td style="padding:10px">${d.batch.exam_start}</td></tr>
      <tr><td style="padding:10px;font-weight:bold">Exam End</td><td style="padding:10px">${d.batch.exam_end}</td></tr>
      <tr style="background:#f5f5f5"><td style="padding:10px;font-weight:bold">Distance</td><td style="padding:10px">${d.distance_km} km</td></tr>
    </table>
    <p style="color:#c0392b;font-weight:bold">⚠️ Arrive 30 minutes before your scheduled arrival time. Bring this slip and a valid ID.</p></div></div>`;
}

export async function sendAllocationNotifications(details: AllocationDetails): Promise<void> {
  const smsText = `JAMB CBT ALLOCATION\nName: ${details.student.full_name}\nReg: ${details.student.reg_number}\nCentre: ${details.centre.name}\nAddress: ${details.centre.address}, ${details.centre.lga}, ${details.centre.state}\nDate: ${details.exam_date}\nBatch ${details.batch.number}: Arrive ${details.batch.arrival} | Exam ${details.batch.exam_start}-${details.batch.exam_end}\nDistance: ${details.distance_km}km\n\nArrive 30 mins early. Bring ID + this slip.`;

  await Promise.allSettled([
    details.student.phone ? sendSMS(details.student.phone, smsText) : Promise.resolve(),
    details.student.email ? sendEmail(details.student.email, `JAMB CBT Allocation - ${details.student.reg_number}`, buildEmailHTML(details)) : Promise.resolve(),
  ]);
}
