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
