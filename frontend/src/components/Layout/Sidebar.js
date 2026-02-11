// Sidebar.jsx - Updated with Exit Management
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
  CurrencyDollarIcon,
  CalculatorIcon,
  CurrencyRupeeIcon,
  UserGroupIcon,
  BriefcaseIcon,
  ChartPieIcon,
  // NEW ICONS FOR EXIT MANAGEMENT
  ArrowRightOnRectangleIcon,
  ClipboardDocumentCheckIcon as ApprovalIcon,
  UserCircleIcon,
  ChevronDoubleLeftIcon,
  ChevronDoubleRightIcon,
  // ADDITIONAL UNIQUE ICONS
  DocumentDuplicateIcon,
  ReceiptPercentIcon,
  BuildingLibraryIcon,
  NewspaperIcon,
  // MORE UNIQUE ICONS TO REPLACE DUPLICATES
  PresentationChartLineIcon,
  ClipboardIcon,
  GiftIcon,
  Cog6ToothIcon,
  DocumentMagnifyingGlassIcon,
  UserIcon,
  CalendarDaysIcon,
  StarIcon
} from "@heroicons/react/24/outline";

const Sidebar = ({ isOpen, onClose, isDesktopOpen = true, toggleDesktopSidebar }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const permissions = user.permissions || [];
  // Normalize role to handle inconsistency (project_manager vs projectmanager)
  let role = user.role || "employees";
  if (role === 'project_manager') role = 'projectmanager';

  const [openDropdown, setOpenDropdown] = useState(null);

  const toggleDropdown = (name) => {
    if (!isDesktopOpen && toggleDesktopSidebar) {
      toggleDesktopSidebar();
    }
    setOpenDropdown(openDropdown === name ? null : name);
  };

  // icon mapping - All unique icons, no duplicates
  const iconMap = {
    Dashboard: HomeIcon,
    Home: HomeIcon,
    "My Profile": UserIcon,
    "User Access": KeyIcon,
    "Employee Management": UsersIcon,
    "Timesheet": DocumentChartBarIcon,
    "Employee Attendance": ClockIcon,
    "Attendance Approval": ClipboardDocumentCheckIcon,
    "Project Allocation": FolderIcon,
    "Leave Management": CalendarIcon,
    "Leave Applications": DocumentDuplicateIcon,
    "Insurance": ShieldCheckIcon,
    "Policy Portal": DocumentIcon,
    "Salary Slips": ReceiptPercentIcon,
    "Admin Timesheet": ClipboardIcon,
    "Edit Leave Eligibility": AdjustmentsHorizontalIcon,
    "Leave Summary": ChartBarIcon,
    "Leave Balance": ClipboardDocumentListIcon,
    "Trainees Management": AcademicCapIcon,
    "Expenditure Management": CurrencyDollarIcon,
    "Payroll Management": CalculatorIcon,
    "Cost to the Company": CurrencyRupeeIcon,
    "Payroll Details": BanknotesIcon,
    "Compensation Master": Cog6ToothIcon,
    "Team Management": UserGroupIcon,
    "Employee Reward Tracker": BriefcaseIcon,
    "Dashboard Reports": ChartPieIcon,
    "Loan Summary": BuildingLibraryIcon,
    "Gratuity Summary": GiftIcon,
    "Monthly Payroll": PresentationChartLineIcon,
    "Announcements": NewspaperIcon,
    "Intern Reference": DocumentTextIcon,
    "Holidays Allowance": CalendarDaysIcon,
    // NEW ICONS FOR EXIT MANAGEMENT
    "Employee Exit Form": ArrowRightOnRectangleIcon,
    "Exit Approval": DocumentMagnifyingGlassIcon,
    "Exit Management": UserCircleIcon,
    "Performance Management": StarIcon
  };

  const getIconForMenu = (name) => iconMap[name] || HomeIcon;

  const menuItems = [
    {
      name: "Home",
      path: "/dashboard",
      icon: getIconForMenu("Home"),
      allowEmployeeRole: true,
    },
    {
      name: "My Profile",
      path: "/my-profile",
      icon: getIconForMenu("My Profile"),
      allowEmployeeRole: true,
    },
    {
      name: "Timesheet",
      hasDropdown: true,
      icon: getIconForMenu("Timesheet"),
      permission: "timesheet_access",
      allowEmployeeRole: true,
      children: [
        { name: "Timesheet", path: "/timesheet", allowEmployeeRole: true },
        { name: "Timesheet History", path: "/timesheet/history", allowEmployeeRole: true },
        { name: "Attendance Regularization", path: "/timesheet/regularization", allowEmployeeRole: true },
      ],
    },
    {
      name: "Employee Attendance",
      path: "/timesheet/attendance",
      icon: getIconForMenu("Employee Attendance"),
      permission: "attendance_access",
      showForRoles: ["admin", "hr", "manager"],
    },
    {
      name: "Attendance Approval",
      path: "/timesheet/attendance-approval",
      icon: getIconForMenu("Attendance Approval"),
      permission: "attendance_access",
      showForRoles: ["admin", "hr",],
    },
    {
      name: "Admin Timesheet",
      hasDropdown: true,
      icon: getIconForMenu("Admin Timesheet"),
      permission: "admin_timesheet_access",
      showForRoles: ["admin", "hr", "manager"],
      children: [
        { name: "Admin Timesheet", path: "/admin/timesheet" },
        { name: "Timesheet Summary", path: "/admin/timesheet/approval" },
      ],
    },
    {
      name: "Project Allocation",
      path: "/project-allocation",
      icon: getIconForMenu("Project Allocation"),
      showForRoles: ["admin", "projectmanager", "manager",],
      allowEmployeeRole: true,
    },


    // PERFORMANCE MANAGEMENT
    {
      name: "Performance Management",
      hasDropdown: true,
      icon: getIconForMenu("Performance Management"),
      // allowEmployeeRole: true,

      children: [
        { name: "Self Appraisal", 
          path: "/performance/self-appraisal", 
          // allowEmployeeRole: true
          showForRoles: ["admin", "hr", "manager", "projectmanager", "project_manager"]
        
        },
        { 
          name: "Team Appraisal", 
          path: "/performance/team-appraisal",
          showForRoles: ["admin", "hr", "manager", "projectmanager", "project_manager"] 
        },
        { 
          name: "Reviewer Approval", 
          path: "/performance/reviewer-approval",
          showForRoles: ["admin", "hr", "manager", "projectmanager", "project_manager"]
        },
        { 
          name: "Director Approval", 
          path: "/performance/director-approval",
          showForRoles: ["admin", "hr", "manager", "director"]
        },


        { 
          name: "Appraisal Workflow", 
          path: "/performance/appraisal-workflow",
          showForRoles: ["admin", "hr", "director"]
        },
        { 
          name: "Increment Master", 
          path: "/performance/increment-master",
          showForRoles: ["admin", "hr"]
        },
        { 
          name: "Increment Summary", 
          path: "/performance/increment-summary",
          showForRoles: ["admin", "hr", "manager"]
        },
      ],
    },
    // LEAVE MANAGEMENT MODULE
    {
      name: "Leave Management",
      hasDropdown: true,
      icon: getIconForMenu("Leave Management"),
      permission: "leave_access",
      allowEmployeeRole: false,
      showForRoles: ["admin", "hr", "manager", "projectmanager", "project_manager"],
      children: [
        {
          name: "Leave Summary",
          path: "/leave-management/summary",
          permission: "leave_view",
          showForRoles: ["admin", "hr", "manager", "projectmanager", "project_manager"]
        },
        {
          name: "Leave Balance",
          path: "/leave-management/balance",
          permission: "leave_view",
          allowEmployeeRole: true,
          showForRoles: ["admin", "hr"]
        }
      ],
    },
    // PROJECT MANAGER: LEAVE SUMMARY (Top Level)
    // { 
    //   name: "Leave Summary", 
    //   path: "/leave-management/summary",
    //   permission: "leave_view",
    //   icon: getIconForMenu("Leave Summary"),
    //   showForRoles: ["projectmanager", "project_manager"]
    // },
    // LEAVE APPLICATIONS
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
      permission: "insurance_access",
      allowEmployeeRole: true,
    },
    {
      name: "Policy Portal",
      path: "/policies",
      icon: getIconForMenu("Policy Portal"),
      allowEmployeeRole: true,
    },
    // SALARY SLIPS
    {
      name: "Salary Slips",
      path: "/salaryslips",
      icon: getIconForMenu("Salary Slips"),
      allowEmployeeRole: true,
    },
    // PAYROLL MANAGEMENT
    {
      name: "Payroll Management",
      hasDropdown: true,
      icon: getIconForMenu("Payroll Management"),
      permission: "payroll_access",
      showForRoles: ["admin", "hr", "finance"],
      allowEmployeeRole: false,
      children: [
        {
          name: "Payroll Details",
          path: "/payroll/details",
          permission: "payroll_manage",
          showForRoles: ["admin", "hr", "finance"]
        },
        {
          name: "Cost to the Company",
          path: "/payroll/cost-to-the-company",
          permission: "payroll_view",
          showForRoles: ["admin", "hr", "finance"]
        },
        {
          name: "Compensation Master",
          path: "/payroll/compensation-master",
          permission: "payroll_manage",
          showForRoles: ["admin", "hr", "finance"]
        },
        {
          name: "Loan Summary",
          path: "/payroll/loan-summary",
          permission: "loan_view",
          showForRoles: ["admin", "hr", "finance"]
        },
        {
          name: "Gratuity Summary",
          path: "/payroll/gratuity-summary",
          permission: "gratuity_view",
          showForRoles: ["admin", "hr", "finance"]
        },
        {
          name: "Monthly Payroll",
          path: "/payroll/monthly",
          permission: "payroll_access",
          showForRoles: ["admin", "hr", "finance"],
          allowEmployeeRole: false
        }
      ],
    },
    // EXPENDITURE MANAGEMENT
    {
      name: "Expenditure Management",
      path: "/expenditure-management",
      icon: getIconForMenu("Expenditure Management"),
      permission: "expenditure_access",
      showForRoles: ["admin", "hr", "finance"],
      allowEmployeeRole: false,
    },
    // ANNOUNCEMENTS
    {
      name: "Announcements",
      path: "/announcements",
      icon: getIconForMenu("Announcements"),
      permission: "announcement_manage",
      showForRoles: ["admin", "hr", "manager"],
      allowEmployeeRole: false,
    },
    // INTERN REFERENCE
    {
      name: "Intern Reference",
      path: "/admin/interns",
      icon: getIconForMenu("Intern Reference"),
      showForRoles: ["admin", "hr", "manager"],
    },
    // EMPLOYEE EXIT FORM - Top level for employees
    {
      name: "Employee Exit Form",
      path: "/employee-exit/form",
      icon: getIconForMenu("Employee Exit Form"),
      allowEmployeeRole: true,
      showForRoles: ["employees"],
    },
    // EXIT MANAGEMENT - Admin/HR/Manager
    {
      name: "Exit Management",
      hasDropdown: true,
      icon: getIconForMenu("Exit Management"),
      permission: "exit_access",
      showForRoles: ["admin", "hr", "manager"],
      children: [
        {
          name: "Exit Approval",
          path: "/employee-exit/approval",
          permission: "exit_approval_access",
          showForRoles: ["admin", "hr", "manager"]
        }
      ],
    },
    // EMPLOYEE REWARD TRACKER
    {
      name: "Employee Reward Tracker",
      path: "/employee-reward-tracker",
      icon: getIconForMenu("Employee Reward Tracker"),
      permission: "reward_access",
      showForRoles: ["admin", "hr", "manager"],
    },
    // HOLIDAY 
    {
      name: "Holidays Allowance",
      path: "/holidays-allowance",
      icon: getIconForMenu("Holidays Allowance"),
      permission: "payroll_view",
      showForRoles: ["admin", "hr",],
    },
    // EMPLOYEE MANAGEMENT
    {
      name: "Employee Management",
      path: "/employee-management",
      icon: getIconForMenu("Employee Management"),
      permission: "employee_access",
      showForRoles: ["admin", "hr"],
    },
    // USER ACCESS
    {
      name: "User Access",
      path: "/user-access",
      icon: getIconForMenu("User Access"),
      permission: "user_access",
      showForRoles: ["admin"],
    },
    // TEAM MANAGEMENT
    {
      name: "Team Management",
      path: "/admin/team-management",
      icon: getIconForMenu("Team Management"),
      permission: "team_access",
      showForRoles: ["admin", "manager"],
    },

  ];

  // Filter logic
  const filteredMenuItems = menuItems.filter((item) => {
    // Admin can see everything
    if (role === "admin") {
      return true;
    }

    // STRICT FILTER FOR PROJECT MANAGER
    if (role === "projectmanager") {
      const allowedModules = [
        "Home",
        "My Profile",
        "Timesheet",
        "Admin Timesheet",
        "Project Allocation",
        "Leave Applications",
        "Policy Portal",
        "Salary Slips",
        "Leave Summary",
        "Leave Management",
      ];
      return allowedModules.includes(item.name);
    }

    // Check if item has showForRoles restriction
    if (item.showForRoles && !item.showForRoles.includes(role)) {
      return false;
    }

    // Check permission
    if (item.permission && !permissions.includes(item.permission)) {
      return false;
    }

    // For employees, check allowEmployeeRole
    if (role === "employees" && !item.allowEmployeeRole) {
      return false;
    }

    // For projectmanager
    if (role === "projectmanager" && item.name === "Project Allocation") {
      return true;
    }

    // For hr role
    if (role === "hr" && item.showForRoles && item.showForRoles.includes("hr")) {
      return true;
    }

    // For finance role
    if (role === "finance" && item.showForRoles && item.showForRoles.includes("finance")) {
      return true;
    }

    // For manager role
    if (role === "manager" && item.showForRoles && item.showForRoles.includes("manager")) {
      return true;
    }

    // Default: show if it passed permission check
    return true;
  });

  // Filter dropdown children
  const getFilteredChildren = (children) => {
    if (!children) return [];

    return children.filter((child) => {
      // Admin can see everything
      if (role === "admin") return true;

      // Check if child has showForRoles restriction
      if (child.showForRoles && !child.showForRoles.includes(role)) {
        return false;
      }

      // Check permission
      if (child.permission && !permissions.includes(child.permission)) {
        return false;
      }

      // For employees, check allowEmployeeRole
      if (role === "employees" && !child.allowEmployeeRole) {
        return false;
      }

      return true;
    });
  };

  const isItemActive = (item) => {
    if (item.path) return location.pathname === item.path;
    if (item.children) {
      return item.children.some((child) =>
        child.path && location.pathname === child.path
      );
    }
    return false;
  };

  const isChildActive = (childPath) => {
    if (!childPath) return false;

    // Exact match only to prevent multiple children being active
    return location.pathname === childPath;
  };

  // DropdownIcons - Updated with Exit Management icons
  const DropdownIcons = {
    "Timesheet": <DocumentTextIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Timesheet History": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Admin Timesheet": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Admin Timesheet Management": <ClockIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Timesheet Summary": <DocumentChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Leave Summary": <ChartBarIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Leave Balance": <ClipboardDocumentListIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Payroll Details": <CurrencyRupeeIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Cost to the Company": <CurrencyRupeeIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Loan Summary": <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Gratuity Summary": <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Monthly Payroll": <BanknotesIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Compensation Master": <CurrencyRupeeIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    // NEW ICONS FOR EXIT MANAGEMENT
    "Employee Exit Form": <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
    "Exit Approval": <ApprovalIcon className="mr-3 h-4 w-4 flex-shrink-0" />,
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
        className={`fixed inset-y-0 left-0 z-50 bg-[#262760] shadow-lg flex flex-col transform transition-all duration-300 ease-in-out
        lg:relative lg:translate-x-0 lg:z-auto lg:h-screen
        ${isOpen ? "translate-x-0" : "-translate-x-full"}
        ${isDesktopOpen ? "w-64" : "w-64 lg:w-20"}`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between p-4 border-b border-[#1e2050] relative min-h-[64px]">
          <div className={`text-center w-full px-2 transition-all duration-200 ${!isDesktopOpen ? 'lg:opacity-0 lg:hidden' : 'opacity-100'}`}>
            <img
              src="/images/steel-logo.png"
              alt="caldim"
              className="h-auto w-full max-w-[160px] object-contain mx-auto"
            />
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white p-1 rounded-md hover:bg-[#1e2050] transition-colors duration-200 absolute right-4"
          >
            <X size={24} />
          </button>

          {/* Desktop Toggle Button */}
          <button
            onClick={toggleDesktopSidebar}
            className={`hidden lg:flex items-center justify-center text-white p-1 rounded-md hover:bg-[#1e2050] transition-colors duration-200 
             ${!isDesktopOpen ? 'w-full' : 'absolute right-2'}`}
          >
            {isDesktopOpen ? <ChevronDoubleLeftIcon className="h-5 w-5" /> : <ChevronDoubleRightIcon className="h-6 w-6" />}
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
                    className={`w-full flex items-center ${!isDesktopOpen ? 'justify-center' : 'justify-between'} px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isItemActive(item)
                      ? "bg-[#1e2050] text-white shadow-sm"
                      : "text-violet-100 hover:bg-[#1e2050] hover:text-white"
                      }`}
                    title={!isDesktopOpen ? item.name : ''}
                  >
                    <div className={`flex items-center ${!isDesktopOpen ? 'justify-center' : ''}`}>
                      <item.icon className={`${isDesktopOpen ? 'mr-3' : ''} h-5 w-5`} />
                      {isDesktopOpen && <span>{item.name}</span>}
                    </div>
                    {isDesktopOpen && (openDropdown === item.name ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    ))}
                  </button>

                  {openDropdown === item.name && isDesktopOpen && (
                    <div className="ml-4 mt-1 mb-2 space-y-1 bg-[#1e2050]/70 rounded-lg py-2 border-l-2 border-[#3730a3]">
                      {getFilteredChildren(item.children).map((child) => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`flex items-center px-3 py-2.5 text-sm rounded-md transition-all mx-1 ${isChildActive(child.path)
                            ? "bg-[#1e2050] text-white border-l-2 border-white"
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
                  className={`flex items-center ${!isDesktopOpen ? 'justify-center' : ''} px-3 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${isItemActive(item)
                    ? "bg-[#1e2050] text-white shadow-sm"
                    : "text-violet-100 hover:bg-[#1e2050] hover:text-white"
                    }`}
                  title={!isDesktopOpen ? item.name : ''}
                >
                  <item.icon className={`${isDesktopOpen ? 'mr-3' : ''} h-5 w-5`} />
                  {isDesktopOpen && <span>{item.name}</span>}
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
      </div>
    </>
  );
};

export default Sidebar;