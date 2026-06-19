import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import './App.css';
import Layout from './components/Layout/Layout';
import Dashboard from './pages/dashboard/Dashboard';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';
import BloodTests from './pages/bloodTests/BloodTests';
import ChemoCycles from './pages/chemoCycles/ChemoCycles';
import Analytics from './pages/Analytics/Analytics';
import Reminders from './pages/reminders/Reminders';
import Settings from './pages/settings/Settings';
import SharedView from './pages/share/SharedView';
import ShareNotFound from './pages/share/ShareNotFound';
import ShareExpired from './pages/share/ShareExpired';
import { AuthProvider } from './context/AuthContext';
import {
  ProtectedRoute,
  PublicOnlyRoute,
} from './components/auth/ProtectedRoute';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public only routes - redirect to dashboard if logged in */}
            <Route
              path="/login"
              element={
                <PublicOnlyRoute>
                  <Login />
                </PublicOnlyRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicOnlyRoute>
                  <Register />
                </PublicOnlyRoute>
              }
            />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />

            {/* 公开 viewer 路由 - 不在 ProtectedRoute / PublicOnlyRoute 任一包裹下 */}
            <Route path="/share/not-found" element={<ShareNotFound />} />
            <Route path="/share/:token/expired" element={<ShareExpired />} />
            <Route path="/share/:token" element={<SharedView />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="blood-tests" element={<BloodTests />} />
              <Route path="chemo-cycles" element={<ChemoCycles />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="reminders" element={<Reminders />} />
              <Route path="settings" element={<Settings />} />
            </Route>

            {/* Catch all - redirect to dashboard if authenticated, otherwise to login */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
