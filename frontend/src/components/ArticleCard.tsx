import { useState } from 'react';
import type { Article } from '../types';
import TaskList from './TaskList';

interface ArticleCardProps {
  article: Article;
  plannedTaskIds: string[];
  onAddToPlan: (taskId: string) => void;
  onRemoveFromPlan: (taskId: string) => void;
}

const ArticleCard = ({ article, plannedTaskIds, onAddToPlan, onRemoveFromPlan }: ArticleCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const taskCounts = {
    daily: article.tasks.filter((t) => t.frequency === 'daily').length,
    weekly: article.tasks.filter((t) => t.frequency === 'weekly').length,
    'one-time': article.tasks.filter((t) => t.frequency === 'one-time').length,
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200">
      <div
        className="p-6 cursor-pointer hover:bg-gray-50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-100 text-indigo-700 text-sm font-medium rounded-full">
                {article.project_name}
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              {article.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {article.description}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <svg
              className={`w-6 h-6 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>

        <div className="flex gap-4 mt-4">
          {taskCounts.daily > 0 && (
            <span className="flex items-center gap-1 text-sm text-green-600">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              {taskCounts.daily} Daily
            </span>
          )}
          {taskCounts.weekly > 0 && (
            <span className="flex items-center gap-1 text-sm text-blue-600">
              <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
              {taskCounts.weekly} Weekly
            </span>
          )}
          {taskCounts['one-time'] > 0 && (
            <span className="flex items-center gap-1 text-sm text-purple-600">
              <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
              {taskCounts['one-time']} One-time
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-200 bg-gray-50 p-6">
          <TaskList
            tasks={article.tasks}
            plannedTaskIds={plannedTaskIds}
            onAddToPlan={onAddToPlan}
            onRemoveFromPlan={onRemoveFromPlan}
          />
        </div>
      )}
    </div>
  );
};

export default ArticleCard;
