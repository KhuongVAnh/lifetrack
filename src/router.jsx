import { Navigate, createBrowserRouter } from "react-router-dom";
import { AppointmentsPage } from "./pages/AppointmentsPage";
import { CommunityKnowledgePage } from "./pages/CommunityKnowledgePage";
import { CommunityQuestionsPage } from "./pages/CommunityQuestionsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { DoctorProfilePage } from "./pages/DoctorProfilePage";
import { DoctorsHirePage } from "./pages/DoctorsHirePage";
import { DoctorsMyPage } from "./pages/DoctorsMyPage";
import { HealthRecordDetailPage } from "./pages/HealthRecordDetailPage";
import { HealthRecordsPage } from "./pages/HealthRecordsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { CommunityShell } from "./shells/CommunityShell";
import { DoctorShell } from "./shells/DoctorShell";
import { PatientShell } from "./shells/PatientShell";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/patient/dashboard" />,
  },
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
                element: <HealthRecordsPage />,
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
            element: <Navigate replace to="/patient/doctors/my" />,
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
]);
