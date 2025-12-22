import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const LoginAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnnouncements();
    
    // Refresh announcements every 60 seconds
    const interval = setInterval(fetchAnnouncements, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAnnouncements = async () => {
    try {
      const data = await authAPI.announcement.getActive();
      setAnnouncements(data);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return null;
  if (!announcements.length) return null;

  return (
    <div className="mb-6">
      <div className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-white/20">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse mr-3"></div>
            <h3 className="text-lg font-bold text-white">📢 Company Announcements</h3>
          </div>
          {/* <span className="text-blue-300 text-sm font-medium">
            {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
          </span> */}
        </div>
        
        <div className="space-y-3">
          {announcements.map((announcement) => (
            <div 
              key={announcement._id} 
              className="bg-white/10 rounded-lg p-3 border border-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex items-start">
                <div className="mr-3 mt-1">
                  <svg className="w-4 h-4 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 13V5a2 2 0 00-2-2H4a2 2 0 00-2 2v8a2 2 0 002 2h3l3 3 3-3h3a2 2 0 002-2zM5 7a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1zm1 3a1 1 0 100 2h3a1 1 0 100-2H6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <h4 className="text-white font-medium">{announcement.title}</h4>
                    <span className="text-blue-300 text-xs">
                      {new Date(announcement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-blue-100 text-sm">{announcement.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-3 text-center">
          <p className="text-blue-200 text-xs">
            Updates in real-time • {announcements.length} active announcement{announcements.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginAnnouncements;
