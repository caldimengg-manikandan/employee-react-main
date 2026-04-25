import React, { useState, useEffect } from 'react';
import { Search, Download, TrendingUp } from 'lucide-react';
import api, { employeeAPI, payrollAPI } from '../../services/api';

const PayrollHistory = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedFy, setSelectedFy] = useState('');

    const user = JSON.parse(sessionStorage.getItem("user") || "{}");
    const role = (user.role || '').toLowerCase();
    const isAdmin = role === 'admin' || role === 'hr' || role === 'director';

    useEffect(() => {
        if (isAdmin) {
            fetchEmployees();
        } else {
            setSelectedEmployee(user.employeeId);
        }
    }, [isAdmin, user.employeeId]);

    useEffect(() => {
        if (selectedEmployee) {
            fetchHistory();
        }
    }, [selectedEmployee, selectedFy]);

    const fetchEmployees = async () => {
        try {
            const res = await employeeAPI.getAllEmployees();
            setEmployees(res.data);
            if (res.data && res.data.length > 0) {
                setSelectedEmployee(res.data[0].employeeId);
            }
        } catch (error) {
            console.error("Failed to load employees", error);
        }
    };

    const fetchHistory = async () => {
        try {
            setLoading(true);
            const params = selectedFy ? { fy: selectedFy } : {};
            const response = await api.get(`/payroll/history/${selectedEmployee}`, { params });
            if (response.data.success) {
                setHistory(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#262760] flex items-center">
                    <TrendingUp className="mr-2 h-6 w-6" /> Payroll History
                </h1>
                
                <div className="flex gap-4">
                    {isAdmin && (
                        <select 
                            className="border border-gray-300 rounded-md px-4 py-2"
                            value={selectedEmployee}
                            onChange={(e) => setSelectedEmployee(e.target.value)}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(emp => (
                                <option key={emp.employeeId} value={emp.employeeId}>{emp.name} ({emp.employeeId})</option>
                            ))}
                        </select>
                    )}
                    <select 
                        className="border border-gray-300 rounded-md px-4 py-2"
                        value={selectedFy}
                        onChange={(e) => setSelectedFy(e.target.value)}
                    >
                        <option value="">All Financial Years</option>
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26">2025-26</option>
                        <option value="2026-27">2026-27</option>
                    </select>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                ) : history.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">No payroll history found.</div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-[#262760] text-white">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Financial Year</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Previous CTC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Revised CTC</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Increment %</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Amount</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Perf. Pay</th>
                                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Status</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {history.map((record) => (
                                <tr key={record._id} className={record.status === 'REVOKED' ? 'bg-red-50 opacity-75' : 'hover:bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{record.financialYear}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{Number(record.previousCTC).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#262760]">₹{Number(record.revisedCTC).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.incrementPercentage}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">+₹{Number(record.incrementAmount).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">₹{Number(record.performancePay).toLocaleString()}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${record.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default PayrollHistory;
