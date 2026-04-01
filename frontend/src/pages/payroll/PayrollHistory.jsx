import React, { useState, useEffect } from 'react';
import { Search, Download, TrendingUp, FileText, FileSpreadsheet, Edit, Trash2, Save, X, AlertCircle } from 'lucide-react';
import api, { employeeAPI, payrollHistoryAPI } from '../../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const PayrollHistory = () => {
    const [history, setHistory] = useState([]);
    const [snapshotData, setSnapshotData] = useState(null); // stores 24-25 snapshot
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [selectedEmployee, setSelectedEmployee] = useState('');
    const [selectedFy, setSelectedFy] = useState('2025-26');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingId, setEditingId] = useState(null);
    const [editFormData, setEditFormData] = useState({});
    const [statusPopup, setStatusPopup] = useState({ isOpen: false, status: 'success', message: '' });

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
        if (['2024-25', '2025-26'].includes(selectedFy)) {
            fetchHistory();
        } else if (selectedEmployee) {
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
            
            if (['2024-25', '2025-26'].includes(selectedFy)) {
               const response = await api.get(`/payroll/history/snapshot/${selectedFy}`);
               if (response.data.success) {
                   setSnapshotData(response.data.data);
               }
               setLoading(false);
               return;
            } else {
               setSnapshotData(null);
            }

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

    const filteredData = snapshotData ? snapshotData.filter(item => 
        item.employeeName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.employeeId?.toLowerCase().includes(searchTerm.toLowerCase())
    ) : [];

    const exportToExcel = () => {
        if (filteredData.length === 0) return;
        const exportData = filteredData.map(row => ({
            'Employee ID': row.employeeId,
            'Employee Name': row.employeeName,
            'Designation': row.designation,
            'Basic+DA': row.basicDA || 0,
            'Net Salary': row.netSalary || 0,
            'Account No': row.accountNumber || '',
            'Location': row.location || ''
        }));
        const worksheet = XLSX.utils.json_to_sheet(exportData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, `Payroll_${selectedFy}`);
        XLSX.writeFile(workbook, `Payroll_History_${selectedFy}.xlsx`);
    };

    const exportToPDF = () => {
        if (filteredData.length === 0) return;
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(`Payroll History Report - FY ${selectedFy}`, 14, 15);
        
        const tableColumn = ['Employee ID', 'Employee Name', 'Designation', 'Basic+DA', 'Net Salary', 'Account No', 'Location'];
        const tableRows = [];

        filteredData.forEach(row => {
            const rowData = [
                row.employeeId,
                row.employeeName,
                row.designation,
                row.basicDA?.toLocaleString('en-IN') || '0',
                row.netSalary?.toLocaleString('en-IN') || '0',
                row.accountNumber || '-',
                row.location || '-'
            ];
            tableRows.push(rowData);
        });

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 25,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [38, 39, 96] }
        });

        doc.save(`Payroll_History_${selectedFy}.pdf`);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this record?')) return;
        try {
            const res = await payrollHistoryAPI.delete(id);
            if (res.data.success) {
                setStatusPopup({ isOpen: true, status: 'success', message: 'Record deleted successfully' });
                fetchHistory();
            }
        } catch (error) {
            setStatusPopup({ isOpen: true, status: 'error', message: error.response?.data?.message || 'Failed to delete' });
        }
    };

    const startEdit = (record) => {
        setEditingId(record._id);
        setEditFormData({
            salary: record.revisedCTC || record.salary || 0,
            financialYear: record.financialYear,
            effectiveFrom: record.effectiveFrom ? new Date(record.effectiveFrom).toISOString().split('T')[0] : '',
            effectiveTo: record.effectiveTo ? new Date(record.effectiveTo).toISOString().split('T')[0] : '',
            notes: record.notes || ''
        });
    };

    const handleUpdate = async (id) => {
        try {
            const res = await payrollHistoryAPI.update(id, editFormData);
            if (res.data.success) {
                setEditingId(null);
                setStatusPopup({ isOpen: true, status: 'success', message: 'Record updated successfully' });
                fetchHistory();
            }
        } catch (error) {
            setStatusPopup({ isOpen: true, status: 'error', message: error.response?.data?.message || 'Failed to update' });
        }
    };

    return (
        <>
        <div className="p-8 max-w-7xl mx-auto font-sans">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-[#262760] flex items-center">
                    <TrendingUp className="mr-2 h-6 w-6" /> Payroll History
                </h1>
                
                <div className="flex gap-4 items-center">
                    <div className="relative">
                       <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                       <input 
                           type="text" 
                           placeholder="Search Employee..." 
                           className="border border-gray-300 rounded-md pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                           value={searchTerm}
                           onChange={(e) => setSearchTerm(e.target.value)}
                       />
                    </div>
                    {isAdmin && !['2024-25', '2025-26'].includes(selectedFy) && (
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
                        <option value="2024-25">2024-25</option>
                        <option value="2025-26">2025-26</option>
                    </select>
                    <div className="flex gap-2">
                        <button 
                             onClick={exportToExcel}
                             className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                         >
                             <FileSpreadsheet className="w-4 h-4" /> Excel
                         </button>
                         <button 
                             onClick={exportToPDF}
                             className="flex items-center gap-2 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                         >
                             <FileText className="w-4 h-4" /> PDF
                         </button>
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-500">Loading history...</div>
                ) : ['2024-25', '2025-26'].includes(selectedFy) && snapshotData ? (
                    filteredData.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">No payroll history found for {selectedFy === '2025-26' ? 'FY2025-26' : 'FY2024-25'}.</div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200 relative">
                            <thead className="bg-[#262760] text-white sticky top-0">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Employee Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Designation</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Basic+DA</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Net Salary</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Account No</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Location</th>
                                    {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredData.map(record => (
                                    <tr key={record._id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{record.employeeId}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="font-medium text-gray-900">{record.employeeName}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-gray-900">{record.designation}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-gray-900">₹{Number(record.basicDA || 0).toLocaleString('en-IN')}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="font-bold text-green-600">₹{Number(record.netSalary || 0).toLocaleString('en-IN')}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-gray-900">{record.accountNumber || '-'}</div></td>
                                        <td className="px-6 py-4 whitespace-nowrap"><div className="text-gray-900">{record.location || '-'}</div></td>
                                        {isAdmin && (
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <button 
                                                    onClick={() => handleDelete(record._id)}
                                                    className="text-red-600 hover:text-red-900"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )
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
                                {isAdmin && <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {history.map((record) => (
                                <tr key={record._id} className={record.status === 'REVOKED' ? 'bg-red-50 opacity-75' : 'hover:bg-gray-50'}>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {editingId === record._id ? (
                                            <input 
                                                className="border rounded px-2 py-1 w-24"
                                                value={editFormData.financialYear}
                                                onChange={(e) => setEditFormData({...editFormData, financialYear: e.target.value})}
                                            />
                                        ) : record.financialYear}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">₹{Number(record.previousCTC || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-[#262760]">
                                        {editingId === record._id ? (
                                            <input 
                                                type="number"
                                                className="border rounded px-2 py-1 w-24"
                                                value={editFormData.salary}
                                                onChange={(e) => setEditFormData({...editFormData, salary: e.target.value})}
                                            />
                                        ) : `₹${Number(record.revisedCTC || 0).toLocaleString('en-IN')}`}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{record.incrementPercentage}%</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">+₹{Number(record.incrementAmount || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">₹{Number(record.performancePay || 0).toLocaleString('en-IN')}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                                            ${record.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 
                                              record.status === 'BASE' ? 'bg-blue-100 text-blue-800' :
                                              record.status === 'PAST' ? 'bg-gray-100 text-gray-800' :
                                              'bg-red-100 text-red-800'}`}>
                                            {record.status}
                                        </span>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                                            {editingId === record._id ? (
                                                <>
                                                    <button onClick={() => handleUpdate(record._id)} className="text-green-600 hover:text-green-900" title="Save"><Save className="h-4 w-4" /></button>
                                                    <button onClick={() => setEditingId(null)} className="text-gray-600 hover:text-gray-900" title="Cancel"><X className="h-4 w-4" /></button>
                                                </>
                                            ) : (
                                                <>
                                                    <button onClick={() => startEdit(record)} className="text-indigo-600 hover:text-indigo-900" title="Edit"><Edit className="h-4 w-4" /></button>
                                                    <button onClick={() => handleDelete(record._id)} className="text-red-600 hover:text-red-900" title="Delete"><Trash2 className="h-4 w-4" /></button>
                                                </>
                                            )}
                                        </td>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
        {statusPopup.isOpen && (
            <div className="fixed bottom-4 right-4 z-50">
                <div className={`${statusPopup.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'} text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-up`}>
                    {statusPopup.status === 'success' ? <TrendingUp className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    <span className="text-sm font-medium">{statusPopup.message}</span>
                    <button onClick={() => setStatusPopup({ ...statusPopup, isOpen: false })} className="hover:opacity-75 transition-opacity">
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        )}
        </>
    );
};

export default PayrollHistory;
