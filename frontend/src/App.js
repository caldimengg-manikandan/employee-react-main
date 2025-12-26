// src/App.js
import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout/Layout";
import ProtectedRoute from "./components/Layout/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import UserAccess from "./pages/UserAccess";
import MyProfile from "./pages/MyProfile";
import EmployeeManagement from "./pages/EmployeeManagement";

// Timesheet Pages
import Timesheet from "./pages/timesheet/Timesheet";
import TimesheetHistory from "./pages/timesheet/TimesheetHistory";
import EmployeeAttendance from "./pages/timesheet/EmployeeAttendance";
import AttendanceRegularization from "./pages/timesheet/AttendanceRegularization";
import AttendanceApproval from "./pages/timesheet/AttendanceApproval";

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

import SalarySlips from "./pages/salaryslips/SalarySlips";
import ExpenditureManagement from "./pages/expenditure/ExpenditureManagement"
import EmployeeRewardTracker from "./pages/rewards/EmployeeRewardTracker";

// Payroll
import PayrollDetails from "./pages/payroll/PayrollDetails";
import CostToTheCompany from "./pages/payroll/CostToTheCompany";
import LoanSummary from "./pages/payroll/LoanSummary";
import GratuitySummary from "./pages/payroll/GratuitySummary";
import MonthlyPayroll from "./pages/payroll/MonthlyPayroll";
import AnnouncementManagement from "./pages/announcements/AnnouncementManagement";
import InternReference from "./pages/internship/InternReference";



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
            <Route
              path="timesheet/regularization"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} allowEmployeeRole>
                  <AttendanceRegularization />
                </ProtectedRoute>
              }
            />
            <Route
              path="timesheet/attendance-approval"
              element={
                <ProtectedRoute requiredPermissions={["attendance_access"]} roles={["admin", "hr", "manager"]}>
                  <AttendanceApproval />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Admin Timesheet ---------------- */}
            <Route
              path="admin/timesheet"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} roles={["admin", "projectmanager", "project_manager"]}>
                  <AdminTimesheet />
                </ProtectedRoute>
              }
            />
            <Route 
              path="admin/timesheet/approval"
              element={
                <ProtectedRoute requiredPermissions={["timesheet_access"]} roles={["admin", "projectmanager", "project_manager"]}>
                  <TimesheetSummary />
                </ProtectedRoute>
              }
            />
            
            <Route
              path="admin/interns"
              element={
                <ProtectedRoute roles={["admin", "hr", "manager"]}>
                  <InternReference />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Project Allocation ---------------- */}
            <Route 
              path="project-allocation" 
              element={
                <ProtectedRoute requiredPermissions={["project_access"]} roles={["admin", "projectmanager", "project_manager"]}>
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
                <ProtectedRoute requiredPermissions={["dashboard"]} allowEmployeeRole>
                  <PolicyPortal />
                </ProtectedRoute>
              }
            />

            {/* ---------------- Salary Slips - ADDED ---------------- */}
            <Route 
              path="salaryslips" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["payroll_view"]} 
                  roles={["admin", "hr", "employees", "projectmanager", "project_manager"]}
                  allowEmployeeRole
                >
                  <SalarySlips />
                </ProtectedRoute>
              } 
            />

            {/* ---------------- Expenditure Management ---------------- */}
            <Route 
              path="expenditure-management" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["expenditure_access"]} 
                  roles={["admin", "hr", "finance"]}
                >
                  <ExpenditureManagement />
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
                  roles={["admin", "hr", "manager", "employees"]}
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
                  roles={["employees", "projectmanager", "project_manager"]} 
                  allowEmployeeRole
                >
                  <LeaveApplications />
                </ProtectedRoute>
              } 
            />
            
            {/* ---------------- Employee Reward Tracker ---------------- */}
            <Route 
              path="employee-reward-tracker" 
              element={
                <ProtectedRoute 
                  requiredPermissions={["reward_access"]} 
                  roles={["admin", "hr", "manager"]}
                >
                  <EmployeeRewardTracker />
                </ProtectedRoute>
              } 
            />

            {/* PAYROLL */}
            <Route
              path="payroll/details"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access"]} roles={["admin", "hr", "finance"]}>
                  <PayrollDetails />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/cost-to-the-company"
              element={
                <ProtectedRoute requiredPermissions={["payroll_view"]} roles={["admin", "hr", "finance"]}>
                  <CostToTheCompany />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/loan-summary"
              element={
                <ProtectedRoute requiredPermissions={["loan_view"]} roles={["admin", "hr", "finance"]}>
                  <LoanSummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/gratuity-summary"
              element={
                <ProtectedRoute requiredPermissions={["gratuity_view"]} roles={["admin", "hr", "finance"]}>
                  <GratuitySummary />
                </ProtectedRoute>
              }
            />
            <Route
              path="payroll/monthly"
              element={
                <ProtectedRoute requiredPermissions={["payroll_access"]} roles={["admin", "hr", "finance"]}>
                  <MonthlyPayroll />
                </ProtectedRoute>
              }
            />

        

            {/* ---------------- User & Employee Management ---------------- */}
            <Route
              path="my-profile"
              element={
                <ProtectedRoute>
                  <MyProfile />
                </ProtectedRoute>
              }
            />

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
            
            {/* ---------------- Announcements ---------------- */}
            <Route
              path="announcements"
              element={
                <ProtectedRoute requiredPermissions={["announcement_manage"]} roles={["admin", "hr", "manager"]}>
                  <AnnouncementManagement />
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