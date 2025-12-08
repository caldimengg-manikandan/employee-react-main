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

// Leave Application Pages
import LeaveApplications from './pages/leaveapplications/LeaveApplications';

//Leave Management Pages 
import EditLeaveEligibility from './pages/leavemanagement/EditLeaveEligibility';
import LeaveSummary from './pages/leavemanagement/LeaveSummary';
import LeaveBalance from './pages/leavemanagement/LeaveBalance';
import TraineeManagement from './pages/leavemanagement/TraineeManagement';

// Admin Timesheet Pages
import AdminTimesheet from './pages/admin-timesheet/AdminTimesheet';
import TimesheetSummary from './pages/admin-timesheet/TimesheetSummary';
// Insurance & Policy Pages
import InsuranceManagement from './pages/insurance/InsuranceManagement';
import PolicyPortal from './pages/PolicyPortal';
import TeamManagement from './pages/admin/TeamManagement';

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
                <ProtectedRoute requiredPermissions={["attendance_access"]}>
                  <EmployeeAttendance />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Admin Timesheet ---------------- */}
            <Route
              path="admin/timesheet"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]}>
                  <AdminTimesheet />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/timesheet/approval"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]}>
                  <TimesheetSummary />
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

            {/* ---------------- Insurance & Policy ---------------- */}
            <Route
              path="insurance"
              element={
                <ProtectedRoute requiredPermissions={["dashboard"]}>
                  <InsuranceManagement />
                </ProtectedRoute>
              }
            />
            <Route
              path="policies"
              element={
                <ProtectedRoute requiredPermissions={["dashboard"]}>
                  <PolicyPortal />
                </ProtectedRoute>
              }
            />



            {/* ---------------- LEAVE MANAGEMENT MODULES (NO DASHBOARD) ---------------- */}
            
            {/* Edit Leave Eligibility */}
            <Route 
              path="leave-management/edit-eligibility" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["leave_manage"]} 
                  roles={["admin", "hr"]}
                >
                  <EditLeaveEligibility />
                </ProtectedRoute>
              } 
            />
            
            {/* Leave Summary */}
            <Route 
              path="leave-management/summary" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["leave_view"]} 
                  roles={["admin", "hr", "manager"]}
                >
                  <LeaveSummary />
                </ProtectedRoute>
              } 
            />
            
            {/* Leave Balance */}
            <Route 
              path="leave-management/balance" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["leave_view"]} 
                  roles={["admin", "hr", "manager", "employee"]}
                  allowEmployeeRole
                >
                  <LeaveBalance />
                </ProtectedRoute>
              } 
            />
            
            {/* Trainees Management */}
            <Route 
              path="leave-management/trainees" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["leave_manage_trainees"]} 
                  roles={["admin", "hr"]}
                >
                  <TraineeManagement />
                </ProtectedRoute>
              } 
            />

            {/* ---------------- Leave Application ---------------- */}
            <Route 
              path="leave-applications" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["leave_access"]} 
                  roles={["employee"]} 
                  allowEmployeeRole
                >
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

            {/* ---------------- Team Management ---------------- */}
            <Route
              path="admin/team-management"
              element={
                <ProtectedRoute requiredPermissions={["employee_access"]}>
                  <TeamManagement />
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
