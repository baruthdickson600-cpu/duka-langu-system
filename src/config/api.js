// ============================================================
// API BASE URL — Hakikisha API zinafanya kazi popote
// ============================================================
// dukalangu.com (custom domain) inaweza kukosa API routes.
// Tumia URL kamili ya Vercel deployment ambapo API zipo.

// Kama tuko kwenye localhost, tumia path tu (dev server ina proxy)
// Vinginevyo, tumia Vercel deployment URL moja kwa moja
const VERCEL_API = 'https://duka-langu-system.vercel.app';

function getApiBase() {
  if (typeof window === 'undefined') return '';
  const host = window.location.hostname;
  // Dev/localhost — tumia relative path
  if (host === 'localhost' || host === '127.0.0.1') return '';
  // Kama tayari tuko kwenye vercel.app deployment — tumia relative
  if (host.endsWith('.vercel.app')) return '';
  // Custom domain (dukalangu.com) — elekeza Vercel ambapo API zipo
  return VERCEL_API;
}

export const API_BASE = getApiBase();

// Helper ya kuita API — inajenga URL kamili moja kwa moja
export async function apiFetch(path, options = {}) {
  const url = `${API_BASE}${path}`;
  return fetch(url, options);
}
