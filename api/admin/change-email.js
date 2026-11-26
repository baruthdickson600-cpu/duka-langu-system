import { createClient } from '@supabase/supabase-js';

// ============================================================
// ADMIN — Change User Email (Supabase Auth + users + businesses)
// POST /api/admin/change-email
// Inabadilisha email kwenye Supabase Auth (service_role) ILI mteja
// aweze kuingia kwa email mpya. Inasasisha pia users + businesses.
// ============================================================

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const ADMIN_EMAIL = (process.env.VITE_ADMIN_EMAIL || process.env.ADMIN_EMAIL || '').toLowerCase().trim();

// ============================================================
// NANI ANARUHUSIWA
//
// API hii inatumia service_role — inapita kinga zote za database.
// Bila ukaguzi huu, mtu YEYOTE duniani angeweza kutuma POST moja
// na kubadilisha password ya msimamizi, au kufuta akaunti yoyote.
// Kwa hiyo kila kitendo kinathibitishwa kwa token ya mtumiaji
// aliyeingia, NA cheo chake kinasomwa kutoka database — si kutoka
// kwenye ombi lenyewe, kwa sababu ombi linaweza kudanganya.
// ============================================================
async function mwombaji(admin, req) {
  const h = req.headers?.authorization || req.headers?.Authorization || '';
  const token = String(h).replace(/^Bearer\s+/i, '').trim();
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) return null;
  const au = data.user;
  const { data: row } = await admin.from('users').select('id,email,role,business_id,is_active')
    .eq('id', au.id).maybeSingle();
  const email = (au.email || row?.email || '').toLowerCase().trim();
  const cheo = String(row?.role || '').trim().toLowerCase();
  return {
    id: au.id,
    email,
    role: (ADMIN_EMAIL && email === ADMIN_EMAIL) ? 'admin' : cheo,
    business_id: row?.business_id || null,
    hai: row ? row.is_active !== false : false,
  };
}

