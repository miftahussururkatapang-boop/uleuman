// Utilitas Keamanan, Sanitasi XSS, PBKDF2 Password Hashing, & Rate Limiting
export function sanitizeText(input, maxLength = 500) {
  if (typeof input !== 'string') return '';
  return input
    .slice(0, maxLength)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .trim();
}

export async function hashPassword(password, saltHex) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(b => parseInt(b, 16)))
    : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const derived = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    256
  );
  const hashArray = Array.from(new Uint8Array(derived));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const finalSaltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
  return { hashHex, saltHex: finalSaltHex };
}

export async function checkRateLimit(db, key, limit = 30, windowSeconds = 60) {
  const now = Math.floor(Date.now() / 1000);
  const row = await db.prepare('SELECT hits, reset_at FROM rate_limits WHERE key = ?').bind(key).first();
  if (!row || row.reset_at < now) {
    await db.prepare('INSERT OR REPLACE INTO rate_limits (key, hits, reset_at) VALUES (?, 1, ?)').bind(key, now + windowSeconds).run();
    return true;
  }
  if (row.hits >= limit) return false;
  await db.prepare('UPDATE rate_limits SET hits = hits + 1 WHERE key = ?').bind(key).run();
  return true;
}

export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    }
  });
}
