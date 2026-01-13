import React, { useEffect, useState } from 'react';
import { teamAPI, employeeAPI } from '../../services/api';

const TeamManagement = () => {
  const [leaders, setLeaders] = useState([]);
  const [teams, setTeams] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [selectedTeamCode, setSelectedTeamCode] = useState('');
  const [teamDetails, setTeamDetails] = useState(null);
  const [form, setForm] = useState({ teamCode: '', leaderEmployeeId: '', division: '' });
  const [memberEmployeeId, setMemberEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ search: '', division: '' });
  const [empFilters, setEmpFilters] = useState({ location: '', division: '', managerEmpId: '' });
  const [selectedLeaderEmpId, setSelectedLeaderEmpId] = useState('');

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
    } catch (e) {
      setError('Failed to load data');
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
    const matchLocation = !empFilters.location || e.location === empFilters.location;
    const matchDivision = !empFilters.division || e.division === empFilters.division;
    let matchManager = true;
    if (empFilters.managerEmpId) {
      const team = teams.find(t => t.leaderEmployeeId === empFilters.managerEmpId);
      const members = team?.members || [];
      matchManager = members.includes(e.employeeId);
    }
    return matchLocation && matchDivision && matchManager;
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

  useEffect(() => {
    const s = filters.search.trim();
    if (filteredLeaders.length === 1) {
      const only = filteredLeaders[0];
      if (only?.employeeId && only.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(only.employeeId);
      }
      return;
    }
    if (s) {
      const exact = leaders.find(l => String(l.employeeId).toLowerCase() === s.toLowerCase() || l.name.toLowerCase() === s.toLowerCase());
      if (exact && exact.employeeId !== selectedLeaderEmpId) {
        handleSelectLeader(exact.employeeId);
        return;
      }
    }
    if (filteredLeaders.length === 0) {
      if (selectedLeaderEmpId) {
        setSelectedLeaderEmpId('');
        setSelectedTeamCode('');
        setTeamDetails(null);
      }
    }
  }, [filters.search, filters.division, leaders]);

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

  return (
    <div className="p-6 w-full">

      {/* <h1 className="text-2xl font-semibold text-gray-800 mb-4">Team Management</h1> */}
      {error && <div className="mb-4 text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 gap-6 w-full">

        <div className=" bg-white rounded-lg shadow p-4">
          {/* <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-700">Sr.Project Managers</h2>
            <button onClick={loadData} disabled={loading} className="px-3 py-2 rounded bg-gray-700 text-white">Refresh</button>
          </div> */}
          {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Search by name or 
               id"
              className="w-full border rounded px-3 py-2"
            />
            <select
              value={filters.division}
              onChange={(e) => setFilters(prev => ({ ...prev, division: e.target.value }))}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">All Divisions</option>
              {uniqueDivisions.map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
            <select
              value={selectedLeaderEmpId}
              onChange={(e) => handleSelectLeader(e.target.value)}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">Select Sr.Team Leader</option>
              {filteredLeaders.map(l => (
                <option key={l._id} value={l.employeeId}>{l.employeeId} - {l.name} - {l.division || '-'}</option>
              ))}
            </select>
          </div> */}
          {/* <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Division</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredLeaders.map(l => (
                  <tr key={l._id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleSelectLeader(l.employeeId)}>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.employeeId}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.name}</td>
                    <td className="px-4 py-2 text-sm text-gray-900">{l.division || '-'}</td>
                  </tr>
                ))}
                {filteredLeaders.length === 0 && (
                  <tr>
                    <td className="px-4 py-4 text-sm text-gray-500" colSpan={3}>No leaders found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div> */}

          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-medium text-gray-700">Employees Filter</h3>
              {(empFilters.location || empFilters.division || empFilters.managerEmpId) && (
                <button
                  onClick={() => setEmpFilters({ location: '', division: '', managerEmpId: '' })}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded transition-colors"
                >
                  Clear Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
              <select
                value={empFilters.location}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Locations</option>
                {uniqueEmpLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
              <select
                value={empFilters.division}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, division: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Divisions</option>
                {uniqueEmpDivisions.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <select
                value={empFilters.managerEmpId}
                onChange={(e) => setEmpFilters(prev => ({ ...prev, managerEmpId: e.target.value }))}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">All Project Managers</option>
                {leaders.map(l => (
                  <option key={l._id} value={l.employeeId}>{l.employeeId} - {l.name}</option>
                ))}
              </select>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <div className="h-[calc(100vh-280px)] overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Employee ID</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Division</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase bg-gray-50">Location</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedEmployees.map(e => (
                        <tr key={e._id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-900">{e.employeeId}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{e.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{e.division || '-'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">{e.location || '-'}</td>
                        </tr>
                      ))}
                      {filteredEmployees.length === 0 && (
                        <tr>
                          <td className="px-4 py-4 text-sm text-gray-500" colSpan={4}>No employees found</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>


      </div>

      {selectedLeaderEmpId && (
        <div className="mt-6 bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-medium text-gray-700">Manage Team Members</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
            <div>
              <div className="text-sm text-gray-600">Selected Leader</div>
              <div className="text-base font-medium">{selectedLeaderEmpId} {getLeaderName(selectedLeaderEmpId)}</div>
            </div>
            {!selectedTeamCode && (
              <div>
                <input value={form.teamCode} onChange={(e) => setForm(prev => ({ ...prev, teamCode: e.target.value }))} className="w-full border rounded px-3 py-2" placeholder="Enter team code to create" />
              </div>
            )}
            {!selectedTeamCode && (
              <div className="flex items-end">
                <button onClick={handleSaveTeam} disabled={loading || !form.teamCode || !form.leaderEmployeeId} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-2">Save Team</button>
              </div>
            )}
            <div>
              <label className="block text-sm text-gray-600">Employee ID</label>
              <input value={memberEmployeeId} onChange={(e) => setMemberEmployeeId(e.target.value)} className="mt-1 w-full border rounded px-3 py-2" placeholder="Enter employee id" />
            </div>
            <div className="flex items-end">
              <button onClick={handleAddMember} disabled={loading || !selectedTeamCode || !memberEmployeeId} className="w-full bg-green-600 hover:bg-green-700 text-white rounded px-3 py-2">Add to Team</button>
            </div>
          </div>

          {teamDetails && (
            <div className="border rounded p-3">
              <div className="mb-3">
                <div className="text-sm text-gray-600">Team</div>
                <div className="text-lg font-medium">{teamDetails.teamCode}</div>
              </div>
              <div className="mb-3">
                <div className="text-sm text-gray-600">Leader</div>
                <div className="text-lg font-medium">{teamDetails.leaderEmployeeId} {getLeaderName(teamDetails.leaderEmployeeId)}</div>
              </div>
              <div className="mb-2 text-sm text-gray-600">Members</div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {(teamDetails.members || []).map(m => (
                      <tr key={m}>
                        <td className="px-4 py-2 text-sm text-gray-900">{m}</td>
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleRemoveMember(m)} className="px-3 py-1 rounded bg-red-600 text-white">Remove</button>
                        </td>
                      </tr>
                    ))}
                    {(teamDetails.members || []).length === 0 && (
                      <tr>
                        <td className="px-4 py-4 text-sm text-gray-500" colSpan={2}>No members yet</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TeamManagement;
