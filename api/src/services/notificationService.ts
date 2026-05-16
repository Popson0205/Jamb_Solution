import AfricasTalking from 'africastalking';

interface AllocationDetails {
  student: { full_name: string; email?: string; phone?: string; reg_number: string };
  centre: { name: string; address: string; state: string; lga: string; latitude?: number; longitude?: number };
  batch: { number: number; arrival: string; arrival_time?: string; exam_start: string; exam_end: string };
  exam_date: string;
  distance_km: number;
}

// Strip seconds: "07:00:00" → "07:00"
const ft = (t: string) => (t || '').substring(0, 5);

// Format date: "2026-05-14" → "Wednesday, 14 May 2026"
function formatDate(dateStr: any): string {
  if (!dateStr) return 'N/A';
  // Handle Date objects, ISO strings, and plain date strings
  const d = dateStr instanceof Date
    ? dateStr
    : new Date(typeof dateStr === 'string' && !dateStr.includes('T') ? dateStr + 'T00:00:00' : dateStr);
  if (isNaN(d.getTime())) return String(dateStr);
  return d.toLocaleDateString('en-NG', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

// Google Maps directions link
function mapsLink(centre: AllocationDetails['centre']): string {
  if (!centre?.latitude || !centre?.longitude) return '';
  return `https://www.google.com/maps/dir/?api=1&destination=${centre.latitude},${centre.longitude}&travelmode=driving`;
}

// Normalise Nigerian phone: 080... → +23480...
function normalisePhone(phone: string): string {
  if (!phone) return '';
  const clean = phone.replace(/\s/g, '');
  if (clean.startsWith('+')) return clean;
  if (clean.startsWith('0')) return `+234${clean.substring(1)}`;
  if (clean.startsWith('234')) return `+${clean}`;
  return `+234${clean}`;
}

// ── SMS via Africa's Talking
async function sendSMS(phone: string, message: string): Promise<void> {
  const username = process.env.AT_USERNAME;
  const apiKey   = process.env.AT_API_KEY;

  if (!username || !apiKey || !phone) {
    console.log('SMS skipped — Africa\'s Talking env vars not set');
    return;
  }

  const to = normalisePhone(phone);
  try {
    const AT  = AfricasTalking({ username, apiKey });
    const sms = AT.SMS;
    // Only pass 'from' if a sender ID is explicitly configured — omit it in sandbox
    const sendParams: any = { to: [to], message };
    if (process.env.AT_SENDER_ID) sendParams.from = process.env.AT_SENDER_ID;
    const res: any = await sms.send(sendParams);
    const recipient = res.SMSMessageData?.Recipients?.[0];
    if (recipient?.status === 'Success') {
      console.log(`✅ SMS sent to ${to} — MessageId: ${recipient.messageId}`);
    } else {
      console.error(`❌ SMS failed to ${to}:`, recipient?.status, recipient?.statusCode);
    }
  } catch (err: any) {
    console.error(`❌ SMS failed to ${to}:`, err.message);
  }
}

// ── Email via SendGrid HTTP API (not SMTP — works on Render free tier)
async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY || !to) {
    console.log('Email skipped — SENDGRID_API_KEY not set');
    return;
  }
  try {
    const sgMail = require('@sendgrid/mail');
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    await sgMail.send({
      to,
      from: {
        email: process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng',
        name: process.env.SENDGRID_FROM_NAME || 'JAMB CBT Allocation',
      },
      replyTo: process.env.SENDGRID_FROM_EMAIL || 'noreply@jamb.gov.ng',
      subject,
      html,
      // Headers to improve deliverability and reduce spam score
      headers: {
        'X-Priority': '1',
        'X-Mailer': 'JAMB CBT Allocation System',
        'Importance': 'high',
      },
      mailSettings: {
        sandboxMode: { enable: false },
      },
      trackingSettings: {
        clickTracking: { enable: false },
        openTracking: { enable: false },
      },
    });
    console.log(`✅ Email sent to ${to}`);
  } catch (err: any) {
    const detail = err.response?.body?.errors?.[0]?.message || err.message;
    console.error(`❌ Email failed to ${to}:`, detail);
  }
}

