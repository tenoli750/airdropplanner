import { useState, useEffect, useCallback } from 'react';
import { bettingApi } from '../services/api';
import type { BettingData } from '../services/api';

export default function BettingPage() {
  const [data, setData] = useState<BettingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Betting form state
  const [selectedCoin, setSelectedCoin] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<string>('100');
  const [betting, setBetting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const result = await bettingApi.getData();
      setData(result);

      // If user already has a bet, pre-select their coin
      if (result.userBet) {
        setSelectedCoin(result.userBet.coin_id);
      }
    } catch (err: any) {
      console.error('Failed to fetch betting data:', err);
      setError('데이터를 불러오는데 실패했습니다. 페이지를 새로고침 해주세요.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Refresh every 10 seconds for live prices
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handlePlaceBet = async () => {
    if (!selectedCoin || !stakeAmount || data?.userBet) return;

    const stake = parseInt(stakeAmount);
    if (isNaN(stake) || stake <= 0) {
      setError('유효하지 않은 금액입니다');
      return;
    }

    if (stake > (data?.maxBet || 1000)) {
      setError(`최대 베팅 금액은 ${data?.maxBet || 1000} 포인트입니다`);
      return;
    }

    if (stake > (data?.balance || 0)) {
      setError('포인트가 부족합니다');
      return;
    }

    setBetting(true);
    setError(null);

    try {
      const result = await bettingApi.placeBet(selectedCoin, stake);
      setSuccessMessage(`베팅 완료! 예상 당첨금: ${result.potential_payout.toLocaleString()} 포인트`);

      // Refresh data
      await fetchData();

      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err: any) {
      setError(err.response?.data?.error || '베팅에 실패했습니다');
    } finally {
      setBetting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-4">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-purple-200 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-purple-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white/80 font-medium">데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  const { activeRace, bettingRace, completedRaces, yesterdayRace, userBet, userBetHistory, balance, multiplier = 4, maxBet = 1000 } = data || {};
  const canBet = bettingRace && !userBet;

  // Find user's bet for yesterday's race
  const yesterdayBet = userBetHistory?.find(bet =>
    yesterdayRace && bet.race_date === yesterdayRace.race_date
  );

  return (
    <div className="max-w-5xl mx-auto p-2 md:p-4 space-y-4 md:space-y-6">
      {/* Header with Balance */}
      <div className="glass rounded-2xl p-4 md:p-6 card-hover">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent mb-1 md:mb-2">
              코인 레이스
            </h1>
            <p className="text-sm md:text-base text-gray-600">
              오늘 하루 가장 높은 상승률을 기록할 코인에 베팅하세요!
            </p>
          </div>
          <div className="text-left sm:text-right glass-dark rounded-xl p-3 md:p-4">
            <div className="text-xs md:text-sm text-gray-300">내 포인트</div>
            <div className="text-2xl md:text-3xl font-bold text-white">{(balance || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="glass rounded-xl p-4 border-l-4 border-red-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚠️</span>
            <span className="text-red-700 font-medium">{error}</span>
          </div>
          <button onClick={fetchData} className="text-red-600 hover:text-red-700 underline font-medium">다시 시도</button>
        </div>
      )}

      {successMessage && (
        <div className="glass rounded-xl p-4 border-l-4 border-green-500 glow-success">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎉</span>
            <span className="text-green-700 font-medium">{successMessage}</span>
          </div>
        </div>
      )}

      {/* ==================== ACTIVE RACE (Currently Racing) ==================== */}
      <div className="glass rounded-2xl p-6 card-hover">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🏁</span>
            오늘의 레이스 - 실시간 현황
          </h2>
          {activeRace && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500 font-medium">
                {new Date(activeRace.race_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
              </span>
              <span className="px-4 py-1.5 gradient-success text-white text-sm font-bold rounded-full animate-pulse-live flex items-center gap-2">
                <span className="w-2 h-2 bg-white rounded-full"></span>
                실시간
              </span>
            </div>
          )}
        </div>

        {activeRace && activeRace.coins.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {activeRace.coins
              .sort((a, b) => (Number(b.live_change) || 0) - (Number(a.live_change) || 0))
              .map((coin, index) => {
                const startPrice = Number(coin.start_price) || 0;
                const currentPrice = Number(coin.current_price) || startPrice;
                const liveChange = Number(coin.live_change) || 0;

                // Format price based on magnitude
                const formatPrice = (price: number) => {
                  if (price >= 1) return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                  if (price >= 0.0001) return `$${price.toFixed(6)}`;
                  return `$${price.toFixed(8)}`;
                };

                return (
                  <div
                    key={coin.id}
                    className={`coin-card ${index === 0 ? 'winner glow-gold' : ''}`}
                  >
                    {index === 0 && (
                      <div className="absolute -top-3 -right-3 gradient-gold text-yellow-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                        <span className="trophy-animate">🏆</span> 1위
                      </div>
                    )}

                    <div className="flex items-center justify-center mb-3">
                      {coin.coin_image ? (
                        <img
                          src={coin.coin_image}
                          alt={coin.coin_name}
                          className={`w-12 h-12 rounded-full shadow-lg ${index === 0 ? 'animate-float' : ''}`}
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-lg">
                          <span className="text-xl font-bold text-gray-500">{coin.coin_symbol.charAt(0)}</span>
                        </div>
                      )}
                    </div>

                    <div className="text-center mb-1">
                      <span className="font-bold text-lg text-gray-800">{coin.coin_symbol}</span>
                    </div>

                    <div className="text-center text-xs text-gray-400 mb-3 truncate">{coin.coin_name}</div>

                    {/* Price info */}
                    <div className="space-y-1.5 mb-3 text-xs bg-gray-50 rounded-lg p-2">
                      <div className="flex justify-between text-gray-500">
                        <span>시작가</span>
                        <span className="font-mono font-medium">{formatPrice(startPrice)}</span>
                      </div>
                      <div className="flex justify-between text-gray-700">
                        <span>현재가</span>
                        <span className="font-mono font-bold">{formatPrice(currentPrice)}</span>
                      </div>
                    </div>

                    {/* Percentage change */}
                    <div className={`percent-badge w-full ${liveChange >= 0 ? 'positive' : 'negative'}`}>
                      {liveChange >= 0 ? '▲' : '▼'} {liveChange >= 0 ? '+' : ''}{liveChange.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🌙</div>
            <p className="text-lg text-gray-600">진행 중인 레이스가 없습니다.</p>
            <p className="text-sm text-gray-400 mt-2">다음 레이스는 00:00 UTC에 시작됩니다.</p>
          </div>
        )}
      </div>

      {/* ==================== BETTING SECTION (Tomorrow's Race) ==================== */}
      <div className="glass rounded-2xl p-6 card-hover border-2 border-purple-200">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-purple-800 flex items-center gap-2">
            <span className="text-2xl">🎯</span>
            내일의 레이스 - 베팅하기
          </h2>
          <div className="flex items-center gap-3">
            {bettingRace ? (
              <>
                <span className="text-sm text-gray-500 font-medium">
                  {new Date(bettingRace.race_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                </span>
                <span className="px-4 py-1.5 gradient-success text-white text-sm font-bold rounded-full">
                  베팅 가능
                </span>
              </>
            ) : (
              <span className="px-4 py-1.5 bg-gray-400 text-white text-sm font-bold rounded-full">
                준비 중
              </span>
            )}
            <span className="px-4 py-1.5 gradient-gold text-yellow-900 text-sm font-bold rounded-full">
              {multiplier}배 당첨금
            </span>
          </div>
        </div>

        {bettingRace && bettingRace.coins.length > 0 ? (
          <>
            {/* Coin Selection */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              {bettingRace.coins.map((coin) => (
                <button
                  key={coin.id}
                  onClick={() => canBet && setSelectedCoin(coin.coin_id)}
                  disabled={!canBet}
                  className={`coin-card text-center transition-all ${
                    selectedCoin === coin.coin_id ? 'selected glow' : ''
                  } ${!canBet ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer hover:scale-105'}`}
                >
                  <div className="flex items-center justify-center mb-3">
                    {coin.coin_image ? (
                      <img src={coin.coin_image} alt={coin.coin_name} className="w-10 h-10 rounded-full shadow-md" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold shadow-md">
                        {coin.coin_symbol.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="font-bold text-gray-800">{coin.coin_symbol}</div>
                  <div className="text-xs text-gray-400 truncate">{coin.coin_name}</div>
                  {selectedCoin === coin.coin_id && (
                    <div className="mt-2 text-purple-600 text-xl">✓</div>
                  )}
                </button>
              ))}
            </div>

            {/* Betting Form */}
            {userBet ? (
              <div className="glass-dark rounded-xl p-5 text-center">
                <div className="text-sm font-medium text-white mb-3 flex items-center justify-center gap-2">
                  <span className="text-xl">🔒</span>
                  베팅 완료!
                </div>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  <span className="gradient-primary text-white px-4 py-2 rounded-lg font-bold">
                    {bettingRace.coins.find(c => c.coin_id === userBet.coin_id)?.coin_symbol || userBet.coin_id}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span className="text-white font-medium">{userBet.stake.toLocaleString()} 포인트</span>
                  <span className="text-gray-300">→</span>
                  <span className="gradient-success text-white px-4 py-2 rounded-lg font-bold">
                    예상 당첨금 {(userBet.stake * multiplier).toLocaleString()}P
                  </span>
                </div>
              </div>
            ) : (
              <div className="bg-white/50 rounded-xl p-5">
                <div className="flex items-center gap-4">
                  <input
                    type="number"
                    min="1"
                    max={Math.min(maxBet, balance || 0)}
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-lg font-medium focus:border-purple-500 focus:outline-none transition-colors"
                    placeholder="베팅 금액"
                  />
                  <div className="flex gap-2">
                    {[100, 500, 1000].map((amount) => (
                      <button
                        key={amount}
                        onClick={() => setStakeAmount(String(Math.min(amount, balance || 0)))}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-gray-700 transition-colors"
                      >
                        {amount}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={handlePlaceBet}
                    disabled={!selectedCoin || betting || !stakeAmount}
                    className="btn-primary px-8 py-3 text-lg"
                  >
                    {betting ? (
                      <span className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        처리 중
                      </span>
                    ) : (
                      '베팅하기'
                    )}
                  </button>
                </div>
                <div className="mt-3 text-sm text-gray-500 text-center">
                  최대 {maxBet.toLocaleString()} 포인트 • 레이스당 1회 베팅 • 매일 00:00 UTC 시작
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-500">내일의 레이스가 곧 준비됩니다.</p>
          </div>
        )}
      </div>

      {/* ==================== YESTERDAY'S RESULT ==================== */}
      {yesterdayRace && (
        <div className="glass rounded-2xl p-6 card-hover">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <span className="text-2xl">📊</span>
              어제의 결과
            </h2>
            <span className="text-sm text-gray-500 font-medium bg-gray-100 px-3 py-1 rounded-full">
              {new Date(yesterdayRace.race_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
            </span>
          </div>

          {/* User's bet result */}
          {yesterdayBet && (
            <div className={`mb-6 p-5 rounded-xl border-2 ${
              yesterdayBet.status === 'won'
                ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 glow-success'
                : 'bg-gradient-to-r from-red-50 to-rose-50 border-red-300 glow-danger'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">
                    {yesterdayBet.status === 'won' ? '🎉' : '😢'}
                  </span>
                  <div>
                    <div className="font-bold text-xl mb-1">
                      {yesterdayBet.status === 'won' ? '축하합니다! 베팅 성공!' : '아쉽네요, 다음 기회에!'}
                    </div>
                    <div className="text-sm text-gray-600">
                      베팅한 코인: <span className="font-bold">{yesterdayBet.coin_symbol}</span>
                      {' • '}
                      베팅 금액: {yesterdayBet.stake.toLocaleString()} 포인트
                    </div>
                  </div>
                </div>
                <div className={`text-3xl font-bold ${
                  yesterdayBet.status === 'won' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {yesterdayBet.status === 'won'
                    ? `+${yesterdayBet.payout.toLocaleString()}`
                    : `-${yesterdayBet.stake.toLocaleString()}`
                  } P
                </div>
              </div>
            </div>
          )}

          {/* Race results */}
          <div className="grid grid-cols-4 gap-4">
            {yesterdayRace.coins
              .sort((a, b) => (Number(b.percent_change) || 0) - (Number(a.percent_change) || 0))
              .map((coin) => {
                const percentChange = Number(coin.percent_change) || 0;
                const isUserBet = yesterdayBet?.coin_id === coin.coin_id;

                return (
                  <div
                    key={coin.id}
                    className={`coin-card text-center ${
                      coin.is_winner ? 'winner' : isUserBet ? 'selected' : ''
                    }`}
                  >
                    {coin.is_winner && (
                      <div className="text-yellow-600 text-sm font-bold mb-2 flex items-center justify-center gap-1">
                        <span className="trophy-animate">🏆</span> 우승
                      </div>
                    )}
                    {isUserBet && !coin.is_winner && (
                      <div className="text-purple-600 text-sm font-bold mb-2">📌 내 베팅</div>
                    )}

                    <div className="flex items-center justify-center mb-2">
                      {coin.coin_image ? (
                        <img src={coin.coin_image} alt={coin.coin_name} className="w-10 h-10 rounded-full shadow-md" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-sm font-bold shadow-md">
                          {coin.coin_symbol.charAt(0)}
                        </div>
                      )}
                    </div>

                    <div className="font-bold text-gray-800 mb-2">{coin.coin_symbol}</div>
                    <div className={`percent-badge ${percentChange >= 0 ? 'positive' : 'negative'}`}>
                      {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* ==================== PAST RACES (History) ==================== */}
      {completedRaces && completedRaces.length > 1 && (
        <div className="glass rounded-2xl p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <span className="text-2xl">📈</span>
            지난 레이스 기록
          </h2>

          <div className="space-y-4">
            {completedRaces.slice(1).map((race) => {
              const userBetForRace = userBetHistory?.find(bet => bet.race_date === race.race_date);

              return (
                <div key={race.id} className="bg-white/70 rounded-xl p-4 hover:shadow-lg transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-medium text-gray-700">
                      {new Date(race.race_date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })}
                    </span>
                    {userBetForRace && (
                      <span className={`px-3 py-1 text-sm rounded-full font-bold ${
                        userBetForRace.status === 'won'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {userBetForRace.status === 'won'
                          ? `+${userBetForRace.payout.toLocaleString()}P`
                          : `-${userBetForRace.stake.toLocaleString()}P`
                        }
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-2">
                    {race.coins
                      .sort((a, b) => (Number(b.percent_change) || 0) - (Number(a.percent_change) || 0))
                      .map((coin) => {
                        const isUserBet = userBetForRace?.coin_id === coin.coin_id;
                        const percentChange = Number(coin.percent_change || 0);
                        return (
                          <div
                            key={coin.id}
                            className={`p-3 rounded-lg text-center text-sm transition-all ${
                              coin.is_winner
                                ? 'bg-yellow-100 border-2 border-yellow-300'
                                : isUserBet
                                  ? 'bg-purple-50 border-2 border-purple-200'
                                  : 'bg-gray-50 border border-gray-200'
                            }`}
                          >
                            <div className="font-bold text-gray-700 flex items-center justify-center gap-1">
                              {coin.is_winner && <span>🏆</span>}
                              {isUserBet && !coin.is_winner && <span>📌</span>}
                              {coin.coin_symbol}
                            </div>
                            <div className={`text-sm font-bold mt-1 ${
                              percentChange >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="glass rounded-2xl p-5 border-l-4 border-blue-500">
        <h4 className="font-bold text-blue-800 mb-3 flex items-center gap-2">
          <span className="text-xl">ℹ️</span>
          이용 안내
        </h4>
        <ul className="space-y-2 text-sm text-blue-700">
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            매일 00:00 UTC에 일일 변동률이 초기화됩니다 (Binance 기준)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            BTC, ETH, SOL, DOGE 중 가장 높은 일일 상승률을 기록할 코인에 베팅하세요
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            베팅 성공 시 <strong>{multiplier}배</strong>의 당첨금을 받습니다
          </li>
          <li className="flex items-start gap-2">
            <span className="text-blue-400 mt-1">•</span>
            레이스당 최대 {maxBet.toLocaleString()} 포인트까지 베팅 가능
          </li>
        </ul>
      </div>
    </div>
  );
}
