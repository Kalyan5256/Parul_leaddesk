import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';

// Pages
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { ForgotPasswordPage } from './pages/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ForceChangePasswordPage } from './pages/ForceChangePasswordPage';
import { DailyReportPage } from './pages/DailyReportPage';
import { MyLeadsPage } from './pages/MyLeadsPage';
import { FollowUpsPage } from './pages/FollowUpsPage';
import { ManagerDashboardPage } from './pages/ManagerDashboardPage';
import { AllLeadsPage } from './pages/AllLeadsPage';
import { FollowUpCommandCentrePage } from './pages/FollowUpCommandCentrePage';
import { TeamManagementPage } from './pages/TeamManagementPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30 seconds
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// Root redirect based on role
const RootRedirect: React.FC = () => {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;

  if (user?.role === 'employee') {
    return <Navigate to="/report" replace />;
  }
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute>
                    <ForceChangePasswordPage />
                  </ProtectedRoute>
                }
              />



              {/* Protected App Routes with Unified Layout */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                {/* Employee & All-Staff Daily Report (Core Feature) */}
                <Route path="/report" element={<DailyReportPage />} />

                {/* My Leads (Employee & Team Lead) */}
                <Route
                  path="/my-leads"
                  element={
                    <ProtectedRoute allowedRoles={['employee', 'team_lead', 'manager', 'admin']}>
                      <MyLeadsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Follow-ups Queue (Employee & Team Lead) */}
                <Route
                  path="/follow-ups"
                  element={
                    <ProtectedRoute allowedRoles={['employee', 'team_lead', 'manager', 'admin']}>
                      <FollowUpsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Manager & Team Lead Dashboard */}
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute allowedRoles={['team_lead', 'manager', 'admin']}>
                      <ManagerDashboardPage />
                    </ProtectedRoute>
                  }
                />

                {/* All Leads (Manager, Team Lead, Admin) */}
                <Route
                  path="/leads"
                  element={
                    <ProtectedRoute allowedRoles={['team_lead', 'manager', 'admin']}>
                      <AllLeadsPage />
                    </ProtectedRoute>
                  }
                />

                {/* Follow-up Command Centre (Manager, Team Lead, Admin) */}
                <Route
                  path="/followups"
                  element={
                    <ProtectedRoute allowedRoles={['team_lead', 'manager', 'admin']}>
                      <FollowUpCommandCentrePage />
                    </ProtectedRoute>
                  }
                />

                {/* Team Management (Manager & Admin only) */}
                <Route
                  path="/team"
                  element={
                    <ProtectedRoute allowedRoles={['manager', 'admin']}>
                      <TeamManagementPage />
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Dynamic Root & Fallback */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
