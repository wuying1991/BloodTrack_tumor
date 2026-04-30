import React from 'react';
import { Outlet, Link, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Layout.css';

const Layout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-content">
          <h1 className="app-title">化疗血常规追踪器</h1>
          <div className="user-info">
            <span className="user-name">
              {user?.firstName} {user?.lastName}
            </span>
            <button onClick={logout} className="logout-button">
              登出
            </button>
          </div>
        </div>
      </header>

      <div className="layout-container">
        <nav className="sidebar">
          <ul className="nav-menu">
            <li>
              <Link to="/" className="nav-link">
                仪表板
              </Link>
            </li>
            <li>
              <Link to="/blood-tests" className="nav-link">
                血常规记录
              </Link>
            </li>
            <li>
              <Link to="/chemo-cycles" className="nav-link">
                化疗周期
              </Link>
            </li>
            <li>
              <Link to="/analytics" className="nav-link">
                数据分析
              </Link>
            </li>
            <li>
              <Link to="/settings" className="nav-link">
                设置
              </Link>
            </li>
          </ul>
        </nav>

        <main className="main-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout;
