import React, { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

// --- Custom hook to get window size ---
const useWindowSize = () => {
    const [windowSize, setWindowSize] = useState({
        width: undefined,
        height: undefined,
    });

    useEffect(() => {
        function handleResize() {
            setWindowSize({
                width: window.innerWidth,
                height: window.innerHeight,
            });
        }
        
        window.addEventListener("resize", handleResize);
        handleResize(); // Set initial size
        
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    return windowSize;
};


// --- Custom component for Y-Axis ticks with word wrapping ---
const CustomizedYAxisTick = (props) => {
    const { x, y, payload } = props;
    const { value } = payload;
    const words = value.split(' ');
    const maxLines = 3;
    let currentLine = '';
    const lines = [];

    words.forEach((word) => {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (testLine.length > 20 && currentLine) {
            lines.push(currentLine);
            currentLine = word;
        } else {
            currentLine = testLine;
        }
    });
    lines.push(currentLine);

    const displayedLines = lines.slice(0, maxLines);
    if (lines.length > maxLines) {
        displayedLines[maxLines - 1] += '...';
    }
    
    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={0} textAnchor="end" fill="#666" fontSize={12}>
                {displayedLines.map((line, index) => (
                    <tspan x={0} dy={index === 0 ? 0 : 15} key={index}>
                        {line}
                    </tspan>
                ))}
            </text>
        </g>
    );
};

// --- Main Dashboard Component ---
const ProjectDashboard = () => {
    // --- STATE MANAGEMENT ---
    const [kpis, setKpis] = React.useState({ totalProjects: 0, completedProjects: 0, inProgressProjects: 0 });
    const [dropdowns, setDropdowns] = React.useState({ projects: [], items: [] });
    const [selectedProject, setSelectedProject] = React.useState('');
    const [selectedItem, setSelectedItem] = React.useState('');
    const [chartData, setChartData] = React.useState([]);
    const [infoData, setInfoData] = React.useState(null);
    const [chartTitle, setChartTitle] = React.useState('Overview');
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState('');
    const [initialLoading, setInitialLoading] = React.useState(true);
    const [showHistoryModal, setShowHistoryModal] = React.useState(false);
    const [projectHistory, setProjectHistory] = React.useState([]);
    const [historyLoading, setHistoryLoading] = React.useState(false);


    // --- CONSTANTS ---
    const API_BASE_URL = 'http://192.168.1.15:5003/api/dashboard';
    const COLORS = [
    '#93c5fd', '#fdba74', '#86efac', '#fca5a5', '#d8b4fe', '#f9a8d4', '#67e8f9', '#fde047',
    '#a5b4fc', '#fb923c', '#6ee7b7', '#f87171', '#c4b5fd', '#f0abfc', '#67e8f9', '#fcd34d'
];
    const PIE_CHART_LIMIT = 100;

    // Special colors for Quantity Comparison
    const QUANTITY_COLORS = {
        'Consumed Quantity': '#f97316',
        'Remaining Quantity': '#2563eb'
    };

    // --- DATA FETCHING HOOKS ---
    React.useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setInitialLoading(true);
                const token = sessionStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const [kpisRes, dropdownsRes] = await Promise.all([
                    fetch(`${API_BASE_URL}/kpis`, { headers }),
                    fetch(`${API_BASE_URL}/dropdowns`, { headers })
                ]);
                if (!kpisRes.ok || !dropdownsRes.ok) throw new Error('Failed to fetch initial data');
                const kpisData = await kpisRes.json();
                const dropdownsData = await dropdownsRes.json();
                setKpis(kpisData);
                setDropdowns(dropdownsData);
            } catch (err) {
                setError(err.message);
                console.error("Error fetching initial data:", err);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    React.useEffect(() => {
        const fetchDashboardData = async () => {
            if (initialLoading) return;
            setLoading(true);
            setError('');
            const params = new URLSearchParams();
            if (selectedProject) params.append('project', selectedProject);
            if (selectedItem) params.append('item', selectedItem);
            try {
                const token = sessionStorage.getItem('token');
                const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
                const response = await fetch(`${API_BASE_URL}/data?${params.toString()}`, { headers });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const data = await response.json();
                setChartData(data.chartData || []);
                setInfoData(data.infoData || null);
                setChartTitle(data.chartTitle || 'Overview');
            } catch (err) {
                setError('Could not fetch dashboard data.');
                console.error("Error fetching dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, [selectedProject, selectedItem, initialLoading]);

    // --- EVENT HANDLERS ---
    const handleProjectChange = (e) => setSelectedProject(e.target.value);
    const handleItemChange = (e) => setSelectedItem(e.target.value);
    const clearFilters = () => {
        setSelectedProject('');
        setSelectedItem('');
    };
    
    const handleTotalProjectsClick = async () => {
        setHistoryLoading(true);
        setShowHistoryModal(true);
        try {
            const token = sessionStorage.getItem('token');
            const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
            const response = await fetch(`${API_BASE_URL}/projects`, { headers });
            if (!response.ok) throw new Error('Failed to fetch project history');
            const data = await response.json();
            setProjectHistory(data);
        } catch (err) {
            console.error("Error fetching project history:", err);
            setProjectHistory([]); // Clear previous data on error
        } finally {
            setHistoryLoading(false);
        }
    };

    // --- CHILD COMPONENTS & HELPERS ---
    const KpiCard = React.memo(({ title, value, color, icon, onClick }) => (
        <div onClick={onClick} className={`bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 flex-1 transform hover:-translate-y-1 ${onClick ? 'cursor-pointer' : ''}`}>
            <div className="flex items-center">
                <div className={`p-3 rounded-full mr-4 ${color.bg}`}>{icon}</div>
                <div>
                    <h3 className="text-lg font-semibold text-gray-500">{title}</h3>
                    <p className={`text-3xl font-bold ${color.text}`}>{value}</p>
                </div>
            </div>
        </div>
    ));

    const CustomTooltipContent = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const name = label || payload[0].payload.name;
            const value = payload[0].value;
            return (
                <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-xl text-sm">
                    <p className="font-bold text-gray-800">{name}</p>
                    <p className="text-indigo-600">{`Quantity: ${value}`}</p>
                </div>
            );
        }
        return null;
    };

    const InfoBoxContent = () => {
        if (!infoData) return <p className="text-gray-500">No details to display.</p>;
        const { type, details } = infoData;
        switch (type) {
            case 'project':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">{details?.projectName || 'Project Details'}</h3>
                        <p><span className="font-semibold">Status:</span> <span className={`capitalize font-medium ${details?.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`}>{details?.status?.replace('_', ' ') || 'N/A'}</span></p>
                        <p><span className="font-semibold">Remarks:</span> {details?.remarks || 'None'}</p>
                    </div>
                );
            case 'item':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">Item: {details?.name}</h3>
                        <p className="font-semibold mb-1">Used in projects:</p>
                        <ul className="list-disc list-inside ml-4 text-sm">
                            {details?.usage?.length > 0 ? details.usage.map((use, i) => (
                                <li key={i}>{use.construction} ({use.activeQuantity} units)</li>
                            )) : <li>No projects found.</li>}
                        </ul>
                    </div>
                );
            case 'specific':
                return (
                    <div>
                        <h3 className="text-xl font-bold mb-2 text-indigo-700">Specific Details</h3>
                        <p><span className="font-semibold">Project:</span> {details?.construction}</p>
                        <p><span className="font-semibold">Item:</span> {details?.itemDescription}</p>
                        <p><span className="font-semibold">Total Quantity (All Projects):</span> {details?.totalQuantity}</p>
                        <p><span className="font-semibold">Consumed Quantity (This Project):</span> {details?.consumedQuantity || 0}</p>
                        <p><span className="font-semibold">Status:</span> {details?.status}</p>
                        <p><span className="font-semibold">Comment:</span> {details?.comment || 'None'}</p>
                    </div>
                );
            default:
                return <p className="text-gray-600">{details?.message || "Select a filter to view details."}</p>;
        }
    };
    
    const ProjectHistoryModal = () => (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 pb-4 border-b">
                    <h2 className="text-2xl font-bold text-gray-800">All Projects</h2>
                    <button
                        onClick={() => setShowHistoryModal(false)}
                        className="text-gray-500 hover:text-gray-800 p-1 rounded-full hover:bg-gray-100 transition-colors"
                    >
                        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="flex-grow overflow-y-auto">
                    {historyLoading ? (
                        <div className="flex justify-center items-center h-full">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : projectHistory.length > 0 ? (
                        <table className="w-full text-left table-auto">
                            <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600 w-16">S.No</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Project</th>
                                    <th className="px-4 py-3 text-sm font-semibold text-gray-600">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {projectHistory.map((proj, index) => (
                                    <tr key={proj._id || index} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 text-sm text-gray-500">{index + 1}</td>
                                        <td className="px-4 py-3 text-sm text-gray-800 font-medium">{proj.projectName}</td>
                                        <td className="px-4 py-3 text-sm">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${proj.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                {proj.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-center text-gray-500 mt-8">No project history found.</p>
                    )}
                </div>
            </div>
        </div>
    );

    // Helper to determine if chart is showing a quantity comparison
    const isQuantityComparison = () => {
        return chartData.some(item => 
            item.name === 'Consumed Quantity' || item.name === 'Remaining Quantity'
        );
    };

    // --- Chart rendering component ---
    const RenderChart = () => {
        const { width } = useWindowSize();
        const isMobile = width < 768; // Mobile breakpoint

        const isComparison = isQuantityComparison();
        
        // Use bar chart for large datasets (except for quantity comparison)
        if (chartData.length > PIE_CHART_LIMIT && !isComparison) {
            const barHeight = 60;
            const chartHeight = barHeight * chartData.length;
            return (
                <ResponsiveContainer width="100%" height={chartHeight}>
                    <BarChart
                        layout="vertical"
                        data={chartData}
                        margin={{ top: 5, right: 30, left: 100, bottom: 20 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis
                            dataKey="name"
                            type="category"
                            width={150}
                            tick={<CustomizedYAxisTick />}
                            interval={0}
                        />
                        <Tooltip content={<CustomTooltipContent />} cursor={{ fill: '#f3f4f6' }} />
                        <Bar dataKey="value" barSize={25}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            );
        }

        // Use pie chart for smaller datasets and quantity comparison
        return (
            <ResponsiveContainer width="100%" height={isMobile ? 500 : 400}>
                <PieChart>
                    <Pie
                        data={chartData}
                        dataKey="value"
                        nameKey="name"
                        cx={isMobile ? "50%" : "40%"} // Center pie on mobile
                        cy="50%"
                        outerRadius={120}
                        innerRadius={50}
                        label={null}
                        labelLine={false}
                    >
                        {chartData.map((entry, index) => {
                            const fillColor = isComparison && QUANTITY_COLORS[entry.name] 
                                ? QUANTITY_COLORS[entry.name] 
                                : COLORS[index % COLORS.length];
                            return (
                                <Cell key={`cell-${index}`} fill={fillColor} />
                            );
                        })}
                    </Pie>
                    <Tooltip content={<CustomTooltipContent />} />
                    <Legend
                        layout={isMobile ? "horizontal" : "vertical"}
                        verticalAlign={isMobile ? "bottom" : "middle"}
                        align={isMobile ? "center" : "right"}
                        iconType="square"
                        wrapperStyle={{
                            paddingLeft: isMobile ? 0 : '20px',
                            paddingTop: isMobile ? '20px' : 0,
                            maxHeight: '350px',
                            overflowY: 'auto'
                        }}
                        formatter={(value, entry) => {
                            const { value: quantity } = entry.payload;
                            const label = `${value}: ${quantity}`;
                            
                            // Truncate long labels on mobile
                            if (isMobile && label.length > 30) {
                                return (
                                    <span className="text-gray-700 text-sm">
                                        {`${label.substring(0, 27)}...`}
                                    </span>
                                );
                            }
                            return (
                                <span className="text-gray-700 text-sm">{label}</span>
                            );
                        }}
                    />
                </PieChart>
            </ResponsiveContainer>
        );
    };

    // --- RENDER ---
    return (
        <div className="bg-gray-50 min-h-screen p-4 sm:p-8 font-sans h-full">
            <div className="max-w-7xl mx-auto h-full">
                {initialLoading ? (
                    <div className="flex justify-center items-center h-64">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                    </div>
                ) : error && !chartData.length ? (
                    <div className="text-center p-10 bg-red-50 rounded-lg">
                        <p className="text-red-600">{error}</p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                            <KpiCard title="Total Projects" value={kpis.totalProjects} color={{ bg: 'bg-blue-50', text: 'text-blue-600' }} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m-1 4h1m5-8h1m-1 4h1m-1 4h1M5 21V5a2 2 0 012-2h10a2 2 0 012 2v16" /></svg>} onClick={handleTotalProjectsClick} />
                            <KpiCard title="Completed" value={kpis.completedProjects} color={{ bg: 'bg-green-50', text: 'text-green-600' }} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                            <KpiCard title="In Progress" value={kpis.inProgressProjects} color={{ bg: 'bg-yellow-50', text: 'text-yellow-600' }} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} />
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-md mb-8 flex flex-wrap items-center gap-4">
                            <h3 className="text-xl font-bold text-gray-800 mr-4">Filters</h3>
                            <div className="flex-grow">
                                <select value={selectedProject} onChange={handleProjectChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="">-- Select a Project --</option>
                                    {dropdowns.projects.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            <div className="flex-grow">
                                <select value={selectedItem} onChange={handleItemChange} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                                    <option value="">-- Select an Item --</option>
                                    {dropdowns.items.map(i => <option key={i} value={i}>{i}</option>)}
                                </select>
                            </div>
                            <button onClick={clearFilters} className="bg-gray-700 text-white px-5 py-2 rounded-lg hover:bg-gray-800 font-semibold shadow-sm">Clear Filters</button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
                            <div className={`${infoData && !loading ? 'lg:col-span-3' : 'lg:col-span-5'} bg-white p-6 rounded-xl shadow-md`}>
                                <h2 className="text-2xl font-bold text-gray-800 mb-4">{chartTitle}</h2>
                                {loading ? (
                                    <div className="flex justify-center items-center h-full"><p>Loading...</p></div>
                                ) : chartData.length > 0 ? (
                                    <RenderChart />
                                ) : (
                                    <div className="flex justify-center items-center h-full"><p>No data available.</p></div>
                                )}
                            </div>
                            
                            {infoData && !loading && (
                                <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4">Information</h2>
                                    <InfoBoxContent />
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
            {showHistoryModal && <ProjectHistoryModal />}
        </div>
    );
};

export default ProjectDashboard;