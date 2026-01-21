import { useState, useEffect, useRef } from 'react';
import type { UserPlan, TaskFrequency, UserStats, Wallet } from '../types';
import { plansApi, walletsApi } from '../services/api';
import { POINTS_BY_FREQUENCY } from '../types';

type FilterType = 'all' | TaskFrequency;

interface TaskWallets {
  [taskId: string]: string; // taskId -> walletId
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

  // Wallet management state - per task
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [taskWallets, setTaskWallets] = useState<TaskWallets>(() => {
    const saved = localStorage.getItem('taskWallets');
    return saved ? JSON.parse(saved) : {};
  });
  const [openWalletDropdown, setOpenWalletDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Wallet edit state
  const [editingWalletId, setEditingWalletId] = useState<string | null>(null);
  const [editingWalletName, setEditingWalletName] = useState('');
  const [newWalletName, setNewWalletName] = useState('');
  const [showAddWallet, setShowAddWallet] = useState(false);

  // Fetch wallets from API and ensure default wallet exists
  useEffect(() => {
    const fetchWallets = async () => {
      try {
        const data = await walletsApi.getAll();
        // Ensure default wallet "W001" exists
        let defaultWallet = data.find(w => w.name === 'W001');
        if (!defaultWallet) {
          try {
            defaultWallet = await walletsApi.create('W001');
            setWallets([defaultWallet, ...data]);
          } catch (err) {
            console.error('Failed to create default wallet:', err);
            setWallets(data);
          }
        } else {
          setWallets(data);
        }
      } catch (err) {
        console.error('Failed to fetch wallets:', err);
      }
    };
    fetchWallets();
  }, []);

  // Save taskWallets to localStorage
  useEffect(() => {
    localStorage.setItem('taskWallets', JSON.stringify(taskWallets));
  }, [taskWallets]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenWalletDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
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

  // Assign default wallet "W001" to all tasks that don't have a wallet
  useEffect(() => {
    if (wallets.length === 0 || plans.length === 0) return;

    const defaultWallet = wallets.find(w => w.name === 'W001');
    if (!defaultWallet) return;

    setTaskWallets(prev => {
      const updatedTaskWallets: TaskWallets = { ...prev };
      let hasChanges = false;

      plans.forEach(plan => {
        if (!updatedTaskWallets[plan.task_id]) {
          updatedTaskWallets[plan.task_id] = defaultWallet.id;
          hasChanges = true;
        }
      });

      return hasChanges ? updatedTaskWallets : prev;
    });
  }, [wallets, plans]);

  // Wallet management functions
  const handleAddWallet = async () => {
    if (!newWalletName.trim() || newWalletName.length > 4) return;
    try {
      const wallet = await walletsApi.create(newWalletName.trim());
      setWallets([...wallets, wallet]);
      setNewWalletName('');
      setShowAddWallet(false);
    } catch (err) {
      console.error('Failed to add wallet:', err);
    }
  };

  const handleEditWallet = async (id: string) => {
    if (!editingWalletName.trim() || editingWalletName.length > 4) return;
    try {
      const updated = await walletsApi.update(id, editingWalletName.trim());
      setWallets(wallets.map(w => w.id === id ? updated : w));
      setEditingWalletId(null);
      setEditingWalletName('');
    } catch (err) {
      console.error('Failed to update wallet:', err);
    }
  };

  const handleDeleteWallet = async (id: string) => {
    try {
      await walletsApi.delete(id);
      setWallets(wallets.filter(w => w.id !== id));
      // Remove from task assignments
      setTaskWallets(prev => {
        const newTaskWallets = { ...prev };
        Object.keys(newTaskWallets).forEach(taskId => {
          if (newTaskWallets[taskId] === id) {
            delete newTaskWallets[taskId];
          }
        });
        return newTaskWallets;
      });
    } catch (err) {
      console.error('Failed to delete wallet:', err);
    }
  };

  const selectWalletForTask = (taskId: string, walletId: string) => {
    setTaskWallets(prev => ({ ...prev, [taskId]: walletId }));
    setOpenWalletDropdown(null);
  };

  const addWalletAndSelectForTask = async (taskId: string) => {
    try {
      const wallet = await walletsApi.create('W' + String(wallets.length + 1).padStart(3, '0'));
      setWallets([...wallets, wallet]);
      selectWalletForTask(taskId, wallet.id);
    } catch (err) {
      console.error('Failed to add wallet:', err);
    }
  };

  const getTaskWallet = (taskId: string): Wallet | null => {
    const walletId = taskWallets[taskId];
    if (!walletId) return null;
    return wallets.find(w => w.id === walletId) || null;
  };

  const openCompleteModal = (taskId: string) => {
    setSelectedTaskId(taskId);
    setCostInput('');
    // Default to current time in HH:MM format
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

      // Build completed_at timestamp from time input
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
      // Remove wallet assignment for this task
      setTaskWallets(prev => {
        const newTaskWallets = { ...prev };
        delete newTaskWallets[taskId];
        return newTaskWallets;
      });
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

      {/* Wallet Management Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-8">
        <h2 className="text-lg font-bold text-gray-900 mb-3">지갑 관리</h2>
        <div className="flex flex-wrap items-center gap-2">
          {wallets.map((wallet) => (
            <div
              key={wallet.id}
              className="flex items-center gap-2 bg-indigo-50 rounded-lg px-3 py-2"
            >
              {editingWalletId === wallet.id ? (
                <>
                  <input
                    type="text"
                    value={editingWalletName}
                    onChange={(e) => setEditingWalletName(e.target.value.slice(0, 4))}
                    maxLength={4}
                    className="w-16 px-2 py-1 text-sm border border-indigo-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleEditWallet(wallet.id);
                      if (e.key === 'Escape') setEditingWalletId(null);
                    }}
                  />
                  <button
                    onClick={() => handleEditWallet(wallet.id)}
                    className="p-1 text-green-600 hover:bg-green-100 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setEditingWalletId(null)}
                    className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm font-medium text-indigo-700">{wallet.name}</span>
                  <button
                    onClick={() => {
                      setEditingWalletId(wallet.id);
                      setEditingWalletName(wallet.name);
                    }}
                    className="p-1 text-indigo-500 hover:bg-indigo-100 rounded"
                    title="Edit"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteWallet(wallet.id)}
                    className="p-1 text-red-500 hover:bg-red-100 rounded"
                    title="Delete"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            </div>
          ))}

          {/* Add Wallet Button */}
          {showAddWallet ? (
            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <input
                type="text"
                value={newWalletName}
                onChange={(e) => setNewWalletName(e.target.value.slice(0, 4))}
                maxLength={4}
                placeholder="4자"
                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddWallet();
                  if (e.key === 'Escape') {
                    setShowAddWallet(false);
                    setNewWalletName('');
                  }
                }}
              />
              <button
                onClick={handleAddWallet}
                disabled={!newWalletName.trim()}
                className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
              <button
                onClick={() => {
                  setShowAddWallet(false);
                  setNewWalletName('');
                }}
                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowAddWallet(true)}
              className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              추가
            </button>
          )}
        </div>
      </div>

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
          const taskWallet = getTaskWallet(plan.task_id);
          const isDropdownOpen = openWalletDropdown === plan.task_id;

