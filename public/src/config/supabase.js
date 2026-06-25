import { createClient } from '@supabase/supabase-js';

// ===== SECURE CONFIG =====
// API keys zinasomwa kutoka environment variables
// Development: weka kwenye .env.local
// Production: weka kwenye Vercel Dashboard > Settings > Environment Variables
const URL = import.meta.env.VITE_SUPABASE_URL || 'https://snosfxagzglswaotrgzv.supabase.co';
const KEY = import.meta.env.VITE_SUPABASE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNub3NmeGFnemdsc3dhb3RyZ3p2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUxMDcwMDAsImV4cCI6MjA5MDY4MzAwMH0.qS6lEKGJ6IRganQTcpB1sFtw90XDyK0BMaQKSTVLXKE';

export const supabase = createClient(URL, KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: 'duka-langu-auth-v2',
  },
  global: {
    headers: { 'x-app-name': 'duka-langu' },
  },
});

// Safisha session iliyoharibika (Invalid Refresh Token)
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'TOKEN_REFRESHED') return;
  if (event === 'SIGNED_OUT' || (!session && event === 'INITIAL_SESSION')) {
    // Session imeisha — safisha localStorage ili app iweze kuanza upya
    try {
      Object.keys(localStorage).forEach(k => {
        if (k.includes('supabase') || k.includes('duka-langu-auth')) {
          localStorage.removeItem(k);
        }
      });
    } catch(e) {}
  }
});

// Session errors handled by onAuthStateChange above
