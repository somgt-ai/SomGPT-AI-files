import { DatabaseSync } from "node:sqlite";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure data directory exists
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "somgpt.db");
export const db = new DatabaseSync(dbPath);

// Enable WAL mode and foreign keys for high performance & concurrency
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize tables
export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      password_salt TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      last_active_at INTEGER NOT NULL,
      is_online INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS password_resets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      email TEXT NOT NULL COLLATE NOCASE,
      reset_code TEXT NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      title TEXT NOT NULL,
      mode TEXT NOT NULL DEFAULT 'standard',
      use_search INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      data TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS complaints (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_email TEXT NOT NULL COLLATE NOCASE,
      subject TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'other',
      message TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      admin_reply TEXT,
      replied_at INTEGER,
      replied_by TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS activity_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      user_email TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_errors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      endpoint TEXT NOT NULL,
      error_message TEXT NOT NULL,
      stack TEXT,
      user_id TEXT,
      created_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    CREATE INDEX IF NOT EXISTS idx_users_last_active ON users(last_active_at);
    CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
    CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_user_id ON complaints(user_id);
    CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
    CREATE INDEX IF NOT EXISTS idx_activity_created_at ON activity_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action);
  `);

  // Seed default admin account if none exists
  seedDefaultAdmin();
}

// Cryptographic Password Hashing using PBKDF2 (SHA-512, 100k iterations)
export function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

export function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6 digits
}

// Default Admin Seeding
function seedDefaultAdmin() {
  try {
    const adminEmail = "admin@somgpt.ai";
    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(adminEmail) as { id: string } | undefined;

    if (!existing) {
      const salt = generateSalt();
      const defaultPassword = process.env.ADMIN_INITIAL_PASSWORD || "AdminSomGPT2026!";
      const hash = hashPassword(defaultPassword, salt);
      const now = Date.now();
      const adminId = "admin_" + crypto.randomUUID().slice(0, 12);

      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, password_salt, role, status, created_at, last_active_at, is_online)
        VALUES (?, ?, ?, ?, ?, 'admin', 'active', ?, ?, 0)
      `).run(adminId, "SomGPT Administrator", adminEmail, hash, salt, now, now);

      logActivity(adminId, adminEmail, "system_init", "Default admin account initialized");
      console.log(`[Database] Default Admin created: ${adminEmail}`);
    }
  } catch (err) {
    console.error("[Database] Error seeding admin:", err);
  }
}

// User Operations
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  password_salt: string;
  role: "admin" | "user";
  status: "active" | "suspended";
  created_at: number;
  last_active_at: number;
  is_online: number;
}

export function createUser(name: string, email: string, password: string): { user: Omit<DbUser, "password_hash" | "password_salt">; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(normalizedEmail);
  if (existing) {
    throw new Error("Email is already registered. Please sign in.");
  }

  const salt = generateSalt();
  const hash = hashPassword(password, salt);
  const now = Date.now();
  const id = "usr_" + crypto.randomUUID().replace(/-/g, "").slice(0, 16);

  db.prepare(`
    INSERT INTO users (id, name, email, password_hash, password_salt, role, status, created_at, last_active_at, is_online)
    VALUES (?, ?, ?, ?, ?, 'user', 'active', ?, ?, 1)
  `).run(id, name.trim(), normalizedEmail, hash, salt, now, now);

  const token = generateToken();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000; // 30 days
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, id, now, expiresAt);

  logActivity(id, normalizedEmail, "register", "New user registered");
  logActivity(id, normalizedEmail, "login", "User initial login");

  return {
    user: {
      id,
      name: name.trim(),
      email: normalizedEmail,
      role: "user",
      status: "active",
      created_at: now,
      last_active_at: now,
      is_online: 1,
    },
    token,
  };
}

