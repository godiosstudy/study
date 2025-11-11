import { createClient } from '@supabase/supabase-js';

function emailTexts(lang, url){
  if ((lang||'').toLowerCase().startsWith('en')) {
    return {
      subject: 'Validate your account',
      html: `<p>Please click <a href="${url}">VALIDATE</a> to confirm your registration.</p>`,
      text: `Please visit: ${url}`
    };
  }
  return {
    subject: 'Valida tu cuenta',
    html: `<p>Por favor haz clic en <a href="${url}">VALIDAR</a> para confirmar tu registro.</p>`,
    text: `Por favor visita: ${url}`
  };
}

async function sendEmail(to, token, lang) {
  const url = `${process.env.APP_BASE_URL}/api/validate?token=${encodeURIComponent(token)}`;
  const { subject, html, text } = emailTexts(lang, url);
  const resp = await fetch('https://api.postmarkapp.com/email', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Postmark-Server-Token': process.env.POSTMARK_TOKEN
    },
    body: JSON.stringify({
      From: 'info@godios.org',
      To: to,
      Subject: subject,
      HtmlBody: html,
      TextBody: text
    })
  });
  if (!resp.ok) {
    const txt = await resp.text().catch(()=>'');
    throw new Error('email failed: ' + txt);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  try {
    const { name, email, password, lang } = req.body || {};
    if (!name || !email || !password) return res.status(400).json({ error: 'missing fields' });

    const token = crypto.randomUUID();
    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

    const { error } = await supa
      .from('profiles')
      .upsert({
        email,
        first_name: name,
        validation_token: token,
        is_validated: false,
        updated_at: new Date().toISOString()
      }, { onConflict: 'email' });

    if (error) {
      console.error('supabase error', error);
      return res.status(500).json({ error: 'db error' });
    }

    await sendEmail(email, token, lang);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
}