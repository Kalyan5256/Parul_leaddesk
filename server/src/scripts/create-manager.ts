import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Parse CLI flags or set defaults
const args = process.argv.slice(2);
const getArg = (flag: string, fallback: string): string => {
  const index = args.indexOf(flag);
  if (index !== -1 && args[index + 1]) {
    return args[index + 1];
  }
  return fallback;
};

const username = getArg('--username', `manager_${Date.now().toString().slice(-4)}`);
const email = getArg('--email', `${username}@paruluniversity.ac.in`);
const password = getArg('--password', 'admin123');
const fullName = getArg('--name', 'Parul University Manager');
const phone = getArg('--phone', '9825099999');

async function createManager() {
  console.log('👑 Parul LeadDesk — Dynamic Manager Creator');
  console.log('--------------------------------------------------');
  console.log(`Username:  ${username}`);
  console.log(`Email:     ${email}`);
  console.log(`Full Name: ${fullName}`);
  console.log(`Role:      manager (Institution-wide access)`);
  console.log('--------------------------------------------------');

  if (password.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  // 1. If Supabase is configured, create in Supabase Auth & Profiles
  if (supabaseUrl && supabaseServiceKey && !supabaseUrl.includes('your-supabase-id')) {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log('Connecting to Supabase at:', supabaseUrl);

    // Check if auth user already exists
    const { data: listData } = await supabase.auth.admin.listUsers();
    const existing = listData?.users.find((u) => u.email === email);

    let authId: string;
    if (existing) {
      authId = existing.id;
      console.log(`ℹ️ Auth account already exists for ${email} (ID: ${authId}). Updating password...`);
      await supabase.auth.admin.updateUserById(authId, { password });
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          username,
          full_name: fullName,
          role: 'manager',
        },
      });

      if (createError) {
        console.error('❌ Failed to create Supabase Auth user:', createError.message);
        process.exit(1);
      }
      authId = newUser.user.id;
      console.log(`✓ Supabase Auth user created successfully (ID: ${authId})`);
    }

    // Upsert into public.profiles
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authId,
      full_name: fullName,
      username,
      email,
      role: 'manager',
      team: null,
      phone,
      is_active: true,
    });

    if (profileError) {
      console.error('❌ Failed to upsert public.profiles record:', profileError.message);
    } else {
      console.log(`✓ public.profiles record created with role: manager`);
    }
  }

  console.log('\n🎉 SUCCESS! Manager created successfully.');
  console.log('Credentials to sign in:');
  console.log(`  Username / Email: ${username} (or ${email})`);
  console.log(`  Password:         ${password}`);
  console.log('\nUsage example for custom credentials:');
  console.log('  npm run create:manager -- --username admissions_head --email head@paruluniversity.ac.in --password mypass123 --name "Dr. Sharma"');
}

createManager().catch((err) => {
  console.error('❌ Failed to create manager:', err);
  process.exit(1);
});
