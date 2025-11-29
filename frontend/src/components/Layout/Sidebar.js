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
    Timesheet: ClockIcon,
    "Project Allocation": FolderIcon,
    "Leave Management": CalendarIcon,
    "Salary Slips": BanknotesIcon,
  };

  const getIconForMenu = (name) => iconMap[name] || HomeIcon;

  const menuItems = [
    {
      name: "Dashboard",
      path: "/dashboard",
      icon: getIconForMenu("Dashboard"),
      permission: "dashboard",
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
        { name: "My Attendance", path: "/timesheet/attendance" },
      ],
    },
    // {
    //   name: "Leave Management",
    //   hasDropdown: true,
    //   icon: getIconForMenu("Leave Management"),
    //   permission: "leave_access",
    //   allowEmployeeRole: true,
    //   children: [
    //     { name: "My Leaves", path: "/leave-management" },
    //     { name: "Leave Applications", path: "/leave-management/applications", permission: "leave_approval" },
    //   ],
    // },
    {
      name: "Project Allocation",
      path: "/project-allocation",
      icon: getIconForMenu("Project Allocation"),
      permission: "project_access",
    },
    // {
    //   name: "Salary Slips",
    //   hasDropdown: true,
    //   icon: getIconForMenu("Salary Slips"),
    //   permission: "payroll_access",
    //   allowEmployeeRole: true,
    //   children: [
    //     { name: "Payslip Viewer", path: "/payslip-viewer" },
    //     { name: "Salary History", path: "/salary-history" },
    //     { name: "Tax Documents", path: "/tax-documents" },
    //   ],
    // },
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
  ];

  // Filter menu items based on permissions and role
  const filteredMenuItems = menuItems.filter((item) => {
    // Check if user has permission
    const hasPermission = permissions.includes(item.permission);
    
    // Check if role-based access is allowed
  const allowByRole = 
      role === "admin" || 
      (role === "employees" && item.allowEmployeeRole) ||
      (role === "projectmanager" && item.name === "Project Allocation");

    return hasPermission || allowByRole;
  });

  // Filter dropdown children based on permissions
  const getFilteredChildren = (children) => {
    return children.filter((child) => {
      if (!child.permission) return true;
      return permissions.includes(child.permission) || role === "admin";
    });
  };

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children)
      return item.children.some((child) => location.pathname === child.path);
    return false;
  };

  const isChildActive = (childPath) => location.pathname === childPath;

  const DropdownIcons = {
    Timesheet: <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Timesheet History": (
      <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />
    ),
    "My Attendance": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "My Leaves": <CalendarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Leave Applications": <UsersIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Payslip Viewer": <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Salary History": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Tax Documents": <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
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
                      {getFilteredChildren(item.children).map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-all mx-1 ${
                            isChildActive(child.path)
                              ? "bg-[#1e2050] text-white border-l-2 border-white"
                              : "text-violet-100 hover:bg-[#1e2050] hover:text-white hover:border-l-2 hover:border-violet-300"
                          }`}
                        >
                          {DropdownIcons[child.name] || (
                            <ClockIcon className="mr-3 h-4 w-4" />
                          )}
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
