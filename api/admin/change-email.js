import { createClient } from '@supabase/supabase-js';

// ============================================================
// ADMIN — Change User Email (Supabase Auth + users + businesses)
// POST /api/admin/change-email
// Inabadilisha email kwenye Supabase Auth (service_role) ILI mteja
// aweze kuingia kwa email mpya. Inasasisha pia users + businesses.
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function findAuthUserByEmail(admin, email) {
  const target = (email || '').toLowerCase().trim();
  if (!target) return null;
  // Pitia kurasa zote za auth users
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    if (error) break;
    const users = data?.users || [];
    const found = users.find(u => (u.email || '').toLowerCase().trim() === target);
    if (found) return found;
    if (users.length < 200) break; // ukurasa wa mwisho
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return res.status(500).json({ success: false, error: 'Server haijawekwa (SUPABASE_SERVICE_ROLE_KEY inahitajika kwenye Vercel).' });
  }

  try {
    const { old_email, new_email, business_id, action, target_email, new_password } = req.body || {};

    const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });

    // ============================================================
    // ACTION: set_password — Admin anaweka password mpya kwa mteja
    // (mteja aliyesahau password). Inahitaji target_email + new_password.
    // ============================================================
    if (action === 'set_password') {
      if (!target_email || !target_email.includes('@')) {
        return res.status(400).json({ success: false, error: 'Email ya mteja si sahihi.' });
      }
      if (!new_password || new_password.length < 6) {
        return res.status(400).json({ success: false, error: 'Password lazima iwe na herufi 6 au zaidi.' });
      }
      let au = await findAuthUserByEmail(admin, target_email);
      if (!au && business_id) {
        const { data: u } = await admin.from('users').select('id,email').eq('business_id', business_id).eq('role', 'office').maybeSingle();
        if (u?.email) au = await findAuthUserByEmail(admin, u.email);
        if (!au && u?.id) { const { data: byId } = await admin.auth.admin.getUserById(u.id).catch(() => ({ data: null })); if (byId?.user) au = byId.user; }
      }
      if (!au) {
        return res.status(404).json({ success: false, error: 'Mtumiaji hajapatikana kwenye Supabase Auth kwa email hii.' });
      }
      const { error: pErr } = await admin.auth.admin.updateUserById(au.id, { password: new_password, email_confirm: true });
      if (pErr) {
        return res.status(400).json({ success: false, error: 'Auth: ' + pErr.message });
      }
      return res.status(200).json({ success: true, message: 'Password imebadilishwa. Mpe mteja password hii aingie nayo.' });
    }

    // ===== Default action: change email =====
    if (!new_email || !new_email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Email mpya si sahihi.' });
    }

    // ===== 1. Tafuta auth user =====
    let authUser = null;

    // (a) kwa old_email
    if (old_email) authUser = await findAuthUserByEmail(admin, old_email);

    // (b) kama haipatikani, jaribu kupata email kutoka users table kwa business_id
    if (!authUser && business_id) {
      const { data: u } = await admin.from('users').select('id,email').eq('business_id', business_id).eq('role', 'office').maybeSingle();
      if (u?.email) authUser = await findAuthUserByEmail(admin, u.email);
      // (c) kama users.id ni sawa na auth id, tumia moja kwa moja
      if (!authUser && u?.id) {
        const { data: byId } = await admin.auth.admin.getUserById(u.id).catch(() => ({ data: null }));
        if (byId?.user) authUser = byId.user;
      }
    }

    if (!authUser) {
      return res.status(404).json({
        success: false,
        error: 'Mtumiaji hajapatikana kwenye Supabase Auth kwa email ya zamani. Hakikisha email ya zamani ni sahihi.',
      });
    }

    // ===== 2. Badilisha email kwenye Auth (email_confirm:true = aingie mara moja) =====
    const { error: authErr } = await admin.auth.admin.updateUserById(authUser.id, {
      email: new_email.trim(),
      email_confirm: true,
    });
    if (authErr) {
      const m = (authErr.message || '').toLowerCase();
      if (m.includes('already') || m.includes('registered') || m.includes('exists') || m.includes('duplicate'))
        return res.status(409).json({ success: false, error: 'Email mpya tayari inatumiwa na akaunti nyingine.' });
      return res.status(400).json({ success: false, error: 'Auth: ' + authErr.message });
    }

    // ===== 3. Sasisha users + businesses =====
    await admin.from('users').update({ email: new_email.trim() }).eq('id', authUser.id).then(() => {}, () => {});
    if (business_id) {
      await admin.from('businesses').update({ email: new_email.trim() }).eq('id', business_id).then(() => {}, () => {});
      // Sasisha users wote wa biashara hii wenye email ya zamani (kama wapo)
      if (old_email) await admin.from('users').update({ email: new_email.trim() }).eq('business_id', business_id).eq('email', old_email).then(() => {}, () => {});
    }

    return res.status(200).json({
      success: true,
      message: 'Email imebadilishwa kikamilifu. Mteja anaweza kuingia kwa email mpya sasa.',
      auth_id: authUser.id,
    });

  } catch (err) {
    console.error('[change-email]', err?.message);
    return res.status(500).json({ success: false, error: 'Tatizo la mfumo: ' + (err?.message || '') });
  }
}
