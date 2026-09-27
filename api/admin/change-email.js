import { createClient } from '@supabase/supabase-js';

// ============================================================
// ADMIN — Change User Email (Supabase Auth + users + businesses)
// POST /api/admin/change-email
// Inabadilisha email kwenye Supabase Auth (service_role) ILI mteja
// aweze kuingia kwa email mpya. Inasasisha pia users + businesses.
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server haijawekwa vizuri (service key inahitajika).' });
  }

  try {
    const { old_email, new_email, business_id } = req.body || {};
    if (!new_email) return res.status(400).json({ success: false, error: 'Email mpya inahitajika.' });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // 1. Tafuta mtumiaji kwa email ya zamani (au business_id -> users)
    let userId = null;
    let currentEmail = old_email;

    if (!currentEmail && business_id) {
      const { data: u } = await admin.from('users').select('id,email').eq('business_id', business_id).eq('role', 'office').maybeSingle();
      if (u) { userId = u.id; currentEmail = u.email; }
    }

    // Tafuta auth user kwa email
    if (!userId && currentEmail) {
      // Orodhesha users kutafuta kwa email
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      const found = (list?.users || []).find(x => (x.email || '').toLowerCase() === currentEmail.toLowerCase());
      if (found) userId = found.id;
    }

    if (!userId && currentEmail) {
      // Jaribu kupata id kutoka users table
      const { data: u2 } = await admin.from('users').select('id').eq('email', currentEmail).maybeSingle();
      if (u2) userId = u2.id;
    }

    if (!userId) {
      return res.status(404).json({ success: false, error: 'Mtumiaji hajapatikana kwa email ya zamani.' });
    }

    // 2. Badilisha email kwenye Supabase Auth (email_confirm:true ili aweze kuingia mara moja)
    const { error: authErr } = await admin.auth.admin.updateUserById(userId, {
      email: new_email,
      email_confirm: true,
    });
    if (authErr) {
      const m = (authErr.message || '').toLowerCase();
      if (m.includes('already') || m.includes('registered') || m.includes('exists'))
        return res.status(409).json({ success: false, error: 'Email mpya tayari inatumiwa na akaunti nyingine.' });
      return res.status(400).json({ success: false, error: authErr.message });
    }

    // 3. Sasisha users table
    await admin.from('users').update({ email: new_email }).eq('id', userId).then(() => {}, () => {});

    // 4. Sasisha businesses table (kama business_id ipo)
    if (business_id) {
      await admin.from('businesses').update({ email: new_email }).eq('id', business_id).then(() => {}, () => {});
    }

    return res.status(200).json({ success: true, message: 'Email imebadilishwa. Mteja anaweza kuingia kwa email mpya.' });

  } catch (err) {
    console.error('[change-email]', err?.message);
    return res.status(500).json({ success: false, error: 'Tatizo la mfumo: ' + (err?.message || '') });
  }
}
