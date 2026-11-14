import { sanitizeText, checkRateLimit, jsonResponse } from '../../_utils.js';

export async function onRequestGet({ env, request }) {
  const url = new URL(request.url);
  const slug = url.searchParams.get('slug');
  if (slug) {
    const inv = await env.DB.prepare('SELECT * FROM invitations WHERE slug = ? AND status = "published"').bind(sanitizeText(slug, 120)).first();
    if (!inv) return jsonResponse({ error: 'Undangan tidak ditemukan atau belum aktif.' }, 404);
    await env.DB.prepare('UPDATE invitations SET views_count = views_count + 1 WHERE id = ?').bind(inv.id).run();
    return jsonResponse({ data: inv });
  }
  const list = await env.DB.prepare('SELECT * FROM invitations ORDER BY updated_at DESC').all();
  return jsonResponse({ data: list.results || [] });
}

export async function onRequestPost({ env, request }) {
  const body = await request.json();
  const id = body.id || crypto.randomUUID();
  const slug = sanitizeText(body.slug || 'undangan-' + id.slice(0, 6), 120).toLowerCase().replace(/[^a-z0-9-]/g, '-');
  await env.DB.prepare(`
    INSERT OR REPLACE INTO invitations (
      id, owner_id, slug, custom_domain, status, privacy, expires_at, language,
      template_id, theme_overrides_json, couple_json, events_json, location_json,
      audio_json, gallery_json, love_story_json, gift_json, extras_json, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `).bind(
    id,
    body.owner_id || 'admin-1',
    slug,
    sanitizeText(body.custom_domain || '', 150),
    body.status || 'published',
    body.privacy || 'public',
    body.expires_at || null,
    body.language || 'id',
    body.template_id || 'emerald-gold',
    JSON.stringify(body.theme_overrides || {}),
    JSON.stringify(body.couple || {}),
    JSON.stringify(body.events || []),
    JSON.stringify(body.location || {}),
    JSON.stringify(body.audio || {}),
    JSON.stringify(body.gallery || {}),
    JSON.stringify(body.love_story || {}),
    JSON.stringify(body.gift || {}),
    JSON.stringify(body.extras || {})
  ).run();
  return jsonResponse({ success: true, id, slug });
}
