import React from "react";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({
  children,
  requiredPermissions = [],
  allowEmployeeRole = false, // ✅ new prop to allow employees for specific routes
}) => {
  // Get token and user
  const token =
    sessionStorage.getItem("token") ;
  const user = JSON.parse(
    sessionStorage.getItem("user") 
  );

  // If not logged in, redirect
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Admins can access everything
  if (user.role === "admin") {
    return children;
  }

  // ✅ Allow employees to access pages explicitly marked
  if (allowEmployeeRole && user.role === "employees") {
    return children;
  }

  // ✅ No special permission required
  if (requiredPermissions.length === 0) {
    return children;
  }

  // ✅ Check permission array
  const userPermissions = user.permissions || [];
  const hasPermission = requiredPermissions.some((perm) =>
    userPermissions.includes(perm)
  );

  // ✅ Deny if missing permission
  if (!hasPermission) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-6xl text-gray-300 mb-4">🚫</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600 mb-4">
            You don't have permission to access this page.
          </p>
          <button
            onClick={() => window.history.back()}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  // ✅ Otherwise, allow access
  return children;
};

export default ProtectedRoute;
