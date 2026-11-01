import { UserProfile, Conversation, ComplaintItem, DashboardStats, SystemErrorItem } from '../types';

const TOKEN_KEY = 'somgpt_auth_token_v1';
const USER_KEY = 'somgpt_auth_user_v1';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getStoredUser(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export function setStoredAuth(token: string, user: UserProfile): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } catch (e) {
    console.error('Failed to save auth to localStorage:', e);
  }
}

export function clearStoredAuth(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

export function authHeaders(): Record<string, string> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

// 1. Auth API
export async function apiRegister(name: string, email: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Registration failed');
  }
  setStoredAuth(data.token, data.user);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<{ user: UserProfile; token: string }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Login failed');
  }
  setStoredAuth(data.token, data.user);
  return data;
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch (e) {
    console.warn('Logout request warning:', e);
  } finally {
    clearStoredAuth();
  }
}

export async function apiGetCurrentUser(): Promise<UserProfile | null> {
  const token = getStoredToken();
  if (!token) return null;

  try {
    const res = await fetch('/api/auth/me', {
      headers: authHeaders(),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        setStoredAuth(token, data.user);
        return data.user;
      }
    } else {
      clearStoredAuth();
    }
  } catch {
    // If offline or network error, return stored user if any
    return getStoredUser();
  }
  return null;
}

export async function apiForgotPassword(email: string): Promise<{ success: boolean; message: string; resetCode?: string }> {
  const res = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to initiate password reset');
  }
  return data;
}

export async function apiResetPassword(email: string, code: string, newPassword: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, code, newPassword }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reset password');
  }
  return data;
}

export async function apiSendHeartbeat(): Promise<void> {
  try {
    await fetch('/api/heartbeat', {
      method: 'POST',
      headers: authHeaders(),
    });
  } catch {}
}

// 2. Private User Conversations API
export async function apiGetConversations(): Promise<Conversation[]> {
  const token = getStoredToken();
  if (!token) return [];

  const res = await fetch('/api/conversations', {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.conversations || [];
}

export async function apiSaveConversation(conversation: Conversation): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  await fetch('/api/conversations', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ conversation }),
  });
}

export async function apiSyncConversations(conversations: Conversation[]): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  await fetch('/api/conversations/sync', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ conversations }),
  });
}

export async function apiDeleteConversation(id: string): Promise<void> {
  const token = getStoredToken();
  if (!token) return;

  await fetch(`/api/conversations/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
}

// 3. Complaints / Feedback API
export async function apiSubmitComplaint(subject: string, category: string, message: string): Promise<ComplaintItem> {
  const res = await fetch('/api/complaints', {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ subject, category, message }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to submit complaint');
  }
  return data.complaint;
}

export async function apiGetMyComplaints(): Promise<ComplaintItem[]> {
  const res = await fetch('/api/complaints/my', {
    headers: authHeaders(),
  });
  if (!res.ok) return [];
  const data = await res.json();
  return data.complaints || [];
}

// 4. Admin API
export async function apiGetAdminDashboard(): Promise<DashboardStats> {
  const res = await fetch('/api/admin/dashboard', {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to load dashboard');
  }
  return data;
}

export async function apiGetAdminUsers(search = '', role = '', status = ''): Promise<UserProfile[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (role) params.set('role', role);
  if (status) params.set('status', status);

  const res = await fetch(`/api/admin/users?${params.toString()}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch users');
  }
  return data.users || [];
}

export async function apiUpdateUserRole(userId: string, role: 'admin' | 'user'): Promise<void> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/role`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ role }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update role');
  }
}

export async function apiUpdateUserStatus(userId: string, status: 'active' | 'suspended'): Promise<void> {
  const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update status');
  }
}

export async function apiGetAdminComplaints(status = 'all'): Promise<ComplaintItem[]> {
  const res = await fetch(`/api/admin/complaints?status=${encodeURIComponent(status)}`, {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to fetch complaints');
  }
  return data.complaints || [];
}

export async function apiReplyComplaint(id: string, reply: string, status?: string): Promise<ComplaintItem> {
  const res = await fetch(`/api/admin/complaints/${encodeURIComponent(id)}/reply`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ reply, status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to reply to complaint');
  }
  return data.complaint;
}

export async function apiUpdateComplaintStatus(id: string, status: 'pending' | 'in_progress' | 'resolved'): Promise<void> {
  const res = await fetch(`/api/admin/complaints/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: authHeaders(),
    body: JSON.stringify({ status }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update complaint status');
  }
}

export async function apiGetAdminErrors(): Promise<SystemErrorItem[]> {
  const res = await fetch('/api/admin/errors', {
    headers: authHeaders(),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to get system errors');
  }
  return data.errors || [];
}

export async function apiClearAdminErrors(): Promise<void> {
  const res = await fetch('/api/admin/errors', {
    method: 'DELETE',
    headers: authHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to clear errors');
  }
}
