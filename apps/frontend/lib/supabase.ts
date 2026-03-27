import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://owpuzdrbqtbwkuqakjwt.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im93cHV6ZHJicXRid2t1cWFrand0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM2NDksImV4cCI6MjA4OTk5OTY0OX0.ApK_uZZJySm42cWVWfxXXBQ-fDdvgjGhaMRBbDnTB8Q';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Tipos para TypeScript
export type Usuario = {
  user_id: string;
  full_name: string;
  email: string;
  role_id: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type Rol = {
  role_id: string;
  name: string;
  description: string;
  active: boolean;
  created_at: string;
  updated_at: string;
};
