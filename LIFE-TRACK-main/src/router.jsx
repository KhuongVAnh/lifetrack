import { Navigate, Outlet, createBrowserRouter, useLocation } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DoctorDashboardPage } from "./pages/DoctorDashboardPage";
import { DoctorLivePage } from "./pages/DoctorLivePage";
import { DoctorPatientsPage } from "./pages/DoctorPatientsPage";
import { DoctorAppointmentsPage } from "./pages/DoctorAppointmentsPage";
import { DoctorMessagesPage } from "./pages/DoctorMessagesPage";
import { DoctorPortalShell } from "./shells/DoctorPortalShell";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { CommunityKnowledgePage } from "./pages/CommunityKnowledgePage";
import { CommunityQuestionsPage } from "./pages/CommunityQuestionsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DoctorProfilePage } from "./pages/DoctorProfilePage";
import { DoctorsHirePage } from "./pages/DoctorsHirePage";
import { DoctorsMyPage } from "./pages/DoctorsMyPage";
import { HealthRecordDetailPage } from "./pages/HealthRecordDetailPage";
import { HealthRecordsPage } from "./pages/HealthRecordsPage";
import { PatientDoctorContactPage } from "./pages/PatientDoctorContactPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CommunityShell } from "./shells/CommunityShell";
import { DoctorShell } from "./shells/DoctorShell";
import { PatientShell } from "./shells/PatientShell";
import { canAccessPatientPortal, getHomePathForRole, isDoctorRole } from "./utils/auth";

function RequireDoctorPortal() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!isDoctorRole(user.normalizedRole ?? user.role)) {
    return <Navigate replace to={getHomePathForRole(user.normalizedRole ?? user.role)} />;
  }

  return <Outlet />;
}

function RequirePatientPortal() {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return null;
  }

  if (!user) {
    return <Navigate replace state={{ from: location }} to="/login" />;
  }

  if (!canAccessPatientPortal(user.normalizedRole ?? user.role)) {
    return <Navigate replace to={getHomePathForRole(user.normalizedRole ?? user.role)} />;
  }

  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/login" />,
  },
  {
    path: "/login",
    element: <LoginPage />,
  },
  {
    element: <RequireDoctorPortal />,
    children: [
      {
        path: "/doctor",
        element: <DoctorPortalShell />,
        children: [
          {
            path: "dashboard",
            element: <DoctorDashboardPage />,
          },
          {
            path: "live",
            element: <DoctorLivePage />,
          },
          {
            path: "patients",
            element: <DoctorPatientsPage />,
          },
          {
            path: "appointments",
            element: <DoctorAppointmentsPage />,
          },
          {
            path: "messages",
            element: <DoctorMessagesPage />,
          },
          {
            path: "*",
            element: <Navigate replace to="/doctor/dashboard" />
          }
        ]
      }
    ],
  },
  {
    element: <RequirePatientPortal />,
    children: [
      {
        path: "/patient",
        children: [
          {
            element: <PatientShell />,
            children: [
              {
                path: "dashboard",
                element: <DashboardPage />,
              },
              {
                path: "health-records",
                children: [
                  {
                    index: true,
                    element: <HealthRecordDetailPage />,
                  },
                  {
                    path: ":memberId",
                    element: <HealthRecordDetailPage />,
                  },
                ],
              },
              {
                path: "appointments",
                element: <AppointmentsPage />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
            ],
          },
          {
            path: "community",
            element: <CommunityShell />,
            children: [
              {
                index: true,
                element: <Navigate replace to="/patient/community/knowledge" />,
              },
              {
                path: "knowledge",
                element: <CommunityKnowledgePage />,
              },
              {
                path: "questions",
                element: <CommunityQuestionsPage />,
              },
            ],
          },
          {
            path: "doctors",
            element: <DoctorShell />,
            children: [
              {
                index: true,
                element: <PatientDoctorContactPage />,
              },
              {
                path: "my",
                element: <DoctorsMyPage />,
              },
              {
                path: "hire",
                element: <DoctorsHirePage />,
              },
              {
                path: ":doctorId/consult",
                element: <PatientDoctorContactPage />,
              },
              {
                path: ":doctorId",
                element: <DoctorProfilePage />,
              },
            ],
          },
          {
            path: "*",
            element: <Navigate replace to="/patient/dashboard" />,
          },
        ],
      },
    ],
  },
]);
