export type TaskFrequency = 'daily' | 'weekly' | 'one-time';

export interface User {
  id: string;
  username: string;
  isAdmin: boolean;
  telegramLinked?: boolean;
  telegramUsername?: string;
}

export interface Task {
  id: string;
  article_id: string;
  title: string;
  description: string | null;
  frequency: TaskFrequency;
  link_url: string | null;
  created_at: string;
}

export interface Article {
  id: string;
  title: string;
  description: string | null;
  project_name: string;
  created_at: string;
  tasks: Task[];
}

export interface UserPlan {
  id: string;
  user_id: string;
  task_id: string;
  added_at: string;
  completed: boolean;
  completed_at: string | null;
  cost: number | null;
  task: {
    id: string;
    article_id: string;
    title: string;
    description: string | null;
    frequency: TaskFrequency;
    link_url: string | null;
  };
  article: {
    id: string;
    title: string;
    project_name: string;
  };
}

export interface UserStats {
  totalPoints: number;
  totalCost: number;
  completedCount: number;
}

export interface CalendarTask {
  id: string;
  task_id: string;
  completed: boolean;
  completed_at: string | null;
  cost: number | null;
  added_at: string;
  task_title: string;
  frequency: TaskFrequency;
  project_name: string;
}

export interface AlarmSettings {
  alarm_enabled: boolean;
  alarm_time: string;
  timezone: string;
  telegram_linked: boolean;
}

export const POINTS_BY_FREQUENCY: Record<TaskFrequency, number> = {
  'daily': 100,
  'weekly': 500,
  'one-time': 1000,
};
