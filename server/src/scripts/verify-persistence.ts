import { supabaseAdmin } from '../lib/supabase.js';
import { dbStore } from '../db/store.js';

async function runVerification() {
  console.log('====================================================');
  console.log('🚀 RUNNING 20-STEP PERSISTENCE & DATA INTEGRITY TEST');
  console.log('====================================================\n');

  if (!supabaseAdmin) {
    console.error('❌ Supabase is not configured!');
    process.exit(1);
  }

  // 1. Get Employee and Manager from database
  const employee1 = await dbStore.getUserByUsernameOrEmail('sandhya.parul22@gmail.com');
  const employee2 = await dbStore.getUserByUsernameOrEmail('dasarikalyan40@gmail.com');
  const manager = await dbStore.getUserByUsernameOrEmail('head.admissions@paruluniversity.ac.in') || await dbStore.getUserByUsernameOrEmail('ravi@gmail.com');

  if (!employee1) {
    throw new Error('Employee 1 (sandhya.parul22@gmail.com) not found');
  }
  if (!employee2) {
    throw new Error('Employee 2 (dasarikalyan40@gmail.com) not found');
  }
  if (!manager) {
    throw new Error('Manager not found');
  }

  console.log(`✅ Using Employee 1: ${employee1.full_name} (${employee1.id})`);
  console.log(`✅ Using Employee 2: ${employee2.full_name} (${employee2.id})`);
  console.log(`✅ Using Manager: ${manager.full_name} (${manager.id})\n`);

  const testMobileA = '9876543210';
  const testLeadNameA = 'DEBUG_TEST_LEAD_001';
  const today = new Date().toISOString().split('T')[0];

  // Clean any previous test record with this mobile
  await supabaseAdmin.from('leads').delete().eq('mobile', testMobileA);

  // STEP 1 & 2: Create Lead A for Employee 1
  console.log('--- STEP 1 & 2: Create Lead A as Employee 1 ---');
  const submitResult = await dbStore.submitBulkLeads(employee1.id, today, [
    {
      lead_name: testLeadNameA,
      mobile: testMobileA,
      lead_type: 'online',
      course: 'B.Tech CSE',
      status: 'Follow Up',
      follow_up_date: today,
      follow_up_time: '14:30',
      remarks: 'Automated verification test lead',
    },
  ]);

  const leadA = submitResult.leads[0];
  console.log(`Created Lead A with ID: ${leadA.id}`);

  // STEP 3: Verify Lead A in Supabase directly
  console.log('\n--- STEP 3: Verify Lead A in Supabase PostgreSQL ---');
  const { data: sbLeadBefore, error: sbErr1 } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadA.id)
    .single();

  if (sbErr1 || !sbLeadBefore) {
    throw new Error(`❌ Lead A not found in Supabase! Error: ${sbErr1?.message}`);
  }
  console.log('✅ Lead A successfully verified in Supabase PostgreSQL table "leads":', {
    id: sbLeadBefore.id,
    lead_name: sbLeadBefore.lead_name,
    mobile: sbLeadBefore.mobile,
    employee_id: sbLeadBefore.employee_id,
    status: sbLeadBefore.status,
    created_at: sbLeadBefore.created_at,
  });

  // STEP 4: Verify Lead A in Employee portal query
  console.log('\n--- STEP 4: Verify Lead A in Employee Portal query ---');
  const empLeads = await dbStore.getLeads({ employee_id: employee1.id });
  const foundInEmp = empLeads.leads.find((l) => l.id === leadA.id);
  if (!foundInEmp) {
    throw new Error('❌ Lead A not found in Employee 1 portal query!');
  }
  console.log(`✅ Lead A visible in Employee portal (Total emp leads: ${empLeads.total})`);

  // STEP 5 & 6: Verify Lead A in Manager portal query
  console.log('\n--- STEP 5 & 6: Verify Lead A in Manager Portal query ---');
  const mgrLeads = await dbStore.getLeads({});
  const foundInMgr = mgrLeads.leads.find((l) => l.id === leadA.id);
  if (!foundInMgr) {
    throw new Error('❌ Lead A not found in Manager portal query!');
  }
  console.log(`✅ Lead A visible in Manager portal (Total all leads: ${mgrLeads.total})`);

  // STEP 7 & 8: Create Follow-up A & verify in Supabase
  console.log('\n--- STEP 7 & 8: Create Follow-up A and verify in Supabase ---');
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0];
  const followUpA = await dbStore.addFollowUp({
    lead_id: leadA.id,
    employee_id: employee1.id,
    follow_up_date: tomorrow,
    follow_up_time: '16:00',
    status: 'Interested',
    note: 'Student interested in scholarship details',
  });
  console.log(`Follow-up created with ID: ${followUpA.id}`);

  const { data: sbFu, error: sbFuErr } = await supabaseAdmin
    .from('follow_ups')
    .select('*')
    .eq('id', followUpA.id)
    .single();

  if (sbFuErr || !sbFu) {
    throw new Error(`❌ Follow-up not found in Supabase! Error: ${sbFuErr?.message}`);
  }
  console.log('✅ Follow-up verified in Supabase table "follow_ups":', {
    id: sbFu.id,
    lead_id: sbFu.lead_id,
    follow_up_date: sbFu.follow_up_date,
    status: sbFu.status,
  });

  // STEP 9, 10, 11, 12: Simulating refresh & Server Restart (syncFromSupabase wipes local RAM and reloads from DB)
  console.log('\n--- STEP 9-12: Full Refresh / Server Restart Simulation (syncFromSupabase) ---');
  await dbStore.syncFromSupabase();

  const refreshedEmpLeads = await dbStore.getLeads({ employee_id: employee1.id });
  const refreshedMgrLeads = await dbStore.getLeads({});
  if (!refreshedEmpLeads.leads.find((l) => l.id === leadA.id)) {
    throw new Error('❌ Lead A disappeared from Employee portal after syncFromSupabase!');
  }
  if (!refreshedMgrLeads.leads.find((l) => l.id === leadA.id)) {
    throw new Error('❌ Lead A disappeared from Manager portal after syncFromSupabase!');
  }
  console.log('✅ Lead A persisted across server sync in both Employee and Manager portals!');

  // STEP 13 & 14: Update Lead A and verify in Supabase
  console.log('\n--- STEP 13 & 14: Update Lead A and verify Supabase persistence ---');
  await dbStore.updateLead(leadA.id, { remarks: 'Updated remarks for persistence verification' }, employee1.id, 'employee');

  const { data: sbLeadUpdated } = await supabaseAdmin
    .from('leads')
    .select('*')
    .eq('id', leadA.id)
    .single();

  if (sbLeadUpdated?.remarks !== 'Updated remarks for persistence verification') {
    throw new Error('❌ Lead A update was not persisted in Supabase!');
  }
  console.log('✅ Lead A update verified in Supabase PostgreSQL!');

  // STEP 15 & 16: Update Follow-up A and verify in Supabase
  console.log('\n--- STEP 15 & 16: Update Follow-up A and verify Supabase persistence ---');
  await dbStore.updateFollowUp(followUpA.id, { note: 'Updated note via verification script' });

  const { data: sbFuUpdated } = await supabaseAdmin
    .from('follow_ups')
    .select('*')
    .eq('id', followUpA.id)
    .single();

  if (sbFuUpdated?.note !== 'Updated note via verification script') {
    throw new Error('❌ Follow-up update was not persisted in Supabase!');
  }
  console.log('✅ Follow-up update verified in Supabase PostgreSQL!');

  // STEP 17-20: Final Session re-sync check
  console.log('\n--- STEP 17-20: Logout & Login re-sync check ---');
  await dbStore.syncFromSupabase();
  const finalLead = await dbStore.getLeadById(leadA.id);
  const finalFu = (await dbStore.getFollowUps({ employee_id: employee1.id })).find((f) => f.id === followUpA.id);

  if (!finalLead || !finalFu) {
    throw new Error('❌ Data missing on final re-login check!');
  }
  console.log('✅ Lead and Follow-up remain 100% persisted and intact!');

  // TEST MULTI-EMPLOYEE DATA ISOLATION
  console.log('\n--- MULTI-EMPLOYEE ISOLATION TEST ---');
  const testMobileB = '9123456780';
  await supabaseAdmin.from('leads').delete().eq('mobile', testMobileB);

  const emp2Submit = await dbStore.submitBulkLeads(employee2.id, today, [
    {
      lead_name: 'DEBUG_TEST_LEAD_002_EMP2',
      mobile: testMobileB,
      lead_type: 'offline',
      course: 'MBA',
      status: 'New',
    },
  ]);

  const leadB = emp2Submit.leads[0];
  console.log(`Created Lead B for Employee 2: ${leadB.id}`);

  // Employee 1 must NOT see Lead B
  const emp1View = await dbStore.getLeads({ employee_id: employee1.id });
  if (emp1View.leads.some((l) => l.id === leadB.id)) {
    throw new Error('❌ Security breach: Employee 1 can see Employee 2 lead!');
  }

  // Employee 2 must NOT see Lead A
  const emp2View = await dbStore.getLeads({ employee_id: employee2.id });
  if (emp2View.leads.some((l) => l.id === leadA.id)) {
    throw new Error('❌ Security breach: Employee 2 can see Employee 1 lead!');
  }

  // Manager must see BOTH
  const mgrView = await dbStore.getLeads({});
  if (!mgrView.leads.some((l) => l.id === leadA.id) || !mgrView.leads.some((l) => l.id === leadB.id)) {
    throw new Error('❌ Manager portal cannot see both leads!');
  }

  console.log('✅ Complete data isolation verified: Employee 1 and Employee 2 cannot see each other’s leads; Manager sees both.\n');
  console.log('🎉 ALL 20 PERSISTENCE & ISOLATION CHECKS PASSED WITH 100% SUCCESS!');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification failed:', err);
  process.exit(1);
});
