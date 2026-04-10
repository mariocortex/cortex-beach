import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './App.css';

// Pages
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import DashboardPage from './pages/DashboardPage';
import TournamentListPage from './pages/TournamentListPage';
import TournamentCreatePage from './pages/TournamentCreatePage';
import TournamentDetailPage from './pages/TournamentDetailPage';
import TournamentEditPage from './pages/TournamentEditPage';
import ControlPanelPage from './pages/ControlPanelPage';
import PublicDisplayPage from './pages/PublicDisplayPage';
import PlayerRegistrationPage from './pages/PlayerRegistrationPage';
import PlayersPage from './pages/PlayersPage';
import PlayerProfilePage from './pages/PlayerProfilePage';
import CompanySettingsPage from './pages/CompanySettingsPage';
import SponsorsPage from './pages/SponsorsPage';
import WhatsAppConfigPage from './pages/WhatsAppConfigPage';

// Components
import Navigation from './components/Navigation';

function AppContent({ isAuthenticated, user, handleLogin, handleLogout }) {
  const location = useLocation();
  const isPublicFullscreen = location.pathname.startsWith('/display/');

  return (
    <>
      {isAuthenticated && !isPublicFullscreen && <Navigation user={user} onLogout={handleLogout} />}

      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            isAuthenticated ?
            <Navigate to="/" replace /> :
            <LoginPage onLogin={handleLogin} />
          }
        />

        <Route
          path="/signup"
          element={
            isAuthenticated ?
            <Navigate to="/" replace /> :
            <SignupPage onLogin={handleLogin} />
          }
        />

        {/* Public Routes */}
        <Route path="/display/:tournamentId" element={<PublicDisplayPage />} />
        <Route path="/register/:id" element={<PlayerRegistrationPage />} />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            isAuthenticated ?
            <DashboardPage user={user} /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tournaments"
          element={
            isAuthenticated ?
            <TournamentListPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/players"
          element={
            isAuthenticated ?
            <PlayersPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/players/:playerId"
          element={
            isAuthenticated ?
            <PlayerProfilePage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tournaments/new"
          element={
            isAuthenticated ?
            <TournamentCreatePage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tournaments/:id"
          element={
            isAuthenticated ?
            <TournamentDetailPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tournaments/:id/edit"
          element={
            isAuthenticated ?
            <TournamentEditPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/tournaments/:id/control"
          element={
            isAuthenticated ?
            <ControlPanelPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/sponsors"
          element={
            isAuthenticated ?
            <SponsorsPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/whatsapp"
          element={
            isAuthenticated ?
            <WhatsAppConfigPage /> :
            <Navigate to="/login" replace />
          }
        />

        <Route
          path="/settings"
          element={
            isAuthenticated ?
            <CompanySettingsPage /> :
            <Navigate to="/login" replace />
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={isAuthenticated ? "/" : "/login"} replace />} />
      </Routes>
    </>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setIsAuthenticated(true);
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogin = (userData, token) => {
    setUser(userData);
    setIsAuthenticated(true);
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <AppContent
        isAuthenticated={isAuthenticated}
        user={user}
        handleLogin={handleLogin}
        handleLogout={handleLogout}
      />
    </Router>
  );
}

export default App;
