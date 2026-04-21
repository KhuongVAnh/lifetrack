import React from "react";
import { RouterProvider } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import { router } from "@/app/router";
import { AuthProvider } from "@/app/providers/AuthProvider";
import "react-toastify/dist/ReactToastify.css";

export default function App() {
  return (
    <React.StrictMode>
      <AuthProvider>
        <RouterProvider router={router} />
        <ToastContainer position="top-right" autoClose={1800} hideProgressBar={false} newestOnTop />
      </AuthProvider>
    </React.StrictMode>
  );
}
