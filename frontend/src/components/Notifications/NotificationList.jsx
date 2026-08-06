import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BellIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  InformationCircleIcon, 
  ClockIcon,
  CalendarIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { notificationAPI } from '../../services/api';

const NotificationList = ({ onClose, onUnreadCountChange }) => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await notificationAPI.getAll();
      const list = Array.isArray(response.data) ? response.data : [];
      setNotifications(list);
      setLoading(false);
      if (onUnreadCountChange) {
        onUnreadCountChange(list.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await notificationAPI.markAsRead(id);
      
      const updated = notifications.map(n => 
        n._id === id ? { ...n, isRead: true } : n
      );
      setNotifications(updated);
      if (onUnreadCountChange) {
        onUnreadCountChange(updated.filter(n => !n.isRead).length);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationAPI.markAllAsRead();
      
      const updated = notifications.map(n => ({ ...n, isRead: true }));
      setNotifications(updated);
      if (onUnreadCountChange) {
        onUnreadCountChange(0);
      }
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const getFallbackTargetRoute = (notification) => {
    if (notification.link) return notification.link;
    const type = notification.type || '';
    switch (type) {
      case 'SPECIAL_PERMISSION_SUBMIT':
        return '/admin/special-permissions';
      case 'SPECIAL_PERMISSION_APPROVED':
      case 'SPECIAL_PERMISSION_REJECTED':
        return '/timesheet';
      case 'TIMESHEET_SUBMIT':
        return '/admin/timesheet/approval';
      case 'TIMESHEET_APPROVED':
      case 'TIMESHEET_REJECTED':
        return '/timesheet';
      case 'LEAVE_APPLY':
        return '/leave-applications';
      case 'LEAVE_APPROVED':
      case 'LEAVE_REJECTED':
        return '/leave-applications';
      case 'EXIT_SUBMIT':
        return '/employee-exit/approval';
      case 'EXIT_APPROVED':
      case 'EXIT_REJECTED':
        return '/employee-exit/form';
      case 'SUPPORT_TICKET':
      case 'SUPPORT_STATUS':
      case 'SUPPORT_COMMENT':
        return '/support/my-tickets';
      default:
        return null;
    }
  };

  const handleNotificationClick = async (notification) => {
    if (!notification.isRead) {
      await markAsRead(notification._id);
    }
    const targetRoute = getFallbackTargetRoute(notification);
    if (targetRoute) {
      navigate(targetRoute);
      if (onClose) onClose();
    }
  };

  const getIcon = (type) => {
    switch (type) {
      case 'LOGIN':
        return <InformationCircleIcon className="h-6 w-6 text-blue-500" />;
      case 'TIMESHEET_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-yellow-500" />;
      case 'TIMESHEET_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'TIMESHEET_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'LEAVE_APPLY':
        return <CalendarIcon className="h-6 w-6 text-purple-500" />;
      case 'LEAVE_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-600" />;
      case 'LEAVE_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-600" />;
      case 'EXIT_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-indigo-500" />;
      case 'EXIT_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'EXIT_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'SPECIAL_PERMISSION_SUBMIT':
        return <ClockIcon className="h-6 w-6 text-teal-500" />;
      case 'SPECIAL_PERMISSION_APPROVED':
        return <CheckCircleIcon className="h-6 w-6 text-green-500" />;
      case 'SPECIAL_PERMISSION_REJECTED':
        return <XCircleIcon className="h-6 w-6 text-red-500" />;
      case 'SUPPORT_TICKET':
        return <BellIcon className="h-6 w-6 text-indigo-600" />;
      case 'SUPPORT_STATUS':
        return <CheckCircleIcon className="h-6 w-6 text-blue-600" />;
      case 'SUPPORT_COMMENT':
        return <ChatBubbleLeftRightIcon className="h-6 w-6 text-[#262760]" />;
      default:
        return <BellIcon className="h-6 w-6 text-gray-500" />;
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl ring-1 ring-black/10 z-50 max-h-[85vh] flex flex-col overflow-hidden border border-gray-100">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/80 flex-shrink-0">
        <h3 className="text-base font-bold text-gray-900">Notifications</h3>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            markAllAsRead();
          }}
          className="text-xs text-[#262760] hover:text-indigo-800 font-bold cursor-pointer transition-colors"
        >
          Mark all as read
        </button>
      </div>

      <div className="overflow-y-auto flex-1 p-2 space-y-2 max-h-[420px]">
        {loading ? (
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
            <p className="text-sm font-semibold">No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div 
              key={notification._id} 
              className={`p-3 rounded-xl transition-all duration-150 ${
                notification.isRead ? 'bg-white hover:bg-gray-50' : 'bg-indigo-50/60 hover:bg-indigo-50 border-l-4 border-l-[#262760]'
              } border border-gray-100 cursor-pointer shadow-2xs`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-bold ${notification.isRead ? 'text-gray-900' : 'text-[#262760]'}`}>
                    {notification.title}
                  </p>
                  <p className={`text-xs mt-1 ${notification.isRead ? 'text-gray-500' : 'text-slate-700'}`}>
                    {notification.message}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                    {formatDate(notification.createdAt)}
                  </p>
                </div>
                {!notification.isRead && (
                  <div className="flex-shrink-0 mt-1">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#262760]"></span>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      <div className="p-2.5 border-t border-gray-100 bg-gray-50/80 flex-shrink-0 text-center">
        <button 
          onClick={onClose}
          className="text-xs font-semibold text-gray-600 hover:text-gray-900 cursor-pointer"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default NotificationList;
