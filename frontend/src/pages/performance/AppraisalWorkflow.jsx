import React, { useState, useEffect } from 'react';
import { Save, Trash2 } from 'lucide-react';
import { employeeAPI } from '../../services/api';

const FINANCIAL_YEARS = ['2023-24', '2024-25', '2025-26'];

const AppraisalWorkflow = () => {
  const [selectedFinancialYear, setSelectedFinancialYear] = useState('2025-26');
  const [appraiserOptions, setAppraiserOptions] = useState([]);
  const [reviewerOptions, setReviewerOptions] = useState([]);
  const [directorOptions, setDirectorOptions] = useState([]);
  
  const [rows, setRows] = useState([]);
  const [filteredRows, setFilteredRows] = useState([]);
  const [filters, setFilters] = useState({
    division: '',
    designation: '',
    location: ''
  });

  // Filter Options
  const [divisionOptions, setDivisionOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [locationOptions, setLocationOptions] = useState([]);

  useEffect(() => {
    const fetchWorkflowUsers = async () => {
        try {
            const response = await employeeAPI.getAllEmployees();
            const employees = response.data;
            
            // Populate rows with fetched employees
            const formattedRows = employees.map(emp => ({
                id: emp._id, // Assuming _id is the unique identifier
                financialYr: selectedFinancialYear, // Initial value
                empId: emp.employeeId,
                name: emp.name,
                appraiser: emp.appraiser || '', 
                reviewer: emp.reviewer || '', 
                director: emp.director || '',
                division: emp.division || '',
                designation: emp.designation || '',
                location: emp.location || ''
            }));
            setRows(formattedRows);
            setFilteredRows(formattedRows);
            
            // Extract unique options for filters
            const divisions = [...new Set(employees.map(e => e.division).filter(Boolean))].sort();
            const designations = [...new Set(employees.map(e => e.designation).filter(Boolean))].sort();
            const locations = [...new Set(employees.map(e => e.location).filter(Boolean))].sort();
            
            setDivisionOptions(divisions);
            setDesignationOptions(designations);
            setLocationOptions(locations);
            
            // Helper to filter and map employees
            const getFilteredOptions = (designations) => {
                const filtered = employees
                    .filter(emp => {
                        const designation = emp.designation || emp.role || emp.position;
                        return designations.includes(designation);
                    })
                    .map(emp => ({
                        name: emp.name,
                        label: `${emp.name} (${emp.employeeId})`
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name));
                
                // Remove duplicates based on name
                return Array.from(new Set(filtered.map(item => item.name)))
                    .map(name => filtered.find(item => item.name === name));
            };
            
            // Appraiser Designations
            const appraiserDesignations = [
                'Managing Director (MD)', 
                'Managing Director MD',
                'General Manager (GM)', 
                'General Manager GM',
                'BRANCH MANAGER', 
                'Sr.Project Manager'
            ];
            setAppraiserOptions(getFilteredOptions(appraiserDesignations));

            // Reviewer Designations
            const reviewerDesignations = ['General Manager (GM)', 'General Manager GM'];
            setReviewerOptions(getFilteredOptions(reviewerDesignations));

            // Director Designations
            const directorDesignations = ['Managing Director (MD)', 'Managing Director MD'];
            setDirectorOptions(getFilteredOptions(directorDesignations));

        } catch (error) {
            console.error("Error fetching employees:", error);
        }
    };
    
    fetchWorkflowUsers();
  }, []);



  useEffect(() => {
    let result = rows;
    
    if (filters.division) {
        result = result.filter(row => row.division === filters.division);
    }
    if (filters.designation) {
        result = result.filter(row => row.designation === filters.designation);
    }
    if (filters.location) {
        result = result.filter(row => row.location === filters.location);
    }
    
    setFilteredRows(result);
  }, [filters, rows]);

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
        ...prev,
        [field]: value
    }));
  };

  const handleDropdownChange = (id, field, value) => {
    setRows(rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  };

  const handleSave = async (id) => {
    try {
        const row = rows.find(r => r.id === id);
        const dataToSave = { 
            appraiser: row.appraiser,
            reviewer: row.reviewer,
            director: row.director
        };
        console.log('Saving workflow for:', dataToSave);
        
        await employeeAPI.updateEmployee(id, dataToSave);
        
        alert(`Workflow saved for ${row.name} successfully!`);
    } catch (error) {
        console.error("Error saving workflow:", error);
        alert("Failed to save workflow. Please try again.");
    }
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

             <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-wrap items-center gap-4">
                <div className="flex flex-col">
                    <label htmlFor="financialYear" className="text-xs font-semibold text-gray-500 mb-1">Financial Year</label>
                    <select
                        id="financialYear"
                        value={selectedFinancialYear}
                        onChange={(e) => setSelectedFinancialYear(e.target.value)}
                        className="block w-40 pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                    >
                        {FINANCIAL_YEARS.map(year => (
                            <option key={year} value={year}>{year}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label htmlFor="division" className="text-xs font-semibold text-gray-500 mb-1">Division</label>
                    <select
                        id="division"
                        value={filters.division}
                        onChange={(e) => handleFilterChange('division', e.target.value)}
                        className="block w-40 pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                    >
                        <option value="">All Divisions</option>
                        {divisionOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label htmlFor="designation" className="text-xs font-semibold text-gray-500 mb-1">Designation</label>
                    <select
                        id="designation"
                        value={filters.designation}
                        onChange={(e) => handleFilterChange('designation', e.target.value)}
                        className="block w-40 pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                    >
                        <option value="">All Designations</option>
                        {designationOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                <div className="flex flex-col">
                    <label htmlFor="location" className="text-xs font-semibold text-gray-500 mb-1">Location</label>
                    <select
                        id="location"
                        value={filters.location}
                        onChange={(e) => handleFilterChange('location', e.target.value)}
                        className="block w-40 pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                    >
                        <option value="">All Locations</option>
                        {locationOptions.map(opt => (
                            <option key={opt} value={opt}>{opt}</option>
                        ))}
                    </select>
                </div>

                {(filters.division || filters.designation || filters.location) && (
                    <div className="flex flex-col justify-end h-full mt-auto pb-1">
                        <button 
                            onClick={() => setFilters({ division: '', designation: '', location: '' })}
                            className="text-sm text-red-600 hover:text-red-800 font-medium underline"
                        >
                            Clear Filters
                        </button>
                    </div>
                )}
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
                                Appraiser
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
                        {filteredRows.map((row, index) => (
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
                                        {appraiserOptions.map(option => (
                                            <option key={option.name} value={option.name}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select 
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                                        value={row.reviewer}
                                        onChange={(e) => handleDropdownChange(row.id, 'reviewer', e.target.value)}
                                    >
                                        <option value="">Select Reviewer</option>
                                        {reviewerOptions.map(option => (
                                            <option key={option.name} value={option.name}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    <select 
                                        className="block w-full pl-3 pr-8 py-2 text-sm border-gray-300 focus:outline-none focus:ring-[#262760] focus:border-[#262760] rounded-md shadow-sm"
                                        value={row.director}
                                        onChange={(e) => handleDropdownChange(row.id, 'director', e.target.value)}
                                    >
                                        <option value="">Select Director</option>
                                        {directorOptions.map(option => (
                                            <option key={option.name} value={option.name}>
                                                {option.label}
                                            </option>
                                        ))}
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