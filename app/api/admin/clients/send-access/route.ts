import { NextResponse } from 'next/server';
import { getAdminSessionFromRequest } from '../../../../../lib/admin-auth';

function clean(value: unknown, max = 500) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function emailValid(value: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value); }
function sameOrigin(req: Request) {
  const origin = req.headers.get('origin');
  if (!origin) return true;
  try { return new URL(origin).origin === new URL(req.url).origin; } catch { return false; }
}
function json(payload: Record<string, unknown>, status = 200) { return NextResponse.json(payload, { status, headers: { 'Cache-Control': 'no-store, max-age=0' } }); }
function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[char] || char));
}

export async function POST(req: Request) {
  if (!(await getAdminSessionFromRequest(req))) return json({ error: 'unauthorized' }, 401);
  if (!sameOrigin(req)) return json({ error: 'invalid_origin' }, 403);
  if (Number(req.headers.get('content-length') || 0) > 12_000) return json({ error: 'request_too_large' }, 413);

  const apiKey = String(process.env.RESEND_API_KEY || '').trim();
  const from = String(process.env.CLIENT_ACCESS_FROM_EMAIL || process.env.RESEND_FROM_EMAIL || '').trim();
  if (!apiKey || !from) return json({ error: 'email_provider_not_configured' }, 503);

  try {
    const body = await req.json() as Record<string, unknown>;
    const email = clean(body.email, 180).toLowerCase();
    const name = clean(body.name, 160) || 'Cliente';
    const company = clean(body.company, 180) || 'sua empresa';
    const password = String(body.password || '').slice(0, 200);
    const portalUrl = `${new URL(req.url).origin}/cliente`;
    if (!emailValid(email) || password.length < 8) return json({ error: 'invalid_access_data' }, 400);

    const subject = `Seu acesso ao painel ThynkXP · ${company}`;
    const html = `<!doctype html><html><body style="margin:0;background:#f6f4f1;font-family:Arial,sans-serif;color:#191512"><div style="max-width:620px;margin:0 auto;padding:36px 20px"><div style="background:#fff;border:1px solid #eee6df;border-radius:24px;padding:32px"><div style="font-size:12px;font-weight:800;letter-spacing:.14em;color:#ff6700;margin-bottom:18px">THYNKXP / ACESSO DO CLIENTE</div><h1 style="font-size:26px;margin:0 0 12px">Olá, ${escapeHtml(name)}.</h1><p style="color:#756c65;line-height:1.6">Seu acesso ao painel da ${escapeHtml(company)} foi criado. Use os dados abaixo no primeiro acesso.</p><div style="background:#faf7f4;border:1px solid #eee5dd;border-radius:16px;padding:18px;margin:22px 0"><p style="margin:0 0 10px"><strong>E-mail:</strong> ${escapeHtml(email)}</p><p style="margin:0"><strong>Senha inicial:</strong> ${escapeHtml(password)}</p></div><a href="${escapeHtml(portalUrl)}" style="display:inline-block;background:#ff6700;color:#fff;text-decoration:none;font-weight:700;padding:13px 18px;border-radius:12px">Acessar painel</a><p style="font-size:12px;color:#9a9189;line-height:1.5;margin-top:24px">Por segurança, não compartilhe estas credenciais. A ThynkXP não solicita sua senha por telefone ou mensagem.</p></div></div></body></html>`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10_000);
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from, to: [email], subject, html }),
      });
      if (!response.ok) return json({ error: 'email_send_failed' }, 502);
      return json({ ok: true });
    } finally { clearTimeout(timer); }
  } catch {
    return json({ error: 'email_send_failed' }, 502);
  }
}
