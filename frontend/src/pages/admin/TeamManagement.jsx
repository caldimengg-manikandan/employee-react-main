import React, { useEffect, useState } from 'react';
import { teamAPI, employeeAPI, authAPI } from '../../services/api';
import Modal from '../../components/Modals/Modal';
import {
  UserGroupIcon,
  UserPlusIcon,
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  CheckCircleIcon,
  TrashIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  UserIcon
} from '@heroicons/react/24/outline';

const TeamManagement = () => {
  const [leaders, setLeaders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [users, setUsers] = useState([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [teamDetails, setTeamDetails] = useState(null);
  const [form, setForm] = useState({ teamCode: '', leaderEmployeeId: '', division: '' });
  const [memberEmployeeId, setMemberEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({ search: '', division: '' });
  const [empFilters, setEmpFilters] = useState({ location: '', division: '', managerEmpId: '' });
  const [selectedLeaderEmpId, setSelectedLeaderEmpId] = useState('');
  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [selectedEmpForManager, setSelectedEmpForManager] = useState('');
  const [managerPassword, setManagerPassword] = useState('Cde@123456');
  const [modalError, setModalError] = useState('');
  const [modalSuccess, setModalSuccess] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [leadersRes, teamsRes, employeesRes] = await Promise.all([
        teamAPI.getLeaders('project'),
        teamAPI.list(),
        employeeAPI.getAllEmployees()
      ]);
      setLeaders(leadersRes.data || []);
      setTeams(teamsRes.data || []);
      setEmployees(employeesRes.data || []);
      try {
        const usersRes = await authAPI.getAllUsers();
        setUsers(usersRes.data || []);
      } catch (e) {
        setUsers([]);
      }
    } catch (e) {
      setError('Failed to load team and employee data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const uniqueDivisions = Array.from(new Set(leaders.map(l => l.division).filter(Boolean)));
  const uniqueEmpLocations = Array.from(new Set(employees.map(e => e.location).filter(Boolean)));
  const uniqueEmpDivisions = Array.from(new Set(employees.map(e => e.division).filter(Boolean)));

  const filteredLeaders = leaders.filter(l => {
    const s = filters.search.trim().toLowerCase();
    const matchesSearch = !s || l.name.toLowerCase().includes(s) || String(l.employeeId).toLowerCase().includes(s);
    const matchesDivision = !filters.division || l.division === filters.division;
    return matchesSearch && matchesDivision;
  });

  const filteredEmployees = employees.filter(e => {
    const s = searchQuery.trim().toLowerCase();
    const matchSearch = !s ||
      (e.name && e.name.toLowerCase().includes(s)) ||
      (e.employeeId && String(e.employeeId).toLowerCase().includes(s)) ||
      (e.division && e.division.toLowerCase().includes(s)) ||
      (e.location && e.location.toLowerCase().includes(s));

    const matchLocation = !empFilters.location || e.location === empFilters.location;
    const matchDivision = !empFilters.division || e.division === empFilters.division;
    let matchManager = true;
    if (empFilters.managerEmpId) {
      const team = teams.find(t => t.leaderEmployeeId === empFilters.managerEmpId);
      const members = team?.members || [];
      matchManager = members.includes(e.employeeId);
    }
    return matchSearch && matchLocation && matchDivision && matchManager;
  });

  const sortedEmployees = [...filteredEmployees].sort((a, b) => {
    const getNum = (id) => {
      const m = String(id || '').match(/^CDE(\d{3})$/i);
      return m ? parseInt(m[1], 10) : Number.MAX_SAFE_INTEGER;
    };
    const na = getNum(a.employeeId);
    const nb = getNum(b.employeeId);
    if (na !== nb) return na - nb;
    return String(a.employeeId).localeCompare(String(b.employeeId));
  });

  const employeesById = employees.reduce((acc, emp) => {
    acc[emp.employeeId] = emp;
    return acc;
  }, {});

  const adminPmOptions = Array.from(
    new Map(
      users
        .filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId)
        .map(u => [u.employeeId, u])
    ).values()
  )
    .map(u => {
      const emp = employeesById[u.employeeId];
      const displayName = emp?.name || u.name || u.employeeId;
      let roleLabel = 'Reporting Manager';
      if (u.role === 'manager') roleLabel = 'General Manager';
      if (u.role === 'director') roleLabel = 'Director';
      return { value: u.employeeId, label: `${u.employeeId} - ${displayName} (${roleLabel})` };
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  const getAssignedManagerEmpId = (employeeId) => {
    const team = teams.find(t => (t.members || []).includes(employeeId));
    return team?.leaderEmployeeId || '';
  };

  const getLeaderLabel = (leaderEmployeeId) => {
    if (!leaderEmployeeId) return '';
    const emp = employeesById[leaderEmployeeId];
    if (emp?.name) return `${leaderEmployeeId} - ${emp.name}`;
    const leader = leaders.find(l => l.employeeId === leaderEmployeeId);
    return leader?.name ? `${leaderEmployeeId} - ${leader.name}` : leaderEmployeeId;
  };

  const handleAssignManager = async (employeeId, leaderEmployeeId) => {
    try {
      setLoading(true);
      setError('');

      const currentTeam = teams.find(t => (t.members || []).includes(employeeId));
      const currentLeader = currentTeam?.leaderEmployeeId || '';
      const nextLeader = String(leaderEmployeeId || '');

      if (currentTeam && currentLeader && currentLeader !== nextLeader) {
        await teamAPI.removeMember(currentTeam.teamCode, employeeId);
      }

      if (!nextLeader) {
        await loadData();
        return;
      }

      let targetTeam = teams.find(t => t.leaderEmployeeId === nextLeader);
      if (!targetTeam) {
        const division = employeesById[nextLeader]?.division || leaders.find(l => l.employeeId === nextLeader)?.division || '';
        const teamCode = `TEAM-${nextLeader}`;
        await teamAPI.upsert({ teamCode, leaderEmployeeId: nextLeader, division });
        targetTeam = { teamCode, leaderEmployeeId: nextLeader, members: [] };
      }

      await teamAPI.addMember(targetTeam.teamCode, employeeId);
      await loadData();
    } catch (e) {
      setError('Failed to assign Reporting Manager');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTeam = async () => {
    if (!form.teamCode || !form.leaderEmployeeId) return;
    try {
      setLoading(true);
      await teamAPI.upsert({ teamCode: form.teamCode.trim(), leaderEmployeeId: form.leaderEmployeeId, division: form.division });
      await loadData();
      setSelectedTeamCode(form.teamCode.trim());
      const teamRes = await teamAPI.getByCode(form.teamCode.trim());
      setTeamDetails(teamRes.data);
    } catch (e) {
      setError('Failed to save team');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectTeam = async (code) => {
    setSelectedTeamCode(code);
    if (!code) { setTeamDetails(null); return; }
    try {
      const res = await teamAPI.getByCode(code);
      setTeamDetails(res.data);
      setForm(prev => ({ ...prev, teamCode: res.data.teamCode, leaderEmployeeId: res.data.leaderEmployeeId, division: res.data.division || '' }));
    } catch (e) {
      setTeamDetails(null);
    }
  };

  const handleAddMember = async () => {
    if (!selectedTeamCode || !memberEmployeeId) return;
    try {
      setLoading(true);
      await teamAPI.addMember(selectedTeamCode, memberEmployeeId.trim());
      const res = await teamAPI.getByCode(selectedTeamCode);
      setTeamDetails(res.data);
      setMemberEmployeeId('');
    } catch (e) {
      setError('Failed to add member');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (employeeId) => {
    try {
      setLoading(true);
      await teamAPI.removeMember(selectedTeamCode, employeeId);
      const res = await teamAPI.getByCode(selectedTeamCode);
      setTeamDetails(res.data);
    } catch (e) {
      setError('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const getLeaderName = (id) => {
    const leader = leaders.find(l => l.employeeId === id);
    return leader ? leader.name : '';
  };

  const handleSelectLeader = async (leaderEmpId) => {
    setSelectedLeaderEmpId(leaderEmpId);
    setForm(prev => ({ ...prev, leaderEmployeeId: leaderEmpId }));
    const teamForLeader = teams.find(t => t.leaderEmployeeId === leaderEmpId);
    if (teamForLeader) {
      await handleSelectTeam(teamForLeader.teamCode);
    } else {
      setSelectedTeamCode('');
      setTeamDetails(null);
    }
  };

  const nonManagerEmployees = employees.filter(emp => {
    return !adminPmOptions.some(opt => opt.value === emp.employeeId);
  }).sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const handleAddReportingManager = async (e) => {
    e.preventDefault();
    if (!selectedEmpForManager) {
      setModalError('Please select an employee');
      return;
    }
    setLoading(true);
    setModalError('');
    setModalSuccess('');
    try {
      const emp = employees.find(emp => emp.employeeId === selectedEmpForManager);
      if (!emp) {
        setModalError('Employee not found');
        setLoading(false);
        return;
      }

      const existingUser = users.find(u => String(u.employeeId || '').toLowerCase() === String(selectedEmpForManager).toLowerCase() || String(u.email || '').toLowerCase() === String(emp.email || '').toLowerCase());
      
      if (existingUser) {
        if (['admin', 'projectmanager', 'manager', 'director'].includes(existingUser.role)) {
          setModalError(`${emp.name} is already a Reporting Manager, General Manager, Director, or Admin.`);
          setLoading(false);
          return;
        }
        await authAPI.updateUser(existingUser._id, {
          ...existingUser,
          role: 'projectmanager'
        });
        setModalSuccess(`Successfully updated ${emp.name}'s role to Reporting Manager.`);
      } else {
        if (!emp.email) {
          setModalError('Selected employee does not have an email address. Cannot create user account.');
          setLoading(false);
          return;
        }
        await authAPI.createUser({
          name: emp.name,
          email: emp.email,
          password: managerPassword,
          role: 'projectmanager',
          employeeId: emp.employeeId,
          permissions: ['timesheet_access', 'attendance_approval', 'leave_access', 'team_access']
        });
        setModalSuccess(`Successfully created user account for ${emp.name} as Reporting Manager.`);
      }
      
      await loadData();
      
      setTimeout(() => {
        setShowAddManagerModal(false);
        setModalSuccess('');
        setSelectedEmpForManager('');
      }, 1500);
      
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to add Reporting Manager');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveReportingManagerRole = async (userId) => {
    const userObj = users.find(u => u._id === userId);
    if (!userObj) return;
    
    if (!window.confirm(`Are you sure you want to remove the Reporting Manager role from ${userObj.name}? They will be reverted to a normal Employee role.`)) {
      return;
    }
    
    setLoading(true);
    setModalError('');
    setModalSuccess('');
    try {
      await authAPI.updateUser(userId, {
        ...userObj,
        role: 'employees'
      });
      setModalSuccess(`Successfully removed Reporting Manager role from ${userObj.name}.`);
      await loadData();
    } catch (err) {
      setModalError(err.response?.data?.message || 'Failed to remove Reporting Manager role');
    } finally {
      setLoading(false);
    }
  };

  // Metrics summary
  const totalEmployeesCount = employees.length;
  const reportingManagersCount = adminPmOptions.length;
  const totalDivisionsCount = uniqueEmpDivisions.length;
  const totalLocationsCount = uniqueEmpLocations.length;
  const assignedCount = employees.filter(e => !!getAssignedManagerEmpId(e.employeeId)).length;

  return (
    <div className="min-h-screen bg-slate-50/60 p-3 sm:p-6 lg:p-8 space-y-6">
      <div className="max-w-none xl:max-w-8xl mx-auto space-y-6">

        {/* Header & Stats Banner */}
        <div className="bg-gradient-to-r from-slate-900 via-[#262760] to-indigo-950 rounded-2xl p-5 text-white shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          {/* Metrics Summary Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Total Workforce</p>
              <p className="text-xl font-black text-white mt-1">{totalEmployeesCount} <span className="text-xs font-normal text-blue-200/60">Employees</span></p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Reporting Managers</p>
              <p className="text-xl font-black text-emerald-400 mt-1">{reportingManagersCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Assigned to Manager</p>
              <p className="text-xl font-black text-amber-300 mt-1">{assignedCount} / {totalEmployeesCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
              <p className="text-xs text-blue-200/70 font-medium">Divisions / Locations</p>
              <p className="text-xl font-black text-cyan-300 mt-1">{totalDivisionsCount} / {totalLocationsCount}</p>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-xl text-red-700 text-sm font-semibold flex items-center justify-between shadow-xs">
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-800"><XMarkIcon className="h-4 w-4" /></button>
          </div>
        )}

        {/* Filter Controls Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-4 sm:p-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50/50 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760] transition-all"
                placeholder="Search employee name, ID, division or location..."
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600">
                  <XMarkIcon className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns & Promote Button Toolbar */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-full sm:w-44">
                <select
                  value={empFilters.location}
                  onChange={(e) => setEmpFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#262760]/30"
                >
                  <option value="">📍 All Locations ({uniqueEmpLocations.length})</option>
                  {uniqueEmpLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-44">
                <select
                  value={empFilters.division}
                  onChange={(e) => setEmpFilters(prev => ({ ...prev, division: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#262760]/30"
                >
                  <option value="">🏢 All Divisions ({uniqueEmpDivisions.length})</option>
                  {uniqueEmpDivisions.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>

              <div className="w-full sm:w-52">
                <select
                  value={empFilters.managerEmpId}
                  onChange={(e) => setEmpFilters(prev => ({ ...prev, managerEmpId: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold bg-slate-50/50 focus:bg-white focus:ring-2 focus:ring-[#262760]/30"
                >
                  <option value="">🛡️ All Reporting Managers</option>
                  {adminPmOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {(empFilters.location || empFilters.division || empFilters.managerEmpId || searchQuery) && (
                <button
                  onClick={() => {
                    setEmpFilters({ location: '', division: '', managerEmpId: '' });
                    setSearchQuery('');
                  }}
                  className="px-3 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 text-xs font-semibold rounded-xl transition-all"
                >
                  Reset
                </button>
              )}

              <button
                onClick={() => {
                  setSelectedEmpForManager('');
                  setManagerPassword('Cde@123456');
                  setModalError('');
                  setModalSuccess('');
                  setShowAddManagerModal(true);
                }}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-md shadow-emerald-500/20 border border-emerald-400/30 transition-all duration-200 active:scale-95 cursor-pointer whitespace-nowrap ml-auto sm:ml-0"
              >
                <UserPlusIcon className="h-4 w-4 mr-1.5 stroke-[2.5]" />
                Promote / Add Manager
              </button>
            </div>
          </div>
        </div>

        {/* Employee Team Allocation Table Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 overflow-hidden">
          
          {/* Table Header Summary */}
          <div className="px-6 py-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-600">
              Showing <span className="text-slate-900 font-bold">{sortedEmployees.length}</span> Employees Matching Selection
            </p>
          </div>

          <div className="overflow-x-auto">
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-gradient-to-r from-[#1e2050] to-[#262760] text-white sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Employee ID</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Employee Name</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Division</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider">Location</th>
                    <th scope="col" className="px-6 py-3.5 text-left text-xs font-bold uppercase tracking-wider min-w-[280px]">
                      Assigned Reporting Manager
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-100">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-12 text-center text-slate-400">
                        <div className="text-4xl mb-2">🔍</div>
                        <p className="text-sm font-semibold text-slate-600">No employees found matching filter criteria</p>
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map(e => {
                      const assignedManagerEmpId = getAssignedManagerEmpId(e.employeeId);
                      const hasManagerInOptions = assignedManagerEmpId
                        ? adminPmOptions.some(o => o.value === assignedManagerEmpId)
                        : true;
                      const initial = e.name ? e.name.charAt(0).toUpperCase() : 'E';
                      const isManagerRole = adminPmOptions.some(o => o.value === e.employeeId);

                      return (
                        <tr key={e._id} className="hover:bg-slate-50/80 transition-colors duration-150 group">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200">
                              {e.employeeId}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-[#262760] to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm group-hover:scale-105 transition-transform">
                                {initial}
                              </div>
                              <div>
                                <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
                                  <span>{e.name}</span>
                                  {isManagerRole && (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                                      Manager
                                    </span>
                                  )}
                                </div>
                                <div className="text-xs text-slate-400">{e.email || 'No email registered'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-700">
                            <span className="bg-slate-100 px-2 py-1 rounded text-slate-700 font-medium">
                              {e.division || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-xs font-semibold text-slate-700">
                            <span className="flex items-center gap-1 text-slate-600">
                              <span>📍</span> {e.location || '—'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <select
                                className="w-full border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#262760]/30 focus:border-[#262760] transition-all"
                                value={assignedManagerEmpId}
                                disabled={loading}
                                onChange={(ev) => handleAssignManager(e.employeeId, ev.target.value)}
                              >
                                <option value="">Select Reporting Manager...</option>
                                {assignedManagerEmpId && !hasManagerInOptions && (
                                  <option value={assignedManagerEmpId}>{getLeaderLabel(assignedManagerEmpId)}</option>
                                )}
                                {adminPmOptions.map(opt => (
                                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                                ))}
                              </select>

                              {assignedManagerEmpId && (
                                <button
                                  onClick={() => handleAssignManager(e.employeeId, "")}
                                  disabled={loading}
                                  title="Unassign Reporting Manager"
                                  className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-bold text-xs flex-shrink-0 cursor-pointer"
                                >
                                  <XMarkIcon className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* Leader / Team Member Detail View Panel */}
      {selectedLeaderEmpId && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/80 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>🛡️</span> Manage Team Members for Leader: {selectedLeaderEmpId}
            </h2>
            <button
              onClick={() => setSelectedLeaderEmpId('')}
              className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              Close Panel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/70">
              <div className="text-xs text-slate-500 font-semibold uppercase">Selected Leader</div>
              <div className="text-sm font-bold text-slate-900 mt-1">{selectedLeaderEmpId} - {getLeaderName(selectedLeaderEmpId)}</div>
            </div>

            {!selectedTeamCode && (
              <div className="flex items-center gap-2">
                <input
                  value={form.teamCode}
                  onChange={(e) => setForm(prev => ({ ...prev, teamCode: e.target.value }))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                  placeholder="Enter team code to create"
                />
                <button
                  onClick={handleSaveTeam}
                  disabled={loading || !form.teamCode || !form.leaderEmployeeId}
                  className="bg-[#262760] hover:bg-[#1f204d] text-white text-xs font-bold px-4 py-2 rounded-xl"
                >
                  Create Team
                </button>
              </div>
            )}

            <div className="flex items-center gap-2 md:col-span-2">
              <input
                value={memberEmployeeId}
                onChange={(e) => setMemberEmployeeId(e.target.value)}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold"
                placeholder="Enter member Employee ID (e.g. CDE012)"
              />
              <button
                onClick={handleAddMember}
                disabled={loading || !selectedTeamCode || !memberEmployeeId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-xl whitespace-nowrap"
              >
                + Add Member
              </button>
            </div>
          </div>

          {teamDetails && (
            <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/50 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-800">Team Code: <span className="text-[#262760] font-mono">{teamDetails.teamCode}</span></span>
                <span className="font-bold text-slate-600">Total Members: {teamDetails.members?.length || 0}</span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-bold text-slate-600 uppercase">Member Employee ID</th>
                      <th className="px-4 py-2 text-right text-xs font-bold text-slate-600 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-100">
                    {(teamDetails.members || []).map(m => (
                      <tr key={m}>
                        <td className="px-4 py-2 text-xs font-mono font-bold text-slate-800">{m}</td>
                        <td className="px-4 py-2 text-right">
                          <button
                            onClick={() => handleRemoveMember(m)}
                            className="px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 text-xs font-bold hover:bg-rose-100 border border-rose-200"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {(teamDetails.members || []).length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-xs text-slate-400 text-center" colSpan={2}>No team members assigned yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Add / Promote Reporting Manager Modal */}
      <Modal
        isOpen={showAddManagerModal}
        onClose={() => setShowAddManagerModal(false)}
        title="Promote or Add Reporting Manager"
      >
        <form onSubmit={handleAddReportingManager} className="space-y-5 text-slate-700">
          {modalError && (
            <div className="p-3 bg-rose-50 border-l-4 border-rose-500 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <span>⚠️</span>
              <span>{modalError}</span>
            </div>
          )}
          {modalSuccess && (
            <div className="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-xl text-emerald-700 text-xs font-semibold flex items-center gap-2">
              <span>🚀</span>
              <span>{modalSuccess}</span>
            </div>
          )}
          
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Select Employee to Promote</label>
            <select
              value={selectedEmpForManager}
              onChange={(e) => {
                setSelectedEmpForManager(e.target.value);
                setModalError('');
              }}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 text-slate-800 text-xs font-bold focus:bg-white focus:ring-2 focus:ring-[#262760]/30 shadow-xs"
              required
            >
              <option value="">-- Choose from available employees --</option>
              {nonManagerEmployees.map(emp => (
                <option key={emp._id} value={emp.employeeId}>
                  {emp.employeeId} - {emp.name} ({emp.division || 'No division'})
                </option>
              ))}
            </select>
          </div>

          {selectedEmpForManager && (() => {
            const emp = employees.find(e => e.employeeId === selectedEmpForManager);
            if (!emp) return null;
            const initials = emp.name ? emp.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'EM';
            const userExists = users.some(u => String(u.employeeId || '').toLowerCase() === String(selectedEmpForManager).toLowerCase() || String(u.email || '').toLowerCase() === String(emp?.email || '').toLowerCase());
            
            return (
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#262760] to-indigo-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                    {initials}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{emp.name}</h4>
                    <p className="text-xs text-slate-500 font-mono">ID: {emp.employeeId}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
                    <span className="block text-slate-400 font-semibold uppercase text-[9px]">Division</span>
                    <span className="font-bold text-slate-700">{emp.division || 'Unassigned'}</span>
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-xl p-2.5">
                    <span className="block text-slate-400 font-semibold uppercase text-[9px]">Location</span>
                    <span className="font-bold text-slate-700">{emp.location || 'Unassigned'}</span>
                  </div>
                </div>

                {userExists ? (
                  <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl p-3 flex items-start gap-2">
                    <span className="text-base">✓</span>
                    <div>
                      <p className="font-bold">Existing user account found</p>
                      <p className="text-emerald-600 mt-0.5">This user's role will be updated to "Reporting Manager" (projectmanager).</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs rounded-xl p-3 flex items-start gap-2">
                      <span className="text-base">✦</span>
                      <div>
                        <p className="font-bold">New account will be created</p>
                        <p className="text-indigo-600 mt-0.5">A new Reporting Manager user account will be generated for login.</p>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Set Initial Password</label>
                      <input
                        type="text"
                        value={managerPassword}
                        onChange={(e) => setManagerPassword(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 bg-white text-xs font-semibold"
                        required
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          <div className="pt-3 border-t border-slate-100">
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">Current Reporting Managers ({adminPmOptions.length})</label>
            <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50">
              {users.filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId).length === 0 ? (
                <div className="text-slate-400 text-xs py-2 text-center">No reporting managers assigned yet.</div>
              ) : (
                users.filter(u => ['projectmanager', 'manager', 'director'].includes(u.role) && u.employeeId).map(m => {
                  const emp = employeesById[m.employeeId];
                  let roleLabel = 'Reporting Manager';
                  if (m.role === 'manager') roleLabel = 'General Manager';
                  if (m.role === 'director') roleLabel = 'Director';
                  return (
                    <div key={m._id} className="flex justify-between items-center bg-white p-2 rounded-lg border border-slate-200/70 text-xs shadow-2xs">
                      <div>
                        <span className="font-bold font-mono text-slate-700">{m.employeeId}</span> - <span className="font-semibold text-slate-800">{emp?.name || m.name}</span> <span className="text-slate-400">({roleLabel})</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveReportingManagerRole(m._id)}
                        disabled={loading}
                        className="text-rose-600 hover:text-rose-800 hover:bg-rose-50 font-bold px-2 py-0.5 rounded-md text-[11px] transition-colors"
                        title="Demote from Reporting Manager"
                      >
                        Remove Role
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowAddManagerModal(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-slate-700 bg-white text-xs font-semibold hover:bg-slate-50"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-gradient-to-r from-[#262760] to-indigo-800 hover:from-[#1d1e49] hover:to-indigo-900 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
              disabled={loading || !selectedEmpForManager}
            >
              {loading ? 'Saving...' : 'Designate as Manager'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default TeamManagement;
