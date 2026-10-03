import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in server/.env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function clearAllData() {
  console.log('\n======================================================');
  console.log('🧹 CLEARING ALL DATA IN SUPABASE (FRESH TESTING RESET)');
  console.log('======================================================');
  console.log('Target Project:', supabaseUrl);

  // 1. Check if public.profiles exists
  const { error: checkTableError } = await supabase.from('profiles').select('id').limit(1);
  if (checkTableError && checkTableError.code === 'PGRST205') {
    console.log('\nℹ️ Tables have not been created in Supabase yet.');
    console.log('To set up fresh empty tables:');
    console.log('1. Open your Supabase SQL Editor:');
    console.log(`   👉 https://supabase.com/dashboard/project/${supabaseUrl.replace('https://', '').split('.')[0]}/sql/new`);
    console.log('2. Copy & paste the contents of "supabase/SETUP_ALL_TABLES.sql" and click RUN.');
    console.log('3. All tables will be created 100% clean and empty!\n');
    return;
  }

  try {
    console.log('\n[1/7] Deleting push subscriptions...');
    await supabase.from('push_subscriptions').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[2/7] Deleting audit logs...');
    await supabase.from('audit_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[3/7] Deleting notifications...');
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[4/7] Deleting follow-up schedules...');
    await supabase.from('follow_ups').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[5/7] Deleting daily reports...');
    await supabase.from('daily_reports').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[6/7] Deleting all candidate leads...');
    await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('[7/7] Deleting profiles and clearing test auth users...');
    const { data: usersData } = await supabase.auth.admin.listUsers();
    const existingUsers = usersData?.users || [];

    for (const u of existingUsers) {
      // Delete auth user (cascades to profile)
      await supabase.auth.admin.deleteUser(u.id);
    }
    // Also clear profiles table just in case
    await supabase.from('profiles').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    console.log('\n✨ Database is now completely empty!');
    console.log('\n👤 Creating fresh Manager account for testing:');
    console.log('   Email: manager@paruluniversity.ac.in');
    console.log('   Password: admin123');

    // Create single Manager account so you can log in
    const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
      email: 'manager@paruluniversity.ac.in',
      password: 'admin123',
      email_confirm: true,
      user_metadata: {
        full_name: 'Dr. Rajesh Parikh (Manager)',
        role: 'manager',
        username: 'manager',
      },
    });

    if (authErr) {
      console.warn('⚠️ Note on Manager creation:', authErr.message);
    } else if (authUser?.user) {
      await supabase.from('profiles').insert({
        id: authUser.user.id,
        full_name: 'Dr. Rajesh Parikh (Manager)',
        username: 'manager',
        email: 'manager@paruluniversity.ac.in',
        role: 'manager',
        team: null,
        phone: '9825012345',
        is_active: true,
      });
      console.log('✅ Fresh Manager account created successfully.');
    }

    console.log('\n======================================================');
    console.log('🎉 ALL DATA CLEARED! READY FOR FRESH MANUAL TESTING.');
    console.log('Leads: 0 | Reports: 0 | Follow-ups: 0 | Employees: 0');
    console.log('======================================================\n');
  } catch (err: any) {
    console.error('❌ Error during cleanup:', err.message);
  }
}

clearAllData();