export function authenticateUser(email: string, password: string): { user: Omit<DbUser, "password_hash" | "password_salt">; token: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(normalizedEmail) as DbUser | undefined;

  if (!user) {
    throw new Error("Invalid email or password");
  }

  if (user.status === "suspended") {
    throw new Error("This account has been suspended by an administrator. Please contact support.");
  }

  const hash = hashPassword(password, user.password_salt);
  if (hash !== user.password_hash) {
    throw new Error("Invalid email or password");
  }

  const now = Date.now();
  db.prepare("UPDATE users SET last_active_at = ?, is_online = 1 WHERE id = ?").run(now, user.id);

  const token = generateToken();
  const expiresAt = now + 30 * 24 * 60 * 60 * 1000;
  db.prepare(`
    INSERT INTO sessions (token, user_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, user.id, now, expiresAt);

  logActivity(user.id, user.email, "login", "User signed in");

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      created_at: user.created_at,
      last_active_at: now,
      is_online: 1,
    },
    token,
  };
}

export function getUserByToken(token: string): Omit<DbUser, "password_hash" | "password_salt"> | null {
  const now = Date.now();
  const session = db.prepare(`
    SELECT s.user_id, s.expires_at, u.*
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > ?
  `).get(token, now) as (DbUser & { user_id: string; expires_at: number }) | undefined;

  if (!session) {
    return null;
  }

  if (session.status === "suspended") {
    return null;
  }

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    status: session.status,
    created_at: session.created_at,
    last_active_at: session.last_active_at,
    is_online: session.is_online,
  };
}

export function touchUserActivity(userId: string) {
  const now = Date.now();
  db.prepare("UPDATE users SET last_active_at = ?, is_online = 1 WHERE id = ?").run(now, userId);
}

export function logoutUser(token: string) {
  const session = db.prepare("SELECT user_id FROM sessions WHERE token = ?").get(token) as { user_id: string } | undefined;
  if (session) {
    db.prepare("UPDATE users SET is_online = 0 WHERE id = ?").run(session.user_id);
    db.prepare("DELETE FROM sessions WHERE token = ?").run(token);
    logActivity(session.user_id, undefined, "logout", "User logged out");
  }
}

// Password Recovery
export function initiatePasswordReset(email: string): { success: boolean; resetCode?: string } {
  const normalizedEmail = email.trim().toLowerCase();
  const user = db.prepare("SELECT id, email FROM users WHERE email = ?").get(normalizedEmail) as { id: string; email: string } | undefined;

  if (!user) {
    // Return true for privacy so attackers can't enumerate emails
    return { success: true };
  }

  const resetCode = generateResetCode();
  const id = crypto.randomUUID();
  const now = Date.now();
  const expiresAt = now + 15 * 60 * 1000; // 15 minutes

  db.prepare(`
    INSERT INTO password_resets (id, user_id, email, reset_code, expires_at, used, created_at)
    VALUES (?, ?, ?, ?, ?, 0, ?)
  `).run(id, user.id, user.email, resetCode, expiresAt, now);

  logActivity(user.id, user.email, "password_reset_request", `Reset code generated`);

  return { success: true, resetCode };
}

export function completePasswordReset(email: string, code: string, newPassword: string): boolean {
  const normalizedEmail = email.trim().toLowerCase();
  const now = Date.now();

  const reset = db.prepare(`
    SELECT * FROM password_resets
    WHERE email = ? AND reset_code = ? AND used = 0 AND expires_at > ?
    ORDER BY created_at DESC LIMIT 1
  `).get(normalizedEmail, code.trim(), now) as { id: string; user_id: string } | undefined;

  if (!reset) {
    throw new Error("Invalid or expired reset code. Please request a new code.");
  }

  const salt = generateSalt();
  const hash = hashPassword(newPassword, salt);

  db.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").run(hash, salt, reset.user_id);
  db.prepare("UPDATE password_resets SET used = 1 WHERE id = ?").run(reset.id);
  // Invalidate all old sessions
  db.prepare("DELETE FROM sessions WHERE user_id = ?").run(reset.user_id);

  logActivity(reset.user_id, normalizedEmail, "password_reset_completed", "Password successfully changed");
  return true;
}

// User-Specific Conversations
export function getUserConversations(userId: string): any[] {
  const rows = db.prepare(`
    SELECT id, title, mode, use_search, created_at, updated_at, data
    FROM conversations
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(userId) as any[];

  return rows.map((r) => {
    try {
      const parsed = JSON.parse(r.data);
      return {
        id: r.id,
        title: r.title,
        mode: r.mode,
        useSearch: Boolean(r.use_search),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        messages: parsed.messages || [],
      };
    } catch {
      return {
        id: r.id,
        title: r.title,
        mode: r.mode,
        useSearch: Boolean(r.use_search),
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        messages: [],
      };
    }
  });
}

export function saveUserConversation(userId: string, conversation: any) {
  const now = Date.now();
  const id = conversation.id || crypto.randomUUID();
  const title = conversation.title || "Wada-hadal cusub";
  const mode = conversation.mode || "standard";
  const useSearch = conversation.useSearch ? 1 : 0;
  const createdAt = conversation.createdAt || now;
  const updatedAt = conversation.updatedAt || now;
  const data = JSON.stringify({ messages: conversation.messages || [] });

  db.prepare(`
    INSERT INTO conversations (id, user_id, title, mode, use_search, created_at, updated_at, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      title = excluded.title,
      mode = excluded.mode,
      use_search = excluded.use_search,
      updated_at = excluded.updated_at,
      data = excluded.data
  `).run(id, userId, title, mode, useSearch, createdAt, updatedAt, data);

  touchUserActivity(userId);
}

export function deleteUserConversation(userId: string, conversationId: string) {
  db.prepare("DELETE FROM conversations WHERE id = ? AND user_id = ?").run(conversationId, userId);
}

export function syncUserConversations(userId: string, clientConversations: any[]) {
  if (!Array.isArray(clientConversations)) return;
  for (const c of clientConversations) {
    if (c && c.id) {
      saveUserConversation(userId, c);
    }
  }
}

// Complaints System
export interface Complaint {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  category: string;
  message: string;
  status: "pending" | "in_progress" | "resolved";
  admin_reply?: string | null;
  replied_at?: number | null;
  replied_by?: string | null;
  created_at: number;
  updated_at: number;
}

export function createComplaint(
  userId: string,
  userName: string,
  userEmail: string,
  subject: string,
  category: string,
  message: string
): Complaint {
  const id = "cmp_" + crypto.randomUUID().slice(0, 12);
  const now = Date.now();

  db.prepare(`
    INSERT INTO complaints (id, user_id, user_name, user_email, subject, category, message, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `).run(id, userId, userName, userEmail, subject, category, message, now, now);

  logActivity(userId, userEmail, "complaint_created", `Subject: ${subject}`);

  return {
    id,
    user_id: userId,
    user_name: userName,
    user_email: userEmail,
    subject,
    category,
    message,
    status: "pending",
    admin_reply: null,
    replied_at: null,
    replied_by: null,
    created_at: now,
    updated_at: now,
  };
}

export function getUserComplaints(userId: string): Complaint[] {
  return db.prepare(`
    SELECT * FROM complaints
    WHERE user_id = ?
    ORDER BY created_at DESC
  `).all(userId) as unknown as Complaint[];
}

export function getAllComplaints(status?: string): Complaint[] {
  if (status && status !== "all") {
    return db.prepare(`
      SELECT * FROM complaints
      WHERE status = ?
      ORDER BY created_at DESC
    `).all(status) as unknown as Complaint[];
  }
  return db.prepare(`
    SELECT * FROM complaints
    ORDER BY created_at DESC
  `).all() as unknown as Complaint[];
}

export function replyToComplaint(complaintId: string, replyText: string, adminEmail: string, status?: string): Complaint {
  const now = Date.now();
  const newStatus = status || "resolved";

  db.prepare(`
    UPDATE complaints
    SET admin_reply = ?, replied_at = ?, replied_by = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(replyText, now, adminEmail, newStatus, now, complaintId);

  const updated = db.prepare("SELECT * FROM complaints WHERE id = ?").get(complaintId) as unknown as Complaint;
  logActivity(updated.user_id, adminEmail, "admin_reply", `Replied to complaint ${complaintId}`);
  return updated;
}

export function updateComplaintStatus(complaintId: string, status: "pending" | "in_progress" | "resolved") {
  const now = Date.now();
  db.prepare("UPDATE complaints SET status = ?, updated_at = ? WHERE id = ?").run(status, now, complaintId);
}

// Activity Logging & Real Analytics
export function logActivity(userId: string | null | undefined, userEmail: string | null | undefined, action: string, details?: string) {
  try {
    const now = Date.now();
    db.prepare(`
      INSERT INTO activity_logs (user_id, user_email, action, details, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId || null, userEmail || null, action, details || null, now);
  } catch (e) {
    console.error("Failed to log activity:", e);
  }
}

export function logSystemError(endpoint: string, errorMessage: string, stack?: string, userId?: string) {
  try {
    const now = Date.now();
    db.prepare(`
      INSERT INTO system_errors (endpoint, error_message, stack, user_id, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(endpoint, errorMessage, stack || null, userId || null, now);
    logActivity(userId, undefined, "system_error", `${endpoint}: ${errorMessage.slice(0, 100)}`);
  } catch (e) {
    console.error("Failed to log system error:", e);
  }
}

export function getSystemErrors(limit = 50) {
  return db.prepare(`
    SELECT * FROM system_errors
    ORDER BY created_at DESC
    LIMIT ?
  `).all(limit);
}

export function clearSystemErrors() {
  db.exec("DELETE FROM system_errors");
}

// Admin Users Management
export function listAllUsers(search = "", roleFilter = "", statusFilter = ""): Omit<DbUser, "password_hash" | "password_salt">[] {
  let query = "SELECT id, name, email, role, status, created_at, last_active_at, is_online FROM users WHERE 1=1";
  const params: any[] = [];

  if (search.trim()) {
    query += " AND (name LIKE ? OR email LIKE ?)";
    params.push(`%${search.trim()}%`, `%${search.trim()}%`);
  }

  if (roleFilter && roleFilter !== "all") {
    query += " AND role = ?";
    params.push(roleFilter);
  }

  if (statusFilter && statusFilter !== "all") {
    query += " AND status = ?";
    params.push(statusFilter);
  }

  query += " ORDER BY created_at DESC";
  return db.prepare(query).all(...params) as any[];
}

export function updateUserRole(userId: string, newRole: "admin" | "user", adminEmail: string) {
  db.prepare("UPDATE users SET role = ? WHERE id = ?").run(newRole, userId);
  logActivity(userId, adminEmail, "role_update", `Changed role to ${newRole}`);
}

export function updateUserStatus(userId: string, newStatus: "active" | "suspended", adminEmail: string) {
  db.prepare("UPDATE users SET status = ? WHERE id = ?").run(newStatus, userId);
  if (newStatus === "suspended") {
    // Invalidate sessions immediately
    db.prepare("DELETE FROM sessions WHERE user_id = ?").run(userId);
    db.prepare("UPDATE users SET is_online = 0 WHERE id = ?").run(userId);
  }
  logActivity(userId, adminEmail, "status_update", `Changed status to ${newStatus}`);
}

// Real-Time Dashboard Statistics
export function getDashboardStats() {
  const now = Date.now();
  const onlineThreshold = now - 60 * 1000; // active in last 60 seconds
  const activeAiThreshold = now - 10 * 60 * 1000; // used AI in last 10 minutes
  const last24h = now - 24 * 60 * 60 * 1000;
  const last7d = now - 7 * 24 * 60 * 60 * 1000;
  const last30d = now - 30 * 24 * 60 * 60 * 1000;

  // Counts
  const totalUsersRow = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  const onlineUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE (is_online = 1 OR last_active_at > ?) AND status = 'active'").get(onlineThreshold) as { count: number };
  
  const activeAiUsersRow = db.prepare(`
    SELECT COUNT(DISTINCT user_id) as count
    FROM activity_logs
    WHERE action IN ('chat_message', 'image_generate', 'voice_query')
      AND created_at > ?
  `).get(activeAiThreshold) as { count: number };

  const newUsers24hRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > ?").get(last24h) as { count: number };
  const newUsers7dRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at > ?").get(last7d) as { count: number };

  const activeUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'active'").get() as { count: number };
  const suspendedUsersRow = db.prepare("SELECT COUNT(*) as count FROM users WHERE status = 'suspended'").get() as { count: number };

  const totalMessagesRow = db.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE action = 'chat_message'").get() as { count: number };
  const totalAiQueriesRow = db.prepare("SELECT COUNT(*) as count FROM activity_logs WHERE action IN ('chat_message', 'image_generate', 'voice_query')").get() as { count: number };

  const totalComplaintsRow = db.prepare("SELECT COUNT(*) as count FROM complaints").get() as { count: number };
  const pendingComplaintsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'pending'").get() as { count: number };
  const resolvedComplaintsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'resolved'").get() as { count: number };
  const inProgressComplaintsRow = db.prepare("SELECT COUNT(*) as count FROM complaints WHERE status = 'in_progress'").get() as { count: number };

  const totalErrorsRow = db.prepare("SELECT COUNT(*) as count FROM system_errors").get() as { count: number };

  // Daily activity for the past 7 days (real counts)
  const dailyActivity: Array<{ date: string; messages: number; registrations: number; logins: number }> = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * 86400000).setHours(0, 0, 0, 0);
    const dayEnd = dayStart + 86400000;
    const dateLabel = new Date(dayStart).toLocaleDateString("en-US", { month: "short", day: "numeric" });

    const messagesCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activity_logs
      WHERE action = 'chat_message' AND created_at >= ? AND created_at < ?
    `).get(dayStart, dayEnd) as { c: number }).c;

    const registrationsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activity_logs
      WHERE action = 'register' AND created_at >= ? AND created_at < ?
    `).get(dayStart, dayEnd) as { c: number }).c;

    const loginsCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activity_logs
      WHERE action = 'login' AND created_at >= ? AND created_at < ?
    `).get(dayStart, dayEnd) as { c: number }).c;

    dailyActivity.push({
      date: dateLabel,
      messages: messagesCount,
      registrations: registrationsCount,
      logins: loginsCount,
    });
  }

  // Weekly activity for past 4 weeks
  const weeklyActivity: Array<{ week: string; queries: number; activeUsers: number }> = [];
  for (let i = 3; i >= 0; i--) {
    const weekStart = now - (i + 1) * 7 * 86400000;
    const weekEnd = now - i * 7 * 86400000;
    const weekLabel = `Week ${4 - i}`;

    const queriesCount = (db.prepare(`
      SELECT COUNT(*) as c FROM activity_logs
      WHERE action IN ('chat_message', 'image_generate', 'voice_query')
        AND created_at >= ? AND created_at < ?
    `).get(weekStart, weekEnd) as { c: number }).c;

    const activeUsersCount = (db.prepare(`
      SELECT COUNT(DISTINCT user_id) as c FROM activity_logs
      WHERE created_at >= ? AND created_at < ? AND user_id IS NOT NULL
    `).get(weekStart, weekEnd) as { c: number }).c;

    weeklyActivity.push({
      week: weekLabel,
      queries: queriesCount,
      activeUsers: activeUsersCount,
    });
  }

  // Monthly activity for past 6 months
  const monthlyActivity: Array<{ month: string; totalActivity: number }> = [];
  for (let i = 5; i >= 0; i--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - i);
    const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getTime();
    const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).getTime();
    const monthLabel = monthDate.toLocaleDateString("en-US", { month: "short", year: "2-digit" });

    const totalActivity = (db.prepare(`
      SELECT COUNT(*) as c FROM activity_logs
      WHERE created_at >= ? AND created_at < ?
    `).get(monthStart, monthEnd) as { c: number }).c;

    monthlyActivity.push({
      month: monthLabel,
      totalActivity,
    });
  }

  // Recent activity logs (last 25 real records)
  const recentLogs = db.prepare(`
    SELECT id, user_id, user_email, action, details, created_at
    FROM activity_logs
    ORDER BY created_at DESC
    LIMIT 25
  `).all();

  // Recent users (last 10 registered)
  const recentUsers = db.prepare(`
    SELECT id, name, email, role, status, created_at, last_active_at, is_online
    FROM users
    ORDER BY created_at DESC
    LIMIT 10
  `).all();

  return {
    totalUsers: totalUsersRow.count,
    onlineUsers: onlineUsersRow.count,
    activeAiUsers: activeAiUsersRow.count,
    newUsers24h: newUsers24hRow.count,
    newUsers7d: newUsers7dRow.count,
    activeUsers: activeUsersRow.count,
    suspendedUsers: suspendedUsersRow.count,
    totalMessages: totalMessagesRow.count,
    totalAiQueries: totalAiQueriesRow.count,
    totalComplaints: totalComplaintsRow.count,
    pendingComplaints: pendingComplaintsRow.count,
    resolvedComplaints: resolvedComplaintsRow.count,
    inProgressComplaints: inProgressComplaintsRow.count,
    totalErrors: totalErrorsRow.count,
    dailyActivity,
    weeklyActivity,
    monthlyActivity,
    recentLogs,
    recentUsers,
  };
}
