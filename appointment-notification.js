const { timingSafeEqual } = require('node:crypto');

function json(response, status, body) {
  response.status(status).json(body);
}

function constantTimeEqual(left, right) {
  const a = Buffer.from(String(left || ''), 'utf8');
  const b = Buffer.from(String(right || ''), 'utf8');
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function clean(value, fallback = 'Not provided') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getRecipients() {
  return String(process.env.BOOKING_NOTIFICATION_EMAILS || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);
}

function readPayload(request) {
  if (request.body && typeof request.body === 'object' && !Buffer.isBuffer(request.body)) {
    return request.body;
  }
  if (Buffer.isBuffer(request.body)) return JSON.parse(request.body.toString('utf8'));
  if (typeof request.body === 'string') return JSON.parse(request.body);
  return null;
}

module.exports = async function appointmentNotification(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    return json(response, 405, { error: 'Method not allowed.' });
  }

  const configuredSecret = process.env.BOOKING_WEBHOOK_SECRET;
  const authorization = request.headers.authorization || '';
  const providedSecret = request.headers['x-booking-webhook-secret'] ||
    (authorization.startsWith('Bearer ') ? authorization.slice(7) : '');

  if (!configuredSecret || !constantTimeEqual(providedSecret, configuredSecret)) {
    return json(response, 401, { error: 'Unauthorized.' });
  }

  let payload;
  try {
    payload = readPayload(request);
  } catch {
    return json(response, 400, { error: 'Invalid JSON.' });
  }

  if (
    !payload ||
    String(payload.type || '').toUpperCase() !== 'INSERT' ||
    payload.schema !== 'public' ||
    payload.table !== 'appointments' ||
    !payload.record
  ) {
    return json(response, 400, { error: 'Unexpected webhook payload.' });
  }

  const recipients = getRecipients();
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.EMAIL_FROM ||
    recipients.length !== 2 ||
    !recipients.every(validEmail)
  ) {
    return json(response, 500, { error: 'Email notifications are not configured.' });
  }

  const appointment = payload.record;
  const reference = clean(appointment.id, 'Pending').replaceAll('-', '').slice(0, 8).toUpperCase();
  const patientName = clean(appointment.patient_name);
  const phone = clean(appointment.phone);
  const patientEmail = clean(appointment.email);
  const appointmentDate = clean(appointment.appointment_date);
  const appointmentSlot = clean(appointment.preferred_slot);
  const createdAt = clean(appointment.created_at);
  const origin = `${request.headers['x-forwarded-proto'] || 'https'}://${request.headers['x-forwarded-host'] || request.headers.host}`;
  const adminUrl = `${origin}/admin.html`;

  const text = [
    'A new video consultation has been requested.',
    '',
    `Booking reference: ${reference}`,
    `Patient: ${patientName}`,
    `Phone: ${phone}`,
    `Email: ${patientEmail}`,
    `Requested date: ${appointmentDate}`,
    `Requested slot: ${appointmentSlot}`,
    `Submitted at: ${createdAt}`,
    '',
    `Review and confirm: ${adminUrl}`,
  ].join('\n');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#17352f;line-height:1.55">
      <div style="background:#087f6d;color:white;padding:20px 24px;border-radius:12px 12px 0 0">
        <div style="font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase">Dr. S. Kaushik Anurag</div>
        <h1 style="font-size:22px;margin:6px 0 0">New consultation request</h1>
      </div>
      <div style="border:1px solid #dce9e5;border-top:0;padding:24px;border-radius:0 0 12px 12px">
        <p>A patient has requested a video-consultation appointment.</p>
        <table style="width:100%;border-collapse:collapse">
          <tr><td style="padding:7px 0;color:#61736e">Booking reference</td><td style="padding:7px 0;font-weight:700">${escapeHtml(reference)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Patient</td><td style="padding:7px 0">${escapeHtml(patientName)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Phone</td><td style="padding:7px 0">${escapeHtml(phone)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Email</td><td style="padding:7px 0">${escapeHtml(patientEmail)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Requested date</td><td style="padding:7px 0">${escapeHtml(appointmentDate)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Requested slot</td><td style="padding:7px 0">${escapeHtml(appointmentSlot)}</td></tr>
          <tr><td style="padding:7px 0;color:#61736e">Submitted at</td><td style="padding:7px 0">${escapeHtml(createdAt)}</td></tr>
        </table>
        <p style="margin:24px 0 0"><a href="${escapeHtml(adminUrl)}" style="display:inline-block;background:#087f6d;color:white;text-decoration:none;padding:11px 17px;border-radius:8px;font-weight:700">Review appointment</a></p>
        <p style="font-size:13px;color:#61736e;margin-top:20px">Confirm or contact the patient through the secure admin dashboard.</p>
      </div>
    </div>`;

  const message = {
    from: process.env.EMAIL_FROM,
    to: recipients,
    subject: `New appointment: ${patientName} · ${appointmentDate} ${appointmentSlot}`,
    text,
    html,
  };

  if (validEmail(String(appointment.email || '').trim())) {
    message.reply_to = String(appointment.email).trim();
  }

  let resendResponse;
  try {
    resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        'Idempotency-Key': `appointment-notification/${String(appointment.id || reference).slice(0, 180)}`,
      },
      body: JSON.stringify(message),
    });
  } catch (error) {
    console.error('Appointment notification request failed:', error.message);
    return json(response, 502, { error: 'Email provider could not be reached.' });
  }

  const result = await resendResponse.json().catch(() => ({}));
  if (!resendResponse.ok) {
    console.error('Appointment notification was rejected:', resendResponse.status, result);
    return json(response, 502, { error: 'Email provider rejected the notification.' });
  }

  return json(response, 200, { delivered: true, message_id: result.id || null });
};
