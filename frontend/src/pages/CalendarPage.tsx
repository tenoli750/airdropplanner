import { useState, useEffect } from 'react';
import { plansApi } from '../services/api';
import type { CalendarTask, UserStats } from '../types';
import { POINTS_BY_FREQUENCY } from '../types';

type MobileViewMode = 'week' | 'month';

// KST (Korean Standard Time) helper functions
// KST = UTC+9
const getKSTDateString = (date: Date = new Date()): string => {
  // Convert date to KST by adding 9 hours
  const kstMs = date.getTime() + (9 * 60 * 60 * 1000);
  const kstDate = new Date(kstMs);
  return `${kstDate.getUTCFullYear()}-${String(kstDate.getUTCMonth() + 1).padStart(2, '0')}-${String(kstDate.getUTCDate()).padStart(2, '0')}`;
};

const getKSTToday = (): Date => {
  const now = new Date();
  const kstTodayStr = getKSTDateString(now);
  // Create a date object representing today at midnight KST
  // We convert to local time for comparison
  const [year, month, day] = kstTodayStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

const isSameDayKST = (date1: Date, date2: Date): boolean => {
  const kst1Str = getKSTDateString(date1);
  const kst2Str = getKSTDateString(date2);
  return kst1Str === kst2Str;
};

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [mobileViewMode, setMobileViewMode] = useState<MobileViewMode>('week');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    return start;
  });

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [calendarData, statsData] = await Promise.all([
          plansApi.getCalendarData(year, month),
          plansApi.getUserStats(),
        ]);
        setTasks(calendarData);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch calendar data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [year, month]);

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month - 1, 1).getDay();
  };

  const getTasksForDate = (date: number) => {
    const dateStr = `${year}-${month.toString().padStart(2, '0')}-${date.toString().padStart(2, '0')}`;
    return tasks.filter((task) => {
      if (task.completed && task.completed_at) {
        const completedDate = task.completed_at.split('T')[0];
        return completedDate === dateStr;
      }
      return false;
    });
  };

  const getIncompleteTasksForDate = (date: number) => {
    const checkDate = new Date(year, month - 1, date);
    const todayKST = getKSTToday();

    // Only show incomplete tasks for past dates (compare in KST)
    if (isSameDayKST(checkDate, todayKST) || checkDate > todayKST) return [];

    return tasks.filter((task) => {
      if (task.completed) return false;

      const addedDate = new Date(task.added_at);
      addedDate.setHours(0, 0, 0, 0);

      if (addedDate > checkDate) return false;

      // Daily tasks should appear every day
      if (task.frequency === 'daily') return true;

      // Weekly tasks appear on Mondays
      if (task.frequency === 'weekly') {
        return checkDate.getDay() === 1; // Monday
      }

      // One-time tasks appear once
      return task.frequency === 'one-time';
    });
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
    setSelectedDate(null); // Clear selection when changing months
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
    setSelectedDate(null); // Clear selection when changing months
  };

  // Week navigation for mobile
  const prevWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() - 7);
    setCurrentWeekStart(newStart);
  };

  const nextWeek = () => {
    const newStart = new Date(currentWeekStart);
    newStart.setDate(newStart.getDate() + 7);
    setCurrentWeekStart(newStart);
  };

  const goToCurrentWeek = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const start = new Date(now);
    start.setDate(now.getDate() - dayOfWeek);
    start.setHours(0, 0, 0, 0);
    setCurrentWeekStart(start);
    setSelectedDate(new Date());
  };

  // Get week days array
  const getWeekDays = () => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(currentWeekStart);
      day.setDate(currentWeekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  // Get tasks for a specific date
  const getTasksForSpecificDate = (date: Date) => {
    const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
    return tasks.filter((task) => {
      if (task.completed && task.completed_at) {
        const completedDate = task.completed_at.split('T')[0];
        return completedDate === dateStr;
      }
      return false;
    });
  };

  // Get incomplete tasks for a specific date
  const getIncompleteTasksForSpecificDate = (date: Date) => {
    const todayKST = getKSTToday();
    const checkDate = new Date(date);

    // Compare in KST
    if (isSameDayKST(checkDate, todayKST) || checkDate > todayKST) return [];

    return tasks.filter((task) => {
      if (task.completed) return false;

      const addedDate = new Date(task.added_at);
      addedDate.setHours(0, 0, 0, 0);

      if (addedDate > checkDate) return false;

      if (task.frequency === 'daily') return true;
      if (task.frequency === 'weekly') {
        return checkDate.getDay() === 1;
      }
      return task.frequency === 'one-time';
    });
  };

  // Check if two dates are the same day (using KST)
  const isSameDay = (date1: Date | null, date2: Date) => {
    if (!date1) return false;
    return isSameDayKST(date1, date2);
  };

  // Check if a date is today (using KST)
  const isDateToday = (date: Date) => {
    const todayKST = getKSTToday();
    return isSameDayKST(date, todayKST);
  };

  // Check if current week contains today (using KST)
  const isCurrentWeek = () => {
    const todayKST = getKSTToday();
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);
    // Compare dates at midnight for proper comparison
    const weekStartMidnight = new Date(currentWeekStart);
    weekStartMidnight.setHours(0, 0, 0, 0);
    weekEnd.setHours(0, 0, 0, 0);
    return todayKST >= weekStartMidnight && todayKST <= weekEnd;
  };

  // Format week range string
  const getWeekRangeString = () => {
    const weekEnd = new Date(currentWeekStart);
    weekEnd.setDate(currentWeekStart.getDate() + 6);

    const startMonth = currentWeekStart.getMonth() + 1;
    const endMonth = weekEnd.getMonth() + 1;

    if (startMonth === endMonth) {
      return `${startMonth}월 ${currentWeekStart.getDate()}일 - ${weekEnd.getDate()}일`;
    }
    return `${startMonth}월 ${currentWeekStart.getDate()}일 - ${endMonth}월 ${weekEnd.getDate()}일`;
  };

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  // Get tasks for selected date (works for both week and month views)
  const selectedDateTasks = selectedDate
    ? getTasksForSpecificDate(selectedDate)
    : [];
  const selectedDateMissed = selectedDate
    ? getIncompleteTasksForSpecificDate(selectedDate)
    : [];

  const todayKST = getKSTToday();
  const isCurrentMonth = year === todayKST.getFullYear() && month === todayKST.getMonth() + 1;

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      {/* Stats Header */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-xs text-gray-600 mb-1">총 포인트</div>
            <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {stats.totalPoints.toLocaleString()}
            </div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-xs text-gray-600 mb-1">완료</div>
            <div className="text-2xl font-bold text-green-600">{stats.completedCount}</div>
          </div>
          <div className="glass rounded-xl p-4 text-center">
            <div className="text-xs text-gray-600 mb-1">총 비용</div>
            <div className="text-2xl font-bold text-blue-600">${stats.totalCost.toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Mobile Calendar - Only visible on mobile */}
      <div className="block md:hidden">
        <div className="glass rounded-2xl p-3 space-y-3">
          {/* View Mode Toggle */}
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={() => setMobileViewMode('week')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mobileViewMode === 'week'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              주간
            </button>
            <button
              onClick={() => setMobileViewMode('month')}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                mobileViewMode === 'month'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              월간
            </button>
          </div>

          {/* Week View Mode */}
          {mobileViewMode === 'week' && (
            <>
              {/* Week Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={prevWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="이전 주"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center flex-1">
                  <h2 className="text-sm font-bold text-gray-800">{getWeekRangeString()}</h2>
                  <p className="text-[10px] text-gray-500">{currentWeekStart.getFullYear()}년</p>
                </div>
                <button
                  onClick={nextWeek}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="다음 주"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {!isCurrentWeek() && (
                  <button
                    onClick={goToCurrentWeek}
                    className="px-2 py-1 text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors font-medium"
                  >
                    오늘
                  </button>
                )}
              </div>

              {/* Horizontal Week Strip */}
              <div className="flex gap-1 overflow-x-auto scrollbar-hide py-1">
                {getWeekDays().map((date, i) => {
                  const completedTasks = getTasksForSpecificDate(date);
                  const missedTasks = getIncompleteTasksForSpecificDate(date);
                  const isToday = isDateToday(date);
                  const isSelected = isSameDay(selectedDate, date);
                  const taskCount = completedTasks.length + missedTasks.length;
                  const hasCompleted = completedTasks.length > 0;
                  const hasMissed = missedTasks.length > 0;

                  return (
                    <div
                      key={i}
                      onClick={() => setSelectedDate(date)}
                      className={`flex-1 min-w-[44px] py-2 px-1 rounded-xl cursor-pointer transition-all text-center ${
                        isToday
                          ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg'
                          : isSelected
                          ? 'bg-indigo-100 text-indigo-800'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`text-[10px] font-medium ${isToday ? 'text-indigo-100' : 'text-gray-400'}`}>
                        {weekDays[i]}
                      </div>
                      <div className={`text-lg font-bold ${isToday ? 'text-white' : ''}`}>
                        {date.getDate()}
                      </div>
                      {/* Task indicator dots */}
                      <div className="flex justify-center gap-0.5 mt-1 min-h-[6px]">
                        {hasCompleted && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-green-300' : 'bg-green-500'}`}></div>
                        )}
                        {hasMissed && (
                          <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-red-300' : 'bg-red-400'}`}></div>
                        )}
                        {taskCount > 2 && (
                          <span className={`text-[8px] ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                            +{taskCount - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Mini Legend */}
              <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span>완료</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                  <span>미완료</span>
                </div>
              </div>
            </>
          )}

          {/* Month View Mode */}
          {mobileViewMode === 'month' && (
            <>
              {/* Mobile Month Navigation */}
              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={prevMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="이전 달"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div className="text-center flex-1">
                  <h2 className="text-sm font-bold text-gray-800">{year}년 {monthNames[month - 1]}</h2>
                </div>
                <button
                  onClick={nextMonth}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  aria-label="다음 달"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                {!isCurrentMonth && (
                  <button
                    onClick={() => setCurrentDate(new Date())}
                    className="px-2 py-1 text-[10px] bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors font-medium"
                  >
                    오늘
                  </button>
                )}
              </div>

              {/* Mobile Week Days Header */}
              <div className="flex justify-between">
                {weekDays.map((day, i) => (
                  <div
                    key={day}
                    className={`flex-1 text-center text-[10px] font-medium py-1 ${
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Mobile Calendar Grid - Compact Horizontal Fit */}
              <div className="space-y-1">
                {(() => {
                  const weeks = [];
                  const allDays = [...emptyDays.map(() => null), ...days];
                  for (let i = 0; i < allDays.length; i += 7) {
                    weeks.push(allDays.slice(i, i + 7));
                  }
                  return weeks.map((week, weekIndex) => (
                    <div key={weekIndex} className="flex justify-between gap-1">
                      {week.map((day, dayIndex) => {
                        if (day === null) {
                          return <div key={`empty-${dayIndex}`} className="flex-1 min-w-[36px] h-[44px]"></div>;
                        }
                        const completedTasks = getTasksForDate(day);
                        const missedTasks = getIncompleteTasksForDate(day);
                        const checkDate = new Date(year, month - 1, day);
                        const isToday = isDateToday(checkDate);
                        const isSelected =
                          selectedDate?.getDate() === day &&
                          selectedDate?.getMonth() + 1 === month &&
                          selectedDate?.getFullYear() === year;
                        const hasCompleted = completedTasks.length > 0;
                        const hasMissed = missedTasks.length > 0;

                        return (
                          <div
                            key={day}
                            onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                            className={`flex-1 min-w-[36px] h-[44px] rounded-lg cursor-pointer transition-all flex flex-col items-center justify-center ${
                              isToday
                                ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-md'
                                : isSelected
                                ? 'bg-indigo-100 text-indigo-800'
                                : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                            }`}
                          >
                            <div className={`text-sm font-bold ${isToday ? 'text-white' : ''}`}>
                              {day}
                            </div>
                            <div className="flex justify-center gap-0.5 min-h-[6px]">
                              {hasCompleted && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-green-300' : 'bg-green-500'}`}></div>
                              )}
                              {hasMissed && (
                                <div className={`w-1.5 h-1.5 rounded-full ${isToday ? 'bg-red-300' : 'bg-red-400'}`}></div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                      {/* Fill remaining slots if week is incomplete */}
                      {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                        <div key={`fill-${i}`} className="flex-1 min-w-[36px] h-[44px]"></div>
                      ))}
                    </div>
                  ));
                })()}
              </div>

              {/* Mini Legend */}
              <div className="flex items-center justify-center gap-3 text-[10px] text-gray-500">
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  <span>완료</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
                  <span>미완료</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop Calendar - Only visible on desktop */}
      <div className="hidden md:block glass rounded-2xl p-6">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
            aria-label="이전 달"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800">{year}년 {monthNames[month - 1]}</h2>
          </div>
          <div className="flex items-center gap-2">
            {!isCurrentMonth && (
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-3 py-1.5 text-sm bg-indigo-100 text-indigo-700 hover:bg-indigo-200 rounded-lg transition-colors font-medium"
              >
                오늘
              </button>
            )}
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="다음 달"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Week Days Header */}
        <div className="flex justify-between mb-3">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`flex-1 text-center text-sm font-medium py-2 ${
                i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Compact Horizontal Fit */}
        <div className="space-y-2">
          {(() => {
            const weeks = [];
            const allDays = [...emptyDays.map(() => null), ...days];
            for (let i = 0; i < allDays.length; i += 7) {
              weeks.push(allDays.slice(i, i + 7));
            }
            return weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="flex justify-between gap-2">
                {week.map((day, dayIndex) => {
                  if (day === null) {
                    return <div key={`empty-${dayIndex}`} className="flex-1 h-[72px]"></div>;
                  }
                  const completedTasks = getTasksForDate(day);
                  const missedTasks = getIncompleteTasksForDate(day);
                  const checkDate = new Date(year, month - 1, day);
                  const isToday = isDateToday(checkDate);
                  const isSelected =
                    selectedDate?.getDate() === day &&
                    selectedDate?.getMonth() + 1 === month &&
                    selectedDate?.getFullYear() === year;
                  const hasCompleted = completedTasks.length > 0;
                  const hasMissed = missedTasks.length > 0;
                  const taskCount = completedTasks.length + missedTasks.length;

                  return (
                    <div
                      key={day}
                      onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                      className={`flex-1 h-[72px] rounded-xl cursor-pointer transition-all flex flex-col items-center justify-center ${
                        isToday
                          ? 'bg-gradient-to-b from-indigo-500 to-indigo-600 text-white shadow-lg shadow-indigo-200'
                          : isSelected
                          ? 'bg-indigo-100 text-indigo-800 ring-2 ring-indigo-300'
                          : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                      }`}
                    >
                      <div className={`text-lg font-bold ${isToday ? 'text-white' : ''}`}>
                        {day}
                      </div>
                      <div className="flex justify-center gap-1 mt-1 min-h-[10px]">
                        {hasCompleted && (
                          <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-green-300' : 'bg-green-500'}`}></div>
                        )}
                        {hasMissed && (
                          <div className={`w-2 h-2 rounded-full ${isToday ? 'bg-red-300' : 'bg-red-400'}`}></div>
                        )}
                        {taskCount > 2 && (
                          <span className={`text-xs font-medium ${isToday ? 'text-indigo-200' : 'text-gray-400'}`}>
                            +{taskCount - 2}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {/* Fill remaining slots if week is incomplete */}
                {week.length < 7 && Array.from({ length: 7 - week.length }).map((_, i) => (
                  <div key={`fill-${i}`} className="flex-1 h-[72px]"></div>
                ))}
              </div>
            ));
          })()}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            <span>완료</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-400"></div>
            <span>미완료</span>
          </div>
        </div>
      </div>

      {/* Selected Date Details */}
      {selectedDate && (
        <div className="glass rounded-xl p-4 sm:p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">
            {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일
          </h3>

          <div className="space-y-4">
            {/* Completed Tasks */}
            {selectedDateTasks.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-green-600 mb-2">
                  ✅ 완료한 태스크 ({selectedDateTasks.length})
                </h4>
                <div className="space-y-2">
                  {selectedDateTasks.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-green-50 rounded-lg border border-green-100"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            task.frequency === 'daily'
                              ? 'bg-green-500'
                              : task.frequency === 'weekly'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                          }`}
                        />
                        <span className="font-medium text-gray-800 text-sm">{task.task_title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.project_name}
                        {task.cost !== null && (
                          <span className="ml-2 text-blue-600">비용: ${task.cost}</span>
                        )}
                      </div>
                      <div className="text-xs text-green-600 mt-1">
                        +{POINTS_BY_FREQUENCY[task.frequency]} points
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Missed Tasks */}
            {selectedDateMissed.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">
                  ❌ 미완료 태스크 ({selectedDateMissed.length})
                </h4>
                <div className="space-y-2">
                  {selectedDateMissed.map((task) => (
                    <div
                      key={task.id}
                      className="p-3 bg-red-50 rounded-lg border border-red-100"
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-400" />
                        <span className="font-medium text-gray-800 text-sm">{task.task_title}</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{task.project_name}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {selectedDateTasks.length === 0 && selectedDateMissed.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">이 날짜에 태스크가 없습니다.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarPage;
