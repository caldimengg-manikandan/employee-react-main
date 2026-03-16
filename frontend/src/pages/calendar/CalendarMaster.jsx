import React, { useState, useEffect } from 'react';
import { leaveAPI, celebrationAPI } from '../../services/api';
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  Cake,
  PartyPopper,
  PlaneTakeoff,
  Home,
  Sparkles,
  Calendar as CalendarIcon,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import WishModal from '../../components/Modals/WishModal';

const CalendarMaster = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState({
    leaves: [],
    balance: null,
    celebrations: [],
    wishStats: { birthdayWishesSent: 0, anniversaryWishesSent: 0 }
  });
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEmployeeForWish, setSelectedEmployeeForWish] = useState(null);
  const [isWishModalOpen, setIsWishModalOpen] = useState(false);

  // Holiday Calendar 2026 data
  const holidays2026 = [
    { date: '01-Jan-26', day: 'THURSDAY', occasion: 'NEW YEAR' },
    { date: '15-Jan-26', day: 'THURSDAY', occasion: 'THAI PONGAL' },
    { date: '16-Jan-26', day: 'FRIDAY', occasion: 'MATTU PONGAL' },
    { date: '26-Jan-26', day: 'MONDAY', occasion: 'REPUBLIC DAY' },
    { date: '14-Apr-26', day: 'TUESDAY', occasion: 'TAMIL NEW YEAR' },
    { date: '01-May-26', day: 'FRIDAY', occasion: 'LABOUR DAY' },
    { date: '14-Sep-26', day: 'MONDAY', occasion: 'VINAYAGAR CHATHURTHI' },
    { date: '02-Oct-26', day: 'FRIDAY', occasion: 'GANDHI JAYANTHI' },
    { date: '19-Oct-26', day: 'MONDAY', occasion: 'AYUDHA POOJA' },
  ];

  useEffect(() => {
    fetchUnifiedData();
  }, [currentDate]);

  const fetchUnifiedData = async () => {
    try {
      setLoading(true);
      const month = currentDate.getMonth() + 1;
      const year = currentDate.getFullYear();

      const [leavesRes, balanceRes, celebRes, statsRes] = await Promise.all([
        leaveAPI.myLeaves(),
        leaveAPI.myBalance(),
        celebrationAPI.getCalendar({ month, year }),
        celebrationAPI.getWishStats({ month, year })
      ]);

      setData({
        leaves: Array.isArray(leavesRes.data) ? leavesRes.data : [],
        balance: balanceRes?.data,
        celebrations: Array.isArray(celebRes.data) ? celebRes.data : [],
        wishStats: statsRes?.data || { birthdayWishesSent: 0, anniversaryWishesSent: 0 }
      });
    } catch (error) {
      console.error("Error fetching unified calendar data:", error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(year, month, i));

    return days;
  };

  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === 'REGIONAL') return null;
    const parts = dateStr.split('-');
    if (parts.length !== 3) return new Date(dateStr);
    const months = { 'Jan': 0, 'Feb': 1, 'Mar': 2, 'Apr': 3, 'May': 4, 'Jun': 5, 'Jul': 6, 'Aug': 7, 'Sep': 8, 'Oct': 9, 'Nov': 10, 'Dec': 11 };
    return new Date(2000 + parseInt(parts[2]), months[parts[1]], parseInt(parts[0]));
  };

  const isSameDay = (d1, d2) => d1 && d2 &&
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  const getDayEvents = (date) => {
    if (!date) return [];
    const events = [];

    // 1. Holiday
    const holiday = holidays2026.find(h => isSameDay(date, parseDate(h.date)));
    if (holiday) events.push({ type: 'holiday', title: holiday.occasion, color: 'bg-rose-500', icon: Home });

    // 2. Personal Leave
    const leave = data.leaves.find(l => l.status === 'Approved' && date >= new Date(l.startDate).setHours(0, 0, 0, 0) && date <= new Date(l.endDate).setHours(23, 59, 59, 999));
    if (leave) events.push({ type: 'leave', title: `${leave.leaveType} Leave (${leave.dayType || 'Full Day'})`, color: 'bg-indigo-600', icon: PlaneTakeoff });

    // 3. Celebrations (Birthdays/Anniversaries)
    const celebs = data.celebrations.filter(c => isSameDay(new Date(c.eventDate), date));
    celebs.forEach(c => {
      if (c.eventType === 'Birthday') {
        events.push({ type: 'birthday', title: `B'day: ${c.employeeName}`, color: 'bg-amber-500', icon: Cake });
      } else {
        events.push({ type: 'anniversary', title: `Work Anniv: ${c.employeeName}`, color: 'bg-emerald-500', icon: PartyPopper });
      }
    });

    return events;
  };

  const handleDayClick = (events) => {
    if (events.some(e => e.type === 'birthday')) {
      confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#fbbf24', '#f59e0b', '#ffffff'] });
    }
  };

  const days = getDaysInMonth(currentDate);

  const getFilteredList = (category) => {
    const month = currentDate.getMonth();
    const year = currentDate.getFullYear();

    switch (category) {
      case 'Holidays':
        return holidays2026.filter(h => {
          const d = parseDate(h.date);
          return d && d.getMonth() === month && d.getFullYear() === year;
        }).map(h => ({
          name: h.occasion,
          date: parseDate(h.date),
          detail: h.day
        }));

      case 'My Leaves':
        return data.leaves.filter(l => {
          const start = new Date(l.startDate);
          return l.status === 'Approved' && start.getMonth() === month && start.getFullYear() === year;
        }).map(l => ({
          name: `${l.leaveType} Leave`,
          date: new Date(l.startDate),
          detail: `${l.dayType || 'Full Day'} - ${l.reason || 'No reason provided'}`
        }));

      case 'Birthdays':
        return data.celebrations.filter(c => c.eventType === 'Birthday')
          .sort((a, b) => new Date(a.eventDate).getDate() - new Date(b.eventDate).getDate())
          .map(c => ({
            name: c.employeeName,
            date: new Date(c.eventDate),
            detail: '🎂 Birthday',
            division: c.division,
            location: c.location,
            employeeId: c.employeeId,
            department: c.department,
            designation: c.designation || 'Employee',
            isWished: c.isWished
          }));

      case 'Anniversaries':
        return data.celebrations.filter(c => c.eventType === 'Work Anniversary')
          .sort((a, b) => new Date(a.eventDate).getDate() - new Date(b.eventDate).getDate())
          .map(c => ({
            name: c.employeeName,
            date: new Date(c.eventDate),
            detail: '🎊 Work Anniversary',
            division: c.division,
            location: c.location,
            employeeId: c.employeeId,
            department: c.department,
            designation: c.designation || 'Employee',
            isWished: c.isWished
          }));

      default: return [];
    }
  };

  const openCategoryModal = (cat) => {
    setSelectedCategory(cat);
    setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 lg:p-8 animate-in fade-in duration-700">
      <div className="max-w-7xl mx-auto">

        {/* Header Section */}
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div>
            <h1 className="text-4xl font-black text-[#1e1b4b] tracking-tight flex items-center gap-3">
              <div className="p-3 bg-indigo-100 rounded-2xl text-indigo-600 shadow-sm border border-indigo-200">
                <CalendarIcon size={32} />
              </div>
              Unified Hub <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Calendar</span>
            </h1>
            <p className="text-gray-500 mt-2 font-medium">Holidays, Celebrations & Leaves • All in one view</p>
          </div>

          <div className="flex flex-wrap gap-4 mt-4 md:mt-0">
            {/* Birthdays */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-amber-500 to-amber-600 px-5 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform">
              <div className="p-2 bg-white/20 rounded-xl text-white"><Sparkles size={24} /></div>
              <div>
                <div className="text-3xl font-black text-white leading-none">{data.wishStats?.birthdayWishesSent || 0}</div>
                <div className="text-[10px] font-black text-amber-100 uppercase tracking-widest mt-1">Birthday Wishes Sent</div>
              </div>
            </div>

            {/* Anniversaries */}
            <div className="flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-emerald-600 px-5 py-3 rounded-2xl shadow-md hover:scale-105 transition-transform">
              <div className="p-2 bg-white/20 rounded-xl text-white"><Sparkles size={24} /></div>
              <div>
                <div className="text-3xl font-black text-white leading-none">{data.wishStats?.anniversaryWishesSent || 0}</div>
                <div className="text-[10px] font-black text-emerald-100 uppercase tracking-widest mt-1">Anniv. Wishes Sent</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

          {/* Main Calendar Card */}
          <div className="lg:col-span-8 bg-white/70 backdrop-blur-xl rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 border border-white/50 overflow-hidden">

            {/* Calendar Controls */}
            <div className="bg-white p-6 flex items-center justify-between border-b border-gray-100">
              <div className="flex items-center gap-4">
                <h2 className="text-2xl font-black text-gray-900">
                  {currentDate.toLocaleString('default', { month: 'long' })}
                  <span className="text-indigo-600 ml-2">{currentDate.getFullYear()}</span>
                </h2>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))} className="p-3 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-gray-600"><ChevronLeft size={20} /></button>
                <button onClick={() => setCurrentDate(new Date())} className="px-6 py-2 bg-indigo-50 text-indigo-700 rounded-2xl font-bold text-sm border border-indigo-100 hover:bg-indigo-100">Today</button>
                <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))} className="p-3 hover:bg-gray-100 rounded-2xl transition-all border border-gray-100 text-gray-600"><ChevronRight size={20} /></button>
              </div>
            </div>

            <div className="p-6">
              {/* Day Headers */}
              <div className="grid grid-cols-7 mb-4">
                {[
                  { name: 'SUN', color: 'text-rose-500' },
                  { name: 'MON', color: 'text-blue-500' },
                  { name: 'TUE', color: 'text-indigo-500' },
                  { name: 'WED', color: 'text-purple-500' },
                  { name: 'THU', color: 'text-emerald-500' },
                  { name: 'FRI', color: 'text-amber-500' },
                  { name: 'SAT', color: 'text-rose-500' }
                ].map(day => (
                  <div key={day.name} className={`text-center text-[10px] font-black tracking-[0.2em] ${day.color}`}>{day.name}</div>
                ))}
              </div>

              {/* Grid */}
              <div className="grid grid-cols-7 gap-4">
                {days.map((date, idx) => {
                  if (!date) return <div key={`empty-${idx}`} className="aspect-square opacity-0"></div>;

                  const events = getDayEvents(date);
                  const isToday = isSameDay(date, new Date());
                  const isWeekend = date.getDay() === 0;

                  return (
                    <div
                      key={date.toISOString()}
                      onClick={() => handleDayClick(events)}
                      className={`relative aspect-square rounded-[1.5rem] p-2 transition-all cursor-pointer group hover:scale-[1.05] hover:z-10
                        ${isToday ? 'bg-indigo-600 ring-4 ring-indigo-100' : 'bg-white border border-gray-100'}
                        ${events.length > 0 ? 'shadow-lg' : 'hover:bg-gray-50'}
                      `}
                    >
                      <span className={`text-sm font-black transition-colors ${isToday ? 'text-white' : isWeekend ? 'text-rose-500' : 'text-gray-400 group-hover:text-gray-900'}`}>
                        {date.getDate()}
                      </span>

                      {/* Event Bubbles */}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {events.map((e, i) => (
                          <div
                            key={i}
                            title={e.title}
                            className={`w-2 h-2 rounded-full ${e.color} animate-pulse`}
                          />
                        ))}
                      </div>

                      {/* Hover Details */}
                      {events.length > 0 && (
                        <div className="absolute top-0 left-0 w-full h-full opacity-0 group-hover:opacity-100 transition-all rounded-[1.5rem] bg-black/5 flex items-center justify-center backdrop-blur-[2px]">
                          <div className="flex -space-x-2">
                            {events.map((e, i) => (
                              <div key={i} className={`p-1.5 rounded-full ${e.color} text-white shadow-xl`}>
                                <e.icon size={12} strokeWidth={3} />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar Info Section */}
          <div className="lg:col-span-4 space-y-8">

            {/* Legend Card - FUNCTIONAL BUTTONS */}
            <div className="bg-[#1e1b4b] rounded-[2.5rem] p-8 text-white shadow-2xl">
              <h3 className="text-xl font-black mb-6 flex items-center gap-3">
                <Sparkles className="text-teal-400" /> Legend
              </h3>
              <div className="space-y-4">
                {[
                  { label: 'Holidays', icon: Home, color: 'bg-rose-500' },
                  { label: 'My Leaves', icon: PlaneTakeoff, color: 'bg-indigo-500' },
                  { label: 'Birthdays', icon: Cake, color: 'bg-amber-500' },
                  { label: 'Anniversaries', icon: PartyPopper, color: 'bg-emerald-500' }
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => openCategoryModal(item.label)}
                    className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/10 hover:bg-white/10 hover:scale-[1.02] transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-xl ${item.color} group-hover:animate-bounce`}><item.icon size={20} /></div>
                      <span className="font-bold text-sm">{item.label}</span>
                    </div>
                    <Info size={16} className="text-white/20 group-hover:text-white" />
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Stats - FUNCTIONAL BUTTONS */}
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => openCategoryModal('Birthdays')}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-left hover:scale-[1.05] transition-all"
              >
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Birthdays</div>
                <div className="text-3xl font-black text-amber-500 flex items-center gap-2">
                  {data.celebrations.filter(c => c.eventType === 'Birthday').length}
                  <Cake size={20} />
                </div>
              </button>
              <button
                onClick={() => openCategoryModal('Anniversaries')}
                className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm text-left hover:scale-[1.05] transition-all"
              >
                <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Work Anniv.</div>
                <div className="text-3xl font-black text-emerald-500 flex items-center gap-2">
                  {data.celebrations.filter(c => c.eventType === 'Work Anniversary').length}
                  <PartyPopper size={20} />
                </div>
              </button>
            </div>

          </div>
        </div>

        {/* Loading Overlay */}
        {loading && (
          <div className="fixed inset-0 bg-white/80 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-indigo-600 animate-spin" />
              <p className="font-black text-indigo-900 animate-pulse">Synchronizing Universal Hub...</p>
            </div>
          </div>
        )}

        {/* DETAIL MODAL */}
        {showModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 lg:p-8 animate-in zoom-in-95 duration-200">
            <div className="absolute inset-0 bg-indigo-900/40 backdrop-blur-xl" onClick={() => setShowModal(false)}></div>
            <div className="relative bg-white w-full max-w-lg rounded-[3rem] overflow-hidden shadow-2xl">
              <div className="bg-[#1e1b4b] p-8 text-white flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 rounded-2xl"><Sparkles size={24} className="text-teal-400" /></div>
                  <h3 className="text-2xl font-black">{selectedCategory} Details</h3>
                </div>
                <button onClick={() => setShowModal(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                  <ChevronLeft className="rotate-180" size={24} />
                </button>
              </div>

              <div className="p-8 max-h-[60vh] overflow-y-auto">
                <div className="space-y-4">
                  {getFilteredList(selectedCategory).length > 0 ? (
                    getFilteredList(selectedCategory).map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-gray-50 rounded-2xl border border-gray-100 group hover:border-indigo-200 transition-all">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-black text-lg">
                            {item.date.getDate()}
                          </div>
                          <div>
                            <div className="font-black text-gray-900">{item.name}</div>
                            <div className="text-xs text-gray-500 font-medium mb-1">
                              {item.date.toLocaleDateString('default', { month: 'long' })} • {item.detail}
                            </div>
                            {(item.division || item.location) && (
                              <div className="flex flex-wrap gap-2 mt-1">
                                {item.division && (
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-md text-[10px] font-bold border border-indigo-100">
                                    {item.division}
                                  </span>
                                )}
                                {item.location && (
                                  <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-md text-[10px] font-bold border border-gray-200">
                                    {item.location}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="p-2 bg-white rounded-xl shadow-sm opacity-0 group-hover:opacity-100 transition-all">
                            <Info size={16} className="text-indigo-600" />
                          </div>
                          {(selectedCategory === 'Birthdays' || selectedCategory === 'Anniversaries') && (
                            <button
                              onClick={() => {
                                if (item.isWished) return;
                                setSelectedEmployeeForWish({
                                  employeeId: item.employeeId,
                                  name: item.name,
                                  department: item.department,
                                  designation: item.designation
                                });
                                setIsWishModalOpen(true);
                              }}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg shadow-sm transition-all flex items-center gap-1 ${item.isWished
                                  ? 'bg-emerald-100 text-emerald-600 border border-emerald-200 cursor-default'
                                  : 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:shadow-md'
                                }`}
                            >
                              {item.isWished ? (
                                <><PartyPopper size={10} /> Wished!</>
                              ) : (
                                <><Sparkles size={10} /> Send Wish</>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <div className="text-gray-300 mb-4"><CalendarIcon size={48} className="mx-auto" /></div>
                      <p className="text-gray-500 font-bold">No events found for {selectedCategory} this month.</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-8 pt-0">
                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                >
                  Got it!
                </button>
              </div>
            </div>
          </div>
        )}

        {/* WISH MODAL */}
        <WishModal
          isOpen={isWishModalOpen}
          onClose={() => {
            setIsWishModalOpen(false);
            setSelectedEmployeeForWish(null);
            fetchUnifiedData(); // Refresh to catch "isWished" status
          }}
          employee={selectedEmployeeForWish}
        />

      </div>
    </div>
  );
};

export default CalendarMaster;
