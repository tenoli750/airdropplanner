import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../services/api';

interface RegisterPageProps {
  onLogin: () => void;
}

const RegisterPage = ({ onLogin }: RegisterPageProps) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('사용자명과 비밀번호를 입력해주세요.');
      return;
    }

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.');
      return;
    }

    if (password.length < 6) {
      setError('비밀번호는 6자 이상이어야 합니다.');
      return;
    }

    setLoading(true);

    try {
      const response = await authApi.register(username, password);
      localStorage.setItem('token', response.token);
      localStorage.setItem('user', JSON.stringify(response.user));
      onLogin();
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || '회원가입 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full gradient-primary mb-4 shadow-xl">
            <span className="text-4xl">✨</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            회원가입
          </h1>
          <p className="text-white/70">
            새 계정을 만들고 시작하세요
          </p>
        </div>

        {/* Register Card */}
        <div className="glass rounded-2xl p-8 card-hover">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                사용자명
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  👤
                </span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors bg-white/50"
                  placeholder="사용자명 입력"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔒
                </span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors bg-white/50"
                  placeholder="비밀번호 입력 (6자 이상)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                비밀번호 확인
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  🔐
                </span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 transition-colors bg-white/50"
                  placeholder="비밀번호 다시 입력"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-lg">
                <span>⚠️</span>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  처리 중...
                </span>
              ) : (
                '가입하기'
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm">
              이미 계정이 있으신가요?{' '}
              <Link
                to="/login"
                className="text-indigo-600 hover:text-indigo-800 font-medium hover:underline"
              >
                로그인
              </Link>
            </p>
          </div>
        </div>

        {/* Benefits */}
        <div className="mt-8 glass rounded-xl p-5">
          <h3 className="text-white font-bold mb-3 text-center">가입 혜택</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="w-8 h-8 rounded-full gradient-gold flex items-center justify-center">
                🎁
              </span>
              <span>회원가입 시 <strong className="text-yellow-300">1,000 포인트</strong> 지급</span>
            </div>
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="w-8 h-8 rounded-full gradient-success flex items-center justify-center">
                🎲
              </span>
              <span>매일 코인 레이스 베팅 참여</span>
            </div>
            <div className="flex items-center gap-3 text-white/80 text-sm">
              <span className="w-8 h-8 rounded-full gradient-primary flex items-center justify-center">
                🏆
              </span>
              <span>리더보드 경쟁 및 랭킹 도전</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
