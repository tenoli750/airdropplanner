import { useState, useEffect } from 'react';
import type { UserPlan, TaskFrequency, UserStats, Wallet, TaskWallet } from '../types';
import { plansApi, walletsApi } from '../services/api';
import { POINTS_BY_FREQUENCY } from '../types';
import WalletModal from '../components/WalletModal';

type FilterType = 'all' | TaskFrequency;

// Task-wallet assignments map: taskId -> walletIds[]
interface TaskWalletsMap {
  [taskId: string]: TaskWallet[];
}

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
  const [timeInput, setTimeInput] = useState('');
  const [completing, setCompleting] = useState(false);
  const [pointsToast, setPointsToast] = useState<{ points: number; show: boolean }>({ points: 0, show: false });

  // Wallet system state (new)
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [taskWalletsMap, setTaskWalletsMap] = useState<TaskWalletsMap>({});
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [walletModalTaskId, setWalletModalTaskId] = useState<string | null>(null);

  // Fetch wallets and task-wallet assignments
  useEffect(() => {
    const fetchWalletData = async () => {
      try {
        const [walletsData, taskWalletsData] = await Promise.all([
          walletsApi.getAll(),
          walletsApi.getAllTaskWallets(),
        ]);
        setWallets(walletsData);

        // Group task wallets by taskId
        const map: TaskWalletsMap = {};
        taskWalletsData.forEach(tw => {
          if (!map[tw.task_id]) {
            map[tw.task_id] = [];
          }
          map[tw.task_id].push(tw);
        });
        setTaskWalletsMap(map);
      } catch (err) {
        console.error('Failed to fetch wallet data:', err);
      }
    };
    fetchWalletData();
  }, []);

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

  // Get wallets for a task
  const getTaskWallets = (taskId: string): TaskWallet[] => {
    return taskWalletsMap[taskId] || [];
  };

  // Get assigned wallet IDs for a task
  const getAssignedWalletIds = (taskId: string): string[] => {
    return getTaskWallets(taskId).map(tw => tw.wallet_id);
  };

  // Open wallet modal for a task
  const openWalletModal = (taskId: string) => {
    setWalletModalTaskId(taskId);
    setShowWalletModal(true);
  };

  // Handle wallets assigned to task
  const handleWalletsAssigned = (newTaskWallets: TaskWallet[]) => {
    if (!walletModalTaskId) return;

    setTaskWalletsMap(prev => {
      const existing = prev[walletModalTaskId] || [];
      const newIds = new Set(newTaskWallets.map(tw => tw.wallet_id));
      const merged = [...existing.filter(tw => !newIds.has(tw.wallet_id)), ...newTaskWallets];
      return { ...prev, [walletModalTaskId]: merged };
    });
  };

  // Handle new wallet created
  const handleWalletCreated = (wallet: Wallet) => {
    setWallets(prev => [...prev, wallet]);
  };

  // Remove wallet from task
  const handleRemoveWalletFromTask = async (taskId: string, walletId: string) => {
    try {
      await walletsApi.removeWalletFromTask(taskId, walletId);
      setTaskWalletsMap(prev => ({
        ...prev,
        [taskId]: (prev[taskId] || []).filter(tw => tw.wallet_id !== walletId),
      }));
    } catch (err) {
      console.error('Failed to remove wallet from task:', err);
    }
  };

  const openCompleteModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCostInput('');
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const minutes = now.getMinutes().toString().padStart(2, '0');
    setTimeInput(`${hours}:${minutes}`);
    setShowCompleteModal(true);
  };

  const handleCompleteTask = async () => {
    if (!selectedTaskId) return;

    try {
      setCompleting(true);
      const cost = costInput ? parseFloat(costInput) : undefined;

      let completedAt: string | undefined;
      if (timeInput) {
        const [hours, minutes] = timeInput.split(':').map(Number);
        const now = new Date();
        now.setHours(hours, minutes, 0, 0);
        completedAt = now.toISOString();
      }

      const result = await plansApi.completeTask(selectedTaskId, cost, completedAt);

      setPlans((prev) =>
        prev.map((plan) =>
          plan.task_id === selectedTaskId
            ? { ...plan, completed: true, completed_at: result.plan.completed_at, cost: result.plan.cost }
            : plan
        )
      );

      if (stats && result.pointsAwarded > 0) {
        setStats({
          ...stats,
          totalPoints: stats.totalPoints + result.pointsAwarded,
          totalCost: stats.totalCost + (cost || 0),
          completedCount: stats.completedCount + 1,
        });

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
      // Also clean up task wallets
      setTaskWalletsMap(prev => {
        const newMap = { ...prev };
        delete newMap[taskId];
        return newMap;
      });
    } catch (err) {
      console.error('Failed to remove task from plan:', err);
    }
  };

  const sortedPlans = [...plans].sort((a, b) => {
    if (a.completed !== b.completed) {
      return a.completed ? 1 : -1;
    }
    return frequencyOrder[a.task.frequency] - frequencyOrder[b.task.frequency];
  });

  const filteredPlans =
    activeFilter === 'all'
      ? sortedPlans
      : sortedPlans.filter((plan) => plan.task.frequency === activeFilter);

  const filters: { key: FilterType; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: 'gray' },
    { key: 'daily', label: 'Daily', color: 'green' },
    { key: 'weekly', label: 'Weekly', color: 'blue' },
    { key: 'one-time', label: 'One-time', color: 'purple' },
  ];

  const getFilterStyles = (filter: typeof filters[0], isActive: boolean) => {
    if (isActive) {
      switch (filter.color) {
        case 'green': return 'bg-green-600 text-white';
        case 'blue': return 'bg-blue-600 text-white';
        case 'purple': return 'bg-purple-600 text-white';
        default: return 'bg-gray-600 text-white';
      }
    }
    switch (filter.color) {
      case 'green': return 'bg-green-100 text-green-700 hover:bg-green-200';
      case 'blue': return 'bg-blue-100 text-blue-700 hover:bg-blue-200';
      case 'purple': return 'bg-purple-100 text-purple-700 hover:bg-purple-200';
      default: return 'bg-gray-100 text-gray-700 hover:bg-gray-200';
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
            +{pointsToast.points} Points!
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
          const taskWallets = getTaskWallets(plan.task_id);

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border border-gray-200 border-l-4 ${styles.border} p-4 hover:shadow-md transition-shadow ${
                plan.completed ? 'opacity-60' : ''
              }`}
            >
              {/* Single row: Project | Title | Badges | Buttons */}
              <div className="flex items-center gap-3">
                {/* Project name */}
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  {plan.article.project_name}
                </span>
                <span className="text-gray-300">|</span>

                {/* Task title */}
                <h3
                  className={`font-bold text-base whitespace-nowrap ${
                    plan.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                  }`}
                >
                  {plan.task.title}
                </h3>

                {/* Completed time */}
                {plan.completed && plan.completed_at && (
                  <span className="text-xs text-green-600 whitespace-nowrap">
                    {new Date(plan.completed_at).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}

                {/* Link URL */}
                {plan.task.link_url && (
                  <a
                    href={plan.task.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                    title={plan.task.link_url}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}

                {/* Badges */}
                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${styles.badge}`}>
                    {plan.task.frequency}
                  </span>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                    +{points}p
                  </span>
                  {taskWallets.map(tw => (
                    <span
                      key={tw.id}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700"
                    >
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                      {tw.wallet?.name || tw.wallet?.address || 'N/A'}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveWalletFromTask(plan.task_id, tw.wallet_id);
                        }}
                        className="ml-0.5 hover:text-red-500 transition-colors"
                        title="지갑 제거"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                  {plan.completed && plan.cost && (
                    <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">
                      {formatCurrency(plan.cost)}
                    </span>
                  )}
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => plan.completed ? handleUncompleteTask(plan.task_id) : openCompleteModal(plan.task_id)}
                    className={`p-2 rounded-lg ${
                      plan.completed
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-green-100 hover:text-green-600'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openWalletModal(plan.task_id)}
                    className={`p-2 rounded-lg ${
                      taskWallets.length > 0
                        ? 'bg-indigo-500 text-white'
                        : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                    }`}
                    title="지갑 관리"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleRemoveFromPlan(plan.task_id)}
                    className="p-2 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Description */}
              {plan.task.description && (
                <p className="mt-2 text-sm text-gray-500">
                  {plan.task.description}
                </p>
              )}
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
                완료 시간
              </label>
              <input
                type="time"
                value={timeInput}
                onChange={(e) => setTimeInput(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                태스크를 완료한 시간을 입력하세요
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비용 (선택사항)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">W</span>
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
                {completing ? '처리중...' : '완료'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Wallet Modal */}
      {walletModalTaskId && (
        <WalletModal
          isOpen={showWalletModal}
          onClose={() => {
            setShowWalletModal(false);
            setWalletModalTaskId(null);
          }}
          taskId={walletModalTaskId}
          existingWallets={wallets}
          assignedWalletIds={getAssignedWalletIds(walletModalTaskId)}
          onWalletsAssigned={handleWalletsAssigned}
          onWalletCreated={handleWalletCreated}
          onWalletRemoved={(walletId) => handleRemoveWalletFromTask(walletModalTaskId, walletId)}
        />
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

