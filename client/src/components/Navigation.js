import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FiMenu, FiX, FiHome, FiCalendar, FiUsers, FiStar, FiSettings, FiLogOut, FiMessageCircle } from 'react-icons/fi';
import './Navigation.css';

function Navigation({ user, onLogout }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    onLogout();
    setIsOpen(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          <span className="logo-icon">🏐</span>
          Córtex Beach
        </Link>

        <button
          className="navbar-toggle"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        <ul className={`navbar-menu ${isOpen ? 'active' : ''}`}>
          <li>
            <Link
              to="/"
              className={`navbar-link ${isActive('/') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiHome size={20} />
              <span>Dashboard</span>
            </Link>
          </li>

          <li>
            <Link
              to="/tournaments"
              className={`navbar-link ${isActive('/tournaments') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiCalendar size={20} />
              <span>Torneios</span>
            </Link>
          </li>

          <li>
            <Link
              to="/players"
              className={`navbar-link ${isActive('/players') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiUsers size={20} />
              <span>Jogadores</span>
            </Link>
          </li>

          <li>
            <Link
              to="/sponsors"
              className={`navbar-link ${isActive('/sponsors') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiStar size={20} />
              <span>Patrocinadores</span>
            </Link>
          </li>

          <li>
            <Link
              to="/whatsapp"
              className={`navbar-link ${isActive('/whatsapp') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiMessageCircle size={20} />
              <span>WhatsApp</span>
            </Link>
          </li>

          <li>
            <Link
              to="/settings"
              className={`navbar-link ${isActive('/settings') ? 'active' : ''}`}
              onClick={() => setIsOpen(false)}
            >
              <FiSettings size={20} />
              <span>Empresa</span>
            </Link>
          </li>

          <li className="navbar-divider"></li>

          <li>
            <div className="navbar-user">
              <div className="user-avatar">{user?.email?.[0].toUpperCase() || 'U'}</div>
              <span className="user-email">{user?.email}</span>
            </div>
          </li>

          <li>
            <button
              className="navbar-link navbar-logout"
              onClick={handleLogout}
            >
              <FiLogOut size={20} />
              <span>Sair</span>
            </button>
          </li>
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
