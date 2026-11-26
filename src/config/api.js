// ============================================================
// API BASE URL — inafanya kazi kwenye Vercel URL na custom domain
// ============================================================
// Vercel serverless functions (/api/*) zinapatikana kwenye deployment
// yoyote — custom domain dukalangu.com INA API zake mwenyewe.
// Tumia relative path KILA WAKATI ili browser aitumie domain iliyo
// active badala ya hardcode URL ya Vercel.

export const API_BASE = '';

export async function apiFetch(path, options = {}) {
  return fetch(path, options);
}

// ============================================================
// OMBI LA ADMIN
//
// /api/admin/* inatumia service_role — inapita kinga zote za
// database. Kwa hiyo server inathibitisha NANI anaomba, kwa token
// ya mtu aliyeingia. Token hii lazima iambatane na kila ombi,
// vinginevyo server inakataa (401).
//
// Cheo HAKITUMWI kwenye ombi kwa makusudi: server inakisoma
// yenyewe kutoka database. Kitu kinachotumwa na kivinjari
// kinaweza kudanganywa.
// ============================================================
export async function ombiLaAdmin(supabase, mwili) {
  let token = '';
  try {
    const { data } = await supabase.auth.getSession();
    token = data?.session?.access_token || '';
  } catch (_) { /* hakuna session */ }

  const res = await fetch(API_BASE + '/api/admin/change-email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: 'Bearer ' + token } : {}),
    },
    body: JSON.stringify(mwili || {}),
  });
  const d = await res.json().catch(() => ({}));
  if (!res.ok && !d?.error) {
    d.error = res.status === 401 || res.status === 403
      ? 'Hauruhusiwi — ingia upya kama msimamizi.'
      : 'Server imerudisha kosa ' + res.status + '.';
  }
  return { res, d };
}
