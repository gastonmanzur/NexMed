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
  CreateOrganizationPage,
  OnboardingPage,
  SelectOrganizationPage
} from '../features/organizations/pages';
import { OrganizationOnboardingPage } from '../features/organizations/OrganizationOnboardingPage';
import { OrganizationProfilePage } from '../features/organizations/OrganizationProfilePage';
import { ProfessionalsListPage } from '../features/professionals/ProfessionalsListPage';
import { ProfessionalFormPage } from '../features/professionals/ProfessionalFormPage';
import { ProfessionalAvailabilityPage } from '../features/professionals/ProfessionalAvailabilityPage';
import { SpecialtiesListPage } from '../features/specialties/SpecialtiesListPage';
import { SpecialtyFormPage } from '../features/specialties/SpecialtyFormPage';

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
        path="/onboarding/organization"
        element={
          <ProtectedRoute requireActiveOrganization>
            <OrganizationOnboardingPage />
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
        path="/organization/profile"
        element={
          <ProtectedRoute requireActiveOrganization>
            <OrganizationProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute requireActiveOrganization>
            <DashboardPage />
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
        path="/app/professionals"
        element={
          <ProtectedRoute requireActiveOrganization>
            <ProfessionalsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/professionals/new"
        element={
          <ProtectedRoute requireActiveOrganization>
            <ProfessionalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/professionals/:professionalId/edit"
        element={
          <ProtectedRoute requireActiveOrganization>
            <ProfessionalFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/professionals/:professionalId/availability"
        element={
          <ProtectedRoute requireActiveOrganization>
            <ProfessionalAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties"
        element={
          <ProtectedRoute requireActiveOrganization>
            <SpecialtiesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties/new"
        element={
          <ProtectedRoute requireActiveOrganization>
            <SpecialtyFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties/:specialtyId/edit"
        element={
          <ProtectedRoute requireActiveOrganization>
            <SpecialtyFormPage />
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
