const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken(): string | null {
  return localStorage.getItem('simon.token');
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    localStorage.removeItem('simon.token');
    localStorage.removeItem('simon.user');
    if (!location.pathname.startsWith('/login')) location.href = '/login';
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get: <T>(p: string) => request<T>(p),
  post: <T>(p: string, body?: unknown) =>
    request<T>(p, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(p: string) => request<T>(p, { method: 'DELETE' }),
};

// ==== Types ====
export type Channel = 'WEB' | 'WHATSAPP' | 'INSTAGRAM';
export type ConvStatus = 'OPEN' | 'CLOSED';
export type MessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  org: { id: string; name: string };
}

export interface ConversationListItem {
  id: string;
  title: string | null;
  channel: Channel;
  status: ConvStatus;
  rating: number | null;
  startedAt: string;
  endedAt: string | null;
  durationSec: number | null;
  messageCount: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  promptId: string | null;
  latencyMs: number | null;
  createdAt: string;
}

export interface ConversationDetail extends ConversationListItem {
  messages: Message[];
}

export interface Prompt {
  id: string;
  name: string;
  content: string;
  isDefault: boolean;
  createdAt: string;
}

export interface SummaryDto {
  conversations: { today: number; yesterday: number; week: number; prevWeek: number; month: number };
  satisfactionRate: number | null;
  prevSatisfactionRate: number | null;
  avgRating: number | null;
  avgLatencySec: number | null;
  prevAvgLatencySec: number | null;
}

export interface TrendPoint { date: string; count: number }

export interface RatingBuckets {
  total: number;
  buckets: { rating: number; count: number; percentage: number }[];
}

export interface ChannelDistribution {
  total: number;
  items: { channel: Channel; count: number; percentage: number }[];
}

export interface WorstPrompt {
  promptId: string;
  name: string;
  avgRating: number;
  samples: number;
}