          return (
            <div
              key={plan.id}
              className={`bg-white rounded-xl border border-gray-200 border-l-4 ${styles.border} p-4 hover:shadow-md transition-shadow ${
                plan.completed ? 'opacity-60' : ''
              }`}
            >
              {/* Row 1: Title and Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <h3
                    className={`font-bold text-base ${
                      plan.completed ? 'text-gray-400 line-through' : 'text-gray-900'
                    }`}
                  >
                    {plan.task.title}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
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
                  <div className="relative" ref={isDropdownOpen ? dropdownRef : null}>
                    <button
                      onClick={() => setOpenWalletDropdown(isDropdownOpen ? null : plan.task_id)}
                      className={`p-2 rounded-lg ${
                        taskWallet
                          ? 'bg-indigo-500 text-white'
                          : 'bg-gray-100 text-gray-400 hover:bg-indigo-100 hover:text-indigo-600'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                      </svg>
                    </button>
                    {isDropdownOpen && (
                      <div className="absolute right-0 top-full mt-1 min-w-[160px] bg-white rounded-lg shadow-xl border py-1 z-50">
                        {wallets.map((wallet) => (
                          <button
                            key={wallet.id}
                            onClick={() => selectWalletForTask(plan.task_id, wallet.id)}
                            className={`w-full px-3 py-2 text-left text-sm flex items-center justify-between whitespace-nowrap ${
                              taskWallet?.id === wallet.id ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-gray-50'
                            }`}
                          >
                            <span className="truncate">{wallet.name}</span>
                            {taskWallet?.id === wallet.id && <span className="ml-2 flex-shrink-0">✓</span>}
                          </button>
                        ))}
                        <hr className="my-1" />
                        <button
                          onClick={() => addWalletAndSelectForTask(plan.task_id)}
                          className="w-full px-3 py-2 text-left text-sm text-indigo-600 hover:bg-indigo-50 whitespace-nowrap flex items-center"
                        >
                          <span>+ 새 지갑</span>
                        </button>
                      </div>
                    )}
                  </div>
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

              {/* Row 2: Badges */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles.badge}`}>
                  {plan.task.frequency}
                </span>
                <span className="px-2 py-1 text-xs font-bold rounded-full bg-amber-100 text-amber-700">
                  +{points}p
                </span>
                {taskWallet && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-100 text-indigo-700">
                    {taskWallet.name}
                  </span>
                )}
                {plan.completed && plan.cost && (
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-rose-100 text-rose-700">
                    {formatCurrency(plan.cost)}
                  </span>
                )}
              </div>

              {/* Row 3: Project Info */}
              <div style={{ marginTop: '8px' }} className="text-sm text-gray-600">
                <span className="font-medium">{plan.article.project_name}</span>
                <span className="mx-2 text-gray-300">|</span>
                <span className="text-gray-500">{plan.article.title}</span>
                {plan.task.link_url && (
                  <a
                    href={plan.task.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="ml-2 text-indigo-600 hover:text-indigo-800"
                  >
                    링크 →
                  </a>
                )}
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
                {completing ? '처리중...' : '완료'}
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
