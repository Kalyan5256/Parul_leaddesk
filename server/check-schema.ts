import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  { auth: { persistSession: false } }
);

async function checkSchema() {
  console.log('Checking tables in Supabase...');

  // Try raw RPC or query
  const res = await supabase.from('profiles').select('*').limit(1);
  console.log('Select profiles result:', res);
}

checkSchema();
