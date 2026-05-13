import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { 
  BarChart, Activity, CheckCircle, Clock, 
  AlertTriangle, MessageCircle, ArrowUpRight, Filter
} from 'lucide-react';

const SupportDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await supportAPI.getDashboardStats();
      setStats(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) return (
    <div className="flex items-center justify-center h-96">
      <div className="w-10 h-10 border-4 border-[#262760] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  const cards = [
    { title: 'Total Tickets', value: stats.total, icon: Activity, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Open Tickets', value: stats.open, icon: MessageCircle, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Resolved', value: stats.resolved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'High Priority', value: stats.highPriority, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Support Dashboard</h1>
          <p className="text-gray-600 mt-1">Analytics and overview of support activity.</p>
        </div>
        <button 
          onClick={() => navigate('/admin/support/all-tickets')}
          className="px-6 py-2.5 bg-[#262760] text-white font-bold rounded-xl shadow-lg hover:bg-[#1e2b58] transition-all flex items-center gap-2"
        >
          View All Tickets
          <ArrowUpRight className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {cards.map((card, i) => (
          <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className={`w-12 h-12 ${card.bg} rounded-xl flex items-center justify-center mb-4`}>
              <card.icon className={`w-6 h-6 ${card.color}`} />
            </div>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{card.title}</p>
            <p className="text-3xl font-black text-gray-800 mt-1">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Tickets */}
        <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-50 flex items-center justify-between">
            <h2 className="font-bold text-gray-800 text-lg">Recently Raised Issues</h2>
            <button 
              onClick={() => navigate('/admin/support/all-tickets')}
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              View Full List
            </button>
          </div>
          <div className="divide-y divide-gray-50">
            {stats.recent.map((ticket) => (
              <div 
                key={ticket._id} 
                onClick={() => navigate(`/admin/support/tickets/${ticket._id}`)}
                className="p-4 hover:bg-gray-50 cursor-pointer transition-all flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-2 h-10 rounded-full ${
                    ticket.priority === 'Critical' ? 'bg-red-500' : 
                    ticket.priority === 'High' ? 'bg-orange-500' : 'bg-blue-500'
                  }`}></div>
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{ticket.subject}</h3>
                    <p className="text-xs text-gray-400 font-medium">Raised by {ticket.employeeId?.name} • {ticket.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${
                    ticket.status === 'Open' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {ticket.status}
                  </span>
                  <p className="text-[10px] text-gray-400 mt-1">{new Date(ticket.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Filters / Summary */}
      </div>
    </div>
  );
};

export default SupportDashboard;