// ── Email HTML template
function buildEmailHTML(d: AllocationDetails): string {
  const arrival    = ft(d.batch.arrival_time || d.batch.arrival);
  const examStart  = ft(d.batch.exam_start);
  const examEnd    = ft(d.batch.exam_end);
  const maps       = mapsLink(d.centre);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f0f4f0;font-family:Arial,sans-serif">
  <div style="max-width:600px;margin:24px auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.1)">
    <div style="background:#006400;padding:24px;text-align:center">
      <h1 style="color:white;margin:0;font-size:20px">JOINT ADMISSIONS AND MATRICULATION BOARD</h1>
      <p style="color:#90ee90;margin:6px 0 0;font-size:13px">CBT Examination Allocation Notification</p>
    </div>
    <div style="padding:28px">
      <p style="font-size:15px;color:#333;margin:0 0 8px">Dear <strong>${d.student.full_name}</strong>,</p>
      <p style="color:#555;font-size:14px;margin:0 0 20px">Your JAMB CBT examination centre has been successfully allocated. Please find your details below:</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <tr style="background:#006400;color:white"><td colspan="2" style="padding:10px 14px;font-weight:bold">Allocation Details</td></tr>
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
      ${maps ? `
      <div style="text-align:center;margin:20px 0">
        <a href="${maps}" target="_blank" style="background:#4285F4;color:white;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:14px;display:inline-block">
          🗺️ Get Directions on Google Maps
        </a>
      </div>` : ''}
      <div style="background:#fff3cd;border:1px solid #ffc107;border-radius:6px;padding:14px;margin-top:16px;font-size:13px;color:#856404">
        ⚠️ <strong>Important:</strong> Arrive at least <strong>30 minutes</strong> before your scheduled arrival time. Bring this email, your JAMB registration slip, and a valid government-issued ID.
      </div>
    </div>
    <div style="background:#f5f5f5;padding:16px;text-align:center;font-size:12px;color:#888">
      This is an automated message from the JAMB CBT Allocation System. Do not reply to this email.<br>
      © ${new Date().getFullYear()} Joint Admissions and Matriculation Board
    </div>
  </div>
</body>
</html>`;
}

// ── SMS message text (kept under 160 chars for Twilio trial compatibility)
function buildSMSText(d: AllocationDetails): string {
  const arrival   = ft(d.batch.arrival_time || d.batch.arrival);
  const examStart = ft(d.batch.exam_start);
  const examEnd   = ft(d.batch.exam_end);
  // Short date: "2026-05-14" → "14/05/2026"
  const shortDate = (() => {
    const dt = new Date(
      typeof d.exam_date === 'string' && !d.exam_date.includes('T')
        ? d.exam_date + 'T00:00:00'
        : d.exam_date
    );
    if (isNaN(dt.getTime())) return String(d.exam_date);
    const day   = String(dt.getDate()).padStart(2, '0');
    const month = String(dt.getMonth() + 1).padStart(2, '0');
    return `${day}/${month}/${dt.getFullYear()}`;
  })();
  // Truncate centre name so total message stays under 160 chars for Twilio trial
  const centreName = d.centre.name.length > 40 ? d.centre.name.substring(0, 37) + '...' : d.centre.name;
  return `JAMB CBT: ${d.student.reg_number}\nCentre: ${centreName}\n${shortDate} Batch ${d.batch.number}\nArrive: ${arrival} Exam: ${examStart}-${examEnd}\nBring JAMB slip+ID.`;
}

// ── Main export
export async function sendAllocationNotifications(details: AllocationDetails): Promise<void> {
  const smsText = buildSMSText(details);
  const emailSubject = `JAMB CBT Allocation — ${details.student.reg_number} | ${formatDate(details.exam_date)}`;

  await Promise.allSettled([
    // SMS via Twilio (to phone number)
    details.student.phone
      ? sendSMS(details.student.phone, smsText)
      : Promise.resolve(),
    // Email via SendGrid
    details.student.email
      ? sendEmail(details.student.email, emailSubject, buildEmailHTML(details))
      : Promise.resolve(),
  ]);
}
