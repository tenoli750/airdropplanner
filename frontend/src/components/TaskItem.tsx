import type { Task } from '../types';
import AddToPlanButton from './AddToPlanButton';

interface TaskItemProps {
  task: Task;
  isInPlan: boolean;
  onAddToPlan: () => void;
  onRemoveFromPlan: () => void;
}

const frequencyStyles = {
  daily: {
    badge: 'bg-green-100 text-green-700',
    dot: 'bg-green-500',
  },
  weekly: {
    badge: 'bg-blue-100 text-blue-700',
    dot: 'bg-blue-500',
  },
  'one-time': {
    badge: 'bg-purple-100 text-purple-700',
    dot: 'bg-purple-500',
  },
};

const TaskItem = ({ task, isInPlan, onAddToPlan, onRemoveFromPlan }: TaskItemProps) => {
  const styles = frequencyStyles[task.frequency];

  return (
    <div className="flex items-start justify-between p-4 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-medium text-gray-900">{task.title}</h4>
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge}`}>
            {task.frequency}
          </span>
        </div>
        {task.description && (
          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
        )}
        {task.link_url && (
          <a
            href={task.link_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            Open Link
          </a>
        )}
      </div>
      <div className="ml-4 flex-shrink-0">
        <AddToPlanButton
          isInPlan={isInPlan}
          onAdd={onAddToPlan}
          onRemove={onRemoveFromPlan}
        />
      </div>
    </div>
  );
};

export default TaskItem;
