import React, { useState, useRef, useEffect } from 'react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon
} from '@heroicons/react/24/outline';

const Header = ({ onMenuClick }) => {
  const location = useLocation();
  const user = JSON.parse(sessionStorage.getItem('user') || '{"name":"John Doe","email":"john.doe@example.com","role":"Employee"}');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const profileRef = useRef(null);
  const navigate = useNavigate();

  // Map routes to page titles
  const getPageTitle = () => {
    const routeTitles = {
      '/home': 'Home',
      '/user-access': 'User Access',
      '/employee-management': 'Employee Management',
      '/announcements': 'Announcement Management',
      '/timesheet': 'Employee Timesheet',
      '/timesheet/history': 'Timesheet History',
      '/timesheet/attendance': 'Employee In/Out Timing',
      '/timesheet/regularization': 'Attendance Regularization',
      '/timesheet/attendance-approval': 'Attendance Approval',
      '/admin/timesheet': 'Admin Timesheet Management',
      '/admin/timesheet/approval': 'Timesheet Summary',
      '/project-allocation': 'Project Allocation',
      '/leave-management/summary': 'Leave Summary',
      '/leave-management/balance': 'Leave Balance',
      '/leave-management/edit-eligibility': 'Edit Leave Eligibility',
      '/leave-management/trainees': 'Trainees Management',
      '/leave-applications': 'Leave Applications',
      '/insurance': 'Insurance',
      '/policies': 'Policy Portal',
      '/salaryslips': 'Salary Slips',
      '/expenditure-management': 'Expenditure Management',
      '/employee-reward-tracker': 'Employee Reward Tracker',
      '/admin/team-management': 'Team Management',
      '/payroll/details': 'Employee PayRolls Details',
      '/payroll/cost-to-the-company': 'Cost to the Company',
      '/payroll/loan-summary': 'Loan Summary',
      '/payroll/gratuity-summary': 'Gratuity Summary',
      '/payroll/monthly': 'Monthly Payroll',
      '/employee-exit/form': 'Employee Exit Form',
      '/my-profile': 'My Profile',
      '/admin/interns': 'Intern Reference',
    };
    
    return routeTitles[location.pathname] || 'Caldim Employee Portal';
  };

  // Get the first letter of the user's name for the avatar
  const userInitial = user.name ? user.name.charAt(0).toUpperCase() : 'U';

  // Update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    navigate('/login');
  };

  // Format date and time for India (Asia/Kolkata)
  const formattedDate = currentTime.toLocaleDateString('en-IN', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    timeZone: 'Asia/Kolkata'
  });

  const formattedTime = currentTime.toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  });

  // Get greeting based on time
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
  };

  return (
    <>
      <header className="bg-white shadow border-b border-gray-200 w-full">
        <div className="flex items-center px-4 py-3">
          
          {/* Left Section */}
          <div className="flex-1">
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <button
              onClick={() => navigate(-1)}
              className="ml-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 inline-flex items-center gap-1"
              aria-label="Go Back"
            >
              <ArrowLeftIcon className="h-5 w-5" />
              <span className="hidden sm:inline text-sm">Back</span>
            </button>
          </div>
          
          {/* Center Section */}
          <div className="flex-1 text-center">
              <h1 className="text-2xl font-bold text-gray-800">{getPageTitle()}</h1>
          </div>
          
          {/* Right Section */}
          <div className="flex-1 flex justify-end items-center space-x-4">
            {/* Time Display */}
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm text-gray-600">{formattedTime}</span>
              <span className="text-xs text-gray-500">{formattedDate}</span>
            </div>
            
            {/* Mobile Time Display */}
            <div className="sm:hidden flex flex-col items-end">
              <span className="text-sm text-gray-600">{formattedTime}</span>
            </div>

            {/* Profile Section */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-gray-200 text-gray-700 font-medium">
                  {userInitial}
                </div>
              </button>

              {/* Profile Dropdown */}
              {isProfileOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden z-50">
                  <div className="p-4 bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-gray-300 text-gray-700 font-medium">
                        {userInitial}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-gray-500">{getGreeting()}</p>
                        <p className="font-medium text-gray-800 truncate">{user.name}</p>
                        <p className="text-sm text-gray-600 truncate">{user.employeeId || ''}</p>
                        
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-2 border-t border-gray-200">

                    <button
                      onClick={handleLogout}
                      className="flex items-center w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <i className="fas fa-sign-out-alt mr-3 w-4 text-center"></i>
                      Log out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>
    </>
  );
};

export default Header;