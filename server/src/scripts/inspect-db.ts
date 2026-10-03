import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('No supabase credentials found in .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function inspect() {
  console.log('--- Connecting to Supabase:', url);
  const { data: users, error: uErr } = await supabase.auth.admin.listUsers();
  console.log('=== AUTH USERS ===');
  if (uErr) {
    console.error('Auth error:', uErr.message);
  } else {
    console.log(`Found ${users.users.length} auth user(s):`);
    for (const u of users.users) {
      console.log(`- ID: ${u.id} | Email: ${u.email} | CreatedAt: ${u.created_at} | Meta: ${JSON.stringify(u.user_metadata)}`);
    }
  }

  const tables = ['profiles', 'leads', 'daily_reports', 'follow_ups', 'notifications', 'audit_logs', 'push_subscriptions'];
  for (const t of tables) {
    const { data, count, error } = await supabase.from(t).select('*', { count: 'exact' });
    console.log(`=== TABLE: ${t} ===`);
    if (error) {
      console.error(`${t} error:`, error.message);
    } else {
      console.log(`Total count: ${count}`);
      if (data && data.length > 0) {
        console.log(`Sample (first ${Math.min(5, data.length)} rows):`);
        console.log(JSON.stringify(data.slice(0, 5), null, 2));
      }
    }
  }
}

inspect().catch(err => {
  console.error('Inspection failed:', err);
});
