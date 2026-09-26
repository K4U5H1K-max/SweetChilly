import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import ProtectedRoute from './components/auth/ProtectedRoute';
import RoleRoute from './components/auth/RoleRoute';
import AuthLoadingScreen from './components/auth/AuthLoadingScreen';
import AdminLayout from './components/layouts/AdminLayout';
import AdminDashboard from './components/admin/AdminDashboard';
import UserLayout from './components/layouts/UserLayout';
import UserDashboard from './components/user/UserDashboard';
import ProjectBrahmaputraLanding from './components/ProjectBrahmaputra/ProjectBrahmaputraLanding';
import AccessPortalPage from './components/auth/AccessPortalPage';

/**
 * Intelligent root route redirection handler
 */
function RootRedirect() {
  const { currentUser, isAuthenticated, authLoading } = useAuth();
  const navigate = useNavigate();

  if (authLoading) {
    return <AuthLoadingScreen message="Initializing Project Brahmaputra platform..." />;
  }

  if (!isAuthenticated || !currentUser) {
    return <ProjectBrahmaputraLanding onProceed={() => navigate('/access')} />;
  }

  if (currentUser.role === 'ADMIN') {
    return <Navigate to="/admin/dashboard" replace />;
  }

  if (currentUser.role === 'USER') {
    return <Navigate to="/user/dashboard" replace />;
  }

  return <Navigate to="/access" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Intelligent Root Entry Point */}
        <Route path="/" element={<RootRedirect />} />

        {/* Public landing and role selection */}
        <Route path="/access" element={<AccessPortalPage />} />

        {/* Public Authentication Routes */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Protected Admin Portal / Command Center */}
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['ADMIN']}>
                <AdminLayout>
                  <AdminDashboard />
                </AdminLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/admin/*" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Protected User Portal / Operator Dashboard */}
        <Route
          path="/user/dashboard"
          element={
            <ProtectedRoute>
              <RoleRoute allowedRoles={['USER']}>
                <UserLayout>
                  <UserDashboard />
                </UserLayout>
              </RoleRoute>
            </ProtectedRoute>
          }
        />
        <Route path="/user/*" element={<Navigate to="/user/dashboard" replace />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
