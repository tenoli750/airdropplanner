import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom';
import ArticlesPage from './pages/ArticlesPage';
import PlanPage from './pages/PlanPage';
import CalendarPage from './pages/CalendarPage';
import BettingPage from './pages/BettingPage';
import LeaderboardPage from './pages/LeaderboardPage';
import AdminPage from './pages/AdminPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import { authApi } from './services/api';
import type { User } from './types';

// Bottom Navigation Component
function BottomNav() {
  const location = useLocation();

  const navItems = [
    { path: '/', icon: '📋', label: '아티클' },
    { path: '/betting', icon: '🎲', label: '베팅' },
    { path: '/leaderboard', icon: '🏆', label: '랭킹' },
    { path: '/profile', icon: '👤', label: '프로필' },
  ];

  return (
    <nav className="bottom-nav">
      <div className="bottom-nav-items">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={`bottom-nav-item ${location.pathname === item.path ? 'active' : ''}`}
          >
            <span className="icon">{item.icon}</span>
            <span className="label">{item.label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

// Mobile Menu Component (now used for all screen sizes)
function MobileMenu({ isOpen, onClose, user, onLogout }: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onLogout: () => void;
}) {
  const location = useLocation();

  useEffect(() => {
    // Close menu on route change
    if (isOpen) {
      onClose();
    }
  }, [location.pathname]); // Removed onClose from dependencies to avoid warnings

  const navItems = [
    { path: '/', icon: '📋', label: '아티클' },
    { path: '/plan', icon: '📝', label: '내 플랜' },
    { path: '/calendar', icon: '📅', label: '캘린더' },
    { path: '/betting', icon: '🎲', label: '베팅' },
    { path: '/leaderboard', icon: '🏆', label: '랭킹' },
    { path: '/profile', icon: '👤', label: '프로필' },
  ];

  if (user?.isAdmin) {
    navItems.push({ path: '/admin', icon: '⚙️', label: '관리자' });
  }

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop overlay */}
      <div 
        className="mobile-nav-backdrop"
        onClick={onClose}
        aria-hidden="true"
      />
      
      {/* Menu */}
      <div className={`mobile-nav ${isOpen ? 'open' : ''}`}>
        <div className="mobile-nav-header">
          <h3 className="mobile-nav-title">메뉴</h3>
          <button 
            onClick={onClose}
            className="mobile-nav-close"
            aria-label="메뉴 닫기"
          >
            ✕
          </button>
        </div>
        
        <div className="mobile-nav-content">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={`mobile-nav-link ${location.pathname === item.path ? 'active' : ''}`}
              onClick={onClose}
            >
              <span className="icon">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}

          <button
            onClick={() => {
              onLogout();
              onClose();
            }}
            className="mobile-nav-link mobile-nav-logout"
          >
            <span className="icon">🚪</span>
            <span>로그아웃</span>
          </button>
        </div>
      </div>
    </>
  );
}

function AppContent() {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userData = await authApi.getProfile();
          setUser(userData);
          setIsAuthenticated(true);
        } catch {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const mobileNav = document.querySelector('.mobile-nav');
      const menuButton = document.querySelector('.mobile-menu-btn');
      
      if (
        mobileMenuOpen &&
        mobileNav &&
        menuButton &&
        !mobileNav.contains(target) &&
        !menuButton.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [mobileMenuOpen]);

  // Prevent body scroll when mobile menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const handleLogin = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      setUser(JSON.parse(userData));
      setIsAuthenticated(true);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setIsAuthenticated(false);
  };

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem('user', JSON.stringify(updatedUser));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 rounded-full"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-white rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="text-white/80 font-medium">로딩 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <nav className="glass sticky top-0 z-50 shadow-lg">
        <div className="max-w-6xl mx-auto px-2 sm:px-4">
          <div className="flex justify-between items-center h-14 sm:h-16 gap-2 min-w-0">
            <NavLink to="/" className="flex items-center gap-1.5 sm:gap-2 group min-w-0 flex-shrink">
              <span className="text-lg sm:text-xl md:text-2xl group-hover:scale-110 transition-transform flex-shrink-0">🚀</span>
              <span className="text-sm sm:text-base md:text-lg font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent whitespace-nowrap truncate">
                {isAuthenticated ? '에어드랍 플래너' : '에어드랍 플래너'}
              </span>
            </NavLink>

            {/* Burger Menu Button - Always visible for authenticated users */}
            {isAuthenticated && (
              <button
                className={`mobile-menu-btn flex-shrink-0 ${mobileMenuOpen ? 'open' : ''}`}
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="메뉴"
                aria-expanded={mobileMenuOpen}
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            )}

            {/* Login button for non-authenticated users */}
            {!isAuthenticated && (
              <NavLink to="/login" className="btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1.5 sm:py-2 flex-shrink-0 whitespace-nowrap">
                로그인
              </NavLink>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      {isAuthenticated && (
        <MobileMenu
          isOpen={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          user={user}
          onLogout={handleLogout}
        />
      )}

      <main className="flex-1 py-4 md:py-6 px-2 md:px-4">
        <Routes>
          <Route
            path="/login"
            element={isAuthenticated ? <Navigate to="/" /> : <LoginPage onLogin={handleLogin} />}
          />
          <Route
            path="/register"
            element={isAuthenticated ? <Navigate to="/" /> : <RegisterPage onLogin={handleLogin} />}
          />
          <Route
            path="/"
            element={<ArticlesPage />}
          />
          <Route
            path="/plan"
            element={isAuthenticated ? <PlanPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/calendar"
            element={isAuthenticated ? <CalendarPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/betting"
            element={isAuthenticated ? <BettingPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/leaderboard"
            element={isAuthenticated ? <LeaderboardPage /> : <Navigate to="/login" />}
          />
          <Route
            path="/profile"
            element={
              isAuthenticated ? (
                <ProfilePage user={user} onUserUpdate={handleUserUpdate} />
              ) : (
                <Navigate to="/login" />
              )
            }
          />
          <Route
            path="/admin"
            element={
              isAuthenticated && user?.isAdmin ? <AdminPage /> : <Navigate to="/" />
            }
          />
        </Routes>
      </main>

      {/* Bottom Navigation for Mobile */}
      {isAuthenticated && <BottomNav />}

      {/* Footer - hidden on mobile via CSS */}
      <footer className="glass mt-auto py-4">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>© 2026 에어드랍 플래너. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
