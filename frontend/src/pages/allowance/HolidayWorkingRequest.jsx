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
    const fetchProfile = async () => {
      try {
        const res = await api.get("/employees/me");
        setCurrentUserProfile(res.data);
      } catch (err) {
        console.error("Failed to load user profile:", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [statusFilter]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      let query = "";
      if (statusFilter !== "All") {
        query = `?status=${statusFilter}`;
      }
      const response = await api.get(`/holiday-working-requests${query}`);
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

  const filteredRequests = requests.filter(req => {
    const matchesSearch =
      req.requestId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.reason.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
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
      <div className="flex justify-between items-center mb-6">
        
        {isManagerOrTL && (
          <button
            onClick={handleCreate}
            className="flex items-center px-4 py-2 bg-[#1e2050] text-white rounded-lg hover:bg-[#2c2f6d] transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5 mr-2" />
            Create Request
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row gap-4 justify-between items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
          <div className="flex gap-4">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
            >
              <option value="All">All Status</option>
              <option value="Pending HR Approval">Pending HR Approval</option>
              <option value="Pending General Manager Approval">Pending GM Approval</option>
              <option value="Approved">Approved</option>
              <option value="Attendance Pending">Attendance Pending</option>
              <option value="Completed">Completed</option>
              <option value="Rejected">Rejected</option>
            </select>
            <button 
              onClick={exportToExcel}
              className="flex items-center px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg hover:bg-green-100 transition-colors shadow-sm"
            >
              <Download className="w-4 h-4 mr-2" />
              Excel
            </button>
            <button 
              onClick={exportToPDF}
              className="flex items-center px-4 py-2 bg-red-50 border border-red-200 text-red-700 rounded-lg hover:bg-red-100 transition-colors shadow-sm"
            >
              <FileText className="w-4 h-4 mr-2" />
              PDF
            </button>
          </div>
        </div>

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
