import { sanitizeText, checkRateLimit, jsonResponse } from '../../_utils.js';

export async function onRequestPost({ env, request }) {
  const ip = request.headers.get('CF-Connecting-IP') || 'anon';
  const allowed = await checkRateLimit(env.DB, 'rsvp:' + ip, 10, 60);
  if (!allowed) return jsonResponse({ error: 'Terlalu banyak permintaan. Silakan coba sebentar lagi.' }, 429);

  const body = await request.json();
  const invitationId = sanitizeText(body.invitation_id, 64);
  const guestId = sanitizeText(body.guest_id || '', 64);
  const guestName = sanitizeText(body.guest_name, 120);
  const attendance = ['hadir', 'tidak_hadir', 'ragu'].includes(body.attendance) ? body.attendance : 'hadir';
  const pax = Math.max(1, Math.min(10, parseInt(body.pax || 1, 10)));
  const message = sanitizeText(body.message, 600);

  if (!invitationId || !guestName) {
    return jsonResponse({ error: 'Nama tamu dan ID undangan wajib diisi.' }, 400);
  }

  // Upsert: Cek apakah tamu sudah pernah mengirim RSVP agar tidak duplikat
  const existing = await env.DB.prepare(
    'SELECT id FROM rsvps WHERE invitation_id = ? AND (guest_id = ? OR LOWER(guest_name) = LOWER(?))'
  ).bind(invitationId, guestId || '__none__', guestName).first();

  if (existing) {
    await env.DB.prepare(
      'UPDATE rsvps SET attendance = ?, pax = ?, message = ?, updated_at = datetime("now") WHERE id = ?'
    ).bind(attendance, pax, message, existing.id).run();
  } else {
    await env.DB.prepare(
      'INSERT INTO rsvps (id, invitation_id, guest_id, guest_name, attendance, pax, message) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), invitationId, guestId || null, guestName, attendance, pax, message).run();
  }

  if (guestId) {
    await env.DB.prepare(
      'UPDATE guests SET rsvp_status = ?, attending_count = ? WHERE id = ?'
    ).bind(attendance, attendance === 'hadir' ? pax : 0, guestId).run();
  }

  return jsonResponse({ success: true, updated: !!existing });
}
