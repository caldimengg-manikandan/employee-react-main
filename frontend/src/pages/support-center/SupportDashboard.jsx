import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { 
  BarChart, Activity, CheckCircle, Clock, 
  AlertTriangle, MessageCircle, ArrowUpRight, Filter,
  XCircle, RefreshCw, Monitor, HelpCircle, LayoutDashboard
} from 'lucide-react';

const SupportDashboard = ({ defaultCategoryMode }) => {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine Category Mode from prop or current pathname
  const getInitialMode = () => {
    if (defaultCategoryMode) return defaultCategoryMode;
    if (location.pathname.includes('/dashboard/it')) return 'it';
    if (location.pathname.includes('/dashboard/non-it')) return 'non-it';
    return 'all';
  };

  const [categoryMode, setCategoryMode] = useState(getInitialMode);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('all');

  useEffect(() => {
    const newMode = getInitialMode();
    setCategoryMode(newMode);
  }, [location.pathname, defaultCategoryMode]);

  useEffect(() => {
    fetchStats();
  }, [categoryMode]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      let mainCategory = undefined;
      if (categoryMode === 'it') mainCategory = 'IT Queries';
      if (categoryMode === 'non-it') mainCategory = 'Non-IT Queries';

      const res = await supportAPI.getDashboardStats(mainCategory ? { mainCategory } : undefined);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to load dashboard stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (mode) => {
    setCategoryMode(mode);
    setActiveFilter('all');
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-4 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const cards = stats ? [
    { title: 'Total Tickets', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-l-blue-500', filterKey: 'all', activeBg: 'bg-blue-100', activeRing: 'ring-blue-400' },
    { title: 'Open Tickets', value: stats.open, icon: MessageCircle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-l-amber-500', filterKey: 'Open', activeBg: 'bg-amber-100', activeRing: 'ring-amber-400' },
    { title: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-l-emerald-500', filterKey: 'Resolved', activeBg: 'bg-emerald-100', activeRing: 'ring-emerald-400' },
    { title: 'Closed', value: stats.closed, icon: XCircle, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-l-slate-500', filterKey: 'Closed', activeBg: 'bg-slate-100', activeRing: 'ring-slate-400' },
    { title: 'Reopen Tickets', value: stats.reopened, icon: RefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-l-purple-500', filterKey: 'Reopened', activeBg: 'bg-purple-100', activeRing: 'ring-purple-400' },
    { title: 'High Priority', value: stats.highPriority, icon: AlertTriangle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-l-rose-500', filterKey: 'HighPriority', activeBg: 'bg-rose-100', activeRing: 'ring-rose-400' },
  ] : [];

  const filteredTickets = ((stats && stats.recent) || []).filter((ticket) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'HighPriority') return ticket.priority === 'High' || ticket.priority === 'Critical';
    return ticket.status === activeFilter;
  });

  const activeLabel = cards.find(c => c.filterKey === activeFilter)?.title || 'All Tickets';

  const viewAllUrl = categoryMode === 'it' 
    ? '/admin/support/all-tickets?mainCategory=IT Queries'
    : categoryMode === 'non-it'
    ? '/admin/support/all-tickets?mainCategory=Non-IT Queries'
    : '/admin/support/all-tickets';

  return (
    <div className="max-w-full mx-auto px-6 py-8">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-800">
              {categoryMode === 'it' && 'IT Support Dashboard'}
              {categoryMode === 'non-it' && 'Non-IT Support Dashboard'}
              {categoryMode === 'all' && 'Support Dashboard'}
            </h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
              categoryMode === 'it' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
              categoryMode === 'non-it' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
              'bg-gray-100 text-gray-800 border border-gray-200'
            }`}>
              {categoryMode === 'it' ? 'IT Queries Only' : categoryMode === 'non-it' ? 'Non-IT Queries Only' : 'All Queries'}
            </span>
          </div>
        </div>

        <button 
          onClick={() => navigate(viewAllUrl)}
          className="px-6 py-2.5 bg-[#262760] text-white font-bold rounded-xl shadow-lg hover:bg-[#1e2b58] transition-all flex items-center gap-2"
        >
          View All {categoryMode === 'it' ? 'IT' : categoryMode === 'non-it' ? 'Non-IT' : ''} Tickets
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      {/* Page Tabs Switcher */}
      <div className="flex items-center gap-2 mb-8 bg-gray-100/80 p-1.5 rounded-2xl w-fit border border-gray-200">
        <button
          onClick={() => handleTabChange('it')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            categoryMode === 'it'
              ? 'bg-white text-blue-700 shadow-md border border-blue-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <Monitor className="w-4 h-4 text-blue-600" />
          IT Query Dashboard
        </button>
        <button
          onClick={() => handleTabChange('non-it')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            categoryMode === 'non-it'
              ? 'bg-white text-purple-700 shadow-md border border-purple-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <HelpCircle className="w-4 h-4 text-purple-600" />
          Non-IT Query Dashboard
        </button>
        <button
          onClick={() => handleTabChange('all')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${
            categoryMode === 'all'
              ? 'bg-white text-[#262760] shadow-md border border-indigo-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-gray-600" />
          Combined Dashboard
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
        {cards.map((card, i) => {
          const isActive = activeFilter === card.filterKey;
          return (
            <div 
              key={i} 
              onClick={() => setActiveFilter(card.filterKey)}
              className={`bg-white p-6 rounded-2xl shadow-sm border-l-4 ${card.border} border-y border-r border-gray-100 hover:shadow-md transition-all duration-300 transform hover:-translate-y-1 cursor-pointer ${isActive ? `ring-2 ${card.activeRing} ${card.activeBg} shadow-md -translate-y-1` : ''}`}
            >
              <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
                <card.icon className={`w-6 h-6 ${card.color}`} />
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{card.title}</p>
              <p className="text-3xl font-black text-gray-800 mt-1">{card.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent Tickets Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="font-bold text-gray-800 text-lg">
                {activeFilter === 'all' ? `Recently Raised ${categoryMode === 'it' ? 'IT' : categoryMode === 'non-it' ? 'Non-IT' : ''} Issues` : activeLabel}
              </h2>
              {activeFilter !== 'all' && (
                <span className="text-xs font-bold bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full">
                  {filteredTickets.length} result{filteredTickets.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              {activeFilter !== 'all' && (
                <button 
                  onClick={() => setActiveFilter('all')}
                  className="text-sm font-bold text-rose-500 hover:underline flex items-center gap-1"
                >
                  <XCircle className="w-3.5 h-3.5" /> Clear Filter
                </button>
              )}
              <button 
                onClick={() => navigate(viewAllUrl)}
                className="text-sm font-bold text-blue-600 hover:underline"
              >
                View Full List
              </button>
            </div>
          </div>
          <div className="divide-y divide-gray-50 max-h-[400px] overflow-y-auto">
            {filteredTickets.length === 0 ? (
              <div className="p-10 text-center text-gray-400">
                <Filter className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="font-bold text-sm">No tickets found for "{activeLabel}"</p>
                <p className="text-xs mt-1">Try selecting a different filter above.</p>
              </div>
            ) : (
              filteredTickets.map((ticket) => (
                <div 
                  key={ticket._id} 
                  onClick={() => navigate(`/support/tickets/${ticket._id}`)}
                  className="p-4 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-2 h-10 rounded-full ${
                      ticket.priority === 'Critical' ? 'bg-red-500' : 
                      ticket.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'
                    }`}></div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded tracking-wider uppercase border border-purple-100">
                          {ticket.ticketNumber || ticket.ticketId}
                        </span>
                        {ticket.mainCategory && (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            ticket.mainCategory === 'IT Queries' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-purple-50 text-purple-700 border border-purple-100'
                          }`}>
                            {ticket.mainCategory}
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-gray-800 text-sm">{ticket.subject}</h3>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Raised by {ticket.employeeId?.name || 'Unknown'} • {ticket.subCategory || ticket.category}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                      ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' :
                      ticket.status === 'Assigned' ? 'bg-orange-100 text-orange-700' :
                      ticket.status === 'In Progress' ? 'bg-amber-100 text-amber-700' :
                      ticket.status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' :
                      ticket.status === 'Closed' ? 'bg-slate-100 text-slate-600' :
                      ticket.status === 'Reopened' ? 'bg-purple-100 text-purple-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      {ticket.status}
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString('en-GB')}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupportDashboard;
