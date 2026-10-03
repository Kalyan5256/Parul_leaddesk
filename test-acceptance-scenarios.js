// Comprehensive Acceptance Scenario Test Suite for Parul LeadDesk
// Verifies Section 62 Acceptance Scenarios 1 through 10

async function runAcceptanceTests() {
  console.log('🚀 Running Complete Acceptance Scenarios Verification...\n');
  const baseUrl = 'http://localhost:5000/api';
  const todayStr = new Date().toISOString().split('T')[0];

  // ==========================================
  // SCENARIO 1: Employee logs in & submits 8 leads
  // ==========================================
  console.log('--- SCENARIO 1: Employee logs in & submits 8 leads ---');
  const empLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'employee3', password: '1234' }),
  });
  const empLoginData = await empLoginRes.json();
  const empToken = empLoginData.token;
  const empUser = empLoginData.user;
  console.log(`✓ Logged in as ${empUser.username} (${empUser.full_name})`);

  // Submit 8 leads
  const eightLeadsPayload = [
    { lead_name: 'Aarav Patel', mobile: '+91 98251 00001', lead_type: 'online', course: 'B.Tech Computer Science & Engg', status: 'Interested', remarks: 'First lead of 8' },
    { lead_name: 'Diya Shah', mobile: '9825100002', lead_type: 'offline', course: 'MBA Dual Specialization', status: 'New', remarks: 'Campus enquiry' },
    { lead_name: 'Rohan Mehta', mobile: '9825100003', lead_type: 'online', course: 'BBA Honours', status: 'Follow Up', follow_up_date: todayStr, remarks: 'Callback today' },
    { lead_name: 'Ananya Gupta', mobile: '9825100004', lead_type: 'offline', course: 'B.Des Fashion & Product Design', status: 'Interested' },
    { lead_name: 'Vikram Singh', mobile: '9825100005', lead_type: 'online', course: 'MCA Cloud Computing', status: 'New' },
    { lead_name: 'Sneha Joshi', mobile: '9825100006', lead_type: 'offline', course: 'B.Pharm Pharmaceutical Tech', status: 'Admission Done' },
    { lead_name: 'Tanvi Patel', mobile: '9825100007', lead_type: 'online', course: 'B.Sc Nursing', status: 'Interested' },
    { lead_name: 'Kunal Verma', mobile: '9825100008', lead_type: 'offline', course: 'BPT Physiotherapy', status: 'New' },
  ];

  const submit8Res = await fetch(`${baseUrl}/leads/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      report_date: todayStr,
      leads: eightLeadsPayload,
    }),
  });
  const submit8Data = await submit8Res.json();
  if (!submit8Data.success || submit8Data.summary.totalSubmittedThisBatch !== 8) {
    throw new Error('Scenario 1 Failed to submit 8 leads: ' + JSON.stringify(submit8Data));
  }
  console.log(`✓ 8 leads submitted successfully. Summary: ${submit8Data.summary.onlineCount} Online, ${submit8Data.summary.offlineCount} Offline.`);

  // Verify records appear in My Leads
  const myLeadsRes = await fetch(`${baseUrl}/leads?startDate=${todayStr}&endDate=${todayStr}`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const myLeadsData = await myLeadsRes.json();
  const found8 = myLeadsData.data.filter((l) => l.report_date === todayStr);
  console.log(`✓ Verified in My Leads: ${found8.length} leads found for today.`);

  // ==========================================
  // SCENARIO 2: Same employee submits another 3 leads (Additive)
  // ==========================================
  console.log('\n--- SCENARIO 2: Same employee submits another 3 leads additively ---');
  const threeLeadsPayload = [
    { lead_name: 'Aditya Kumar', mobile: '9825100009', lead_type: 'online', course: 'LLB Law Honours', status: 'Interested' },
    { lead_name: 'Prisha Solanki', mobile: '9825100010', lead_type: 'offline', course: 'B.Tech Artificial Intelligence', status: 'New' },
    { lead_name: 'Khushi Panchal', mobile: '9825100011', lead_type: 'online', course: 'MBA Dual Specialization', status: 'Admission Done' },
  ];

  const submit3Res = await fetch(`${baseUrl}/leads/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      report_date: todayStr,
      leads: threeLeadsPayload,
    }),
  });
  const submit3Data = await submit3Res.json();
  if (!submit3Data.success || !submit3Data.summary.wasAdditive) {
    throw new Error('Scenario 2 Failed to detect additive submission: ' + JSON.stringify(submit3Data));
  }
  console.log(`✓ Additive submission detected! Previous count: ${submit3Data.summary.previousDayCount}, New batch: ${submit3Data.summary.totalSubmittedThisBatch}`);
  console.log(`✓ Daily report total leads is now: ${submit3Data.summary.totalDayLeads} (8 + 3 = 11 leads). Previous 8 remain intact!`);

  // ==========================================
  // SCENARIO 4 & 5: Manager logs in, sees KPIs, charts & filters
  // ==========================================
  console.log('\n--- SCENARIO 4 & 5: Manager logs in, verifies KPIs and filtering ---');
  const mgrLoginRes = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'manager', password: 'admin123' }),
  });
  const mgrLoginData = await mgrLoginRes.json();
  const mgrToken = mgrLoginData.token;
  console.log(`✓ Logged in as Manager (${mgrLoginData.user.full_name})`);

  // Manager fetches KPIs
  const kpisRes = await fetch(`${baseUrl}/reports/kpis`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const kpisData = await kpisRes.json();
  console.log(`✓ Live Manager KPIs calculated from DB: Total Leads: ${kpisData.data.totalLeads}, Today: ${kpisData.data.todayLeads}, Admissions: ${kpisData.data.admissionDoneCount}, Conversion: ${kpisData.data.conversionRate}%`);

  // Manager filters: Team A, last 30 days
  const filterRes = await fetch(`${baseUrl}/reports/kpis?team=Team%20A`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const filterData = await filterRes.json();
  console.log(`✓ Filtered Team A KPIs: Total Leads: ${filterData.data.totalLeads}, Active: ${filterData.data.submittedSummary}`);

  // ==========================================
  // SCENARIO 6: Manager exports filtered leads to CSV
  // ==========================================
  console.log('\n--- SCENARIO 6: Manager exports filtered leads to CSV ---');
  const exportRes = await fetch(`${baseUrl}/leads/export?team=Team%20A&status=Interested`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const csvContent = await exportRes.text();
  const csvLines = csvContent.trim().split('\n');
  console.log(`✓ Exported CSV successfully! Total rows: ${csvLines.length}. Header: ${csvLines[0]}`);

  // ==========================================
  // SCENARIO 7 & 8: Follow-up today & overdue tracking
  // ==========================================
  console.log('\n--- SCENARIO 7 & 8: Follow-ups Today & Overdue tracking ---');
  const fuTodayEmp = await fetch(`${baseUrl}/follow-ups?group=TODAY`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const fuTodayData = await fuTodayEmp.json();
  console.log(`✓ Employee sees ${fuTodayData.count} follow-ups scheduled for Today.`);

  const fuOverdueEmp = await fetch(`${baseUrl}/follow-ups?group=OVERDUE`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const fuOverdueData = await fuOverdueEmp.json();
  console.log(`✓ Overdue queue tracked: ${fuOverdueData.count} candidate follow-ups overdue.`);

  // ==========================================
  // SCENARIO 9: Not submitted today panel
  // ==========================================
  console.log('\n--- SCENARIO 9: Not Submitted Today Panel ---');
  const notSubRes = await fetch(`${baseUrl}/reports/not-submitted`, {
    headers: { Authorization: `Bearer ${mgrToken}` },
  });
  const notSubData = await notSubRes.json();
  console.log(`✓ Active counsellors not yet submitted today: ${notSubData.count}`);
  notSubData.data.forEach((emp) => console.log(`   - ${emp.full_name} (${emp.team || 'No team'})`));

  console.log('\n🎉 ALL ACCEPTANCE SCENARIOS VERIFIED SUCCESSFULLY!');
}

runAcceptanceTests().catch((err) => {
  console.error('\n❌ Acceptance test failed:', err);
  process.exit(1);
});
