import axios from 'axios';
import type { Article, UserPlan, UserStats, CalendarTask, AlarmSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// API functions for articles
export const articlesApi = {
  getAll: async (): Promise<Article[]> => {
    const response = await api.get<Article[]>('/articles');
    return response.data;
  },

  getById: async (id: string): Promise<Article> => {
    const response = await api.get<Article>(`/articles/${id}`);
    return response.data;
  },
};

// API functions for user plans
export const plansApi = {
  getUserPlan: async (): Promise<UserPlan[]> => {
    const response = await api.get<UserPlan[]>('/plans');
    return response.data;
  },

  getTaskIdsInPlan: async (): Promise<string[]> => {
    const response = await api.get<string[]>('/plans/task-ids');
    return response.data;
  },

  addTaskToPlan: async (taskId: string): Promise<UserPlan> => {
    const response = await api.post<UserPlan>('/plans', { taskId });
    return response.data;
  },

  removeTaskFromPlan: async (taskId: string): Promise<void> => {
    await api.delete(`/plans/${taskId}`);
  },

  toggleTaskComplete: async (taskId: string): Promise<UserPlan> => {
    const response = await api.patch<UserPlan>(`/plans/${taskId}/toggle`);
    return response.data;
  },

  completeTask: async (taskId: string, cost?: number): Promise<{ plan: UserPlan; pointsAwarded: number }> => {
    const response = await api.patch<{ plan: UserPlan; pointsAwarded: number }>(`/plans/${taskId}/complete`, { cost });
    return response.data;
  },

  uncompleteTask: async (taskId: string): Promise<{ plan: UserPlan; pointsRemoved: number }> => {
    const response = await api.patch<{ plan: UserPlan; pointsRemoved: number }>(`/plans/${taskId}/uncomplete`);
    return response.data;
  },

  getCalendarData: async (year: number, month: number): Promise<CalendarTask[]> => {
    const response = await api.get<CalendarTask[]>(`/plans/calendar?year=${year}&month=${month}`);
    return response.data;
  },

  getUserStats: async (): Promise<UserStats> => {
    const response = await api.get<UserStats>('/plans/stats');
    return response.data;
  },

  getPointValues: async (): Promise<Record<string, number>> => {
    const response = await api.get<Record<string, number>>('/plans/point-values');
    return response.data;
  },
};

// API functions for authentication
export const authApi = {
  register: async (username: string, password: string): Promise<{ token: string; user: any }> => {
    const response = await api.post<{ token: string; user: any }>('/auth/register', { username, password });
    return response.data;
  },

  login: async (username: string, password: string): Promise<{ token: string; user: any }> => {
    const response = await api.post<{ token: string; user: any }>('/auth/login', { username, password });
    return response.data;
  },

  getProfile: async (): Promise<any> => {
    const response = await api.get('/auth/profile');
    return response.data;
  },

  getTelegramStatus: async (): Promise<{ linked: boolean; telegramId?: number; telegramUsername?: string }> => {
    const response = await api.get<{ linked: boolean; telegramId?: number; telegramUsername?: string }>('/auth/telegram-status');
    return response.data;
  },

  generateTelegramLinkCode: async (): Promise<{ code: string; expiresAt: string }> => {
    const response = await api.post<{ code: string; expiresAt: string }>('/auth/telegram-link-code');
    return response.data;
  },

  unlinkTelegram: async (): Promise<void> => {
    await api.delete('/auth/telegram-link');
  },
};

// API functions for alarm settings
export const alarmApi = {
  getSettings: async (): Promise<AlarmSettings> => {
    const response = await api.get<AlarmSettings>('/alarm/settings');
    return response.data;
  },

  updateSettings: async (settings: Partial<AlarmSettings>): Promise<AlarmSettings> => {
    const response = await api.put<AlarmSettings>('/alarm/settings', settings);
    return response.data;
  },
};

// Betting types
export interface RaceCoin {
  id: string;
  race_id: string;
  coin_id: string;
  coin_name: string;
  coin_symbol: string;
  coin_image: string | null;
  start_price: number | null;
  current_price: number | null;
  end_price: number | null;
  percent_change: number | null;
  live_change: number | null;
  is_winner: boolean;
}

export interface Race {
  id: string;
  race_date: string;
  status: 'upcoming' | 'racing' | 'completed';
  coins: RaceCoin[];
  multiplier?: number;
  max_bet?: number;
}

export interface Bet {
  id: string;
  user_id: string;
  race_date: string;
  coin_id: string;
  stake: number;
  payout: number;
  status: 'pending' | 'won' | 'lost';
  created_at: string;
  coin_name?: string;
  coin_symbol?: string;
}

export interface BetHistory extends Bet {
  percent_change?: number;
  coin_won?: boolean;
  race_status?: string;
}

export interface BettingData {
  activeRace: Race | null;
  bettingRace: Race | null;
  yesterdayRace: Race | null;
  completedRaces: Race[];
  userBet: Bet | null;
  userBetHistory: BetHistory[];
  balance: number;
  multiplier: number;
  maxBet: number;
}

export const bettingApi = {
  // Get all betting data (uses Binance API on backend)
  getData: async (): Promise<BettingData> => {
    const response = await api.get<BettingData>('/betting/data');
    return response.data;
  },

  // Place a bet
  placeBet: async (coinId: string, stake: number): Promise<{
    message: string;
    bet: Bet;
    remaining_points: number;
    potential_payout: number;
  }> => {
    const response = await api.post('/betting/place-bet', { coin_id: coinId, stake });
    return response.data;
  },

  // Get balance
  getBalance: async (): Promise<{ points: number }> => {
    const response = await api.get<{ points: number }>('/betting/balance');
    return response.data;
  },
};

// API functions for admin
export const adminApi = {
  getArticles: async (): Promise<Article[]> => {
    const response = await api.get<Article[]>('/admin/articles');
    return response.data;
  },

  createArticle: async (article: Omit<Article, 'id' | 'created_at' | 'tasks'>): Promise<Article> => {
    const response = await api.post<Article>('/admin/articles', article);
    return response.data;
  },

  updateArticle: async (id: string, article: Partial<Article>): Promise<Article> => {
    const response = await api.put<Article>(`/admin/articles/${id}`, article);
    return response.data;
  },

  deleteArticle: async (id: string): Promise<void> => {
    await api.delete(`/admin/articles/${id}`);
  },

  createTask: async (articleId: string, task: any): Promise<any> => {
    const response = await api.post(`/admin/tasks`, { ...task, article_id: articleId });
    return response.data;
  },

  updateTask: async (taskId: string, task: any): Promise<any> => {
    const response = await api.put(`/admin/tasks/${taskId}`, task);
    return response.data;
  },

  deleteTask: async (taskId: string): Promise<void> => {
    await api.delete(`/admin/tasks/${taskId}`);
  },
};

export default api;
