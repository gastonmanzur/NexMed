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
import { AppointmentCreatePage } from '../features/appointments/AppointmentCreatePage';
import { AppointmentsListPage } from '../features/appointments/AppointmentsListPage';
import { AppointmentDetailPage } from '../features/appointments/AppointmentDetailPage';
import { AppointmentReschedulePage } from '../features/appointments/AppointmentReschedulePage';
import { JoinPage } from '../features/patient/JoinPage';
import { PatientOrganizationsPage } from '../features/patient/PatientOrganizationsPage';
import { PatientBookPage } from '../features/patient/PatientBookPage';
import { PatientAppointmentsPage } from '../features/patient/PatientAppointmentsPage';
import { PatientReschedulePage } from '../features/patient/PatientReschedulePage';
import { PatientProfilePage } from '../features/patient/PatientProfilePage';
import { PatientNotificationsPage } from '../features/patient/PatientNotificationsPage';
import { PatientWaitlistPage } from '../features/patient/PatientWaitlistPage';
import { PatientWaitlistCreatePage } from '../features/patient/PatientWaitlistCreatePage';
import { OrganizationReminderRulesPage } from '../features/organizations/OrganizationReminderRulesPage';
import { FeedbackPage } from '../features/feedback/FeedbackPage';

export const App = (): ReactElement => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />
      <Route path="/join/:tokenOrSlug" element={<JoinPage />} />
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
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <OrganizationProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/professionals"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <ProfessionalsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/professionals/new"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <ProfessionalFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/professionals/:professionalId/edit"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <ProfessionalFormPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/app/professionals/:professionalId/availability"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <ProfessionalAvailabilityPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <SpecialtiesListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties/new"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <SpecialtyFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/specialties/:specialtyId/edit"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <SpecialtyFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/appointments"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <AppointmentsListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/appointments/new"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <AppointmentCreatePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/appointments/:appointmentId"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <AppointmentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/appointments/:appointmentId/reschedule"
        element={
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin', 'staff']}>
            <AppointmentReschedulePage />
          </ProtectedRoute>
        }
      />


      <Route
        path="/feedback"
        element={(
          <ProtectedRoute>
            <FeedbackPage />
          </ProtectedRoute>
        )}
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
      <Route
        path="/patient/organizations"
        element={(
          <ProtectedRoute>
            <PatientOrganizationsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/organizations/:organizationId/book"
        element={(
          <ProtectedRoute>
            <PatientBookPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/appointments"
        element={(
          <ProtectedRoute>
            <PatientAppointmentsPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/appointments/:appointmentId/reschedule"
        element={(
          <ProtectedRoute>
            <PatientReschedulePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/profile"
        element={(
          <ProtectedRoute>
            <PatientProfilePage />
          </ProtectedRoute>
        )}
      />

      <Route
        path="/patient/waitlist"
        element={(
          <ProtectedRoute>
            <PatientWaitlistPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/waitlist/new"
        element={(
          <ProtectedRoute>
            <PatientWaitlistCreatePage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/organization/settings/reminders"
        element={(
          <ProtectedRoute requireActiveOrganization allowedOrganizationRoles={['owner', 'admin']}>
            <OrganizationReminderRulesPage />
          </ProtectedRoute>
        )}
      />
      <Route
        path="/patient/notifications"
        element={(
          <ProtectedRoute>
            <PatientNotificationsPage />
          </ProtectedRoute>
        )}
      />
      <Route path="/unauthorized" element={<UnauthorizedPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};
