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
  },
  global: {
    headers: {
      'x-app-name': 'duka-langu',
    },
  },
});
