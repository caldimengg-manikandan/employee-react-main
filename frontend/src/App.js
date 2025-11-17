// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserAccess from "./pages/UserAccess";
import EmployeeManagement from "./pages/EmployeeManagement";

// Timesheet Pages
import Timesheet from "./pages/timesheet/Timesheet";
import TimesheetHistory from "./pages/timesheet/TimesheetHistory";
import EmployeeAttendance from "./pages/timesheet/EmployeeAttendance";

// Project Allocation Pages
import ProjectAllocation from './pages/project-allocation/ProjectAllocation';

// Leave Management Pages
import LeaveManagement from './pages/leave-management/LeaveManagement';
import LeaveApplications from './pages/leave-management/LeaveApplications'; // For managers/admin

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Layout */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            {/* Default redirect */}
            <Route index element={<Navigate to="/dashboard" replace />} />

            {/* Dashboard */}
            <Route path="dashboard" element={<Dashboard />} />

            {/* ---------------- Timesheet Management ---------------- */}
            <Route
              path="timesheet"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <Timesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/history"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <TimesheetHistory />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/attendance"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <EmployeeAttendance />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Project Allocation ---------------- */}
            <Route 
              path="project-allocation" 
              element={
                <ProtectedRoute requiredPermissions={["project_access"]}>
                  <ProjectAllocation />
                </ProtectedRoute>
              } 
            />

            {/* ---------------- Leave Management ---------------- */}
            <Route
              path="leave-management"
              element={
                <ProtectedRoute requiredPermissions={["leave_access"]} allowEmployeeRole>
                  <LeaveManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="leave-management/applications"
              element={
                <ProtectedRoute requiredPermissions={["leave_approval"]}>
                  <LeaveApplications />
                </ProtectedRoute>
              }
            />

            {/* ---------------- User & Employee Management ---------------- */}
            <Route
              path="user-access"
              element={
                <ProtectedRoute requiredPermissions={["user_access"]}>
                  <UserAccess />
                </ProtectedRoute>
              }
            />

            <Route
              path="employee-management"
              element={
                <ProtectedRoute requiredPermissions={["employee_access"]}>
                  <EmployeeManagement />
                </ProtectedRoute>
              }
            />
          </Route>
        </Routes>
      </div>
    </Router>
  );
}

export default App;