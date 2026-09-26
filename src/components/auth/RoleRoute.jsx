import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import AuthLoadingScreen from './AuthLoadingScreen';

export default function RoleRoute({ allowedRoles = [], children }) {
  const { currentUser, isAuthenticated, authLoading } = useAuth();

  if (authLoading) {
    return <AuthLoadingScreen message="Checking authorization privileges..." />;
  }

  if (!isAuthenticated || !currentUser) {
    return <Navigate to="/access" replace />;
  }

  if (!allowedRoles.includes(currentUser.role)) {
    // Redirect unauthorized user to their authorized portal
    if (currentUser.role === 'ADMIN') {
      return <Navigate to="/admin/dashboard" replace />;
    }
    if (currentUser.role === 'USER') {
      return <Navigate to="/user/dashboard" replace />;
    }
    return <Navigate to="/access" replace />;
  }

  return children;
}
