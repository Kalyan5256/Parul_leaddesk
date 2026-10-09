import {
  UserProfile,
  Lead,
  DailyReport,
  FollowUp,
  AppNotification,
  LeadStatus,
  LeadType,
  UserRole,
  AuditLog,
  PushSubscriptionRecord,
} from '../types/index.js';
import bcrypt from 'bcryptjs';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase.js';

interface StoredUser extends UserProfile {
  password_hash: string;
}

interface PasswordResetToken {
  token: string;
  userId: string;
  email: string;
  expiresAt: number;
}

class DatabaseStore {
  private users: StoredUser[] = [];
  private resetTokens: PasswordResetToken[] = [];
  private leads: Lead[] = [];
  private dailyReports: DailyReport[] = [];
  private followUps: FollowUp[] = [];
  private notifications: AppNotification[] = [];
  private auditLogs: AuditLog[] = [];
  private pushSubscriptions: PushSubscriptionRecord[] = [];
  private initialized = false;


  constructor() {
    this.initSeedData();
  }

  private async initSeedData() {
    if (this.initialized) return;
    this.initialized = true;
    this.users = [];
    this.leads = [];
    this.dailyReports = [];
    this.followUps = [];
    this.notifications = [];
    this.auditLogs = [];
    this.pushSubscriptions = [];
    if (isSupabaseConfigured && supabaseAdmin) {
      await this.syncFromSupabase();
    }
    return;

  }

  async syncFromSupabase(): Promise<void> {
    if (!supabaseAdmin) return;
    try {
      const { data: profiles, error: pErr } = await supabaseAdmin.from('profiles').select('*');
      if (profiles && !pErr) {
        for (const p of profiles) {
          const idx = this.users.findIndex((u) => u.id === p.id || u.email === p.email);
          if (idx === -1) {
            this.users.push({
              id: p.id,
              full_name: p.full_name,
              username: p.username,
              email: p.email,
              role: p.role,
              team: p.team || null,
              phone: p.phone || null,
              is_active: p.is_active ?? true,
              must_change_password: p.must_change_password ?? false,
              password_reset_at: p.password_reset_at || null,
              password_reset_by: p.password_reset_by || null,
              created_at: p.created_at || new Date().toISOString(),
              password_hash: '',
            });
          } else {
            this.users[idx] = { ...this.users[idx], ...p };
          }
        }
      }

      const userMap = new Map(this.users.map((u) => [u.id, u]));

      const { data: leads, error: lErr } = await supabaseAdmin
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (leads && !lErr) {
        this.leads = leads.map((l: any) => {
          const emp = userMap.get(l.employee_id);
          return {
            ...l,
            employee_name: emp?.full_name || l.employee_name || 'Staff',
            employee_team: emp?.team || l.employee_team || '',
          };
        });
      }

      const { data: reports, error: rErr } = await supabaseAdmin.from('daily_reports').select('*');
      if (reports && !rErr) {
        this.dailyReports = reports;
      }

      const { data: followUps, error: fErr } = await supabaseAdmin
        .from('follow_ups')
        .select('*')
        .order('created_at', { ascending: false });

      if (followUps && !fErr) {
        const leadMap = new Map(this.leads.map((l) => [l.id, l]));
        this.followUps = followUps.map((f: any) => {
          const emp = userMap.get(f.employee_id);
          const ld = leadMap.get(f.lead_id);
          return {
            ...f,
            employee_name: emp?.full_name || f.employee_name || 'Staff',
            lead_name: ld?.lead_name || f.lead_name || 'Student',
            lead_mobile: ld?.mobile || f.lead_mobile || '',
            is_active: f.is_active ?? true,
            completed_at: f.completed_at ?? null,
            lead_status: ld?.status,
          };
        });
      }
    } catch (err: any) {
      console.warn('Supabase sync notice:', err.message);
    }
  }

  // --- USER METHODS ---
  async getUserByUsernameOrEmail(identifier: string): Promise<StoredUser | null> {
    const clean = identifier.trim().toLowerCase();
    let user = this.users.find(
      (u) => u.username.toLowerCase() === clean || (u.email && u.email.toLowerCase() === clean)
    );

    if (!user && supabaseAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .or(`username.ilike.${clean},email.ilike.${clean}`)
          .maybeSingle();

        if (profile) {
          const stored: StoredUser = {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            team: profile.team || null,
            phone: profile.phone || null,
            is_active: profile.is_active ?? true,
            must_change_password: profile.must_change_password ?? false,
            password_reset_at: profile.password_reset_at || null,
            password_reset_by: profile.password_reset_by || null,
            created_at: profile.created_at || new Date().toISOString(),
            password_hash: '',
          };
          this.users.push(stored);
          return stored;
        }
      } catch {
        // Not found
      }
    }

