import React, { useState } from 'react';
import { Save, Trash2 } from 'lucide-react';

const APPRAISERS = ['BalaSubiramaniyam', 'Uvaraj', 'Arunkumar.P', 'Harisankar', 'Arunkumar.D', 'Gopinath'];
const REVIEWERS = ['Arunkumar.p'];
const DIRECTORS = ['Balasubiramaniyam', 'Uvaraj'];
const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26'];

const AppraisalWorkflow = () => {
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('2025-26');
  // Mock Data matching the image structure
  const [rows, setRows] = useState([
    { id: 1, financialYr: '2025-26', empId: 'EMP001', name: 'John Doe', appraiser: '', reviewer: '', director: '' },
    { id: 2, financialYr: '2025-26', empId: 'EMP002', name: 'Jane Smith', appraiser: '', reviewer: '', director: '' },
    { id: 3, financialYr: '2025-26', empId: 'EMP003', name: 'Robert Fox', appraiser: '', reviewer: '', director: '' },
  ]);

  const handleDropdownChange = (id, field, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = (id) => {
    const row = rows.find(r => r.id === id);
    console.log('Saving workflow for:', row);
    // Here you would typically call an API
    // await performanceAPI.updateWorkflow(id, row);
    alert(`Workflow saved for ${row.name} successfully!`);
  };

  const handleDelete = (id) => {
    if(window.confirm('Are you sure you want to delete this workflow entry?')) {
        // Here you would typically call an API
        // await performanceAPI.deleteWorkflow(id);
        setRows(rows.filter(r => r.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-8 font-sans">
        <div className="w-full mx-auto">

             <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex items-center gap-4">
                <label htmlFor="financialYear" className="text-sm font-semibold text-gray-700">Financial Year:</label>
                <select
                    id="financialYear"
                    value={selectedFinancialYear}
                    onChange={(e) => setSelectedFinancialYear(e.target.value)}
                    className="block w-48 pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] sm:text-sm rounded-md shadow-sm"
                >
                    {FINANCIAL_YEARS.map(year => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
             </div>
             
             <div className="bg-white shadow border-b border-gray-200 sm:rounded-lg overflow-auto max-h-[75vh]">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-[#262760] sticky top-0 z-10">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                S.No
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                Employee ID
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                Employee Name
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                Appraisee
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                Reviewer
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                                Director
                            </th>
                            <th scope="col" className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {rows.map((row, index) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {index + 1}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                    {row.empId}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                    {row.name}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select 
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                                        value={row.appraiser}
                                        onChange={(e) => handleDropdownChange(row.id, 'appraiser', e.target.value)}
                                    >
                                        <option value="">Select Appraiser</option>
                                        {APPRAISERS.map(a => <option key={a} value={a}>{a}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select 
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                                        value={row.reviewer}
                                        onChange={(e) => handleDropdownChange(row.id, 'reviewer', e.target.value)}
                                    >
                                        <option value="">Select Reviewer</option>
                                        {REVIEWERS.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select 
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                                        value={row.director}
                                        onChange={(e) => handleDropdownChange(row.id, 'director', e.target.value)}
                                    >
                                        <option value="">Select Director</option>
                                        {DIRECTORS.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                    <div className="flex justify-center items-center space-x-3">
                                        <button 
                                            onClick={() => handleSave(row.id)} 
                                            className="text-[#262760] hover:text-[#1e2050] transition-colors"
                                            title="Save"
                                        >
                                            <div className="bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100">
                                                <Save className="h-4 w-4" />
                                            </div>
                                        </button>
                                        <button 
                                            onClick={() => handleDelete(row.id)} 
                                            className="text-red-600 hover:text-red-900 transition-colors"
                                            title="Delete"
                                        >
                                            <div className="bg-red-50 p-2 rounded-lg hover:bg-red-100">
                                                <Trash2 className="h-4 w-4" />
                                            </div>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
             </div>
        </div>
    </div>
  );
};

export default AppraisalWorkflow;