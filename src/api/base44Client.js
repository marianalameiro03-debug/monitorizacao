import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────────────────────
// 🔑 Make sure your .env file has these two variables:
//    VITE_SUPABASE_URL=https://your-project.supabase.co
//    VITE_SUPABASE_ANON_KEY=your-anon-key
// ─────────────────────────────────────────────────────────────
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);
