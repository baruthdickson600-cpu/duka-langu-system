// src/lib/supabase.js
// Supabase Client Configuration - Duka Langu POS System

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://vuccgtntekejwrnmisoo.supabase.co";
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1Y2NndG50ZWtlandybm1pc29vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUwMzc2MzksImV4cCI6MjA5MDYxMzYzOX0.UE2MlrbaAXcu2eyXWhDNA_-je5d3JcgaaNnUchCZrIw";

export const supabase = createClient(supabaseUrl, supabaseKey);
