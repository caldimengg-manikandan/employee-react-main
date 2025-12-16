import React, { useState } from "react";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

import {
  HomeIcon,
  KeyIcon,
  UsersIcon,
  ClockIcon,
  DocumentTextIcon,
  DocumentChartBarIcon,
  FolderIcon,
  CalendarIcon,
  BanknotesIcon,
  ShieldCheckIcon,
  DocumentIcon,
  ClipboardDocumentCheckIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  AcademicCapIcon,
  AdjustmentsHorizontalIcon,
  CurrencyDollarIcon // Added for Expenditure Management
} from "@heroicons/react/24/outline";

const Sidebar = ({ isOpen, onClose }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const permissions = user.permissions || [];
  const role = user.role || "employees";

  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // icon mapping
  const iconMap = {
    Dashboard: HomeIcon,
    "User Access": KeyIcon,
    "Employee Management": UsersIcon,
    "Timesheet": ClockIcon,
    "Employee Attendance": ClockIcon,
    "Project Allocation": FolderIcon,
    "Leave Management": CalendarIcon,
    "Leave Applications": ClipboardDocumentCheckIcon,
    "Salary Slips": BanknotesIcon,
    "Admin Timesheet": ClockIcon,
    "Insurance": ShieldCheckIcon,
    "Policy Portal": DocumentIcon,
    "Edit Leave Eligibility": AdjustmentsHorizontalIcon,
    "Leave Summary": ChartBarIcon,
    "Leave Balance": ClipboardDocumentListIcon,
    "Trainees Management": AcademicCapIcon,
    "Expenditure Management": CurrencyDollarIcon // Added
  };

  const getIconForMenu = (name) => iconMap[name] || HomeIcon;

  const menuItems = [
    {
      name: "Home",
      path: "/dashboard",
      icon: getIconForMenu("home"),
      allowEmployeeRole: true,
    },
    {
      name: "Timesheet",
      hasDropdown: true,
      icon: getIconForMenu("Timesheet"),
      permission: "timesheet_access",
      allowEmployeeRole: true,
      children: [
        { name: "Timesheet", path: "/timesheet" },
        { name: "Timesheet History", path: "/timesheet/history" },
      ],
    },
    {
      name: "Employee Attendance",
      path: "/timesheet/attendance",
      icon: getIconForMenu("Employee Attendance"),
      permission: "attendance_access",
      allowEmployeeRole: false,
    },
    {
      name: "Admin Timesheet",
      hasDropdown: true,
      icon: getIconForMenu("Admin Timesheet"),
      allowEmployeeRole: false,
      children: [
        { name: "Admin Timesheet", path: "/admin/timesheet" },
        { name: "Timesheet Summary", path: "/admin/timesheet/approval" },
      ],
    },
    {
      name: "Project Allocation",
      path: "/project-allocation",
      icon: getIconForMenu("Project Allocation"),
      permission: "project_access",
    },
    // LEAVE MANAGEMENT MODULE (SIMPLIFIED - REMOVED LEAVE DASHBOARD)
    {
      name: "Leave Management",
      hasDropdown: true,
      icon: getIconForMenu("Leave Management"),
      permission: "leave_access",
      allowEmployeeRole: false,
      children: [
      
        { 
          name: "Leave Summary", 
          path: "/leave-management/summary",
          icon: "ChartBarIcon",
          permission: "leave_view",
          showForRoles: ["admin", "hr", "manager"]
        },
        { 
          name: "Leave Balance", 
          path: "/leave-management/balance",
          icon: "ClipboardDocumentListIcon",
          permission: "leave_view",
          showForRoles: ["admin", "hr", "manager", "employees"],
          allowEmployeeRole: true
        },
       
      ],
    },
    // LEAVE APPLICATIONS AS SEPARATE MODULE (ADDED)
    {
      name: "Leave Applications",
      path: "/leave-applications",
      icon: getIconForMenu("Leave Applications"),
      permission: "leave_access",
      allowEmployeeRole: true,
    },
    {
      name: "Insurance",
      path: "/insurance",
      icon: getIconForMenu("Insurance"),
    },
    {
      name: role === "admin" ? "Policy Portal" : "Policy",
      path: "/policies",
      icon: getIconForMenu("Policy Portal"),
      allowEmployeeRole: true,
    },

    {
      name: "Salary Slips",
      path: "/salaryslips",
      icon: getIconForMenu("Salary Slips"),
      permission: "payroll_access",
      allowEmployeeRole: true,
    },




    // EXPENDITURE MANAGEMENT - ADDED
    {
      name: "Expenditure Management",
      path: "/expenditure-management",
      icon: getIconForMenu("Expenditure Management"),
      permission: "expenditure_access", // You can add this permission
      showForRoles: ["admin", "hr", "finance"], // Specify which roles can see this
      allowEmployeeRole: false, // Employees shouldn't see this by default
    },

    {
      name: "Employee Reward Tracker",
      path: "/employee-reward-tracker",
      icon: getIconForMenu("Employee Reward Tracker"),
      permission: "reward_access",
      showForRoles: ["admin", "hr", "manager"],
      allowEmployeeRole: false,
    },

    
    {
      name: "Employee Management",
      path: "/employee-management",
      icon: getIconForMenu("Employee Management"),
      permission: "employee_access",
    },
    {
      name: "User Access",
      path: "/user-access",
      icon: getIconForMenu("User Access"),
      permission: "user_access",
    },
    {
      name: "Team Management",
      path: "/admin/team-management",
      icon: getIconForMenu("Employee Management"),
      showForRoles: ["admin"],
    },
  ];

  const filteredMenuItems = menuItems.filter((item) => {
    if (item.showForRoles && !item.showForRoles.includes(role) && role !== "admin") {
      return false;
    }
    const hasPermission = !item.permission || permissions.includes(item.permission);
    const allowByRole =
      role === "admin" ||
      (role === "employees" && item.allowEmployeeRole) ||
      (role === "projectmanager" && item.name === "Project Allocation");
    return hasPermission && allowByRole;
  });

  // Filter dropdown children based on permissions and role
  const getFilteredChildren = (children, parentItem) => {
    if (!children) return [];
    
    return children.filter((child) => {
      if (child.showForRoles && !child.showForRoles.includes(role) && role !== "admin") {
        return false;
      }

      if (role === "employees") {
        if (parentItem && parentItem.allowEmployeeRole) {
          return true;
        }
        return !!child.allowEmployeeRole;
      }

      if (child.permission && !permissions.includes(child.permission) && role !== "admin") {
        return false;
      }

      return true;
    });
  };

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children) {
      return item.children.some((child) => 
        child.path && location.pathname.startsWith(child.path.replace(/\/[^\/]+$/, '')) ||
        location.pathname === child.path
      );
    }
    return false;
  };

  const isChildActive = (childPath) => {
    if (!childPath) return false;
    
    // Exact match
    if (location.pathname === childPath) return true;
    
    // For leave management sub-paths
    if (childPath === '/leave-management' && location.pathname.startsWith('/leave-management')) {
      return location.pathname === '/leave-management';
    }
    
    // For other sub-paths
    if (childPath && location.pathname.startsWith(childPath)) {
      return true;
    }
    
    return false;
  };

  const DropdownIcons = {
    // Timesheet icons
    "Timesheet": <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Timesheet History": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Employee Attendance": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Admin Timesheet": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Timesheet Summary": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    
    // Leave Management icons
    "Edit Leave Eligibility": <AdjustmentsHorizontalIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Leave Summary": <ChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Leave Balance": <ClipboardDocumentListIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Trainees Management": <AcademicCapIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    
    // Salary Slips icons
    "Payslip Viewer": <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Salary History": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Tax Documents": <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    
    // Default icon
    "default": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />
  };

  const getChildIcon = (childName) => {
    return DropdownIcons[childName] || DropdownIcons["default"];
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#262760] shadow-lg flex flex-col transform transition-transform duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto lg:h-screen
        ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e2050]">
          <div className="text-center w-full px-2">
            <img
              src="/images/steel-logo.png"
              alt="caldim"
              className="h-auto w-full max-w-[160px] object-contain mx-auto"
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white p-1 rounded-md hover:bg-[#1e2050] transition-colors duration-200"
          >
            <X size={24} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {filteredMenuItems.map((item) => (
            <div key={item.name}>
              {item.hasDropdown ? (
                <>
                  <button
                    onClick={() => toggleDropdown(item.name)}
                    className={`w-full flex items-center justify-between px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                      isItemActive(item)
                        ? "bg-[#1e2050] text-white shadow-sm"
                        : "text-violet-100 hover:bg-[#1e2050] hover:text-white"
                    }`}
                  >
                    <div className="flex items-center">
                      <item.icon className="mr-3 h-5 w-5" />
                      <span>{item.name}</span>
                    </div>
                    {openDropdown === item.name ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </button>

                  {openDropdown === item.name && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 bg-[#1e2050]/70 rounded-lg py-2 border-l-2 border-[#3730a3]">
                      {getFilteredChildren(item.children, item).map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-all mx-1 ${
                            isChildActive(child.path)
                              ? "bg[#1e2050] text-white border-l-2 border-white"
                              : "text-violet-100 hover:bg-[#1e2050] hover:text-white hover:border-l-2 hover:border-violet-300"
                          }`}
                        >
                          {getChildIcon(child.name)}
                          <span>{child.name}</span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isItemActive(item)
                      ? "bg-[#1e2050] text-white shadow-sm"
                      : "text-violet-100 hover:bg-[#1e2050] hover:text-white"
                  }`}
                >
                  <item.icon className="mr-3 h-5 w-5" />
                  <span>{item.name}</span>
                </Link>
              )}
            </div>
          ))}

          {filteredMenuItems.length === 0 && (
            <div className="text-center py-8">
              <p className="text-violet-200 text-sm">No menu items available</p>
              <p className="text-violet-300 text-xs mt-2">
                Check your permissions
              </p>
            </div>
          )}
        </nav>

        {/* User Info */}
        <div className="p-4 border-t border-[#1e2050]">
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-white bg-opacity-20 text-white font-medium">
              {user.name ? user.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">
                {user.name || "User"}
              </p>
              <p className="text-xs text-violet-200 truncate">
                {role || "Employee"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
