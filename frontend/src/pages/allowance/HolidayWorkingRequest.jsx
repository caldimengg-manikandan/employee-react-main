import React, { useState, useEffect } from "react";
import { Plus, Search, Filter, Eye, Download, FileText, Edit, Trash2, Check, X, ClipboardCheck } from "lucide-react";
import api from "../../services/api";
import HolidayWorkingRequestForm from "../../components/Forms/HolidayWorkingRequestForm";
import HolidayRequestDetailsModal from "../../components/Modals/HolidayRequestDetailsModal";
import HolidayWorkingAttendanceVerificationModal from "../../components/Modals/HolidayWorkingAttendanceVerificationModal";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const HolidayWorkingRequest = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [divisionFilter, setDivisionFilter] = useState("All");
  const [monthFilter, setMonthFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [locationFilter, setLocationFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);
  const [employeeLocations, setEmployeeLocations] = useState([]);

  const monthsList = [
    { value: "All", label: "All Months" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March" },
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December" }
  ];

  const availableYears = React.useMemo(() => {
    const currentYr = new Date().getFullYear();
    const yearsSet = new Set([currentYr, currentYr - 1, currentYr + 1]);
    requests.forEach(r => {
      if (r.workingDate) {
        const d = new Date(r.workingDate);
        if (!isNaN(d.getTime())) {
          yearsSet.add(d.getFullYear());
        }
      }
    });
    return Array.from(yearsSet).sort((a, b) => b - a);
  }, [requests]);

  const uniqueLocations = React.useMemo(() => {
    const reqLocs = requests.flatMap(r => (r.employees || []).map(e => e.location || e.branch)).filter(Boolean);
    const set = new Set([...employeeLocations, ...reqLocs]);
    return Array.from(set).sort();
  }, [employeeLocations, requests]);

  const activeFilterCount = [
    statusFilter !== "All",
    divisionFilter !== "All",
    monthFilter !== "All",
    yearFilter !== "All",
    locationFilter !== "All"
  ].filter(Boolean).length;

  const handleClearFilters = () => {
    setStatusFilter("All");
    setDivisionFilter("All");
    setMonthFilter("All");
    setYearFilter("All");
    setLocationFilter("All");
    setSearchQuery("");
  };

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isVerifyOpen, setIsVerifyOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [actionLoading, setActionLoading] = useState({});

  const handleVerify = (request) => {
    setSelectedRequest(request);
    setIsVerifyOpen(true);
  };

  const [currentUserProfile, setCurrentUserProfile] = useState(null);

  const user = JSON.parse(sessionStorage.getItem("user") || "{}");
  const userRole = user.role?.toLowerCase() || "";
  const isAdmin = userRole === "admin";
  const isHR = ["hr", "admin"].includes(userRole);
  const isGM = ["manager", "director"].includes(userRole);

  const userDesignation = (currentUserProfile?.designation || "").trim().toLowerCase();
  const allowedDesignations = [
    "team lead",
    "sr. team lead",
    "sr team lead",
    "assistant project manager",
    "asst project manager"
  ];
  
  const isAllowedToCreate = allowedDesignations.includes(userDesignation) || isAdmin;
  const isManagerOrTL = isAllowedToCreate;
  const canEditDelete = isAllowedToCreate || isAdmin;

  useEffect(() => {
    const fetchProfileAndLocations = async () => {
      try {
        const [profRes, empRes] = await Promise.all([
          api.get("/employees/me").catch(() => null),
          api.get("/employees").catch(() => null)
        ]);
        if (profRes && profRes.data) {
          setCurrentUserProfile(profRes.data);
        }
        if (empRes && empRes.data) {
          const emps = Array.isArray(empRes.data) ? empRes.data : (empRes.data.data || []);
          const locs = Array.from(new Set(emps.map(e => e.location || e.branch).filter(Boolean))).sort();
          setEmployeeLocations(locs);
        }
      } catch (err) {
        console.error("Failed to load user profile or locations:", err);
      }
    };
    fetchProfileAndLocations();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter, monthFilter, yearFilter, locationFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== "All") params.append("status", statusFilter);
      if (monthFilter !== "All") params.append("month", monthFilter);
      if (yearFilter !== "All") params.append("year", yearFilter);
      if (locationFilter !== "All") params.append("location", locationFilter);

      const queryString = params.toString() ? `?${params.toString()}` : "";
      const response = await api.get(`/holiday-working-requests${queryString}`);
      if (response.data.success) {
        setRequests(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setSelectedRequest(null);
    setIsFormOpen(true);
  };

  const handleEdit = (request) => {
    setSelectedRequest(request);
    setIsFormOpen(true);
  };

  const handleView = (request) => {
    setSelectedRequest(request);
    setIsDetailsOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this request?")) {
      try {
        const response = await api.delete(`/holiday-working-requests/${id}`);
        if (response.data.success) {
          fetchRequests();
        }
      } catch (error) {
        console.error("Error deleting request:", error);
        alert(error.response?.data?.message || "Failed to delete request");
      }
    }
  };

  const handleQuickApprove = async (request) => {
    if (actionLoading[request._id]) return;
    if (window.confirm(`Are you sure you want to approve request ${request.requestId}?`)) {
      try {
        setActionLoading(prev => ({ ...prev, [request._id]: true }));
        const nextStatus = request.status === "Pending HR Approval" ? "Pending General Manager Approval" : "Approved";
        const response = await api.put(`/holiday-working-requests/${request._id}/status`, {
          status: nextStatus,
          remarks: "Approved from request list"
        });
        if (response.data.success) {
          fetchRequests();
        }
      } catch (error) {
        console.error("Error approving request:", error);
        alert(error.response?.data?.message || "Failed to approve request");
      } finally {
        setActionLoading(prev => ({ ...prev, [request._id]: false }));
      }
    }
  };

  const handleQuickReject = async (request) => {
    if (actionLoading[request._id]) return;
    if (window.confirm(`Are you sure you want to reject request ${request.requestId}?`)) {
      try {
        setActionLoading(prev => ({ ...prev, [request._id]: true }));
        const response = await api.put(`/holiday-working-requests/${request._id}/status`, {
          status: "Rejected",
          remarks: "Rejected from request list"
        });
        if (response.data.success) {
          fetchRequests();
        }
      } catch (error) {
        console.error("Error rejecting request:", error);
        alert(error.response?.data?.message || "Failed to reject request");
      } finally {
        setActionLoading(prev => ({ ...prev, [request._id]: false }));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "Approved": return "bg-green-100 text-green-800 border-green-200";
      case "Rejected": return "bg-red-100 text-red-800 border-red-200";
      case "Pending HR Approval": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "Pending General Manager Approval": return "bg-blue-100 text-blue-800 border-blue-200";
      case "Attendance Pending": return "bg-amber-100 text-amber-800 border-amber-200";
      case "Attendance Verified": return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "Completed": return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const uniqueDivisions = Array.from(
    new Set(requests.map(r => r.division).filter(Boolean))
  ).sort();

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.projectName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.reason || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (req.createdByName || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesDivision =
      divisionFilter === "All" || req.division === divisionFilter;

    let matchesMonth = true;
    let matchesYear = true;

    if (req.workingDate) {
      const wDate = new Date(req.workingDate);
      if (!isNaN(wDate.getTime())) {
        if (monthFilter !== "All") {
          matchesMonth = (wDate.getMonth() + 1) === parseInt(monthFilter, 10);
        }
        if (yearFilter !== "All") {
          matchesYear = wDate.getFullYear() === parseInt(yearFilter, 10);
        }
      }
    }

    let matchesLocation = true;
    if (locationFilter !== "All") {
      const locTarget = locationFilter.toLowerCase();
      const hasEmpLoc = (req.employees || []).some(e => String(e.location || e.branch || '').toLowerCase() === locTarget);
      const hasReqLoc = String(req.location || '').toLowerCase() === locTarget;
      matchesLocation = hasEmpLoc || hasReqLoc;
    }

    return matchesSearch && matchesDivision && matchesMonth && matchesYear && matchesLocation;
  });

  const exportToExcel = () => {
    if (filteredRequests.length === 0) {
      alert("No data available to export.");
      return;
    }
    
    const exportData = filteredRequests.map((req, index) => ({
      "S.no": index + 1,
      "Request ID": req.requestId,
      "Date": new Date(req.workingDate).toLocaleDateString(),
      "Type": req.holidayType,
      "Division": req.division || "N/A",
      "Projects": req.projectName || "N/A",
      "Created By": req.createdByName || "N/A",
      "Status": req.status,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Requests");
    XLSX.writeFile(workbook, "Holiday_Working_Requests.xlsx");
  };

  const exportToPDF = () => {
    if (filteredRequests.length === 0) {
      alert("No data available to export.");
      return;
    }

    const doc = new jsPDF("landscape");
    doc.text("Holiday Working Requests", 14, 15);

    const tableColumn = ["S.no", "Request ID", "Date", "Type", "Division", "Projects", "Created By", "Status"];
    const tableRows = [];

    filteredRequests.forEach((req, index) => {
      const rowData = [
        index + 1,
        req.requestId,
        new Date(req.workingDate).toLocaleDateString(),
        req.holidayType,
        req.division || "N/A",
        req.projectName || "N/A",
        req.createdByName || "N/A",
        req.status
      ];
      tableRows.push(rowData);
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 20,
      theme: "grid",
      styles: { fontSize: 9 },
      headStyles: { fillColor: [30, 32, 80] },
    });

    doc.save("Holiday_Working_Requests.pdf");
  };

  return (
    <div className="p-6 w-full">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 border rounded-lg transition-colors text-sm font-medium cursor-pointer ${
                showFilters || activeFilterCount > 0
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700 font-semibold'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-indigo-600 text-white font-bold rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
            {isManagerOrTL && (
              <button
                onClick={handleCreate}
                className="flex items-center px-4 py-2 bg-[#1e2050] text-white rounded-lg hover:bg-[#2c2f6d] transition-colors shadow-sm text-sm font-semibold whitespace-nowrap cursor-pointer"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Create Request
              </button>
            )}
            <button 
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm text-sm font-medium"
            >
              <Download className="w-4 h-4 mr-1.5" />
              Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors shadow-sm text-sm font-medium"
            >
              <FileText className="w-4 h-4 mr-1.5" />
              PDF
            </button>
          </div>
        </div>

        {/* Collapsible Filter Panel */}
        {showFilters && (
          <div className="p-4 bg-indigo-50/50 border-b border-gray-200 transition-all duration-200">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Filter Requests
              </h4>
              {activeFilterCount > 0 && (
                <button
                  onClick={handleClearFilters}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer underline"
                >
                  Clear All Filters
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {/* Location Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Location</label>
                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs font-medium"
                >
                  <option value="All">All Locations</option>
                  {uniqueLocations.map(loc => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              {/* Division Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Division</label>
                <select
                  value={divisionFilter}
                  onChange={(e) => setDivisionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs font-medium"
                >
                  <option value="All">All Divisions</option>
                  {uniqueDivisions.map(div => (
                    <option key={div} value={div}>{div}</option>
                  ))}
                </select>
              </div>
              {/* Month Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Month</label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs font-medium"
                >
                  {monthsList.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              {/* Year Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Year</label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs font-medium"
                >
                  <option value="All">All Years</option>
                  {availableYears.map(yr => (
                    <option key={yr} value={yr}>{yr}</option>
                  ))}
                </select>
              </div>
              {/* Status Filter */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-xs font-medium"
                >
                  <option value="All">All Status</option>
                  <option value="Pending HR Approval">Pending HR Approval</option>
                  <option value="Pending General Manager Approval">Pending GM Approval</option>
                  <option value="Approved">Approved</option>
                  <option value="Attendance Pending">Attendance Pending</option>
                  <option value="Attendance Verified">Attendance Verified</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                </select>
              </div>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-[#1e2050] text-white text-sm">
              <tr>
                <th className="py-3 px-6 font-medium">S.no</th>
                <th className="py-3 px-6 font-medium">Request ID</th>
                <th className="py-3 px-6 font-medium">Date</th>
                <th className="py-3 px-6 font-medium">Type</th>
                <th className="py-3 px-6 font-medium">Division</th>
                <th className="py-3 px-6 font-medium">Projects</th>
                <th className="py-3 px-6 font-medium">Created By</th>
                <th className="py-3 px-6 font-medium">Status</th>
                <th className="py-3 px-6 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                      <span className="ml-2">Loading requests...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-8 text-center text-gray-500">
                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-lg font-medium text-gray-900">No requests found</p>
                    <p className="text-sm">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filteredRequests.map((req, index) => (
                  <tr key={req._id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {index + 1}
                    </td>
                    <td className="py-4 px-6 text-sm font-medium text-indigo-600">
                      {req.requestId}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {new Date(req.workingDate).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-500">
                      {req.holidayType}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {req.division || "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {req.projectName || "N/A"}
                    </td>
                    <td className="py-4 px-6 text-sm text-gray-900">
                      {req.createdByName || "N/A"}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(req.status)}`}>
                        {req.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleView(req)}
                          className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        {(req.status === "Attendance Pending" || req.status === "Approved") && isHR && (
                          <button
                            onClick={() => handleVerify(req)}
                            className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                            title="Verify Attendance"
                          >
                            <ClipboardCheck className="w-5 h-5" />
                          </button>
                        )}
                        {((req.status === "Pending HR Approval" && isHR) ||
                          (req.status === "Pending General Manager Approval" && isGM)) && (
                            <>
                              <button
                                onClick={() => handleQuickApprove(req)}
                                disabled={actionLoading[req._id]}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Approve Request"
                              >
                                <Check className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleQuickReject(req)}
                                disabled={actionLoading[req._id]}
                                className="p-2 text-gray-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-50"
                                title="Reject Request"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </>
                          )}
                        {canEditDelete && req.status === "Pending HR Approval" && (
                          <>
                            <button
                              onClick={() => handleEdit(req)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit Request"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => handleDelete(req._id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Delete Request"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isFormOpen && (
        <HolidayWorkingRequestForm
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          onSuccess={() => {
            setIsFormOpen(false);
            fetchRequests();
          }}
          initialData={selectedRequest}
        />
      )}

      {isDetailsOpen && (
        <HolidayRequestDetailsModal
          isOpen={isDetailsOpen}
          onClose={() => setIsDetailsOpen(false)}
          request={selectedRequest}
          onStatusChange={() => {
            setIsDetailsOpen(false);
            fetchRequests();
          }}
        />
      )}

      {isVerifyOpen && (
        <HolidayWorkingAttendanceVerificationModal
          isOpen={isVerifyOpen}
          onClose={() => setIsVerifyOpen(false)}
          request={selectedRequest}
          onSuccess={() => {
            setIsVerifyOpen(false);
            fetchRequests();
          }}
        />
      )}
    </div>
  );
};

export default HolidayWorkingRequest;
