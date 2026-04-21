import { Navigate } from "react-router-dom";
import { DoctorLayout, DoctorPortalLayout } from "@/app/layouts";
import { RequireDoctorPortal } from "./guards";

function lazyPage(importer, exportName) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

export const doctorRoutes = [
  {
    element: <RequireDoctorPortal />,
    children: [
      {
        path: "/doctor",
        element: <DoctorPortalLayout />,
        children: [
          {
            path: "dashboard",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorDashboardPage"), "DoctorDashboardPage"),
          },
          {
            path: "live",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorLivePage"), "DoctorLivePage"),
          },
          {
            path: "patients",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorPatientsPage"), "DoctorPatientsPage"),
          },
          {
            path: "appointments",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorAppointmentsPage"), "DoctorAppointmentsPage"),
          },
          {
            path: "messages",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorMessagesPage"), "DoctorMessagesPage"),
          },
          {
            path: "emr",
            lazy: lazyPage(() => import("@/widgets/page-views/DoctorEmrPage"), "DoctorEmrPage"),
          },
          {
            path: "*",
            element: <Navigate replace to="/doctor/dashboard" />,
          },
        ],
      },
      {
        path: "/patient/doctors",
        element: <DoctorLayout />,
        children: [
          {
            index: true,
            element: <Navigate replace to="/patient/doctors/my" />,
          },
          {
            path: "chat",
            lazy: lazyPage(() => import("@/widgets/page-views/PatientDoctorContactPage"), "PatientDoctorContactPage"),
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
    ],
  },
];
