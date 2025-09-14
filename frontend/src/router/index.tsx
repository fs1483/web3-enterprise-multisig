import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';
import { DashboardPage } from '../pages/DashboardPage';
import { OptimizedDashboardPage } from '../pages/OptimizedDashboardPage';
import { ProposalsPage } from '../pages/proposals/ProposalsPage';
import { ProposalDetailPage } from '../pages/proposals/ProposalDetailPage';
import { CreateProposalPage } from '../pages/proposals/CreateProposalPage';
import { CreateSafePage } from '../pages/safes/CreateSafePage';
import SafeCreationStatusPage from '../pages/safes/SafeCreationStatusPage';
import SafeTransactionHistoryPage from '../pages/safes/SafeTransactionHistoryPage';
import SafeDetailPage from '../pages/safes/SafeDetailPage';
import SafesPage from '../pages/safes/SafesPage';
import { TransactionsPage } from '../pages/transactions/TransactionsPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

export const AppRouter: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <RegisterPage />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <OptimizedDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/dashboard/legacy"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/proposals"
          element={
            <ProtectedRoute>
              <ProposalsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/proposals/:id"
          element={
            <ProtectedRoute>
              <ProposalDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Safe Management */}
        <Route
          path="/safes"
          element={
            <ProtectedRoute>
              <SafesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Analytics</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/team"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Team Management</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Settings</h1>
                <p className="text-gray-600 mt-2">Coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />
        <Route
          path="/proposals/create"
          element={
            <ProtectedRoute>
              <CreateProposalPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safes/create"
          element={
            <ProtectedRoute>
              <CreateSafePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safes/status/:transactionId"
          element={
            <ProtectedRoute>
              <SafeCreationStatusPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safes/history"
          element={
            <ProtectedRoute>
              <SafeTransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safe-transactions"
          element={
            <ProtectedRoute>
              <SafeTransactionHistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/safes/:safeAddress"
          element={
            <ProtectedRoute>
              <SafeDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/help"
          element={
            <ProtectedRoute>
              <div className="p-8 text-center">
                <h1 className="text-2xl font-bold">Help & Documentation</h1>
                <p className="text-gray-600 mt-2">Documentation and help resources coming soon...</p>
              </div>
            </ProtectedRoute>
          }
        />

        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};
