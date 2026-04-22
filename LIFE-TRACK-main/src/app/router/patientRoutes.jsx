import { Navigate } from "react-router-dom";
import { CommunityLayout, PatientLayout, DoctorLayout } from "@/app/layouts";
import { RequirePatientPortal } from "./guards";

function lazyPage(importer, exportName) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

export const patientRoutes = [
  {
    element: <RequirePatientPortal />,
    children: [
      {
        path: "/patient",
        children: [
          {
            element: <PatientLayout />,
            children: [
              {
                path: "dashboard",
                lazy: lazyPage(() => import("@/widgets/page-views/DashboardPage"), "DashboardPage"),
              },
              {
                path: "health-records",
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/widgets/page-views/HealthRecordDetailPage"), "HealthRecordDetailPage"),
                  },
                  {
                    path: ":memberId",
                    lazy: lazyPage(() => import("@/widgets/page-views/HealthRecordDetailPage"), "HealthRecordDetailPage"),
                  },
                ],
              },
              {
                path: "appointments",
                lazy: lazyPage(() => import("@/widgets/page-views/AppointmentsPage"), "AppointmentsPage"),
              },
              {
                path: "medications",
                lazy: lazyPage(() => import("@/widgets/page-views/MedicationsPage"), "MedicationsPage"),
              },
              {
                path: "phr",
                lazy: lazyPage(() => import("@/widgets/page-views/phr/PatientPhrShell"), "PatientPhrShell"),
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/widgets/page-views/phr/PhrOverviewPage"), "PhrOverviewPage"),
                  },
                  {
                    path: "history",
                    lazy: lazyPage(() => import("@/widgets/page-views/phr/PhrHistoryPage"), "PhrHistoryPage"),
                  },
                ],
              },
              {
                path: "settings",
                lazy: lazyPage(() => import("@/widgets/page-views/SettingsPage"), "SettingsPage"),
              },
            ],
          },
          {
            path: "doctors",
            element: <DoctorLayout />,
            children: [
              {
                index: true,
                element: <Navigate replace to="/patient/doctors/my" />,
              },
              {
                path: "chat",
                children: [
                  {
                    index: true,
                    lazy: lazyPage(() => import("@/widgets/page-views/PatientDoctorContactPage"), "PatientDoctorContactPage"),
                  },
                  {
                    path: ":doctorId",
                    lazy: lazyPage(() => import("@/widgets/page-views/PatientDoctorContactPage"), "PatientDoctorContactPage"),
                  },
                ],
              },
              {
                path: "my",
                lazy: lazyPage(() => import("@/widgets/page-views/DoctorsMyPage"), "DoctorsMyPage"),
              },
              {
                path: "hire",
                lazy: lazyPage(() => import("@/widgets/page-views/DoctorsHirePage"), "DoctorsHirePage"),
              },
              {
                path: ":doctorId/consult",
                lazy: lazyPage(() => import("@/widgets/page-views/PatientDoctorContactPage"), "PatientDoctorContactPage"),
              },
              {
                path: ":doctorId",
                lazy: lazyPage(() => import("@/widgets/page-views/DoctorProfilePage"), "DoctorProfilePage"),
              },
            ],
          },
          {
            path: "community",
            element: <CommunityLayout />,
            children: [
              {
                index: true,
                element: <Navigate replace to="/patient/community/knowledge" />,
              },
              {
                path: "knowledge",
                lazy: lazyPage(() => import("@/widgets/page-views/CommunityKnowledgePage"), "CommunityKnowledgePage"),
              },
              {
                path: "questions",
                lazy: lazyPage(() => import("@/widgets/page-views/CommunityQuestionsPage"), "CommunityQuestionsPage"),
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
];
