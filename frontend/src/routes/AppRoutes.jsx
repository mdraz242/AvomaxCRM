import { Navigate, Route, Routes } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import AccommodationPage from '../pages/AccommodationPage.jsx';
import ActivityLogsPage from '../pages/ActivityLogsPage.jsx';
import AdmissionsPage from '../pages/AdmissionsPage.jsx';
import DashboardPage from '../pages/DashboardPage.jsx';
import DocumentsPage from '../pages/DocumentsPage.jsx';
import FeesPage from '../pages/FeesPage.jsx';
import FlightsPage from '../pages/FlightsPage.jsx';
import LoginPage from '../pages/LoginPage.jsx';
import ReportsPage from '../pages/ReportsPage.jsx';
import SettingsPage from '../pages/SettingsPage.jsx';
import StaffPage from '../pages/StaffPage.jsx';
import StudentProfilePage from '../pages/StudentProfilePage.jsx';
import StudentsPage from '../pages/StudentsPage.jsx';
import VisaPage from '../pages/VisaPage.jsx';
import { ROLES } from '../utils/constants.js';
import ProtectedRoute from './ProtectedRoute.jsx';

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="students/:id" element={<StudentProfilePage />} />
        <Route path="admissions" element={<AdmissionsPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="visa" element={<VisaPage />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="flights" element={<FlightsPage />} />
        <Route path="accommodation" element={<AccommodationPage />} />
        <Route
          path="staff"
          element={
            <ProtectedRoute allowedRoles={[ROLES.SUPER_ADMIN, ROLES.ADMIN]}>
              <StaffPage />
            </ProtectedRoute>
          }
        />
        <Route path="reports" element={<ReportsPage />} />
        <Route path="activity-logs" element={<ActivityLogsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

