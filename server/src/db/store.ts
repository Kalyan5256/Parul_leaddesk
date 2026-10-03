import { UserProfile, Lead, DailyReport, FollowUp, AppNotification, LeadStatus, LeadType, UserRole } from '../types/index.js';
import bcrypt from 'bcryptjs';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase.js';

interface StoredUser extends UserProfile {
  password_hash: string;
}

class DatabaseStore {
  private users: StoredUser[] = [];
  private leads: Lead[] = [];
  private dailyReports: DailyReport[] = [];
  private followUps: FollowUp[] = [];
  private notifications: AppNotification[] = [];
  private initialized = false;

  constructor() {
    this.initSeedData();
  }

  private async initSeedData() {
    if (this.initialized) return;

    // 1. Create Demo Users
    const passwordSalt = await bcrypt.genSalt(10);
    const hashManager = await bcrypt.hash('admin123', passwordSalt);
    const hashLead = await bcrypt.hash('lead123', passwordSalt);
    const hashEmployee = await bcrypt.hash('1234', passwordSalt);

    const baseUsers: StoredUser[] = [
      {
        id: '11111111-0000-0000-0000-000000000001',
        full_name: 'Dr. Rajesh Parikh (Manager)',
        username: 'manager',
        email: 'manager@paruluniversity.ac.in',
        role: 'manager',
        team: null,
        phone: '9825012345',
        is_active: true,
        created_at: new Date(Date.now() - 60 * 86400000).toISOString(),
        password_hash: hashManager,
      },
      {
        id: '22222222-0000-0000-0000-000000000001',
        full_name: 'Sneha Dave (Team Lead A)',
        username: 'teamlead1',
        email: 'teamlead1@paruluniversity.ac.in',
        role: 'team_lead',
        team: 'Team A',
        phone: '9825023456',
        is_active: true,
        created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
        password_hash: hashLead,
      },
      {
        id: '22222222-0000-0000-0000-000000000002',
        full_name: 'Amit Trivedi (Team Lead B)',
        username: 'teamlead2',
        email: 'teamlead2@paruluniversity.ac.in',
        role: 'team_lead',
        team: 'Team B',
        phone: '9825034567',
        is_active: true,
        created_at: new Date(Date.now() - 50 * 86400000).toISOString(),
        password_hash: hashLead,
      },
      // Team A employees
      {
        id: '33333333-0000-0000-0000-000000000001',
        full_name: 'Pooja Sharma',
        username: 'employee1',
        email: 'pooja.s@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team A',
        phone: '9876500001',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
      {
        id: '33333333-0000-0000-0000-000000000002',
        full_name: 'Rahul Verma',
        username: 'employee2',
        email: 'rahul.v@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team A',
        phone: '9876500002',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
      {
        id: '33333333-0000-0000-0000-000000000003',
        full_name: 'Anjali Desai',
        username: 'employee3',
        email: 'anjali.d@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team A',
        phone: '9876500003',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
      // Team B employees
      {
        id: '33333333-0000-0000-0000-000000000004',
        full_name: 'Vikram Joshi',
        username: 'employee4',
        email: 'vikram.j@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team B',
        phone: '9876500004',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
      {
        id: '33333333-0000-0000-0000-000000000005',
        full_name: 'Kavita Patel',
        username: 'employee5',
        email: 'kavita.p@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team B',
        phone: '9876500005',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
      {
        id: '33333333-0000-0000-0000-000000000006',
        full_name: 'Siddharth Nair',
        username: 'employee6',
        email: 'siddharth.n@paruluniversity.ac.in',
        role: 'employee',
        team: 'Team B',
        phone: '9876500006',
        is_active: true,
        created_at: new Date(Date.now() - 40 * 86400000).toISOString(),
        password_hash: hashEmployee,
      },
    ];

    this.users = baseUsers;

    // 2. Generate ~120 realistic Indian leads across 30 days
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

    const indianFirstNames = [
      'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Ayaan',
      'Krishna', 'Ishaan', 'Shaurya', 'Dhruv', 'Kabir', 'Rohan', 'Tanmay', 'Kunal',
      'Diya', 'Saanvi', 'Ananya', 'Aadhya', 'Pari', 'Isha', 'Navya', 'Riya',
      'Myra', 'Anika', 'Meera', 'Sneha', 'Tanvi', 'Shreya', 'Prisha', 'Khushi'
    ];

    const indianLastNames = [
      'Patel', 'Shah', 'Mehta', 'Desai', 'Sharma', 'Verma', 'Gupta', 'Joshi',
      'Chauhan', 'Pandey', 'Nair', 'Reddy', 'Iyer', 'Bhatt', 'Mishra', 'Yadav',
      'Solanki', 'Rathod', 'Panchal', 'Vyas', 'Soni', 'Thakur', 'Gowda', 'Menon'
    ];

    const statuses: LeadStatus[] = [
      'New', 'Interested', 'Follow Up', 'Not Interested', 'Admission Done', 'Wrong Number'
    ];

    const employees = baseUsers.filter((u) => u.role === 'employee');
    const today = new Date(); // Oct 3 2026

    let leadIndex = 1;
    // Generate across past 30 days
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() - dayOffset);
      const dateStr = targetDate.toISOString().split('T')[0];

      // Each day, 2 to 4 employees submitted reports
      const reportingEmployees = employees.slice(0, (dayOffset % 4) + 2);

      for (const emp of reportingEmployees) {
        // Today, only some submitted so "Not Submitted Today" panel has entries!
        if (dayOffset === 0 && (emp.username === 'employee3' || emp.username === 'employee6')) {
          // Employee 3 & 6 did NOT submit today yet!
          continue;
        }

        const leadsForDayCount = 2 + ((dayOffset + emp.username.charCodeAt(8)) % 3); // 2 to 4 leads
        const empLeads: Lead[] = [];

        for (let k = 0; k < leadsForDayCount; k++) {
          const fn = indianFirstNames[(leadIndex + k) % indianFirstNames.length];
          const ln = indianLastNames[(leadIndex * 3 + k) % indianLastNames.length];
          const status = statuses[(leadIndex + k * 2) % statuses.length];
          const leadType: LeadType = (leadIndex + k) % 2 === 0 ? 'online' : 'offline';
          const course = courses[(leadIndex + k) % courses.length];

          // 10-digit Indian mobile starting with 9, 8, 7, or 6
          const mobilePrefix = ['98', '99', '87', '76', '91', '81', '70'][(leadIndex + k) % 7];
          const mobile = `${mobilePrefix}${String(10000000 + leadIndex * 47).slice(-8)}`;

          // Follow-up dates:
          let followUpDate: string | null = null;
          if (status === 'Follow Up' || status === 'Interested') {
            const fuDate = new Date(today);
            if (k % 3 === 0) {
              // Past overdue
              fuDate.setDate(fuDate.getDate() - (1 + (k % 4)));
            } else if (k % 3 === 1) {
              // Today
              fuDate.setDate(fuDate.getDate());
            } else {
              // Upcoming future
              fuDate.setDate(fuDate.getDate() + 2 + (k % 5));
            }
            followUpDate = fuDate.toISOString().split('T')[0];
          }

          const leadId = `lead-${String(leadIndex).padStart(5, '0')}`;
          const leadObj: Lead = {
            id: leadId,
            employee_id: emp.id,
            employee_name: emp.full_name,
            employee_team: emp.team || '',
            report_date: dateStr,
            lead_name: `${fn} ${ln}`,
            mobile,
            lead_type: leadType,
            course,
            status,
            follow_up_date: followUpDate,
            remarks: `Enquired for 2026-27 session. Preferred batch: morning. Seed record #${leadIndex}`,
            created_at: new Date(targetDate.getTime() + k * 1800000).toISOString(),
            updated_at: new Date(targetDate.getTime() + k * 1800000).toISOString(),
          };

          empLeads.push(leadObj);
          this.leads.push(leadObj);

          // If follow up date set, generate history
          if (followUpDate) {
            this.followUps.push({
              id: `fu-${leadIndex}`,
              lead_id: leadId,
              employee_id: emp.id,
              employee_name: emp.full_name,
              lead_name: leadObj.lead_name,
              lead_mobile: leadObj.mobile,
              follow_up_date: followUpDate,
              status: leadObj.status,
              note: `Contacted candidate. Discussed eligibility criteria and scholarship details.`,
              created_at: new Date(targetDate.getTime() + k * 1800000 + 600000).toISOString(),
            });
          }

          leadIndex++;
        }

        // Daily Report record
        this.dailyReports.push({
          id: `rep-${emp.id}-${dateStr}`,
          employee_id: emp.id,
          report_date: dateStr,
          lead_count: empLeads.length,
          submitted_at: new Date(targetDate.getTime() + 8 * 3600000).toISOString(),
        });
      }
    }

    // 3. Demo notifications
    this.notifications.push(
      {
        id: 'notif-1',
        user_id: '33333333-0000-0000-0000-000000000001', // Pooja
        title: 'Follow-up Due Today',
        body: 'You have 3 candidate follow-ups scheduled for counselling today.',
        link: '/follow-ups',
        is_read: false,
        created_at: new Date().toISOString(),
      },
      {
        id: 'notif-2',
        user_id: '33333333-0000-0000-0000-000000000001',
        title: 'Overdue Follow-up Alert',
        body: 'Lead Aarav Patel has an overdue follow-up from yesterday.',
        link: '/follow-ups',
        is_read: false,
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 'notif-3',
        user_id: '11111111-0000-0000-0000-000000000001', // Manager
        title: 'Daily Reporting Reminder',
        body: '2 counsellors have not yet submitted their daily report for today.',
        link: '/dashboard',
        is_read: false,
        created_at: new Date().toISOString(),
      }
    );

    this.initialized = true;
    console.log(`✓ Seed data ready: ${this.users.length} users, ${this.leads.length} leads across 30 days, ${this.dailyReports.length} daily reports.`);
  }

  // --- USER METHODS ---
  async getUserByUsernameOrEmail(identifier: string): Promise<StoredUser | null> {
    const clean = identifier.trim().toLowerCase();
    const user = this.users.find(
      (u) => u.username.toLowerCase() === clean || u.email.toLowerCase() === clean
    );
    return user || null;
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    const user = this.users.find((u) => u.id === id);
    if (!user) return null;
    const { password_hash, ...profile } = user;
    return profile;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    return this.users.map(({ password_hash, ...profile }) => profile);
  }

  async createUser(data: {
    full_name: string;
    username: string;
    email: string;
    role: UserRole;
    team?: string | null;
    phone?: string | null;
    password?: string;
  }): Promise<UserProfile> {
    const id = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(data.password || '1234', salt);

    const newUser: StoredUser = {
      id,
      full_name: data.full_name,
      username: data.username,
      email: data.email,
      role: data.role,
      team: data.team || null,
      phone: data.phone || null,
      is_active: true,
      created_at: new Date().toISOString(),
      password_hash,
    };

    this.users.push(newUser);
    const { password_hash: _, ...profile } = newUser;
    return profile;
  }

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...updates };
    const { password_hash, ...profile } = this.users[index];
    return profile;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<UserProfile | null> {
    return this.updateUser(id, { is_active: isActive });
  }

  // --- LEADS METHODS ---
  async getLeads(filters: {
    employee_id?: string;
    team?: string;
    status?: string;
    lead_type?: string;
    course?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<{ leads: Lead[]; total: number }> {
    let result = [...this.leads];

    // Filter by employee
    if (filters.employee_id) {
      result = result.filter((l) => l.employee_id === filters.employee_id);
    }

    // Filter by team
    if (filters.team) {
      result = result.filter((l) => l.employee_team === filters.team);
    }

    // Filter by status
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter((l) => l.status === filters.status);
    }

    // Filter by lead type
    if (filters.lead_type && filters.lead_type !== 'ALL') {
      result = result.filter((l) => l.lead_type.toLowerCase() === filters.lead_type?.toLowerCase());
    }

    // Filter by course
    if (filters.course && filters.course !== 'ALL') {
      result = result.filter((l) => l.course === filters.course);
    }

    // Filter by date range
    if (filters.startDate) {
      result = result.filter((l) => l.report_date >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter((l) => l.report_date <= filters.endDate!);
    }

    // Search by student name or mobile
    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (l) => l.lead_name.toLowerCase().includes(q) || l.mobile.includes(q)
      );
    }

    // Sorting
    const sortField = filters.sortBy || 'created_at';
    const isDesc = (filters.sortOrder || 'desc') === 'desc';
    result.sort((a, b) => {
      const valA = (a as any)[sortField] || '';
      const valB = (b as any)[sortField] || '';
      if (valA < valB) return isDesc ? 1 : -1;
      if (valA > valB) return isDesc ? -1 : 1;
      return 0;
    });

    const total = result.length;
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const startIndex = (page - 1) * limit;
    const paginated = result.slice(startIndex, startIndex + limit);

    return { leads: paginated, total };
  }

  async getLeadById(id: string): Promise<Lead | null> {
    return this.leads.find((l) => l.id === id) || null;
  }

  async checkDuplicateMobiles(mobiles: string[]): Promise<string[]> {
    const existing = new Set(this.leads.map((l) => l.mobile));
    const duplicates: string[] = [];
    for (const m of mobiles) {
      if (existing.has(m) && !duplicates.includes(m)) {
        duplicates.push(m);
      }
    }
    return duplicates;
  }

  async submitBulkLeads(
    employee_id: string,
    report_date: string,
    rawLeads: Array<{
      lead_name: string;
      mobile: string;
      lead_type: LeadType;
      course: string;
      status: LeadStatus;
      follow_up_date?: string | null;
      remarks?: string | null;
    }>
  ): Promise<{ insertedCount: number; leads: Lead[]; dailyReport: DailyReport }> {
    const emp = await this.getUserById(employee_id);
    if (!emp) throw new Error('Employee not found');

    const createdTime = new Date().toISOString();
    const newLeads: Lead[] = [];

    for (let i = 0; i < rawLeads.length; i++) {
      const item = rawLeads[i];
      const leadId = `lead-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      const lead: Lead = {
        id: leadId,
        employee_id,
        employee_name: emp.full_name,
        employee_team: emp.team || '',
        report_date,
        lead_name: item.lead_name,
        mobile: item.mobile,
        lead_type: item.lead_type,
        course: item.course,
        status: item.status,
        follow_up_date: item.follow_up_date || null,
        remarks: item.remarks || null,
        created_at: createdTime,
        updated_at: createdTime,
      };

      this.leads.unshift(lead);
      newLeads.push(lead);

      // Create initial follow_up record if follow_up_date is set
      if (item.follow_up_date) {
        this.followUps.unshift({
          id: `fu-${Date.now()}-${i}`,
          lead_id: leadId,
          employee_id,
          employee_name: emp.full_name,
          lead_name: item.lead_name,
          lead_mobile: item.mobile,
          follow_up_date: item.follow_up_date,
          status: item.status,
          note: item.remarks || 'Initial follow up scheduled during daily report submission',
          created_at: createdTime,
        });
      }
    }

    // Upsert daily report: Section 11 & 25
    // "If an employee submits another report on the same date: DO NOT overwrite. ADD the new leads. The daily count must reflect the actual number of leads."
    const allEmpLeadsForDate = this.leads.filter(
      (l) => l.employee_id === employee_id && l.report_date === report_date
    );
    const actualLeadCount = allEmpLeadsForDate.length;

    let existingReport = this.dailyReports.find(
      (r) => r.employee_id === employee_id && r.report_date === report_date
    );

    if (existingReport) {
      existingReport.lead_count = actualLeadCount;
      existingReport.submitted_at = createdTime;
    } else {
      existingReport = {
        id: `rep-${employee_id}-${report_date}`,
        employee_id,
        report_date,
        lead_count: actualLeadCount,
        submitted_at: createdTime,
      };
      this.dailyReports.unshift(existingReport);
    }

    return {
      insertedCount: newLeads.length,
      leads: newLeads,
      dailyReport: existingReport,
    };
  }

  async updateLead(
    id: string,
    updates: Partial<Lead>,
    modifierId: string,
    modifierRole: UserRole
  ): Promise<Lead | null> {
    const lead = this.leads.find((l) => l.id === id);
    if (!lead) return null;

    // Check 24-hour edit rule for employees: Section 50
    if (modifierRole === 'employee') {
      if (lead.employee_id !== modifierId) {
        throw new Error('Unauthorized to modify another employee lead');
      }
      const createdTime = new Date(lead.created_at).getTime();
      const elapsedHours = (Date.now() - createdTime) / (1000 * 60 * 60);
      if (elapsedHours > 24) {
        throw new Error('Employees can edit their leads only within 24 hours of submission');
      }
    }

    const updatedLead: Lead = {
      ...lead,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const index = this.leads.findIndex((l) => l.id === id);
    this.leads[index] = updatedLead;

    return updatedLead;
  }

  async deleteLead(id: string): Promise<boolean> {
    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) return false;
    this.leads.splice(index, 1);
    this.followUps = this.followUps.filter((f) => f.lead_id !== id);
    return true;
  }

  async assignLeads(leadIds: string[], targetEmployeeId: string): Promise<number> {
    const targetEmp = await this.getUserById(targetEmployeeId);
    if (!targetEmp) throw new Error('Target employee not found');

    let count = 0;
    const now = new Date().toISOString();
    for (const id of leadIds) {
      const lead = this.leads.find((l) => l.id === id);
      if (lead) {
        lead.employee_id = targetEmployeeId;
        lead.employee_name = targetEmp.full_name;
        lead.employee_team = targetEmp.team || '';
        lead.updated_at = now;
        count++;

        // Add notification for the assigned employee
        this.notifications.unshift({
          id: `notif-assign-${Date.now()}-${count}`,
          user_id: targetEmployeeId,
          title: 'New Lead Assigned',
          body: `Lead ${lead.lead_name} (${lead.course}) has been assigned to you.`,
          link: '/my-leads',
          is_read: false,
          created_at: now,
        });
      }
    }
    return count;
  }

  // --- FOLLOW UPS METHODS ---
  async getFollowUps(filters: {
    employee_id?: string;
    team?: string;
    group?: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'ALL';
  }): Promise<FollowUp[]> {
    let result = [...this.followUps];
    const todayStr = new Date().toISOString().split('T')[0];

    if (filters.employee_id) {
      result = result.filter((f) => f.employee_id === filters.employee_id);
    }

    if (filters.team) {
      const teamUserIds = new Set(
        this.users.filter((u) => u.team === filters.team).map((u) => u.id)
      );
      result = result.filter((f) => teamUserIds.has(f.employee_id));
    }

    if (filters.group === 'OVERDUE') {
      result = result.filter(
        (f) => f.follow_up_date < todayStr && f.status !== 'Admission Done' && f.status !== 'Not Interested'
      );
    } else if (filters.group === 'TODAY') {
      result = result.filter((f) => f.follow_up_date === todayStr);
    } else if (filters.group === 'UPCOMING') {
      result = result.filter((f) => f.follow_up_date > todayStr);
    } else if (filters.group === 'COMPLETED') {
      result = result.filter(
        (f) => f.status === 'Admission Done' || f.status === 'Not Interested'
      );
    }

    return result.sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date));
  }

  async addFollowUp(data: {
    lead_id: string;
    employee_id: string;
    follow_up_date: string;
    status: string;
    note?: string | null;
  }): Promise<FollowUp> {
    const lead = await this.getLeadById(data.lead_id);
    if (!lead) throw new Error('Lead not found');

    const emp = await this.getUserById(data.employee_id);
    const now = new Date().toISOString();

    const fu: FollowUp = {
      id: `fu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lead_id: data.lead_id,
      employee_id: data.employee_id,
      employee_name: emp?.full_name || 'Staff',
      lead_name: lead.lead_name,
      lead_mobile: lead.mobile,
      follow_up_date: data.follow_up_date,
      status: data.status,
      note: data.note || null,
      created_at: now,
    };

    this.followUps.unshift(fu);

    // Update lead follow_up_date and status
    lead.follow_up_date = data.follow_up_date;
    if (data.status) {
      lead.status = data.status as LeadStatus;
    }
    lead.updated_at = now;

    return fu;
  }

  async updateFollowUp(
    id: string,
    updates: Partial<FollowUp>
  ): Promise<FollowUp | null> {
    const fu = this.followUps.find((f) => f.id === id);
    if (!fu) return null;

    Object.assign(fu, updates);
    // Also sync back to lead
    const lead = this.leads.find((l) => l.id === fu.lead_id);
    if (lead) {
      if (updates.follow_up_date) lead.follow_up_date = updates.follow_up_date;
      if (updates.status) lead.status = updates.status as LeadStatus;
      lead.updated_at = new Date().toISOString();
    }
    return fu;
  }

  // --- REPORTING & KPI METHODS (Real Database Computations) ---
  async getDailySummary(employee_id: string, date: string): Promise<DailyReport | null> {
    return (
      this.dailyReports.find(
        (r) => r.employee_id === employee_id && r.report_date === date
      ) || null
    );
  }

  async getKPIs(filters?: { employee_id?: string; team?: string; startDate?: string; endDate?: string }) {
    let leads = [...this.leads];
    if (filters?.employee_id) {
      leads = leads.filter((l) => l.employee_id === filters.employee_id);
    }
    if (filters?.team) {
      leads = leads.filter((l) => l.employee_team === filters.team);
    }
    if (filters?.startDate) {
      leads = leads.filter((l) => l.report_date >= filters.startDate!);
    }
    if (filters?.endDate) {
      leads = leads.filter((l) => l.report_date <= filters.endDate!);
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const totalLeads = leads.length;
    const todayLeads = leads.filter((l) => l.report_date === todayStr).length;
    const thisWeekLeads = leads.filter((l) => l.report_date >= sevenDaysAgoStr).length;
    const thisMonthLeads = leads.filter((l) => l.report_date >= thirtyDaysAgoStr).length;

    const interestedCount = leads.filter((l) => l.status === 'Interested').length;
    const admissionDoneCount = leads.filter((l) => l.status === 'Admission Done').length;
    const conversionRate = totalLeads > 0 ? Number(((admissionDoneCount / totalLeads) * 100).toFixed(1)) : 0;

    // Follow-ups
    const followUpsDueToday = leads.filter(
      (l) => l.follow_up_date === todayStr && l.status !== 'Admission Done' && l.status !== 'Not Interested'
    ).length;

    const overdueFollowUps = leads.filter(
      (l) => l.follow_up_date && l.follow_up_date < todayStr && l.status !== 'Admission Done' && l.status !== 'Not Interested'
    ).length;

    // Active employees reporting status today
    const activeEmployees = this.users.filter((u) => u.role === 'employee' && u.is_active);
    const submittedTodayEmployeeIds = new Set(
      this.dailyReports
        .filter((r) => r.report_date === todayStr && r.lead_count > 0)
        .map((r) => r.employee_id)
    );

    const activeEmployeesCount = activeEmployees.length;
    const submittedCount = activeEmployees.filter((e) => submittedTodayEmployeeIds.has(e.id)).length;

    return {
      totalLeads,
      todayLeads,
      thisWeekLeads,
      thisMonthLeads,
      interestedCount,
      admissionDoneCount,
      conversionRate,
      followUpsDueToday,
      overdueFollowUps,
      activeEmployeesCount,
      submittedCount,
      submittedSummary: `${submittedCount} / ${activeEmployeesCount} submitted`,
    };
  }

  async getEmployeeLeaderboard(filters?: { team?: string }) {
    const employees = this.users.filter((u) => u.role === 'employee');
    const todayStr = new Date().toISOString().split('T')[0];
    const sevenDaysAgoStr = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const thirtyDaysAgoStr = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];

    const leaderboard = employees
      .filter((emp) => (!filters?.team || emp.team === filters.team))
      .map((emp) => {
        const empLeads = this.leads.filter((l) => l.employee_id === emp.id);
        const todayLeads = empLeads.filter((l) => l.report_date === todayStr).length;
        const weekLeads = empLeads.filter((l) => l.report_date >= sevenDaysAgoStr).length;
        const monthLeads = empLeads.filter((l) => l.report_date >= thirtyDaysAgoStr).length;
        const interested = empLeads.filter((l) => l.status === 'Interested').length;
        const admissions = empLeads.filter((l) => l.status === 'Admission Done').length;
        const conversionRate = empLeads.length > 0 ? Number(((admissions / empLeads.length) * 100).toFixed(1)) : 0;

        // Last submitted report
        const reports = this.dailyReports
          .filter((r) => r.employee_id === emp.id)
          .sort((a, b) => b.submitted_at.localeCompare(a.submitted_at));
        const lastSubmitted = reports.length > 0 ? reports[0].submitted_at : null;

        return {
          id: emp.id,
          name: emp.full_name,
          username: emp.username,
          team: emp.team || 'Unassigned',
          isActive: emp.is_active,
          totalLeads: empLeads.length,
          today: todayLeads,
          thisWeek: weekLeads,
          thisMonth: monthLeads,
          interested,
          admissions,
          conversionRate,
          lastSubmitted,
        };
      });

    return leaderboard.sort((a, b) => b.totalLeads - a.totalLeads);
  }

  async getNotSubmittedEmployees(dateStr?: string) {
    const targetDate = dateStr || new Date().toISOString().split('T')[0];
    const activeEmployees = this.users.filter((u) => u.role === 'employee' && u.is_active);

    const submittedEmpIds = new Set(
      this.dailyReports
        .filter((r) => r.report_date === targetDate && r.lead_count > 0)
        .map((r) => r.employee_id)
    );

    return activeEmployees
      .filter((e) => !submittedEmpIds.has(e.id))
      .map(({ password_hash, ...profile }) => profile);
  }

  async getTrend(days: number = 30, filters?: { team?: string; employee_id?: string }) {
    const result: Array<{ date: string; displayDate: string; count: number; online: number; offline: number }> = [];
    const today = new Date();

    let filteredLeads = [...this.leads];
    if (filters?.employee_id) {
      filteredLeads = filteredLeads.filter((l) => l.employee_id === filters.employee_id);
    }
    if (filters?.team) {
      filteredLeads = filteredLeads.filter((l) => l.employee_team === filters.team);
    }

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const displayDate = d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

      const dayLeads = filteredLeads.filter((l) => l.report_date === dateStr);
      const online = dayLeads.filter((l) => l.lead_type === 'online').length;
      const offline = dayLeads.filter((l) => l.lead_type === 'offline').length;

      result.push({
        date: dateStr,
        displayDate,
        count: dayLeads.length,
        online,
        offline,
      });
    }

    return result;
  }

  async getTypeSplit(filters?: { team?: string; employee_id?: string }) {
    let leads = [...this.leads];
    if (filters?.employee_id) {
      leads = leads.filter((l) => l.employee_id === filters.employee_id);
    }
    if (filters?.team) {
      leads = leads.filter((l) => l.employee_team === filters.team);
    }

    const online = leads.filter((l) => l.lead_type === 'online').length;
    const offline = leads.filter((l) => l.lead_type === 'offline').length;

    // Status distribution
    const statuses: LeadStatus[] = ['New', 'Interested', 'Follow Up', 'Not Interested', 'Admission Done', 'Wrong Number'];
    const statusDistribution = statuses.map((status) => ({
      name: status,
      value: leads.filter((l) => l.status === status).length,
    }));

    // Online vs Offline by team
    const teamAOnline = leads.filter((l) => l.employee_team === 'Team A' && l.lead_type === 'online').length;
    const teamAOffline = leads.filter((l) => l.employee_team === 'Team A' && l.lead_type === 'offline').length;
    const teamBOnline = leads.filter((l) => l.employee_team === 'Team B' && l.lead_type === 'online').length;
    const teamBOffline = leads.filter((l) => l.employee_team === 'Team B' && l.lead_type === 'offline').length;

    const teamSplit = [
      { team: 'Team A', online: teamAOnline, offline: teamAOffline },
      { team: 'Team B', online: teamBOnline, offline: teamBOffline },
    ];

    return {
      typeSplit: [
        { name: 'Online', value: online },
        { name: 'Offline', value: offline },
      ],
      statusDistribution,
      teamSplit,
    };
  }

  // --- NOTIFICATIONS METHODS ---
  async getNotifications(userId: string): Promise<AppNotification[]> {
    return this.notifications
      .filter((n) => n.user_id === userId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  async markNotificationRead(id: string, userId: string): Promise<boolean> {
    const notif = this.notifications.find((n) => n.id === id && n.user_id === userId);
    if (!notif) return false;
    notif.is_read = true;
    return true;
  }

  async markAllNotificationsRead(userId: string): Promise<number> {
    let count = 0;
    for (const n of this.notifications) {
      if (n.user_id === userId && !n.is_read) {
        n.is_read = true;
        count++;
      }
    }
    return count;
  }
}

export const dbStore = new DatabaseStore();
