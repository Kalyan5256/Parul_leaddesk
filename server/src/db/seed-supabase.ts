import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function seedSupabase() {
  console.log('🌱 Starting Fresh Supabase Database Seeding...');
  console.log('Target URL:', supabaseUrl);

  // 1. Check if public.profiles exists
  const { error: checkTableError } = await supabase.from('profiles').select('id').limit(1);
  if (checkTableError && checkTableError.code === 'PGRST205') {
    console.error('\n⚠️  ACTION REQUIRED: Tables have not been created in Supabase yet!');
    console.error('Please open your Supabase SQL Editor at:');
    console.error(`👉 https://supabase.com/dashboard/project/${supabaseUrl.replace('https://', '').split('.')[0]}/sql/new`);
    console.error('Copy and run the contents of "supabase/migrations/001_init.sql", then re-run this seed script.');
    process.exit(1);
  }

  // Passwords: minimum 6 characters for Supabase Auth compliance
  const usersToCreate = [
    {
      username: 'manager',
      email: 'manager@paruluniversity.ac.in',
      password: 'admin123',
      full_name: 'Dr. Rajesh Parikh (Manager)',
      role: 'manager',
      team: null,
      phone: '9825012345',
    },
    {
      username: 'teamlead1',
      email: 'teamlead1@paruluniversity.ac.in',
      password: 'lead123',
      full_name: 'Sneha Dave (Team Lead A)',
      role: 'team_lead',
      team: 'Team A',
      phone: '9825023456',
    },
    {
      username: 'teamlead2',
      email: 'teamlead2@paruluniversity.ac.in',
      password: 'lead123',
      full_name: 'Amit Trivedi (Team Lead B)',
      role: 'team_lead',
      team: 'Team B',
      phone: '9825034567',
    },
    {
      username: 'employee1',
      email: 'employee1@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Pooja Sharma',
      role: 'employee',
      team: 'Team A',
      phone: '9876500001',
    },
    {
      username: 'employee2',
      email: 'employee2@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Rahul Verma',
      role: 'employee',
      team: 'Team A',
      phone: '9876500002',
    },
    {
      username: 'employee3',
      email: 'employee3@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Anjali Desai',
      role: 'employee',
      team: 'Team A',
      phone: '9876500003',
    },
    {
      username: 'employee4',
      email: 'employee4@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Vikram Joshi',
      role: 'employee',
      team: 'Team B',
      phone: '9876500004',
    },
    {
      username: 'employee5',
      email: 'employee5@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Kavita Patel',
      role: 'employee',
      team: 'Team B',
      phone: '9876500005',
    },
    {
      username: 'employee6',
      email: 'employee6@paruluniversity.ac.in',
      password: '123456',
      full_name: 'Siddharth Nair',
      role: 'employee',
      team: 'Team B',
      phone: '9876500006',
    },
  ];

  console.log('\n--- 1. Creating Supabase Auth Users and Profiles ---');
  const userMap = new Map<string, string>(); // username -> auth.id

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existingUsers = listData?.users || [];

  for (const u of usersToCreate) {
    const existing = existingUsers.find((eu) => eu.email === u.email);

    let authId: string;
    if (existing) {
      authId = existing.id;
      console.log(`ℹ️ Auth user ${u.username} already exists (ID: ${authId})`);
    } else {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
        user_metadata: {
          username: u.username,
          full_name: u.full_name,
          role: u.role,
        },
      });

      if (createError) {
        console.error(`❌ Failed to create auth user ${u.username}:`, createError.message);
        continue;
      }
      authId = newUser.user.id;
      console.log(`✓ Created auth user ${u.username} (ID: ${authId})`);
    }

    userMap.set(u.username, authId);

    // Upsert into public.profiles
    const { error: profileError } = await supabase.from('profiles').upsert({
      id: authId,
      full_name: u.full_name,
      username: u.username,
      email: u.email,
      role: u.role,
      team: u.team,
      phone: u.phone,
      is_active: true,
    });

    if (profileError) {
      console.error(`❌ Error upserting profile for ${u.username}:`, profileError.message);
    } else {
      console.log(`✓ Profile synchronized for ${u.username}`);
    }
  }

  // 2. Generate and Insert ~120 Realistic Indian Leads across 30 days
  console.log('\n--- 2. Seeding Leads, Daily Reports, and Follow-ups ---');

  const courses = [
    'B.Tech Computer Science & Engg',
    'B.Tech Artificial Intelligence',
    'MBA Dual Specialization',
    'BBA Honours',
    'B.Des Fashion & Product Design',
    'MCA Cloud Computing',
    'B.Pharm Pharmaceutical Tech',
    'B.Sc Nursing',
    'BPT Physiotherapy',
    'LLB Law Honours',
  ];

  const firstNames = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
    'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Kabir', 'Rohan', 'Tanmay', 'Kunal',
    'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Isha', 'Navya', 'Riya'
  ];

  const lastNames = [
    'Patel', 'Shah', 'Mehta', 'Desai', 'Sharma', 'Verma', 'Gupta', 'Joshi',
    'Chauhan', 'Pandey', 'Nair', 'Reddy', 'Iyer', 'Bhatt', 'Mishra', 'Yadav'
  ];

  const statuses = [
    'New', 'Interested', 'Follow Up', 'Not Interested', 'Admission Done', 'Wrong Number'
  ];

  const employees = usersToCreate.filter((u) => u.role === 'employee');
  const today = new Date();

  let leadCount = 0;
  const leadsToInsert: any[] = [];
  const dailyReportsMap = new Map<string, number>();

  for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
    const targetDate = new Date(today);
    targetDate.setDate(targetDate.getDate() - dayOffset);
    const dateStr = targetDate.toISOString().split('T')[0];

    const reportingEmployees = employees.slice(0, (dayOffset % 3) + 2);

    for (const emp of reportingEmployees) {
      const authId = userMap.get(emp.username);
      if (!authId) continue;

      if (dayOffset === 0 && (emp.username === 'employee4' || emp.username === 'employee5' || emp.username === 'employee6')) {
        continue;
      }

      const numLeads = 2 + (leadCount % 3);
      for (let k = 0; k < numLeads; k++) {
        leadCount++;
        const fn = firstNames[(leadCount + k) % firstNames.length];
        const ln = lastNames[(leadCount * 2 + k) % lastNames.length];
        const status = statuses[(leadCount + k) % statuses.length];
        const leadType = (leadCount + k) % 2 === 0 ? 'online' : 'offline';
        const course = courses[(leadCount + k) % courses.length];
        const mobilePrefix = ['98', '99', '87', '76', '91', '81', '70'][(leadCount + k) % 7];
        const mobile = `${mobilePrefix}${String(10000000 + leadCount * 67).slice(-8)}`;

        let followUpDate: string | null = null;
        if (status === 'Follow Up' || status === 'Interested') {
          const fuDate = new Date(today);
          if (k % 3 === 0) {
            fuDate.setDate(fuDate.getDate() - (1 + (k % 3)));
          } else if (k % 3 === 1) {
            fuDate.setDate(fuDate.getDate());
          } else {
            fuDate.setDate(fuDate.getDate() + 2 + (k % 4));
          }
          followUpDate = fuDate.toISOString().split('T')[0];
        }

        leadsToInsert.push({
          employee_id: authId,
          report_date: dateStr,
          lead_name: `${fn} ${ln}`,
          mobile,
          lead_type: leadType,
          course,
          status,
          follow_up_date: followUpDate,
          remarks: `Prospective candidate for 2026-27 admission. Direct inquiry #${leadCount}`,
          created_at: new Date(targetDate.getTime() + k * 1800000).toISOString(),
        });

        const repKey = `${authId}_${dateStr}`;
        dailyReportsMap.set(repKey, (dailyReportsMap.get(repKey) || 0) + 1);
      }
    }
  }

  // Insert leads in batches
  console.log(`Inserting ${leadsToInsert.length} leads into Supabase...`);
  const chunkSize = 50;
  for (let i = 0; i < leadsToInsert.length; i += chunkSize) {
    const chunk = leadsToInsert.slice(i, i + chunkSize);
    const { error: leadsError } = await supabase.from('leads').insert(chunk);
    if (leadsError) {
      console.error(`❌ Error inserting leads chunk ${i}:`, leadsError.message);
    }
  }
  console.log(`✓ Inserted leads successfully!`);

  // Insert daily_reports
  console.log('Inserting daily_reports...');
  const reportsToInsert: any[] = [];
  for (const [key, count] of dailyReportsMap.entries()) {
    const [employee_id, report_date] = key.split('_');
    reportsToInsert.push({
      employee_id,
      report_date,
      lead_count: count,
      submitted_at: `${report_date}T18:00:00Z`,
    });
  }

  const { error: reportsError } = await supabase.from('daily_reports').upsert(reportsToInsert, {
    onConflict: 'employee_id,report_date',
  });
  if (reportsError) {
    console.error('❌ Error inserting daily_reports:', reportsError.message);
  } else {
    console.log(`✓ Inserted ${reportsToInsert.length} daily_reports successfully!`);
  }

  // Insert Notifications
  console.log('Inserting notifications...');
  const managerId = userMap.get('manager');
  const emp1Id = userMap.get('employee1');

  const notificationsToInsert = [
    ...(managerId ? [{
      user_id: managerId,
      title: 'Daily Compliance Reminder',
      body: '3 counsellors have not yet submitted their daily report for today.',
      link: '/dashboard',
      is_read: false,
    }] : []),
    ...(emp1Id ? [{
      user_id: emp1Id,
      title: 'Follow-up Due Today',
      body: 'You have 4 candidate follow-up calls scheduled for today.',
      link: '/follow-ups',
      is_read: false,
    }, {
      user_id: emp1Id,
      title: 'Overdue Follow-up Alert',
      body: 'Candidate Aarav Patel has an overdue follow-up from yesterday.',
      link: '/follow-ups',
      is_read: false,
    }] : [])
  ];

  if (notificationsToInsert.length > 0) {
    const { error: notifError } = await supabase.from('notifications').insert(notificationsToInsert);
    if (notifError) {
      console.error('❌ Error inserting notifications:', notifError.message);
    } else {
      console.log(`✓ Inserted demo notifications!`);
    }
  }

  console.log('\n🎉 Fresh Supabase Database Seeding Completed Successfully!');
  console.log('You can now log in with:');
  console.log('  Manager:   manager   / admin123');
  console.log('  Team Lead: teamlead1 / lead123');
  console.log('  Employee:  employee1 / 123456');
}

seedSupabase().catch((e) => {
  console.error('❌ Seeding failed:', e);
});
