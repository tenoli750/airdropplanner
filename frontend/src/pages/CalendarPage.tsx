import { useState, useEffect } from 'react';
import { plansApi } from '../services/api';
import type { CalendarTask, UserStats } from '../types';
import { POINTS_BY_FREQUENCY } from '../types';

const CalendarPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState<CalendarTask[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

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
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Only show incomplete tasks for past dates
    if (checkDate >= today) return [];

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

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);

  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];
  const monthNames = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];

  const selectedDateTasks = selectedDate
    ? getTasksForDate(selectedDate.getDate())
    : [];
  const selectedDateMissed = selectedDate
    ? getIncompleteTasksForDate(selectedDate.getDate())
    : [];

  const today = new Date();
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1;

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
          {/* Mobile Month Navigation */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={prevMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="이전 달"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-bold text-gray-800 min-w-0 flex-shrink">
              {year}년 {monthNames[month - 1]}
            </h2>
            <button
              onClick={nextMonth}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center"
              aria-label="다음 달"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            {!isCurrentMonth && (
              <button
                onClick={() => setCurrentDate(new Date())}
                className="ml-auto px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                오늘
              </button>
            )}
          </div>

          {/* Mobile Week Days Header */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {weekDays.map((day, i) => (
              <div
                key={day}
                className={`text-center text-[10px] font-medium py-1 ${
                  i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Mobile Calendar Grid - Compact Square */}
          <div className="grid grid-cols-7 gap-0.5">
            {emptyDays.map((_, i) => (
              <div key={`empty-${i}`} className="aspect-square"></div>
            ))}
            {days.map((day) => {
              const completedTasks = getTasksForDate(day);
              const missedTasks = getIncompleteTasksForDate(day);
              const isToday =
                today.getDate() === day &&
                today.getMonth() + 1 === month &&
                today.getFullYear() === year;
              const isSelected =
                selectedDate?.getDate() === day &&
                selectedDate?.getMonth() + 1 === month &&
                selectedDate?.getFullYear() === year;
              const dayOfWeek = new Date(year, month - 1, day).getDay();
              const taskCount = completedTasks.length + missedTasks.length;

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                  className={`aspect-square p-0.5 sm:p-1 border rounded-lg cursor-pointer transition-all min-w-0 overflow-hidden relative ${
                    isToday
                      ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-200'
                      : isSelected
                      ? 'border-indigo-400 bg-indigo-50'
                      : 'border-gray-100 hover:border-gray-300'
                  }`}
                >
                  <div
                    className={`text-[11px] sm:text-xs font-medium mb-0.5 text-center ${
                      dayOfWeek === 0
                        ? 'text-red-500'
                        : dayOfWeek === 6
                        ? 'text-blue-500'
                        : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>
                  {taskCount > 0 && (
                    <div className="flex items-center justify-center gap-0.5 flex-wrap">
                      {completedTasks.slice(0, 3).map((task, i) => (
                        <div
                          key={i}
                          className={`w-1 h-1 rounded-full ${
                            task.frequency === 'daily'
                              ? 'bg-green-500'
                              : task.frequency === 'weekly'
                              ? 'bg-blue-500'
                              : 'bg-purple-500'
                          }`}
                        />
                      ))}
                      {missedTasks.slice(0, 3 - completedTasks.length).map((_task, i) => (
                        <div
                          key={`missed-${i}`}
                          className="w-1 h-1 rounded-full bg-red-400"
                        />
                      ))}
                      {taskCount > 3 && (
                        <div className="text-[8px] text-gray-400">+{taskCount - 3}</div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Mobile Legend */}
          <div className="flex items-center justify-center gap-2 mt-2 text-[10px] text-gray-600 flex-wrap">
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
              <span>Daily</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
              <span>Weekly</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
              <span>One-time</span>
            </div>
            <div className="flex items-center gap-0.5">
              <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div>
              <span>Missed</span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Calendar - Only visible on desktop */}
      <div className="hidden md:block glass rounded-2xl p-4 sm:p-6">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            onClick={prevMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="이전 달"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-800 min-w-0 flex-shrink">
            {year}년 {monthNames[month - 1]}
          </h2>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
            aria-label="다음 달"
          >
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {!isCurrentMonth && (
            <button
              onClick={() => setCurrentDate(new Date())}
              className="ml-auto px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              오늘
            </button>
          )}
        </div>

        {/* Week Days Header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs sm:text-sm font-medium py-2 ${
                i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-gray-600'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Grid - Square */}
        <div className="grid grid-cols-7 gap-1 aspect-square">
          {emptyDays.map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square"></div>
          ))}
          {days.map((day) => {
            const completedTasks = getTasksForDate(day);
            const missedTasks = getIncompleteTasksForDate(day);
            const isToday =
              today.getDate() === day &&
              today.getMonth() + 1 === month &&
              today.getFullYear() === year;
            const isSelected =
              selectedDate?.getDate() === day &&
              selectedDate?.getMonth() + 1 === month &&
              selectedDate?.getFullYear() === year;
            const dayOfWeek = new Date(year, month - 1, day).getDay();

            return (
              <div
                key={day}
                onClick={() => setSelectedDate(new Date(year, month - 1, day))}
                className={`aspect-square p-1 sm:p-2 border rounded-lg cursor-pointer transition-all min-w-0 overflow-hidden ${
                  isToday
                    ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-200'
                    : isSelected
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-100 hover:border-gray-300'
                }`}
              >
                <div
                  className={`text-xs sm:text-sm font-medium mb-1 truncate ${
                    dayOfWeek === 0
                      ? 'text-red-500'
                      : dayOfWeek === 6
                      ? 'text-blue-500'
                      : 'text-gray-700'
                  }`}
                >
                  {day}
                </div>
                <div className="flex flex-wrap gap-0.5 justify-center">
                  {completedTasks.slice(0, 4).map((task, i) => (
                    <div
                      key={i}
                      className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full flex-shrink-0 ${
                        task.frequency === 'daily'
                          ? 'bg-green-500'
                          : task.frequency === 'weekly'
                          ? 'bg-blue-500'
                          : 'bg-purple-500'
                      }`}
                      title={task.task_title}
                    />
                  ))}
                  {missedTasks.slice(0, 4 - completedTasks.length).map((task, i) => (
                    <div
                      key={`missed-${i}`}
                      className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-red-400 flex-shrink-0"
                      title={`Missed: ${task.task_title}`}
                    />
                  ))}
                </div>
                {completedTasks.length + missedTasks.length > 4 && (
                  <div className="text-[10px] text-gray-400 text-center mt-0.5">
                    +{completedTasks.length + missedTasks.length - 4}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 mt-4 text-xs text-gray-600 flex-wrap">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Daily</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Weekly</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span>One-time</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-400"></div>
            <span>Missed</span>
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
