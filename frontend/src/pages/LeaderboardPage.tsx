import { useState, useEffect, useCallback } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  totalPoints: number;
  totalBets: number;
  wins: number;
  losses: number;
  winRate: number;
  totalWinnings: number;
  joinedAt: string;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardUser[];
  currentUserRank: LeaderboardUser | null;
  totalUsers: number;
}

export default function LeaderboardPage() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/betting/leaderboard`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leaderboard');
      }

      const result = await response.json();
      setData(result);
      setError(null);
    } catch (err) {
      setError('리더보드를 불러오는데 실패했습니다');
      console.error('Error fetching leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'rank-badge gold';
    if (rank === 2) return 'rank-badge silver';
    if (rank === 3) return 'rank-badge bronze';
    return 'rank-badge bg-gray-100 text-gray-600';
  };

  const getRankEmoji = (rank: number) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank.toString();
  };

  const getRowClass = (rank: number, isCurrentUser: boolean) => {
    if (isCurrentUser) return 'leaderboard-row highlight';
    if (rank === 1) return 'leaderboard-row top-1';
    if (rank === 2) return 'leaderboard-row top-2';
    if (rank === 3) return 'leaderboard-row top-3';
    return 'leaderboard-row';
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-yellow-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-yellow-500 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white/80 font-medium">리더보드를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="glass rounded-xl p-6 border-l-4 border-red-500">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">⚠️</span>
            <p className="text-red-700 font-medium text-lg">{error}</p>
          </div>
          <button
            onClick={fetchLeaderboard}
            className="btn-primary"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  const { leaderboard, currentUserRank, totalUsers } = data || {
    leaderboard: [],
    currentUserRank: null,
    totalUsers: 0,
  };

  // Top 3 users for podium display
  const topThree = leaderboard.slice(0, 3);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="glass rounded-2xl p-6 card-hover">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent mb-2">
              리더보드
            </h1>
            <p className="text-gray-600">
              총 <span className="font-bold text-indigo-600">{totalUsers}</span>명의 유저가 경쟁 중입니다
            </p>
          </div>
          <div className="text-6xl trophy-animate">🏆</div>
        </div>
      </div>

      {/* Podium - Top 3 */}
      {topThree.length >= 3 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-bold text-gray-700 mb-6 text-center">TOP 3</h2>
          <div className="flex items-end justify-center gap-4">
            {/* 2nd Place */}
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full gradient-silver flex items-center justify-center mb-3 shadow-lg ${topThree[1]?.isCurrentUser ? 'ring-4 ring-indigo-400' : ''}`}>
                <span className="text-3xl">🥈</span>
              </div>
              <div className="bg-gradient-to-t from-gray-300 to-gray-200 w-24 h-20 rounded-t-lg flex flex-col items-center justify-end pb-2 shadow-lg">
                <span className="font-bold text-gray-700 text-sm truncate max-w-[80px]">
                  {topThree[1]?.username}
                </span>
                <span className="text-xs text-gray-500">{topThree[1]?.totalPoints.toLocaleString()} P</span>
              </div>
            </div>

            {/* 1st Place */}
            <div className="flex flex-col items-center -mt-4">
              <div className={`w-24 h-24 rounded-full gradient-gold flex items-center justify-center mb-3 shadow-xl glow-gold animate-float ${topThree[0]?.isCurrentUser ? 'ring-4 ring-indigo-400' : ''}`}>
                <span className="text-4xl">🥇</span>
              </div>
              <div className="bg-gradient-to-t from-yellow-400 to-yellow-300 w-28 h-28 rounded-t-lg flex flex-col items-center justify-end pb-3 shadow-xl">
                <span className="font-bold text-yellow-900 truncate max-w-[100px]">
                  {topThree[0]?.username}
                </span>
                <span className="text-sm text-yellow-800 font-medium">{topThree[0]?.totalPoints.toLocaleString()} P</span>
              </div>
            </div>

            {/* 3rd Place */}
            <div className="flex flex-col items-center">
              <div className={`w-20 h-20 rounded-full gradient-bronze flex items-center justify-center mb-3 shadow-lg ${topThree[2]?.isCurrentUser ? 'ring-4 ring-indigo-400' : ''}`}>
                <span className="text-3xl">🥉</span>
              </div>
              <div className="bg-gradient-to-t from-orange-300 to-orange-200 w-24 h-16 rounded-t-lg flex flex-col items-center justify-end pb-2 shadow-lg">
                <span className="font-bold text-orange-900 text-sm truncate max-w-[80px]">
                  {topThree[2]?.username}
                </span>
                <span className="text-xs text-orange-700">{topThree[2]?.totalPoints.toLocaleString()} P</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Current User Rank (if not in top list) */}
      {currentUserRank && !leaderboard.find(u => u.isCurrentUser) && (
        <div className="glass rounded-2xl p-5 border-2 border-indigo-300 glow">
          <h2 className="text-sm font-medium text-gray-500 mb-3">내 순위</h2>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="rank-badge bg-indigo-100 text-indigo-700">
                {currentUserRank.rank}
              </div>
              <div>
                <p className="font-bold text-indigo-900 text-lg">
                  {currentUserRank.username}
                  <span className="ml-2 text-xs gradient-primary text-white px-2 py-1 rounded-full">
                    나
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  {currentUserRank.totalBets > 0 ? (
                    <>
                      {currentUserRank.wins}승 {currentUserRank.losses}패 · 승률 {currentUserRank.winRate}%
                    </>
                  ) : (
                    '베팅 기록 없음'
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                {currentUserRank.totalPoints.toLocaleString()} P
              </p>
              {currentUserRank.totalWinnings > 0 && (
                <p className="text-sm text-green-600 font-medium">
                  +{currentUserRank.totalWinnings.toLocaleString()} 수익
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Full Leaderboard Table */}
      <div className="glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-white/50">
          <h2 className="font-bold text-gray-700 flex items-center gap-2">
            <span className="text-xl">📊</span>
            포인트 랭킹
          </h2>
        </div>

        {leaderboard.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-6xl mb-4">🏜️</div>
            <p className="text-gray-500 text-lg">아직 리더보드에 유저가 없습니다</p>
            <p className="text-gray-400 text-sm mt-2">베팅에 참여해서 첫 번째 순위에 도전하세요!</p>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {leaderboard.map((user, index) => (
              <div
                key={user.userId}
                className={getRowClass(user.rank, user.isCurrentUser)}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={getRankBadgeClass(user.rank)}>
                    {getRankEmoji(user.rank)}
                  </div>

                  {/* User Info */}
                  <div>
                    <p className={`font-bold text-lg ${user.isCurrentUser ? 'text-indigo-700' : 'text-gray-800'}`}>
                      {user.username}
                      {user.isCurrentUser && (
                        <span className="ml-2 text-xs gradient-primary text-white px-2 py-1 rounded-full">
                          나
                        </span>
                      )}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.totalBets > 0 ? (
                        <span className="flex items-center gap-2">
                          <span className="text-green-600 font-medium">{user.wins}승</span>
                          <span className="text-red-600 font-medium">{user.losses}패</span>
                          <span className="text-gray-400">·</span>
                          <span>승률 {user.winRate}%</span>
                        </span>
                      ) : (
                        '베팅 기록 없음'
                      )}
                    </p>
                  </div>
                </div>

                {/* Points */}
                <div className="text-right">
                  <p className={`text-xl font-bold ${
                    user.rank === 1
                      ? 'text-yellow-600'
                      : user.rank === 2
                      ? 'text-gray-600'
                      : user.rank === 3
                      ? 'text-orange-600'
                      : user.isCurrentUser
                      ? 'text-indigo-600'
                      : 'text-gray-800'
                  }`}>
                    {user.totalPoints.toLocaleString()} P
                  </p>
                  {user.totalWinnings > 0 && (
                    <p className="text-sm text-green-600 font-medium">
                      +{user.totalWinnings.toLocaleString()} 수익
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="stats-card card-hover">
          <div className="text-3xl mb-2">👥</div>
          <div className="value">{totalUsers}</div>
          <p className="text-sm text-gray-500 mt-1">총 참여자</p>
        </div>
        <div className="stats-card card-hover">
          <div className="text-3xl mb-2">💰</div>
          <div className="value">
            {leaderboard[0]?.totalPoints?.toLocaleString() || 0}
          </div>
          <p className="text-sm text-gray-500 mt-1">최고 포인트</p>
        </div>
        <div className="stats-card card-hover">
          <div className="text-3xl mb-2">🎯</div>
          <div className="value">
            {Math.max(...leaderboard.map(u => u.winRate), 0)}%
          </div>
          <p className="text-sm text-gray-500 mt-1">최고 승률</p>
        </div>
      </div>

      {/* Info Section */}
      <div className="glass rounded-2xl p-5 border-l-4 border-yellow-500">
        <h4 className="font-bold text-yellow-800 mb-3 flex items-center gap-2">
          <span className="text-xl">💡</span>
          랭킹 안내
        </h4>
        <ul className="space-y-2 text-sm text-yellow-700">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            포인트가 높을수록 상위 랭크에 올라갑니다
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            베팅에서 승리하면 4배의 포인트를 획득합니다
          </li>
          <li className="flex items-start gap-2">
            <span className="text-yellow-400 mt-1">•</span>
            매일 꾸준히 베팅에 참여해서 순위를 올려보세요!
          </li>
        </ul>
      </div>
    </div>
  );
}
