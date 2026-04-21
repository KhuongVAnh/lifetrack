import { Navigate } from "react-router-dom";
import { CommunityLayout, PatientLayout } from "@/app/layouts";
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
