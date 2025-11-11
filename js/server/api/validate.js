import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const token = String(req.query.token || '');
    if (!token) return res.status(400).send('Missing token');

    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supa
      .from('profiles')
      .update({ is_validated: true, validation_token: null, updated_at: new Date().toISOString() })
      .eq('validation_token', token)
      .select('email, first_name')
      .single();

    if (error || !data) return res.status(400).send('Invalid token');

    const redirect = `${process.env.APP_BASE_URL}/?validate=${encodeURIComponent(token)}`;
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(`<!doctype html><meta http-equiv="refresh" content="0; url='${redirect}'">Validated`);
  } catch (e) {
    console.error(e);
    res.status(500).send('Server error');
  }
}