import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

console.log('🔍 Testing Supabase Connection with provided credentials...');
console.log('URL:', supabaseUrl);
console.log('Service Key prefix:', supabaseServiceKey.substring(0, 20) + '...');

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function testConnection() {
  try {
    // 1. Check Auth connection
    console.log('\n--- 1. Testing Auth API ---');
    const { data: usersData, error: authError } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (authError) {
      console.error('❌ Supabase Auth check failed:', authError.message);
    } else {
      console.log('✅ Supabase Auth connection successful! Total auth users in project:', usersData.users.length);
    }

    // 2. Check Database Tables
    console.log('\n--- 2. Checking Database Tables ---');
    const tables = ['profiles', 'leads', 'daily_reports', 'follow_ups', 'notifications'];

    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
      if (error) {
        console.log(`⚠️  Table "${table}": Not found or error (${error.message})`);
      } else {
        console.log(`✅ Table "${table}": Exists!`);
      }
    }

  } catch (err: any) {
    console.error('❌ Connection test encountered an error:', err.message || err);
  }
}

testConnection();
