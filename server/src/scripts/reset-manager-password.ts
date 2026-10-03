import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import readline from 'readline';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function askInput(promptText: string, isPassword = false): Promise<string> {
  return new Promise((resolve) => {
    if (!isPassword) {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question(promptText, (answer) => {
        rl.close();
        resolve(answer.trim());
      });
      return;
    }

    // Masked password input for TTY terminals
    const stdin = process.stdin;
    process.stdout.write(promptText);

    if (stdin.isTTY) {
      let password = '';
      const onData = (chunk: Buffer) => {
        const str = chunk.toString('utf-8');
        for (let i = 0; i < str.length; i++) {
          const char = str[i];
          if (char === '\n' || char === '\r' || char === '\u0004') {
            stdin.removeListener('data', onData);
            stdin.setRawMode(false);
            stdin.pause();
            process.stdout.write('\n');
            resolve(password.trim());
            return;
          } else if (char === '\u0003') {
            process.exit(1);
          } else if (char === '\b' || char === '\x7f') {
            if (password.length > 0) {
              password = password.slice(0, -1);
              process.stdout.write('\b \b');
            }
          } else {
            password += char;
            process.stdout.write('*');
          }
        }
      };

      stdin.setRawMode(true);
      stdin.resume();
      stdin.on('data', onData);
    } else {
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });
      rl.question('', (answer) => {
        rl.close();
        resolve(answer.trim());
      });
    }
  });
}

async function runResetManagerPassword() {
  console.log('\n==================================================');
  console.log('🔑 Reset Manager / Admin Password');
  console.log('==================================================\n');

  try {
    const email = await askInput('Manager/Admin email: ');
    if (!email || !email.includes('@')) {
      console.error('\n❌ Error: A valid email address is required.');
      process.exit(1);
    }

    const cleanEmail = email.toLowerCase().trim();

    const newPassword = await askInput('New password: ', true);
    if (!newPassword || newPassword.length < 6) {
      console.error('❌ Error: Password must be at least 6 characters long.');
      process.exit(1);
    }

    const confirmPassword = await askInput('Confirm new password: ', true);
    if (newPassword !== confirmPassword) {
      console.error('❌ Error: Passwords do not match.');
      process.exit(1);
    }

    // Connect to Supabase
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
      process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 1. Find profile in public.profiles
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, email, full_name, role')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (profErr) {
      console.error('❌ Error checking database profile:', profErr.message);
      process.exit(1);
    }

    // Also check Supabase Auth directly if profile is not found
    let authUserId: string | null = profile?.id || null;
    let userRole = profile?.role;

    if (!authUserId) {
      const { data: listData } = await supabase.auth.admin.listUsers();
      const sbAuthUser = listData?.users?.find(
        (u) => u.email?.toLowerCase() === cleanEmail
      );
      if (sbAuthUser) {
        authUserId = sbAuthUser.id;
        userRole = (sbAuthUser.user_metadata as any)?.role || 'manager';
      }
    }

    if (!authUserId) {
      console.error(`\n❌ Error: No account found associated with "${cleanEmail}".`);
      process.exit(1);
    }

    // Verify privileged role
    if (userRole && userRole !== 'manager' && userRole !== 'admin') {
      console.error(`\n❌ Error: Account "${cleanEmail}" has role "${userRole}". This script only resets Manager or Admin accounts.`);
      process.exit(1);
    }

    // 2. Hash new password securely
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    // 3. Update password in Supabase Auth
    const { error: authUpdateErr } = await supabase.auth.admin.updateUserById(authUserId, {
      password: newPassword,
    });

    if (authUpdateErr) {
      console.error('❌ Error updating Supabase Auth password:', authUpdateErr.message);
      process.exit(1);
    }

    // 4. Update profile record
    await supabase
      .from('profiles')
      .update({
        must_change_password: false,
        password_reset_at: new Date().toISOString(),
      })
      .eq('id', authUserId);

    // Output formatted confirmation - NEVER prints password
    console.log('\nPassword reset successfully.');
    console.log(`Account: ${cleanEmail}\n`);
  } catch (err: any) {
    console.error('\n❌ Unexpected error during password reset:', err.message);
    process.exit(1);
  }
}

runResetManagerPassword();
