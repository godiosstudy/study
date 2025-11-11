import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  try {
    const email = String(req.query.email || '').trim();
    if (!email) return res.status(400).json({ error: 'email required' });

    const supa = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    const { data, error } = await supa
      .from('profiles')
      .select('email')
      .ilike('email', email)
      .limit(1);

    if (error) {
      console.error('supabase error', error);
      return res.status(500).json({ error: 'db error' });
    }
    return res.status(200).json({ exists: Array.isArray(data) && data.length > 0 });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'server error' });
  }
}