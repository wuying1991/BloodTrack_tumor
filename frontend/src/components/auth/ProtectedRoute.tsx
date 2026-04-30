import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * ProtectedRoute Component
 * Wraps routes that require authentication
 * Redirects to login if user is not authenticated
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // Show loading state while checking authentication
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>加载中... (Loading...)</p>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    // Save the current location to redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render children if authenticated
  return <>{children}</>;
};

/**
 * PublicOnlyRoute Component
 * Wraps routes that should only be accessible to non-authenticated users
 * Redirects to dashboard if user is already authenticated
 */
export const PublicOnlyRoute: React.FC<ProtectedRouteProps> = ({
  children,
  fallback,
}) => {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className="auth-loading">
        <div className="spinner"></div>
        <p>加载中... (Loading...)</p>
      </div>
    );
  }

  // Redirect to dashboard if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  // Render children if not authenticated
  return <>{children}</>;
};

export default ProtectedRoute;
