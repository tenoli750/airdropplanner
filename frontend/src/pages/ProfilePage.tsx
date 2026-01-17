import { useState, useEffect } from 'react';
import { authApi, alarmApi } from '../services/api';
import type { User } from '../types';

interface ProfilePageProps {
  user: User | null;
  onUserUpdate: (user: User) => void;
}

const ProfilePage = ({ user, onUserUpdate }: ProfilePageProps) => {
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [codeExpiry, setCodeExpiry] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Alarm settings state
  const [alarmEnabled, setAlarmEnabled] = useState(false);
  const [alarmTime, setAlarmTime] = useState('09:00');
  const [alarmLoading, setAlarmLoading] = useState(false);
  const [alarmSaved, setAlarmSaved] = useState(false);

  useEffect(() => {
    // Refresh user data
    const fetchUser = async () => {
      try {
        const userData = await authApi.getProfile();
        onUserUpdate(userData);
      } catch (err) {
        console.error('Failed to fetch user:', err);
      }
    };
    fetchUser();
  }, []);

  // Fetch alarm settings
  useEffect(() => {
    const fetchAlarmSettings = async () => {
      try {
        const settings = await alarmApi.getSettings();
        setAlarmEnabled(settings.alarm_enabled);
        setAlarmTime(settings.alarm_time);
      } catch (err) {
        console.error('Failed to fetch alarm settings:', err);
      }
    };
    if (user?.telegramLinked) {
      fetchAlarmSettings();
    }
  }, [user?.telegramLinked]);

  const handleSaveAlarm = async () => {
    setAlarmLoading(true);
    try {
      await alarmApi.updateSettings({
        alarm_enabled: alarmEnabled,
        alarm_time: alarmTime,
        timezone: 'Asia/Seoul',
      });
      setAlarmSaved(true);
      setTimeout(() => setAlarmSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save alarm settings:', err);
    } finally {
      setAlarmLoading(false);
    }
  };

  const handleGenerateCode = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await authApi.generateTelegramLinkCode();
      setLinkCode(response.code);
      setCodeExpiry(new Date(response.expiresAt));
    } catch (err: any) {
      setError(err.response?.data?.error || '코드 생성 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!confirm('텔레그램 연동을 해제하시겠습니까?')) return;

    setLoading(true);
    setError('');
    try {
      await authApi.unlinkTelegram();
      const userData = await authApi.getProfile();
      onUserUpdate(userData);
      setLinkCode(null);
    } catch (err: any) {
      setError(err.response?.data?.error || '연동 해제 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeRemaining = () => {
    if (!codeExpiry) return '';
    const now = new Date();
    const diff = codeExpiry.getTime() - now.getTime();
    if (diff <= 0) return '만료됨';
    const minutes = Math.floor(diff / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">로그인이 필요합니다.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">프로필</h1>

      {/* User Info */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">계정 정보</h2>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">사용자명</span>
            <span className="font-medium">{user.username}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">계정 유형</span>
            <span className={`font-medium ${user.isAdmin ? 'text-orange-600' : 'text-gray-900'}`}>
              {user.isAdmin ? '관리자' : '일반 사용자'}
            </span>
          </div>
        </div>
      </div>

      {/* Telegram Linking */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">텔레그램 연동</h2>

        {user.telegramLinked ? (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="w-3 h-3 bg-green-500 rounded-full"></span>
              <span className="text-green-700 font-medium">연동됨</span>
            </div>
            {user.telegramUsername && (
              <p className="text-gray-600 mb-4">
                연동된 계정: <span className="font-medium">@{user.telegramUsername}</span>
              </p>
            )}
            <button
              onClick={handleUnlink}
              disabled={loading}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors disabled:opacity-50"
            >
              {loading ? '처리 중...' : '연동 해제'}
            </button>
          </div>
        ) : (
          <div>
            <p className="text-gray-600 mb-4">
              텔레그램 봇과 연동하면 텔레그램에서 바로 아티클과 태스크를 추가할 수 있습니다.
            </p>

            {!linkCode ? (
              <button
                onClick={handleGenerateCode}
                disabled={loading}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {loading ? '생성 중...' : '연동 코드 발급'}
              </button>
            ) : (
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">
                  아래 코드를 텔레그램 봇에서 입력하세요:
                </p>
                <div className="flex items-center gap-4 mb-3">
                  <code className="text-3xl font-mono font-bold text-indigo-600 tracking-widest">
                    {linkCode}
                  </code>
                  <span className="text-sm text-gray-500">
                    {formatTimeRemaining()}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>1. 텔레그램에서 봇을 열어주세요</p>
                  <p>2. <code className="bg-gray-200 px-1 rounded">/link {linkCode}</code> 입력</p>
                  <p>3. 연동 완료!</p>
                </div>
                <button
                  onClick={handleGenerateCode}
                  className="mt-3 text-sm text-indigo-600 hover:text-indigo-800"
                >
                  새 코드 발급
                </button>
              </div>
            )}
          </div>
        )}

        {error && (
          <p className="mt-4 text-red-600 text-sm">{error}</p>
        )}
      </div>

      {/* Alarm Settings - Only show if Telegram is linked */}
      {user.telegramLinked && (
        <div className="bg-white rounded-lg shadow-md p-6 mt-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">⏰ 알림 설정</h2>
          <p className="text-gray-600 mb-4">
            매일 정해진 시간에 미완료 태스크 알림을 받을 수 있습니다.
          </p>

          <div className="space-y-4">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">알림 활성화</span>
              <button
                onClick={() => setAlarmEnabled(!alarmEnabled)}
                className={`relative w-14 h-7 rounded-full transition-colors ${
                  alarmEnabled ? 'bg-indigo-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                    alarmEnabled ? 'translate-x-8' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Time Picker */}
            <div className="flex items-center justify-between">
              <span className="text-gray-700">알림 시간</span>
              <input
                type="time"
                value={alarmTime}
                onChange={(e) => setAlarmTime(e.target.value)}
                disabled={!alarmEnabled}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:bg-gray-100"
              />
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveAlarm}
              disabled={alarmLoading}
              className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {alarmLoading ? '저장 중...' : alarmSaved ? '✓ 저장됨!' : '설정 저장'}
            </button>

            {alarmEnabled && (
              <p className="text-sm text-gray-500">
                매일 {alarmTime}에 미완료 태스크 알림이 텔레그램으로 발송됩니다.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-3">텔레그램 봇 사용법</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <p><code className="bg-gray-200 px-1 rounded">/n</code> - 새 아티클(프로젝트) 추가</p>
          <p><code className="bg-gray-200 px-1 rounded">/t</code> - 새 태스크 추가</p>
          <p><code className="bg-gray-200 px-1 rounded">/list</code> - 아티클 목록 보기</p>
          <p className="mt-2 text-gray-500">
            메시지에 답장하면서 /t를 입력하면 해당 메시지가 태스크 설명으로 자동 입력됩니다.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
