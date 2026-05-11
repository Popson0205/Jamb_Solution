import nodemailer from 'nodemailer';
import axios from 'axios';

interface AllocationDetails {
  student: { full_name: string; email?: string; phone?: string; reg_number: string };
  centre: { name: string; address: string; state: string; lga: string; latitude?: number; longitude?: number };
  batch: { number: number; arrival: string; arrival_time?: string; exam_start: string; exam_end: string };
  exam_date: string;
  distance_km: number;
}

// Strip seconds from time strings e.g. "07:00:00" → "07:00"
const ft = (t: string) => (t || '').substring(0, 5);

// Format date e.g. "2026-05-11" → "Sunday, 11 May 2026"
function formatDate(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Google Maps directions link
function mapsLink(centre: AllocationDetails['centre']): string {
  if (!centre.latitude || !centre.longitude) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${centre.latitude},${centre.longitude}&travelmode=driving`;
}

// ── EMAIL via SendGrid
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !to) return;
  try {
    const transporter = nodemailer.createTransport({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: { user: 'apikey', pass: process.env.SENDGRID_API_KEY },
    });
    await transporter.sendMail({
      from: `"${process.env.SENDGRID_FROM_NAME || 'JAMB CBT Allocation'}" <${process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng'}>`,
      to,
      subject,
      html,
    });
    console.log(`Email sent to ${to}`);
  } catch (err: any) {
    console.error('Email error:', err.message);
  }
}

// ── WHATSAPP via Meta Cloud API (free — 1,000 conversations/month)
async function sendWhatsApp(phone: string, details: AllocationDetails): Promise<void> {
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_ID || !phone) return;

  // Normalise Nigerian number: 080... → 23480...
  const to = phone.startsWith('+')
    ? phone.replace('+', '')
    : phone.startsWith('0')
    ? `234${phone.substring(1)}`
    : phone;

  const arrival  = ft(details.batch.arrival_time || details.batch.arrival);
  const examStart = ft(details.batch.exam_start);
  const examEnd   = ft(details.batch.exam_end);
  const maps      = mapsLink(details.centre);

  // WhatsApp text message
  const message = `*JAMB CBT ALLOCATION*\n\nDear *${details.student.full_name}*,\n\nYour exam centre has been allocated:\n\n📍 *Centre:* ${details.centre.name}\n🏠 *Address:* ${details.centre.address}, ${details.centre.lga}, ${details.centre.state}\n📅 *Date:* ${formatDate(details.exam_date)}\n🔢 *Batch:* ${details.batch.number}\n⏰ *Arrival:* ${arrival}\n📝 *Exam:* ${examStart} – ${examEnd}\n📏 *Distance:* ${details.distance_km} km${maps ? `\n\n🗺️ *Directions:* ${maps}` : ''}\n\n⚠️ Arrive 30 minutes early. Bring your JAMB slip and a valid ID.`;

  try {
    await axios.post(
      `https://graph.facebook.com/v19.0/${process.env.WHATSAPP_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`WhatsApp sent to ${to}`);
  } catch (err: any) {
    console.error('WhatsApp error:', err.response?.data || err.message);
  }
}

// ── EMAIL HTML TEMPLATE
function buildEmailHTML(d: AllocationDetails): string {
  const arrival   = ft(d.batch.arrival_time || d.batch.arrival);
  const examStart = ft(d.batch.exam_start);
  const examEnd   = ft(d.batch.exam_end);
  const maps      = mapsLink(d.centre);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
    <!-- Header -->
    <div style="background:#006400;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">JOINT ADMISSIONS AND MATRICULATION BOARD</h1>
      <p style="color:#90ee90;margin:6px 0 0;font-size:13px">CBT Examination Allocation Notification</p>
    </div>
    <!-- Body -->
    <div style="padding:28px">
      <p style="font-size:15px;color:#333">Dear <strong>${d.student.full_name}</strong>,</p>
      <p style="color:#555;font-size:14px">Your JAMB CBT examination centre has been successfully allocated. Please find your details below:</p>
      <!-- Details table -->
      <table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">
        <tr style="background:#006400;color:white">
          <td colspan="2" style="padding:10px 14px;font-weight:bold">Allocation Details</td>
        </tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-weight:bold;width:40%;border-bottom:1px solid #eee">Registration Number</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${d.student.reg_number}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Exam Centre</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${d.centre.name}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Address</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${d.centre.address}, ${d.centre.lga}, ${d.centre.state}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Exam Date</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${formatDate(d.exam_date)}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Batch</td><td style="padding:10px 14px;border-bottom:1px solid #eee">Batch ${d.batch.number}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Arrival Time</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${arrival}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Exam Start</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${examStart}</td></tr>
        <tr><td style="padding:10px 14px;font-weight:bold;border-bottom:1px solid #eee">Exam End</td><td style="padding:10px 14px;border-bottom:1px solid #eee">${examEnd}</td></tr>
        <tr style="background:#f9f9f9"><td style="padding:10px 14px;font-weight:bold">Distance from You</td><td style="padding:10px 14px">${d.distance_km} km</td></tr>
      </table>
      <!-- Google Maps button -->
      ${maps ? `<div style="text-align:center;margin:20px 0">
        <a href="${maps}" target="_blank" style="background:#4285F4;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
          🗺️ Get Directions on Google Maps
        </a>
      </div>` : ''}
      <!-- Warning -->
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:14px;margin-top:16px;font-size:13px;color:#856404">
        ⚠️ <strong>Important:</strong> Arrive at least <strong>30 minutes</strong> before your scheduled arrival time. Bring this email, your JAMB registration slip, and a valid government-issued ID.
      </div>
    </div>
    <!-- Footer -->
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#888">
      This is an automated message from the JAMB CBT Allocation System. Do not reply to this email.<br>
      © ${new Date().getFullYear()} Joint Admissions and Matriculation Board
    </div>
  </div>
</body>
</html>`;
}

// ── MAIN EXPORT
export async function sendAllocationNotifications(details: AllocationDetails): Promise<void> {
  await Promise.allSettled([
    // Email
    details.student.email
      ? sendEmail(
          details.student.email,
          `JAMB CBT Allocation — ${details.student.reg_number} | ${formatDate(details.exam_date)}`,
          buildEmailHTML(details)
        )
      : Promise.resolve(),
    // WhatsApp
    details.student.phone
      ? sendWhatsApp(details.student.phone, details)
      : Promise.resolve(),
  ]);
}