const KATAA = { success: false, error: 'Hauruhusiwi kufanya kitendo hiki. Ingia kama msimamizi.' };

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

    // ===== Thibitisha mwombaji kabla ya kitendo chochote =====
    const mimi = await mwombaji(admin, req);
    if (!mimi) return res.status(401).json(KATAA);
    const niAdmin = mimi.role === 'admin';
    // Mmiliki wa duka anaruhusiwa kugusa wafanyakazi wa duka lake pekee
    const niMmilikiWa = (bid) => mimi.role === 'office' && mimi.hai && !!bid && mimi.business_id === bid;

    // ============================================================
    // ACTION: set_password — Admin anaweka password mpya kwa mteja
    // (mteja aliyesahau password). Inahitaji target_email + new_password.
    // ============================================================
    if (action === 'set_password') {
      if (!niAdmin) return res.status(403).json(KATAA);
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

    // ============================================================
    // ACTION: create_employee — Mmiliki anaunda mfanyakazi
    // Inaunda auth user (email_confirm:true = aingie mara moja) + users row.
    // Haisumbui session ya mmiliki (service_role, si signUp).
    // ============================================================
    if (action === 'create_employee') {
      const { emp_email, emp_password, emp_name, emp_phone, business_id: bid, branch_id } = req.body || {};
      if (!emp_email || !emp_email.includes('@')) return res.status(400).json({ success: false, error: 'Email ya mfanyakazi si sahihi.' });
      if (!emp_password || emp_password.length < 4) return res.status(400).json({ success: false, error: 'Password lazima iwe herufi 4 au zaidi.' });
      if (!bid) return res.status(400).json({ success: false, error: 'business_id inahitajika.' });
      if (!niAdmin && !niMmilikiWa(bid)) return res.status(403).json(KATAA);

      // Je auth user tayari ipo?
      let au = await findAuthUserByEmail(admin, emp_email);
      if (au) {
        // Sasisha password na thibitisha email (ili aingie)
        await admin.auth.admin.updateUserById(au.id, { password: emp_password, email_confirm: true }).catch(() => {});
      } else {
        const { data: created, error: cErr } = await admin.auth.admin.createUser({
          email: emp_email.trim().toLowerCase(), password: emp_password, email_confirm: true,
        });
        if (cErr) {
          const m = (cErr.message || '').toLowerCase();
          if (m.includes('already') || m.includes('registered') || m.includes('exists'))
            return res.status(409).json({ success: false, error: 'Email hii tayari inatumika. Tumia nyingine.' });
          return res.status(400).json({ success: false, error: 'Auth: ' + cErr.message });
        }
        au = created?.user;
      }
      if (!au) return res.status(500).json({ success: false, error: 'Imeshindwa kuunda mtumiaji.' });

      // Weka/rekebisha users row
      const row = { id: au.id, email: emp_email.trim().toLowerCase(), name: emp_name || '', phone: emp_phone || '', role: 'employee', business_id: bid, branch_id: branch_id || null, is_active: true };
      const { error: upErr } = await admin.from('users').upsert(row, { onConflict: 'id' });
      if (upErr) return res.status(400).json({ success: false, error: 'DB: ' + upErr.message });

      return res.status(200).json({ success: true, message: 'Mfanyakazi ameundwa na anaweza kuingia sasa.', user: row });
    }

    // ============================================================
    // ACTION: delete_employee — Futa mfanyakazi kabisa (Auth + users)
    // ============================================================
    // ============================================================
    // ACTION: delete_employee — Futa mtumiaji KABISA (users + Auth)
    //
    // Safu ya users PEKEE haitoshi: akaunti ya kuingia (Supabase
    // Auth) ingebaki, na mtu aliyefutwa angeweza kuingia tena na
    // kuanzisha duka jipya. Kwa hiyo tunafuta zote mbili.
    //
    // Makosa HAYAFICHWI: kitendo kisichoweza kurudishwa lazima
    // kiseme ukweli kama hakufanikiwa.
    // ============================================================
    if (action === 'delete_employee') {
      const { emp_id, emp_email } = req.body || {};
      if (!emp_id && !emp_email) return res.status(400).json({ success: false, error: 'emp_id au emp_email inahitajika.' });

      // Tafuta safu kwanza — tunahitaji kujua cheo chake kabla ya kufuta
      const q = admin.from('users').select('id,email,role,business_id');
      const { data: lengwa } = emp_id
        ? await q.eq('id', emp_id).maybeSingle()
        : await q.eq('email', String(emp_email).trim().toLowerCase()).maybeSingle();

      const chLengwa = String(lengwa?.role || '').trim().toLowerCase();
      const ruhusa = niAdmin
        || (chLengwa === 'employee' && niMmilikiWa(lengwa?.business_id));
      if (!ruhusa) return res.status(403).json(KATAA);

      const authId = lengwa?.id || emp_id || (await findAuthUserByEmail(admin, emp_email))?.id;
      if (!authId) return res.status(404).json({ success: false, error: 'Mtumiaji huyu hajapatikana.' });
      if (authId === mimi.id) return res.status(400).json({ success: false, error: 'Hauwezi kujifuta mwenyewe.' });

      // 1. Safu ya users
      if (lengwa?.id) {
        const { error: dErr } = await admin.from('users').delete().eq('id', lengwa.id);
        if (dErr) return res.status(400).json({ success: false, error: 'DB: ' + dErr.message });
      }

      // 2. Akaunti ya kuingia. Ikigoma, safu imeenda — semea wazi.
      const { error: aErr } = await admin.auth.admin.deleteUser(authId);
      if (aErr) {
        const m = (aErr.message || '').toLowerCase();
        if (!m.includes('not found') && !m.includes('does not exist')) {
          return res.status(207).json({
            success: false,
            error: 'Safu yake imefutwa, LAKINI akaunti ya kuingia imegoma kufutwa: ' + aErr.message
              + ' — ifute kwa mkono kwenye Supabase → Authentication → Users.',
          });
        }
      }

      return res.status(200).json({ success: true, message: 'Amefutwa kabisa — safu na akaunti ya kuingia.' });
    }

    // ===== Default action: change email =====
    if (!niAdmin && !niMmilikiWa(business_id)) return res.status(403).json(KATAA);
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