    return user || null;
  }

  async getUserById(id: string): Promise<UserProfile | null> {
    let user = this.users.find((u) => u.id === id);
    if (!user && supabaseAdmin) {
      try {
        const { data: profile } = await supabaseAdmin
          .from('profiles')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (profile) {
          user = {
            id: profile.id,
            full_name: profile.full_name,
            username: profile.username,
            email: profile.email,
            role: profile.role,
            team: profile.team || null,
            phone: profile.phone || null,
            is_active: profile.is_active ?? true,
            must_change_password: profile.must_change_password ?? false,
            password_reset_at: profile.password_reset_at || null,
            password_reset_by: profile.password_reset_by || null,
            created_at: profile.created_at || new Date().toISOString(),
            password_hash: '',
          };
          this.users.push(user);
        }
      } catch {
        // Not found
      }
    }
    if (!user) return null;
    const { password_hash, ...profile } = user;
    return profile;
  }

  async getAllUsers(): Promise<UserProfile[]> {
    if (supabaseAdmin) {
      await this.syncFromSupabase();
    }
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
    must_change_password?: boolean;
  }): Promise<UserProfile & { temporaryPassword?: string }> {
    const isEmployee = data.role === 'employee';
    const temporaryPassword =
      data.password || `Welcome@${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const mustChange =
      data.must_change_password !== undefined ? data.must_change_password : isEmployee;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(temporaryPassword, salt);

    let authId = `user-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    // Sync to Supabase Auth & public.profiles
    if (supabaseAdmin && data.email) {
      try {
        const { data: authData, error: authErr } = await supabaseAdmin.auth.admin.createUser({
          email: data.email,
          password: temporaryPassword,
          email_confirm: true,
          user_metadata: {
            username: data.username,
            full_name: data.full_name,
            role: data.role,
          },
        });

        if (authData?.user) {
          authId = authData.user.id;
          await supabaseAdmin.from('profiles').upsert({
            id: authId,
            full_name: data.full_name,
            username: data.username,
            email: data.email,
            role: data.role,
            team: data.team || null,
            phone: data.phone || null,
            is_active: true,
            must_change_password: mustChange,
          });
        } else if (authErr) {
          console.warn('Supabase Auth user creation note:', authErr.message);
          // If the user already exists in Supabase Auth, update their role, credentials and profile
          if (
            authErr.message?.toLowerCase().includes('already') ||
            authErr.message?.toLowerCase().includes('exists')
          ) {
            try {
              const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
              const existingSbUser = listData?.users.find(
                (u) => u.email?.toLowerCase() === data.email.toLowerCase()
              );
              if (existingSbUser) {
                authId = existingSbUser.id;
                await supabaseAdmin.auth.admin.updateUserById(authId, {
                  password: temporaryPassword,
                  user_metadata: {
                    username: data.username,
                    full_name: data.full_name,
                    role: data.role,
                  },
                  ban_duration: 'none',
                });
                await supabaseAdmin.from('profiles').upsert({
                  id: authId,
                  full_name: data.full_name,
                  username: data.username,
                  email: data.email,
                  role: data.role,
                  team: data.team || null,
                  phone: data.phone || null,
                  is_active: true,
                  must_change_password: mustChange,
                });
              }
            } catch (err: any) {
              console.warn('Supabase fallback user recovery notice:', err?.message);
            }
          }
        }
      } catch (sbErr: any) {
        console.warn('Supabase sync on user creation note:', sbErr.message);
      }
    }

    const newUser: StoredUser = {
      id: authId,
      full_name: data.full_name,
      username: data.username,
      email: data.email,
      role: data.role,
      team: data.team || null,
      phone: data.phone || null,
      is_active: true,
      must_change_password: mustChange,
      created_at: new Date().toISOString(),
      password_hash,
    };

    this.users = this.users.filter((u) => u.id !== authId && u.email !== data.email);
    this.users.push(newUser);

    const { password_hash: _, ...profile } = newUser;
    return { ...profile, temporaryPassword };
  }

  async updateUser(id: string, updates: Partial<UserProfile>): Promise<UserProfile | null> {
    let index = this.users.findIndex((u) => u.id === id);
    if (index === -1 && supabaseAdmin) {
      await this.syncFromSupabase();
      index = this.users.findIndex((u) => u.id === id);
    }
    if (index === -1) return null;

    this.users[index] = { ...this.users[index], ...updates };

    // Persist changes to Supabase profiles and Supabase Auth
    if (supabaseAdmin) {
      try {
        const updatePayload: Record<string, any> = {};
        if (updates.full_name !== undefined) updatePayload.full_name = updates.full_name;
        if (updates.username !== undefined) updatePayload.username = updates.username;
        if (updates.email !== undefined) updatePayload.email = updates.email;
        if (updates.role !== undefined) updatePayload.role = updates.role;
        if (updates.team !== undefined) updatePayload.team = updates.team;
        if (updates.phone !== undefined) updatePayload.phone = updates.phone;
        if (updates.is_active !== undefined) updatePayload.is_active = updates.is_active;
        if (updates.must_change_password !== undefined) updatePayload.must_change_password = updates.must_change_password;

        if (Object.keys(updatePayload).length > 0) {
          const { error: sbErr } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', id);

          if (sbErr) {
            console.error('Supabase profile update failed:', sbErr.message);
          }
        }

        // Also synchronize Supabase Auth user metadata & ban state if applicable
        const authUpdates: Record<string, any> = {};
        const metaUpdates: Record<string, any> = {};
        if (updates.role !== undefined) metaUpdates.role = updates.role;
        if (updates.full_name !== undefined) metaUpdates.full_name = updates.full_name;
        if (updates.username !== undefined) metaUpdates.username = updates.username;

        if (Object.keys(metaUpdates).length > 0) {
          authUpdates.user_metadata = metaUpdates;
        }

        if (updates.is_active === false) {
          authUpdates.ban_duration = '876600h'; // ~100 years in auth.users
        } else if (updates.is_active === true) {
          authUpdates.ban_duration = 'none'; // unban in auth.users
        }

        if (Object.keys(authUpdates).length > 0) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdates);
          if (authErr) {
            console.warn('Supabase Auth user update warning:', authErr.message);
          }
        }
      } catch (err: any) {
        console.error('Error syncing user update to Supabase:', err.message);
      }
    }

    const { password_hash, ...profile } = this.users[index];
    return profile;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<UserProfile | null> {
    return this.updateUser(id, { is_active: isActive });
  }

  async getStoredUserById(id: string): Promise<StoredUser | null> {
    const user = this.users.find((u) => u.id === id);
    return user || null;
  }

  async createPasswordResetToken(userId: string): Promise<{ token: string; email: string }> {
    const user = this.users.find((u) => u.id === userId);
    if (!user) throw new Error('User not found');

    this.resetTokens = this.resetTokens.filter((t) => t.userId !== userId);

    const token = `rst_${Math.random().toString(36).substring(2, 10)}_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 10)}`;
    const expiresAt = Date.now() + 60 * 60 * 1000; // 1 hour validity

    this.resetTokens.push({
      token,
      userId: user.id,
      email: user.email,
      expiresAt,
    });

    return { token, email: user.email };
  }

  async verifyPasswordResetToken(token: string): Promise<StoredUser | null> {
    const record = this.resetTokens.find((t) => t.token === token);
    if (!record) return null;

    if (Date.now() > record.expiresAt) {
      this.resetTokens = this.resetTokens.filter((t) => t.token !== token);
      return null;
    }

    const user = this.users.find((u) => u.id === record.userId);
    return user || null;
  }

  async updateUserPassword(userId: string, newPasswordPlain: string): Promise<boolean> {
    const index = this.users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPasswordPlain, salt);
    this.users[index].password_hash = password_hash;

    // Invalidate reset tokens for this user
    this.resetTokens = this.resetTokens.filter((t) => t.userId !== userId);

    // If Supabase is configured, also update Supabase Auth user password
    if (supabaseAdmin && this.users[index].email) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const sbUser = listData?.users.find(
          (u) => u.email === this.users[index].email || u.id === userId
        );
        if (sbUser) {
          await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
            password: newPasswordPlain,
          });
        }
      } catch (sbErr) {
        console.warn('Optional Supabase background sync on password update:', sbErr);
      }
    }

    return true;
  }

  // --- MANAGER PASSWORD RESET ---
  async resetEmployeePassword(
    targetUserId: string,
    managerId: string
  ): Promise<{ temporaryPassword: string; targetUser: UserProfile }> {
    const userIndex = this.users.findIndex((u) => u.id === targetUserId);
    if (userIndex === -1) {
      throw new Error('Employee account not found');
    }

    const manager = this.users.find((u) => u.id === managerId);

    // Generate secure temporary password: Welcome@ + 6 alphanumeric characters
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let randomPart = '';
    for (let i = 0; i < 6; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const temporaryPassword = `Welcome@${randomPart}`;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(temporaryPassword, salt);
    const now = new Date().toISOString();

    this.users[userIndex].password_hash = password_hash;
    this.users[userIndex].must_change_password = true;
    this.users[userIndex].password_reset_at = now;
    this.users[userIndex].password_reset_by = managerId;

    // Invalidate any existing reset tokens
    this.resetTokens = this.resetTokens.filter((t) => t.userId !== targetUserId);

    // Sync to Supabase Auth if configured
    if (supabaseAdmin && this.users[userIndex].email) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const sbUser = listData?.users.find(
          (u) => u.email === this.users[userIndex].email || u.id === targetUserId
        );
        if (sbUser) {
          await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
            password: temporaryPassword,
          });
          await supabaseAdmin
            .from('profiles')
            .update({
              must_change_password: true,
              password_reset_at: now,
              password_reset_by: managerId,
            })
            .eq('id', sbUser.id);
        }
      } catch (sbErr) {
        console.warn('Supabase sync on manager password reset:', sbErr);
      }
    }

    // Add Audit Log
    await this.addAuditLog({
      target_user_id: targetUserId,
      target_user_name: this.users[userIndex].full_name,
      performed_by: managerId,
      performed_by_name: manager?.full_name || 'Manager',
      action: 'MANAGER_PASSWORD_RESET',
      metadata: {
        role: this.users[userIndex].role,
        team: this.users[userIndex].team,
      },
    });

    const { password_hash: _, ...profile } = this.users[userIndex];
    return { temporaryPassword, targetUser: profile };
  }

  async changeOwnPassword(userId: string, newPasswordPlain: string): Promise<boolean> {
    const userIndex = this.users.findIndex((u) => u.id === userId);
    if (userIndex === -1) return false;

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(newPasswordPlain, salt);

    this.users[userIndex].password_hash = password_hash;
    this.users[userIndex].must_change_password = false;

    this.resetTokens = this.resetTokens.filter((t) => t.userId !== userId);

    if (supabaseAdmin && this.users[userIndex].email) {
      try {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const sbUser = listData?.users.find(
          (u) => u.email === this.users[userIndex].email || u.id === userId
        );
        if (sbUser) {
          await supabaseAdmin.auth.admin.updateUserById(sbUser.id, {
            password: newPasswordPlain,
          });
          await supabaseAdmin
            .from('profiles')
            .update({
              must_change_password: false,
            })
            .eq('id', sbUser.id);
        }
      } catch (sbErr) {
        console.warn('Supabase sync on own password change:', sbErr);
      }
    }

    await this.addAuditLog({
      target_user_id: userId,
      target_user_name: this.users[userIndex].full_name,
      performed_by: userId,
      performed_by_name: this.users[userIndex].full_name,
      action: 'PASSWORD_CHANGED',
      metadata: { forced_reset_completed: true },
    });

    return true;
  }

  // --- AUDIT LOGS ---
  async addAuditLog(data: {
    target_user_id: string;
    target_user_name?: string;
    performed_by: string;
    performed_by_name?: string;
    action: string;
    metadata?: Record<string, any>;
  }): Promise<AuditLog> {
    const entry: AuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      target_user_id: data.target_user_id,
      target_user_name: data.target_user_name,
      performed_by: data.performed_by,
      performed_by_name: data.performed_by_name,
      action: data.action,
      metadata: data.metadata || {},
      created_at: new Date().toISOString(),
    };
    this.auditLogs.unshift(entry);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('audit_logs').insert(entry);
      } catch (err) {
        // Ignored if table not created yet in live db
      }
    }
    return entry;
  }

  async getAuditLogs(limit: number = 50): Promise<AuditLog[]> {
    return this.auditLogs.slice(0, limit);
  }

  // --- PUSH SUBSCRIPTIONS ---
  async savePushSubscription(
    arg1: string | { user_id: string; endpoint: string; p256dh: string; auth: string; user_agent?: string },
    endpoint?: string,
    p256dh?: string,
    auth?: string,
    user_agent?: string
  ): Promise<PushSubscriptionRecord> {
    let userId: string;
    let ep: string;
    let pKey: string;
    let authKey: string;
    let agent: string | undefined;

    if (typeof arg1 === 'object') {
      userId = arg1.user_id;
      ep = arg1.endpoint;
      pKey = arg1.p256dh;
      authKey = arg1.auth;
      agent = arg1.user_agent;
    } else {
      userId = arg1;
      ep = endpoint!;
      pKey = p256dh!;
      authKey = auth!;
      agent = user_agent;
    }

    const existingIndex = this.pushSubscriptions.findIndex((s) => s.endpoint === ep);
    const now = new Date().toISOString();
    const record: PushSubscriptionRecord = {
      id: `push-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId,
      endpoint: ep,
      p256dh: pKey,
      auth: authKey,
      user_agent: agent,
      created_at: now,
    };

    if (existingIndex !== -1) {
      this.pushSubscriptions[existingIndex] = record;
    } else {
      this.pushSubscriptions.push(record);
    }

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('push_subscriptions').upsert(record, { onConflict: 'endpoint' });
      } catch (err) {
        // Ignored if table not created yet
      }
    }

    return record;
  }

  async getPushSubscriptionsForUser(userId: string): Promise<PushSubscriptionRecord[]> {
    return this.pushSubscriptions.filter((s) => s.user_id === userId);
  }

  async removePushSubscription(endpointOrId: string): Promise<boolean> {
    const initialLen = this.pushSubscriptions.length;
    this.pushSubscriptions = this.pushSubscriptions.filter(
      (s) => s.endpoint !== endpointOrId && s.id !== endpointOrId
    );
    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('push_subscriptions').delete().or(`endpoint.eq.${endpointOrId},id.eq.${endpointOrId}`);
      } catch (err) {}
    }
    return this.pushSubscriptions.length < initialLen;
  }

  // --- DUE FOLLOW-UPS (IST) ---
  async getDueFollowUpsIST(
    currentDateIST?: string,
    currentTimeIST?: string
  ): Promise<Array<{ followUp: FollowUp; lead: Lead }>> {
    const now = new Date();
    const todayIST =
      currentDateIST ||
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(now);
    const nowIST =
      currentTimeIST ||
      new Intl.DateTimeFormat('en-GB', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).format(now);

    const dueList: Array<{ followUp: FollowUp; lead: Lead }> = [];

    for (const f of this.followUps) {
      if (f.is_active === false) continue;
      const lead = this.leads.find((l) => l.id === f.lead_id);
      if (!lead) continue;
      if (['Admission Done', 'Not Interested', 'Wrong Number'].includes(lead.status)) continue;
      if (f.status === 'Admission Done' || f.status === 'Not Interested' || f.status === 'Wrong Number') continue;
      if (f.is_notified) continue;
      if (f.follow_up_date !== todayIST) continue;
      if (!f.follow_up_time) continue;
      if (f.follow_up_time <= nowIST) {
        dueList.push({ followUp: f, lead });
      }
    }

    return dueList;
  }

  async markFollowUpNotified(id: string): Promise<void> {
    const fu = this.followUps.find((f) => f.id === id);
    if (fu) {
      fu.is_notified = true;
    }
    if (fu?.lead_id) {
      const lead = this.leads.find((l) => l.id === fu.lead_id);
      if (lead) {
        lead.is_notified = true;
      }
    }
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
    if (supabaseAdmin && this.leads.length === 0) {
      await this.syncFromSupabase();
    }
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
    if (supabaseAdmin && mobiles.length > 0) {
      try {
        const { data, error } = await supabaseAdmin
          .from('leads')
          .select('mobile')
          .in('mobile', mobiles);
        if (data && !error) {
          const set = new Set(data.map((d: any) => d.mobile));
          return Array.from(set);
        }
      } catch (err) {
        console.warn('Supabase duplicate check fallback:', err);
      }
    }
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
      follow_up_time?: string | null;
      remarks?: string | null;
    }>
  ): Promise<{ insertedCount: number; leads: Lead[]; dailyReport: DailyReport }> {
    const emp = await this.getUserById(employee_id);
    if (!emp) throw new Error('Employee not found');

    const createdTime = new Date().toISOString();

    if (supabaseAdmin) {
      const dbLeadsPayload = rawLeads.map((item) => ({
        employee_id,
        report_date,
        lead_name: item.lead_name.trim(),
        mobile: item.mobile.trim(),
        lead_type: item.lead_type,
        course: item.course.trim(),
        status: item.status,
        follow_up_date: item.follow_up_date || null,
        follow_up_time: item.follow_up_time
          ? (item.follow_up_time.length === 5 ? `${item.follow_up_time}:00` : item.follow_up_time)
          : null,
        is_notified: false,
        remarks: item.remarks || null,
      }));

      const { data: insertedDbLeads, error: insertLeadErr } = await supabaseAdmin
        .from('leads')
        .insert(dbLeadsPayload)
        .select('*');

      if (insertLeadErr || !insertedDbLeads) {
        console.error('Failed to insert leads into Supabase:', insertLeadErr);
        throw new Error(`Database error saving leads: ${insertLeadErr?.message || 'Unknown database error'}`);
      }

      // Insert follow-ups for leads with a follow-up date
      const followUpsPayload: any[] = [];
      insertedDbLeads.forEach((dbLead: any) => {
        if (dbLead.follow_up_date) {
          followUpsPayload.push({
            lead_id: dbLead.id,
            employee_id,
            follow_up_date: dbLead.follow_up_date,
            follow_up_time: dbLead.follow_up_time || null,
            is_notified: false,
            status: dbLead.status,
            note: dbLead.remarks || 'Initial follow up scheduled during daily report submission',
          });
        }
      });

      let insertedDbFollowUps: any[] = [];
      if (followUpsPayload.length > 0) {
        const { data: fuData, error: fuErr } = await supabaseAdmin
          .from('follow_ups')
          .insert(followUpsPayload)
          .select('*');

        if (fuErr) {
          console.error('Failed to insert follow-ups into Supabase:', fuErr);
        } else if (fuData) {
          insertedDbFollowUps = fuData;
        }
      }

      // Upsert daily report in Supabase
      const { count: totalEmpDayLeads } = await supabaseAdmin
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', employee_id)
        .eq('report_date', report_date);

      const actualLeadCount = totalEmpDayLeads ?? insertedDbLeads.length;
      const nowIso = new Date().toISOString();

      const { data: dbReport, error: repErr } = await supabaseAdmin
        .from('daily_reports')
        .upsert(
          {
            employee_id,
            report_date,
            lead_count: actualLeadCount,
            submitted_at: nowIso,
          },
          { onConflict: 'employee_id,report_date' }
        )
        .select('*')
        .single();

      if (repErr) {
        console.error('Failed to upsert daily_reports in Supabase:', repErr);
      }

      // Update in-memory cache with persisted Supabase rows
      const formattedLeads: Lead[] = insertedDbLeads.map((dbLead: any) => ({
        ...dbLead,
        employee_name: emp.full_name,
        employee_team: emp.team || '',
      }));

      const newLeadIds = new Set(formattedLeads.map((l) => l.id));
      this.leads = [...formattedLeads, ...this.leads.filter((l) => !newLeadIds.has(l.id))];

      const formattedFollowUps: FollowUp[] = insertedDbFollowUps.map((dbFu: any) => {
        const matchingLead = formattedLeads.find((l) => l.id === dbFu.lead_id);
        return {
          ...dbFu,
          employee_name: emp.full_name,
          lead_name: matchingLead?.lead_name || 'Student',
          lead_mobile: matchingLead?.mobile || '',
        };
      });

      const newFuIds = new Set(formattedFollowUps.map((f) => f.id));
      this.followUps = [...formattedFollowUps, ...this.followUps.filter((f) => !newFuIds.has(f.id))];

      const finalReport: DailyReport = dbReport || {
        id: `rep-${employee_id}-${report_date}`,
        employee_id,
        report_date,
        lead_count: actualLeadCount,
        submitted_at: nowIso,
      };

      const existingRepIdx = this.dailyReports.findIndex(
        (r) => r.employee_id === employee_id && r.report_date === report_date
      );
      if (existingRepIdx !== -1) {
        this.dailyReports[existingRepIdx] = finalReport;
      } else {
        this.dailyReports.unshift(finalReport);
      }

      return {
        insertedCount: formattedLeads.length,
        leads: formattedLeads,
        dailyReport: finalReport,
      };
    }

    // Fallback if Supabase not configured
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
        follow_up_time: item.follow_up_time || null,
        is_notified: false,
        remarks: item.remarks || null,
        created_at: createdTime,
        updated_at: createdTime,
      };

      this.leads.unshift(lead);
      newLeads.push(lead);

      if (item.follow_up_date) {
        this.followUps.unshift({
          id: `fu-${Date.now()}-${i}`,
          lead_id: leadId,
          employee_id,
          employee_name: emp.full_name,
          lead_name: item.lead_name,
          lead_mobile: item.mobile,
          follow_up_date: item.follow_up_date,
          follow_up_time: item.follow_up_time || null,
          is_notified: false,
          status: item.status,
          note: item.remarks || 'Initial follow up scheduled during daily report submission',
          created_at: createdTime,
        });
      }
    }

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

    const nowIso = new Date().toISOString();

    if (supabaseAdmin) {
      const dbUpdates: any = {};
      if (updates.lead_name !== undefined) dbUpdates.lead_name = updates.lead_name.trim();
      if (updates.mobile !== undefined) dbUpdates.mobile = updates.mobile.trim();
      if (updates.lead_type !== undefined) dbUpdates.lead_type = updates.lead_type;
      if (updates.course !== undefined) dbUpdates.course = updates.course.trim();
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.follow_up_date !== undefined) dbUpdates.follow_up_date = updates.follow_up_date || null;
      if (updates.follow_up_time !== undefined) {
        dbUpdates.follow_up_time = updates.follow_up_time
          ? (updates.follow_up_time.length === 5 ? `${updates.follow_up_time}:00` : updates.follow_up_time)
          : null;
      }
      if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks || null;
      if (updates.is_notified !== undefined) dbUpdates.is_notified = updates.is_notified;
      dbUpdates.updated_at = nowIso;

      const { error: upErr } = await supabaseAdmin
        .from('leads')
        .update(dbUpdates)
        .eq('id', id);

      if (upErr) {
        console.error('Failed to update lead in Supabase:', upErr);
        throw new Error(`Database error updating lead: ${upErr.message}`);
      }

      // If lead transitioned to a terminal status, deactivate active follow-ups in Supabase
      if (updates.status && ['Not Interested', 'Admission Done', 'Wrong Number'].includes(updates.status)) {
        try {
          await supabaseAdmin
            .from('follow_ups')
            .update({ is_active: false, completed_at: nowIso })
            .eq('lead_id', id)
            .eq('is_active', true);
        } catch (fErr) {
          // Backward-compatible if column not yet added in Supabase
        }
      }
    }

    // If lead transitioned to a terminal status, deactivate active in-memory follow-ups
    if (updates.status && ['Not Interested', 'Admission Done', 'Wrong Number'].includes(updates.status)) {
      for (const f of this.followUps) {
        if (f.lead_id === id) {
          f.is_active = false;
          f.completed_at = f.completed_at || nowIso;
        }
      }
    }

    const updatedLead: Lead = {
      ...lead,
      ...updates,
      updated_at: nowIso,
    };

    const index = this.leads.findIndex((l) => l.id === id);
    if (index !== -1) {
      this.leads[index] = updatedLead;
    }

    return updatedLead;
  }

  async deleteLead(id: string): Promise<boolean> {
    if (supabaseAdmin) {
      const { error: delErr } = await supabaseAdmin.from('leads').delete().eq('id', id);
      if (delErr) {
        console.error('Failed to delete lead from Supabase:', delErr);
      }
    }

    const index = this.leads.findIndex((l) => l.id === id);
    if (index === -1) return false;
    this.leads.splice(index, 1);
    this.followUps = this.followUps.filter((f) => f.lead_id !== id);
    return true;
  }

  async assignLeads(leadIds: string[], targetEmployeeId: string): Promise<number> {
    const targetEmp = await this.getUserById(targetEmployeeId);
    if (!targetEmp) throw new Error('Target employee not found');

    const now = new Date().toISOString();

    if (supabaseAdmin && leadIds.length > 0) {
      const { error: assignErr } = await supabaseAdmin
        .from('leads')
        .update({ employee_id: targetEmployeeId, updated_at: now })
        .in('id', leadIds);
      if (assignErr) {
        console.error('Failed to assign leads in Supabase:', assignErr);
      }
    }

    let count = 0;
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
    lead_id?: string;
    group?: 'OVERDUE' | 'TODAY' | 'UPCOMING' | 'COMPLETED' | 'ALL';
  }): Promise<FollowUp[]> {
    if (supabaseAdmin && this.followUps.length === 0) {
      await this.syncFromSupabase();
    }

    const todayIST = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const leadMap = new Map(this.leads.map((l) => [l.id, l]));

    // 1. If lead_id is requested (e.g. LeadDetailDrawer history), return full interaction history
    if (filters.lead_id) {
      let leadFUs = this.followUps.filter((f) => f.lead_id === filters.lead_id);
      return leadFUs.sort((a, b) => b.created_at.localeCompare(a.created_at));
    }

    // 2. Otherwise (Command Centre or Active Queues), resolve to ONE CURRENT REPRESENTATION PER LEAD
    let result = [...this.followUps];

    if (filters.employee_id) {
      result = result.filter((f) => f.employee_id === filters.employee_id);
    }

    if (filters.team) {
      const teamUserIds = new Set(
        this.users.filter((u) => u.team === filters.team).map((u) => u.id)
      );
      result = result.filter((f) => teamUserIds.has(f.employee_id));
    }

    // Group by lead_id to pick the single authoritative current follow-up
    // Deterministic priority: active row first, then newest created_at, then highest id
    const latestByLead = new Map<string, FollowUp>();
    for (const f of result) {
      const existing = latestByLead.get(f.lead_id);
      if (!existing) {
        latestByLead.set(f.lead_id, f);
      } else {
        if (f.is_active && !existing.is_active) {
          latestByLead.set(f.lead_id, f);
        } else if (f.is_active === existing.is_active) {
          if (f.created_at > existing.created_at || (f.created_at === existing.created_at && f.id > existing.id)) {
            latestByLead.set(f.lead_id, f);
          }
        }
      }
    }

    const currentFollowUps: FollowUp[] = [];
    for (const [leadId, f] of latestByLead.entries()) {
      const lead = leadMap.get(leadId);
      if (!lead) continue;

      const isTerminal = ['Admission Done', 'Not Interested', 'Wrong Number'].includes(lead.status);

      // Always stamp authoritative lead_status from leads table
      const item: FollowUp = {
        ...f,
        lead_status: lead.status,
      };

      if (filters.group === 'OVERDUE') {
        if (!isTerminal && f.is_active !== false && f.follow_up_date < todayIST) {
          currentFollowUps.push(item);
        }
      } else if (filters.group === 'TODAY') {
        if (!isTerminal && f.is_active !== false && f.follow_up_date === todayIST) {
          currentFollowUps.push(item);
        }
      } else if (filters.group === 'UPCOMING') {
        if (!isTerminal && f.is_active !== false && f.follow_up_date > todayIST) {
          currentFollowUps.push(item);
        }
      } else if (filters.group === 'COMPLETED') {
        if (isTerminal || f.status === 'Admission Done' || f.status === 'Not Interested') {
          currentFollowUps.push(item);
        }
      } else {
        // group === 'ALL' (Command Centre Kanban)
        // If lead is terminal, authoritative displayed status is lead.status
        if (isTerminal) {
          currentFollowUps.push({
            ...item,
            status: lead.status,
          });
        } else {
          currentFollowUps.push(item);
        }
      }
    }

    return currentFollowUps.sort((a, b) => b.follow_up_date.localeCompare(a.follow_up_date));
  }

  async addFollowUp(data: {
    lead_id: string;
    employee_id: string;
    follow_up_date: string;
    follow_up_time?: string | null;
    status: string;
    note?: string | null;
  }): Promise<FollowUp> {
    const lead = await this.getLeadById(data.lead_id);
    if (!lead) throw new Error('Lead not found');

    const emp = await this.getUserById(data.employee_id);
    const now = new Date().toISOString();
    const formattedTime = data.follow_up_time
      ? (data.follow_up_time.length === 5 ? `${data.follow_up_time}:00` : data.follow_up_time)
      : null;

    let fuId = `fu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (supabaseAdmin) {
      // 1. Deactivate prior active follow-ups for this lead in Supabase
      try {
        await supabaseAdmin
          .from('follow_ups')
          .update({ is_active: false, completed_at: now })
          .eq('lead_id', data.lead_id)
          .eq('is_active', true);
      } catch (err) {
        // Backward-compatible if is_active column is pending in DB
      }

      // 2. Insert new active follow-up
      const { data: dbFu, error: fuErr } = await supabaseAdmin
        .from('follow_ups')
        .insert({
          lead_id: data.lead_id,
          employee_id: data.employee_id,
          follow_up_date: data.follow_up_date,
          follow_up_time: formattedTime,
          is_notified: false,
          status: data.status,
          note: data.note || null,
          is_active: true,
        })
        .select('*')
        .single();

      if (fuErr) {
        console.error('Failed to insert follow-up into Supabase:', fuErr);
        throw new Error(`Database error saving follow-up: ${fuErr.message}`);
      }
      if (dbFu) {
        fuId = dbFu.id;
      }

      // Update lead follow-up date and status in Supabase
      const { error: leadUpErr } = await supabaseAdmin
        .from('leads')
        .update({
          follow_up_date: data.follow_up_date,
          follow_up_time: formattedTime,
          status: data.status,
          is_notified: false,
          updated_at: now,
        })
        .eq('id', data.lead_id);

      if (leadUpErr) {
        console.warn('Notice updating lead follow_up schedule in Supabase:', leadUpErr);
      }
    }

    // Deactivate prior in-memory follow-ups for this lead
    for (const priorFu of this.followUps) {
      if (priorFu.lead_id === data.lead_id && priorFu.is_active !== false) {
        priorFu.is_active = false;
        priorFu.completed_at = now;
      }
    }

    const fu: FollowUp = {
      id: fuId,
      lead_id: data.lead_id,
      employee_id: data.employee_id,
      employee_name: emp?.full_name || 'Staff',
      lead_name: lead.lead_name,
      lead_mobile: lead.mobile,
      follow_up_date: data.follow_up_date,
      follow_up_time: formattedTime,
      is_notified: false,
      status: data.status,
      note: data.note || null,
      created_at: now,
      is_active: true,
      completed_at: null,
      lead_status: data.status,
    };

    this.followUps.unshift(fu);

    // Update lead in-memory
    lead.follow_up_date = data.follow_up_date;
    lead.follow_up_time = formattedTime;
    lead.is_notified = false;
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

    const formattedTime = updates.follow_up_time !== undefined
      ? (updates.follow_up_time && updates.follow_up_time.length === 5 ? `${updates.follow_up_time}:00` : updates.follow_up_time)
      : undefined;

    if (supabaseAdmin) {
      const dbUpdates: any = {};
      if (updates.follow_up_date !== undefined) dbUpdates.follow_up_date = updates.follow_up_date;
      if (formattedTime !== undefined) dbUpdates.follow_up_time = formattedTime;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.note !== undefined) dbUpdates.note = updates.note;
      if (updates.is_notified !== undefined) dbUpdates.is_notified = updates.is_notified;
      if (updates.is_active !== undefined) dbUpdates.is_active = updates.is_active;
      if (updates.completed_at !== undefined) dbUpdates.completed_at = updates.completed_at;

      // If status changed to a terminal status, mark inactive
      if (updates.status && ['Not Interested', 'Admission Done', 'Wrong Number'].includes(updates.status)) {
        dbUpdates.is_active = false;
        dbUpdates.completed_at = new Date().toISOString();
      }

      const { error: fuErr } = await supabaseAdmin
        .from('follow_ups')
        .update(dbUpdates)
        .eq('id', id);

      if (fuErr) {
        console.error('Failed to update follow-up in Supabase:', fuErr);
      }

      if (fu.lead_id) {
        const leadUpdates: any = { updated_at: new Date().toISOString() };
        if (updates.follow_up_date !== undefined) leadUpdates.follow_up_date = updates.follow_up_date;
        if (formattedTime !== undefined) {
          leadUpdates.follow_up_time = formattedTime;
          leadUpdates.is_notified = false;
        }
        if (updates.status) leadUpdates.status = updates.status;

        const { error: leadErr } = await supabaseAdmin
          .from('leads')
          .update(leadUpdates)
          .eq('id', fu.lead_id);

        if (leadErr) {
          console.warn('Notice updating lead follow_up schedule in Supabase:', leadErr);
        }
      }
    }

    Object.assign(fu, {
      ...updates,
      ...(formattedTime !== undefined ? { follow_up_time: formattedTime } : {}),
      ...(updates.status && ['Not Interested', 'Admission Done', 'Wrong Number'].includes(updates.status)
        ? { is_active: false, completed_at: new Date().toISOString() }
        : {}),
    });

    const lead = this.leads.find((l) => l.id === fu.lead_id);
    if (lead) {
      if (updates.follow_up_date !== undefined) lead.follow_up_date = updates.follow_up_date;
      if (formattedTime !== undefined) {
        lead.follow_up_time = formattedTime;
        lead.is_notified = false;
        fu.is_notified = false;
      }
      if (updates.status) lead.status = updates.status as LeadStatus;
      lead.updated_at = new Date().toISOString();
    }
    return fu;
  }

  // --- REPORTING & KPI METHODS (Real Database Computations) ---
  async getDailySummary(employee_id: string, date: string): Promise<DailyReport | null> {
    if (supabaseAdmin) {
      try {
        const { data, error } = await supabaseAdmin
          .from('daily_reports')
          .select('*')
          .eq('employee_id', employee_id)
          .eq('report_date', date)
          .maybeSingle();
        if (data && !error) {
          return data;
        }
      } catch (err) {
        console.warn('Supabase getDailySummary fallback:', err);
      }
    }
    return (
      this.dailyReports.find(
        (r) => r.employee_id === employee_id && r.report_date === date
      ) || null
    );
  }

  async getKPIs(filters?: { employee_id?: string; team?: string; startDate?: string; endDate?: string }) {
    if (supabaseAdmin && this.leads.length === 0) {
      await this.syncFromSupabase();
    }
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
    if (supabaseAdmin && this.leads.length === 0) {
      await this.syncFromSupabase();
    }
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

  async addNotification(params: {
    user_id: string;
    title: string;
    body: string;
    type?: 'submission' | 'lead_assigned' | 'target_alert' | 'followup_due' | 'system';
    link?: string;
  }): Promise<AppNotification> {
    const notif: AppNotification = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      user_id: params.user_id,
      title: params.title,
      body: params.body,
      type: params.type || 'system',
      link: params.link || null,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    this.notifications.unshift(notif);

    if (supabaseAdmin) {
      try {
        await supabaseAdmin.from('notifications').insert(notif);
      } catch (err) {
        // Table might not exist yet or mock fallback
      }
    }

    return notif;
  }
}

export const dbStore = new DatabaseStore();
