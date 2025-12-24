import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);

  // Close sidebar when window is resized to desktop size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when route changes (for mobile)
  const handleCloseSidebar = () => {
    setSidebarOpen(false);
  };

  const toggleDesktopSidebar = () => {
    setIsDesktopSidebarOpen(!isDesktopSidebarOpen);
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-50">
      {/* Full Height Sidebar */}
      <Sidebar 
        isOpen={sidebarOpen} 
        onClose={handleCloseSidebar} 
        isDesktopOpen={isDesktopSidebarOpen}
        toggleDesktopSidebar={toggleDesktopSidebar}
      />
      
      {/* Main Content Area - includes Header and Outlet */}
      <div className="flex flex-col flex-1 w-full min-w-0">
        {/* Header positioned after sidebar */}
        <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        
        {/* Main content with Outlet */}
        <main className="flex-1 overflow-auto bg-gray-50">
          <div className="max-w-none w-full h-full">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default Layout;