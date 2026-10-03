// Security Verification Script for Parul LeadDesk
// Verifies Section 56 Critical Security Requirements

async function runSecurityTests() {
  console.log('🔒 Starting Critical Security Verification Tests...\n');
  const baseUrl = 'http://localhost:5000/api';

  // 1. Login as Employee 1 (Pooja Sharma)
  console.log('Step 1: Logging in as employee1...');
  const resEmp1 = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'employee1', password: '1234' }),
  });
  const dataEmp1 = await resEmp1.json();
  if (!dataEmp1.success || !dataEmp1.token) {
    throw new Error('Failed to login as employee1: ' + JSON.stringify(dataEmp1));
  }
  const token1 = dataEmp1.token;
  const user1 = dataEmp1.user;
  console.log(`✓ Logged in as ${user1.username} (ID: ${user1.id}, Role: ${user1.role})`);

  // 2. Login as Employee 2 (Rahul Verma)
  console.log('\nStep 2: Logging in as employee2...');
  const resEmp2 = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'employee2', password: '1234' }),
  });
  const dataEmp2 = await resEmp2.json();
  const token2 = dataEmp2.token;
  const user2 = dataEmp2.user;
  console.log(`✓ Logged in as ${user2.username} (ID: ${user2.id}, Role: ${user2.role})`);

  // 3. Employee 2 creates a lead
  console.log('\nStep 3: Employee 2 creates a lead...');
  const resCreate = await fetch(`${baseUrl}/leads/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token2}`,
    },
    body: JSON.stringify({
      report_date: new Date().toISOString().split('T')[0],
      leads: [
        {
          lead_name: 'Confidential Lead of Emp2',
          mobile: '9876543210',
          lead_type: 'online',
          course: 'B.Tech Computer Science & Engg',
          status: 'New',
          remarks: 'Private notes for employee 2 only',
        },
      ],
    }),
  });
  const createResult = await resCreate.json();
  if (!createResult.success) {
    throw new Error('Failed to create lead for emp2: ' + JSON.stringify(createResult));
  }
  const lead2Id = createResult.data[0].id;
  console.log(`✓ Employee 2 created lead ID: ${lead2Id}`);

  // 4. Employee 1 queries GET /api/leads (attempting to see all leads or passing employee_id of employee 2)
  console.log('\nStep 4: Employee 1 attempts to query leads with manipulated employee_id parameter...');
  const resGetLeadsTampered = await fetch(`${baseUrl}/leads?employee_id=${user2.id}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const dataLeads = await resGetLeadsTampered.json();
  const returnedLeads = dataLeads.data;
  
  // Verify that EVERY single lead belongs to user1, NOT user2!
  const alienLeads = returnedLeads.filter((l) => l.employee_id !== user1.id);
  if (alienLeads.length > 0) {
    throw new Error(`CRITICAL FAILURE: Employee 1 received leads from another user! Count: ${alienLeads.length}`);
  }
  console.log(`✓ PASS: Employee 1 received ${returnedLeads.length} leads; ALL belong to Employee 1. Manipulated employee_id was safely ignored.`);

  // 5. Employee 1 attempts direct GET /api/leads/:id on Employee 2's lead
  console.log(`\nStep 5: Employee 1 attempts direct GET /api/leads/${lead2Id} on Employee 2's private lead...`);
  const resDirectTamper = await fetch(`${baseUrl}/leads/${lead2Id}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  console.log(`Response status code: ${resDirectTamper.status}`);
  const directData = await resDirectTamper.json();
  if (resDirectTamper.status === 403 || resDirectTamper.status === 404) {
    console.log(`✓ PASS: Server correctly rejected unauthorized lead retrieval with status ${resDirectTamper.status} (${directData.message})`);
  } else {
    throw new Error(`CRITICAL FAILURE: Expected 403/404 but got ${resDirectTamper.status}: ${JSON.stringify(directData)}`);
  }

  // 6. Employee 1 attempts to create a lead spoofing employee_id of employee 2
  console.log('\nStep 6: Employee 1 attempts to submit a lead while spoofing employee_id...');
  const resSpoofedCreate = await fetch(`${baseUrl}/leads/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token1}`,
    },
    body: JSON.stringify({
      employee_id: user2.id, // spoof attempt!
      report_date: new Date().toISOString().split('T')[0],
      leads: [
        {
          lead_name: 'Spoofed Lead Attempt',
          mobile: '9812345678',
          lead_type: 'offline',
          course: 'MBA Dual Specialization',
          status: 'Interested',
        },
      ],
    }),
  });
  const spoofedData = await resSpoofedCreate.json();
  const createdLead = spoofedData.data[0];
  if (createdLead.employee_id !== user1.id) {
    throw new Error(`CRITICAL FAILURE: Server accepted spoofed employee_id! Lead assigned to ${createdLead.employee_id}`);
  }
  console.log(`✓ PASS: Server ignored spoofed employee_id and enforced actual authenticated user ID (${createdLead.employee_id})`);

  // 7. Test Export Isolation
  console.log('\nStep 7: Testing CSV Export Isolation for Employee 1...');
  const resExport = await fetch(`${baseUrl}/leads/export?employee_id=${user2.id}`, {
    headers: { Authorization: `Bearer ${token1}` },
  });
  const csvText = await resExport.text();
  if (csvText.includes('Confidential Lead of Emp2')) {
    throw new Error('CRITICAL FAILURE: Export CSV leaked Employee 2 lead to Employee 1!');
  }
  console.log('✓ PASS: Export CSV strictly isolated to Employee 1 leads only.');

  console.log('\n🎉 ALL CRITICAL SECURITY TESTS PASSED SUCCESSFULLY! Employee isolation is 100% enforced.');
}

runSecurityTests().catch((err) => {
  console.error('\n❌ Security test failed:', err);
  process.exit(1);
});
