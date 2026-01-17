import { useState, useEffect } from 'react';
import type { UserPlan, TaskFrequency, UserStats } from '../types';
import { plansApi } from '../services/api';
import { POINTS_BY_FREQUENCY } from '../types';

type FilterType = 'all' | TaskFrequency;

const frequencyOrder: Record<TaskFrequency, number> = {
  daily: 1,
  weekly: 2,
  'one-time': 3,
};

const frequencyStyles = {
  daily: {
    badge: 'bg-green-100 text-green-700',
    border: 'border-l-green-500',
  },
  weekly: {
    badge: 'bg-blue-100 text-blue-700',
    border: 'border-l-blue-500',
  },
  'one-time': {
    badge: 'bg-purple-100 text-purple-700',
    border: 'border-l-purple-500',
  },
};

const PlanPage = () => {
  const [plans, setPlans] = useState<UserPlan[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  
  // Complete task modal state
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [costInput, setCostInput] = useState('');
  const [completing, setCompleting] = useState(false);
  const [pointsToast, setPointsToast] = useState<{ points: number; show: boolean }>({ points: 0, show: false });

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setLoading(true);
        const [plansData, statsData] = await Promise.all([
          plansApi.getUserPlan(),
          plansApi.getUserStats(),
        ]);
        setPlans(plansData);
        setStats(statsData);
      } catch (err) {
        setError('Failed to load your plan. Please try again later.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchPlans();
  }, []);

  const openCompleteModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCostInput('');
    setShowCompleteModal(true);
  };

  const handleCompleteTask = async () => {
    if (!selectedTaskId) return;
    
    try {
      setCompleting(true);
      const cost = costInput ? parseFloat(costInput) : undefined;
      const result = await plansApi.completeTask(selectedTaskId, cost);
      
      setPlans((prev) =>
        prev.map((plan) =>
          plan.task_id === selectedTaskId
            ? { ...plan, completed: true, completed_at: result.plan.completed_at, cost: result.plan.cost }
            : plan
        )
      );
      
      // Update stats
      if (stats && result.pointsAwarded > 0) {
        setStats({
          ...stats,
          totalPoints: stats.totalPoints + result.pointsAwarded,
          totalCost: stats.totalCost + (cost || 0),
          completedCount: stats.completedCount + 1,
        });
        
        // Show points toast
        setPointsToast({ points: result.pointsAwarded, show: true });
        setTimeout(() => setPointsToast({ points: 0, show: false }), 2000);
      }
      
      setShowCompleteModal(false);
    } catch (err) {
      console.error('Failed to complete task:', err);
    } finally {
      setCompleting(false);
    }
  };

  const handleUncompleteTask = async (taskId: string) => {
    try {
      const plan = plans.find(p => p.task_id === taskId);
      if (!plan) return;
      
      await plansApi.uncompleteTask(taskId);
      
      const points = POINTS_BY_FREQUENCY[plan.task.frequency];
      
      setPlans((prev) =>
        prev.map((p) =>
          p.task_id === taskId
            ? { ...p, completed: false, completed_at: null, cost: null }
            : p
        )
      );
      
      // Update stats
      if (stats) {
        setStats({
          ...stats,
          totalPoints: Math.max(0, stats.totalPoints - points),
          totalCost: stats.totalCost - (plan.cost || 0),
          completedCount: Math.max(0, stats.completedCount - 1),
        });
      }
    } catch (err) {
      console.error('Failed to uncomplete task:', err);
    }
  };

  const handleRemoveFromPlan = async (taskId: string) => {
    try {
      await plansApi.removeTaskFromPlan(taskId);
      setPlans((prev) => prev.filter((plan) => plan.task_id !== taskId));
    } catch (err) {
      console.error('Failed to remove task from plan:', err);
    }
  };

  const filteredPlans = (activeFilter === 'all'
    ? plans
    : plans.filter((plan) => plan.task.frequency === activeFilter)
  ).sort((a, b) => frequencyOrder[a.task.frequency] - frequencyOrder[b.task.frequency]);

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'gray' },
    { key: 'daily', label: 'Daily', color: 'green' },
    { key: 'weekly', label: 'Weekly', color: 'blue' },
    { key: 'one-time', label: 'One-time', color: 'purple' },
  ];

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

  const completedCount = plans.filter((p) => p.completed).length;
  const totalCount = plans.length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(amount);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Points Toast */}
      {pointsToast.show && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
          <div className="bg-amber-500 text-white px-6 py-3 rounded-full shadow-lg font-bold text-lg">
            +{pointsToast.points} Points! 🎉
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl p-4 text-white">
            <div className="text-xs opacity-90">포인트</div>
            <div className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</div>
          </div>
          <div className="bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl p-4 text-white">
            <div className="text-xs opacity-90">완료</div>
            <div className="text-2xl font-bold">{stats.completedCount}개</div>
          </div>
          <div className="bg-gradient-to-br from-rose-400 to-pink-500 rounded-xl p-4 text-white">
            <div className="text-xs opacity-90">비용</div>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCost)}</div>
          </div>
        </div>
      )}

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Airdrop Plan</h1>
        <p className="text-gray-600">
          Track and complete your airdrop tasks.
        </p>

        {totalCount > 0 && (
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${(completedCount / totalCount) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-600">
              {completedCount}/{totalCount} completed
            </span>
          </div>
        )}
      </div>

      {plans.length > 0 && (
        <div className="flex gap-2 mb-6">
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
                ({filter.key === 'all' ? plans.length : plans.filter((p) => p.task.frequency === filter.key).length})
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {filteredPlans.map((plan) => {
          const styles = frequencyStyles[plan.task.frequency];
          const points = POINTS_BY_FREQUENCY[plan.task.frequency];
          return (
            <div
              key={plan.id}
              className={`bg-white rounded-lg border border-gray-200 border-l-4 ${styles.border} p-4 hover:shadow-md transition-shadow ${
                plan.completed ? 'opacity-75' : ''
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                {/* Left: Checkbox */}
                <button
                  onClick={() => plan.completed ? handleUncompleteTask(plan.task_id) : openCompleteModal(plan.task_id)}
                  className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                    plan.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-gray-400'
                  }`}
                >
                  {plan.completed && (
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>

                {/* Center: Task Info - Horizontal Layout */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3
                      className={`font-semibold text-base ${
                        plan.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                      }`}
                    >
                      {plan.task.title}
                    </h3>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles.badge} whitespace-nowrap`}>
                      {plan.task.frequency}
                    </span>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-amber-100 text-amber-700 whitespace-nowrap">
                      +{points}p
                    </span>
                    {plan.completed && plan.cost && (
                      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-rose-100 text-rose-700 whitespace-nowrap">
                        비용: {formatCurrency(plan.cost)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
                    <span className="font-medium text-gray-700">{plan.article.project_name}</span>
                    <span className="text-gray-400">•</span>
                    <span className="truncate">{plan.article.title}</span>
                    {plan.task.link_url && (
                      <>
                        <span className="text-gray-400">•</span>
                        <a
                          href={plan.task.link_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 whitespace-nowrap"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                            />
                          </svg>
                          링크
                        </a>
                      </>
                    )}
                  </div>
                  {plan.task.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{plan.task.description}</p>
                  )}
                </div>

                {/* Right: Delete Button */}
                <button
                  onClick={() => handleRemoveFromPlan(plan.task_id)}
                  className="text-gray-400 hover:text-red-500 transition-colors p-2 flex-shrink-0"
                  title="Remove from plan"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Complete Task Modal */}
      {showCompleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-4">태스크 완료</h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비용 (선택사항)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₩</span>
                <input
                  type="number"
                  value={costInput}
                  onChange={(e) => setCostInput(e.target.value)}
                  placeholder="0"
                  className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                이 태스크에 사용한 비용을 입력하세요 (예: 가스비, 수수료 등)
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCompleteModal(false)}
                className="flex-1 px-4 py-3 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCompleteTask}
                disabled={completing}
                className="flex-1 px-4 py-3 text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {completing ? '처리중...' : '완료 ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {plans.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks in your plan</h3>
          <p className="text-gray-500 mb-4">
            Browse articles and add tasks to start building your airdrop plan.
          </p>
          <a
            href="/"
            className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Browse Articles
          </a>
        </div>
      )}

      {filteredPlans.length === 0 && plans.length > 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No {activeFilter} tasks in your plan.</p>
        </div>
      )}
    </div>
  );
};

export default PlanPage;
