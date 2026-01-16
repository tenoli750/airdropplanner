import { useState } from 'react';
import type { Task, TaskFrequency } from '../types';
import TaskItem from './TaskItem';

interface TaskListProps {
  tasks: Task[];
  plannedTaskIds: string[];
  onAddToPlan: (taskId: string) => void;
  onRemoveFromPlan: (taskId: string) => void;
}

type FilterType = 'all' | TaskFrequency;

const TaskList = ({ tasks, plannedTaskIds, onAddToPlan, onRemoveFromPlan }: TaskListProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'gray' },
    { key: 'daily', label: 'Daily', color: 'green' },
    { key: 'weekly', label: 'Weekly', color: 'blue' },
    { key: 'one-time', label: 'One-time', color: 'purple' },
  ];

  const filteredTasks = activeFilter === 'all'
    ? tasks
    : tasks.filter((task) => task.frequency === activeFilter);

  const getFilterStyles = (filter: typeof filters[0], isActive: boolean) => {
    if (isActive) {
      switch (filter.color) {
        case 'green':
          return 'bg-green-600 text-white';
        case 'blue':
          return 'bg-blue-600 text-white';
        case 'purple':
          return 'bg-purple-600 text-white';
        default:
          return 'bg-gray-600 text-white';
      }
    }
    switch (filter.color) {
      case 'green':
        return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'blue':
        return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'purple':
        return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      default:
        return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
    }
  };

  return (
    <div>
      <div className="flex gap-2 mb-4">
        {filters.map((filter) => (
          <button
            key={filter.key}
            onClick={() => setActiveFilter(filter.key)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${getFilterStyles(
              filter,
              activeFilter === filter.key
            )}`}
          >
            {filter.label}
            <span className="ml-1 opacity-75">
              ({filter.key === 'all' ? tasks.length : tasks.filter((t) => t.frequency === filter.key).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {filteredTasks.map((task) => (
          <TaskItem
            key={task.id}
            task={task}
            isInPlan={plannedTaskIds.includes(task.id)}
            onAddToPlan={() => onAddToPlan(task.id)}
            onRemoveFromPlan={() => onRemoveFromPlan(task.id)}
          />
        ))}
      </div>

      {filteredTasks.length === 0 && (
        <p className="text-center py-8 text-gray-500">
          No {activeFilter !== 'all' ? activeFilter : ''} tasks available.
        </p>
      )}
    </div>
  );
};

export default TaskList;
