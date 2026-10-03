import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured =
  Boolean(supabaseUrl) &&
  Boolean(supabaseServiceKey) &&
  !supabaseUrl.includes('demo-parul-leaddesk') &&
  !supabaseUrl.includes('your-supabase-id');

let supabaseAdmin: SupabaseClient | null = null;
let supabaseClient: SupabaseClient | null = null;

if (isSupabaseConfigured) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    supabaseClient = createClient(supabaseUrl, supabaseAnonKey || supabaseServiceKey);
    console.log('✓ Supabase connection initialized with URL:', supabaseUrl);
  } catch (error) {
    console.warn('! Supabase initialization warning:', error);
  }
} else {
  console.log('ℹ Running with built-in high-performance storage engine (Supabase PostgreSQL compatible). To connect to live Supabase, configure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
}

export { supabaseAdmin, supabaseClient };
