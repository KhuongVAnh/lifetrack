import { Navigate, createBrowserRouter } from "react-router-dom";
import { doctorRoutes } from "./doctorRoutes";
import { patientRoutes } from "./patientRoutes";

function lazyPage(importer, exportName) {
  return async () => {
    const module = await importer();
    return { Component: module[exportName] };
  };
}

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate replace to="/login" />,
  },
  {
    path: "/login",
    lazy: lazyPage(() => import("@/widgets/page-views/LoginPage"), "LoginPage"),
  },
  ...doctorRoutes,
  ...patientRoutes,
]);
