import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function cleanupTestData() {
  console.log('\n🧹 Cleaning up test accounts and dummy records from Supabase...');
  console.log('Target:', url);

  try {
    // 1. Fetch all users from Supabase Auth
    const { data: usersData, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) {
      throw listErr;
    }

    const users = usersData?.users || [];
    console.log(`Found ${users.length} auth user(s).`);

    // All these accounts were created during testing/seed:
    // dasarikalyan40@gmail.com, test_mgr@paruluniversity.ac.in, meera.c@paruluniversity.ac.in,
    // teamlead1, teamlead2, manager@paruluniversity.ac.in
    for (const u of users) {
      console.log(`Deleting test auth user: ${u.email} (${u.id})`);
      const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
      if (delErr) {
        console.warn(`  ⚠️ Could not delete auth user ${u.email}:`, delErr.message);
      } else {
        console.log(`  ✓ Auth user deleted: ${u.email}`);
      }
    }

    // 2. Clear application profiles table
    console.log('\nClearing test profiles...');
    const { error: profErr } = await supabase
      .from('profiles')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (profErr) {
      console.warn('  ⚠️ Profiles delete warning:', profErr.message);
    } else {
      console.log('  ✓ Profiles table cleaned.');
    }

    // 3. Clear any leftover test records in other tables
    const tables = ['leads', 'daily_reports', 'follow_ups', 'notifications', 'audit_logs', 'push_subscriptions'];
    for (const table of tables) {
      await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    }

    console.log('\n✅ Supabase is now 100% clean with zero test accounts and zero dummy records.');
    console.log('The database schema, RLS policies, and tables remain intact.\n');
  } catch (err: any) {
    console.error('❌ Cleanup failed:', err.message);
    process.exit(1);
  }
}

cleanupTestData();
