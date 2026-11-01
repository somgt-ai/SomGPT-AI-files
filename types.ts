export type Role = 'user' | 'assistant' | 'system';

export type AppMode = 'standard' | 'image' | 'research' | 'study' | 'religion' | 'code';

export type AppLanguage = 'so' | 'en' | 'ar';

export type AppTheme = 'dark' | 'light' | 'system';

export interface GroundingSource {
  title: string;
  url: string;
  domain?: string;
}

export interface Attachment {
  id: string;
  name: string;
  mimeType: string;
  data: string; // Base64
  previewUrl: string;
  size?: number;
}

export interface GeneratedImage {
  id: string;
  url: string; // data URL (png, jpeg, or svg)
  prompt: string;
  expandedPrompt?: string;
  style?: string;
  isEdited?: boolean;
  originalImageUrl?: string;
  aspectRatio?: string;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  image?: {
    data: string;
    mimeType: string;
    previewUrl?: string;
    name?: string;
  };
  generatedImage?: GeneratedImage;
  sources?: GroundingSource[];
  isStreaming?: boolean;
  statusMessage?: string;
  error?: string;
}

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  messages: ChatMessage[];
  mode: AppMode;
  useSearch?: boolean;
}

export interface AppSettings {
  theme: AppTheme;
  language: AppLanguage;
  autoSearch: boolean;
  ttsVoice: 'Kore' | 'Fenrir' | 'Puck' | 'Charon' | 'Zephyr';
  soundEnabled: boolean;
  imageStyle?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'suspended';
  created_at: number;
  last_active_at: number;
  is_online?: number;
}

export interface ComplaintItem {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  subject: string;
  category: string;
  message: string;
  status: 'pending' | 'in_progress' | 'resolved';
  admin_reply?: string | null;
  replied_at?: number | null;
  replied_by?: string | null;
  created_at: number;
  updated_at: number;
}

export interface SystemErrorItem {
  id: number;
  endpoint: string;
  error_message: string;
  stack?: string | null;
  user_id?: string | null;
  created_at: number;
}

export interface ActivityLogItem {
  id: number;
  user_id?: string | null;
  user_email?: string | null;
  action: string;
  details?: string | null;
  created_at: number;
}

export interface DashboardStats {
  totalUsers: number;
  onlineUsers: number;
  activeAiUsers: number;
  newUsers24h: number;
  newUsers7d: number;
  activeUsers: number;
  suspendedUsers: number;
  totalMessages: number;
  totalAiQueries: number;
  totalComplaints: number;
  pendingComplaints: number;
  resolvedComplaints: number;
  inProgressComplaints: number;
  totalErrors: number;
  dailyActivity: Array<{ date: string; messages: number; registrations: number; logins: number }>;
  weeklyActivity: Array<{ week: string; queries: number; activeUsers: number }>;
  monthlyActivity: Array<{ month: string; totalActivity: number }>;
  recentLogs: ActivityLogItem[];
  recentUsers: UserProfile[];
}

