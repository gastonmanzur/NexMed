import type { ReactElement } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { HomePage } from '../features/home/HomePage';
import { AdminPage } from '../features/admin/AdminPage';
import {
  LoginPage,
  RegisterPage,
  ForgotPasswordPage,
  ResetPasswordPage,
  VerifyEmailPage,
  ChangePasswordPage,
  PostLoginResolverPage
} from '../features/auth/pages';
import { ProtectedRoute } from '../features/auth/ProtectedRoute';
import { UnauthorizedPage } from '../features/auth/UnauthorizedPage';
import { DashboardPage } from '../features/protected/DashboardPage';
import {
  AppPlaceholderPage,
  CreateOrganizationPage,
  OnboardingPage,
  SelectOrganizationPage
} from '../features/organizations/pages';

export const App = (): ReactElement => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route
        path="/post-login"
        element={
          <ProtectedRoute>
            <PostLoginResolverPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <OnboardingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/organizations/new"
        element={
          <ProtectedRoute>
            <CreateOrganizationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/select-organization"
        element={
          <ProtectedRoute>
            <SelectOrganizationPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute requireActiveOrganization>
            <AppPlaceholderPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireActiveOrganization>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/change-password"
        element={
          <ProtectedRoute>
            <ChangePasswordPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminPage />
          </ProtectedRoute>
        }
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
