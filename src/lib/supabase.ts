import { createClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://lnbisyxbcvdpuacrbrwp.supabase.co";
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxuYmlzeXhiY3ZkcHVhY3JicndwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTQzMTg3NjksImV4cCI6MjEwOTg5NDc2OX0.nWJiqaBKUsaaGWmusyYQwdFhbkjjHxsl2ufuCz3_kvU";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

