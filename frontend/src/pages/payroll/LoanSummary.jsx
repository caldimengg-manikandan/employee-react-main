import React, { useEffect, useState } from "react";
import { Eye, Download, Trash2, Plus, Edit2, Check, X, User, Calendar, Building, CreditCard, DollarSign, Clock, AlertCircle, Power } from "lucide-react";
import { employeeAPI, loanAPI } from "../../services/api";
import jsPDF from "jspdf";

export default function LoanSummary() {
  const [loans, setLoans] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  // Loan counter not needed if we generate based on count or backend handles it, 
  // but we'll keep it simple and generate on frontend for now.
  const [loanCounter, setLoanCounter] = useState(1);

  /* -------- FILTERS -------- */
  const [filters, setFilters] = useState({
    employeeId: "",
    location: "all",
    division: "all",
    status: "all"
  });

  const locations = ["all", "Chennai", "Hosur"];
  const divisions = ["all", "SDS", "TEKLA", "DAS(Software)", "Mechanical", "Electrical"];
  const statusOptions = ["all", "active", "completed", "on-hold"];

  /* -------- MODALS -------- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const initialForm = {
    employeeId: "",
    employeeName: "",
    amount: "",
    tenureMonths: "",
    startDate: new Date().toISOString().slice(0, 10),
    location: "Chennai",
    division: "SDS",
    status: "active"
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchLoans();
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await employeeAPI.getAllEmployees();
      if (response.data) {
        const data = Array.isArray(response.data) ? response.data : [];
        // Sort employees by employeeId
        const sortedData = data.sort((a, b) => {
          const idA = a.employeeId || "";
          const idB = b.employeeId || "";
          return idA.localeCompare(idB, undefined, { numeric: true, sensitivity: 'base' });
        });
        setEmployees(sortedData);
      }
    } catch (error) {
      console.error("Error fetching employees:", error);
    }
  };

  /* -------- FETCH -------- */
  async function fetchLoans() {
    setLoading(true);
    try {
      const response = await loanAPI.list(filters);
      if (response.data && response.data.success) {
        setLoans(response.data.loans);
        
        // Update counter based on existing loans to avoid ID collision
        if (response.data.loans.length > 0) {
          // Extract numbers from loan IDs (e.g., "LN-005" -> 5)
          const maxId = response.data.loans.reduce((max, loan) => {
            const num = parseInt(loan.loanId?.split('-')[1] || 0);
            return num > max ? num : max;
          }, 0);
          setLoanCounter(maxId + 1);
        }
      }
    } catch (error) {
      console.error("Error fetching loans:", error);
    } finally {
      setLoading(false);
    }
  }

  /* -------- FILTER FUNCTIONS -------- */
  const filteredLoans = loans.filter(loan => {
    if (filters.employeeId && !loan.employeeId.toLowerCase().includes(filters.employeeId.toLowerCase())) {
      return false;
    }
    if (filters.location !== "all" && loan.location !== filters.location) {
      return false;
    }
    if (filters.division !== "all" && loan.division !== filters.division) {
      return false;
    }
    if (filters.status !== "all" && loan.status !== filters.status) {
      return false;
    }
    return true;
  });

  /* -------- HELPERS -------- */
  function calcMonthlyDeduction(loan) {
    if (!loan.amount || !loan.tenureMonths) return 0;
    return Math.round(loan.amount / loan.tenureMonths);
  }

  function remainingBalance(loan) {
    const paid = loan.paidMonths || 0;
    return Math.max(loan.amount - calcMonthlyDeduction(loan) * paid, 0);
  }

  function formatLoanId(counter) {
    return `LN-${counter.toString().padStart(3, '0')}`;
  }

  function isPaymentDue(loan) {
    if (loan.status === "completed") return false;
    const today = new Date();
    const nextDue = new Date(loan.nextDueDate);
    return today > nextDue;
  }

  /* -------- TOGGLE PAYMENT ENABLE/DISABLE -------- */
  async function togglePayment(loanId) { // loanId here corresponds to _id passed from UI
    try {
      const response = await loanAPI.togglePayment(loanId);
      if (response.data && response.data.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === loanId ? response.data.loan : loan
        ));
      }
    } catch (error) {
      console.error("Error toggling payment:", error);
    }
  }

  /* -------- FORM HANDLING -------- */
  function handleChange(e) {
    const { name, value } = e.target;
    
    // Validation logic
    if (name === "amount") {
      if (Number(value) > 1000000) return; // Max 10 Lakhs
    }
    
    if (name === "tenureMonths") {
      if (Number(value) > 60) return; // Max 60 months
    }

    setForm((s) => ({ ...s, [name]: value }));
  }

  const handleEmployeeChange = (e) => {
    const selectedEmpId = e.target.value;
    const selectedEmp = employees.find(emp => emp.employeeId === selectedEmpId);
    
    setForm(prev => ({
      ...prev,
      employeeId: selectedEmpId,
      employeeName: selectedEmp ? selectedEmp.name : "",
      division: selectedEmp ? (selectedEmp.division || "SDS") : prev.division,
      location: selectedEmp ? (selectedEmp.location || "Chennai") : prev.location
    }));
  };

  function handleFilterChange(e) {
    const { name, value } = e.target;
    setFilters((s) => ({ ...s, [name]: value }));
  }

  /* -------- ADD LOAN -------- */
  async function saveLoan(e) {
    e.preventDefault();

    const requiredFields = ['employeeId', 'employeeName', 'amount', 'tenureMonths'];
    const missingFields = requiredFields.filter(field => !form[field]);

    if (missingFields.length > 0) {
      alert(`Please fill all required fields: ${missingFields.join(', ')}`);
      return;
    }

    const newLoanId = formatLoanId(loanCounter);
    
    const payload = {
      loanId: newLoanId,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      amount: Number(form.amount),
      tenureMonths: Number(form.tenureMonths),
      startDate: form.startDate,
      location: form.location,
      division: form.division,
      status: "active",
      paymentEnabled: true
    };

    try {
      const response = await loanAPI.create(payload);
      if (response.data && response.data.success) {
        setLoans((prev) => [response.data.loan, ...prev]);
        setLoanCounter(prev => prev + 1);
        setForm(initialForm);
        setShowAddModal(false);
      }
    } catch (error) {
      console.error("Error creating loan:", error);
      alert("Failed to create loan");
    }
  }

  /* -------- EDIT LOAN -------- */
  function editLoan(loan) {
    setSelectedLoan(loan);
    setForm({
      employeeId: loan.employeeId,
      employeeName: loan.employeeName,
      amount: loan.amount,
      tenureMonths: loan.tenureMonths,
      startDate: loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : "",
      location: loan.location,
      division: loan.division,
      status: loan.status
    });
    setShowEditModal(true);
  }

  async function updateLoan(e) {
    e.preventDefault();

    const updatedLoan = {
      ...selectedLoan,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      amount: Number(form.amount),
      tenureMonths: Number(form.tenureMonths),
      startDate: form.startDate,
      location: form.location,
      division: form.division,
      status: form.status
    };

    try {
      // Use _id for API call
      const response = await loanAPI.update(selectedLoan._id, updatedLoan);
      if (response.data && response.data.success) {
        setLoans(prev => prev.map(loan => 
          loan._id === selectedLoan._id ? response.data.loan : loan
        ));
        
        setShowEditModal(false);
        setSelectedLoan(null);
        setForm(initialForm);
      }
    } catch (error) {
      console.error("Error updating loan:", error);
      alert("Failed to update loan");
    }
  }

  /* -------- ACTIONS -------- */
  function viewLoan(loan) {
    setSelectedLoan(loan);
    setShowViewModal(true);
  }

  function downloadPDF(loan) {
    const doc = new jsPDF();
    
    // Add Company/Title Header
    doc.setFontSize(22);
    doc.setTextColor(38, 39, 96); // #262760
    doc.text("Loan Statement", 105, 20, { align: "center" });
    
    // Add Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 25, 190, 25);
    
    // Reset Font
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    
    let y = 40;
    const lineHeight = 10;
    const leftColX = 20;
    const rightColX = 110;
    
    // Helper to add row
    const addRow = (label, value) => {
      doc.setFont("helvetica", "bold");
      doc.text(label, leftColX, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), leftColX + 40, y);
    };

    // Loan Information
    doc.setFontSize(14);
    doc.setTextColor(38, 39, 96);
    doc.text("Loan Details", leftColX, y);
    y += 10;
    
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);

    const loanId = loan.loanId || loan.id || "N/A";
    
    doc.text("Loan ID:", leftColX, y);
    doc.text(loanId, leftColX + 40, y);
    
    doc.text("Date:", rightColX, y);
    doc.text(new Date().toLocaleDateString(), rightColX + 20, y);
    y += lineHeight;

    doc.text("Employee:", leftColX, y);
    doc.text(`${loan.employeeName} (${loan.employeeId})`, leftColX + 40, y);
    y += lineHeight;

    doc.text("Location:", leftColX, y);
    doc.text(loan.location || "N/A", leftColX + 40, y);
    
    doc.text("Division:", rightColX, y);
    doc.text(loan.division || "N/A", rightColX + 20, y);
    y += lineHeight + 5;

    // Financials Box
    doc.setFillColor(245, 247, 250);
    doc.rect(15, y, 180, 70, "F");
    y += 10;

    doc.text("Loan Amount:", leftColX + 5, y);
    doc.text(`Rs. ${loan.amount}`, leftColX + 45, y);
    
    doc.text("Tenure:", rightColX, y);
    doc.text(`${loan.tenureMonths} months`, rightColX + 25, y);
    y += lineHeight;

    doc.text("Start Date:", leftColX + 5, y);
    doc.text(new Date(loan.startDate).toLocaleDateString(), leftColX + 45, y);
    
    doc.text("Monthly EMI:", rightColX, y);
    doc.text(`Rs. ${calcMonthlyDeduction(loan)}`, rightColX + 25, y);
    y += lineHeight;

    doc.text("Paid Months:", leftColX + 5, y);
    doc.text(String(loan.paidMonths || 0), leftColX + 45, y);
    y += lineHeight;

    doc.setFont("helvetica", "bold");
    doc.text("Remaining Balance:", leftColX + 5, y);
    doc.text(`Rs. ${remainingBalance(loan)}`, leftColX + 45, y);
    doc.setFont("helvetica", "normal");
    y += lineHeight;

    doc.text("Status:", leftColX + 5, y);
    doc.text(loan.status.charAt(0).toUpperCase() + loan.status.slice(1), leftColX + 45, y);
    y += lineHeight + 15;

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("This is a computer generated document.", 105, 280, { align: "center" });

    doc.save(`Loan_${loanId}.pdf`);
  }

  async function deleteLoan(id) {
    if (!window.confirm("Are you sure you want to delete this loan?")) return;
    try {
      const response = await loanAPI.delete(id);
      if (response.data && response.data.success) {
        setLoans((prev) => prev.filter((l) => l._id !== id));
      }
    } catch (error) {
      console.error("Error deleting loan:", error);
      alert("Failed to delete loan");
    }
  }

  function getStatusColor(status) {
    switch(status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'on-hold': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  /* -------- UI -------- */
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <div>
          
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#262760] text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-[#1e1f4d] transition-colors shadow-md"
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      {/* FILTERS */}
      <div className="bg-white p-4 rounded-lg shadow border mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Employee ID</label>
            <input
              type="text"
              name="employeeId"
              value={filters.employeeId}
              onChange={handleFilterChange}
              placeholder="Search by ID..."
              maxLength={10}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Location</label>
            <select
              name="location"
              value={filters.location}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {locations.map(loc => (
                <option key={loc} value={loc}>
                  {loc === "all" ? "All Locations" : loc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Division</label>
            <select
              name="division"
              value={filters.division}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {divisions.map(div => (
                <option key={div} value={div}>
                  {div === "all" ? "All Divisions" : div}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#262760]"
            >
              {statusOptions.map(status => (
                <option key={status} value={status}>
                  {status === "all" ? "All Status" : status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* LOANS TABLE - REMOVED LOAN ID COLUMN */}
      <div className="bg-white shadow rounded-lg overflow-x-auto border">
        <table className="w-full min-w-[1200px]">
          <thead className="bg-gradient-to-r from-[#262760] to-[#3a3b8c] text-white">
            <tr>
              <th className="px-6 py-4">Employee ID</th>
              <th className="px-6 py-4">Employee Name</th>
              <th className="px-6 py-4 text-right">Loan Amount</th>
              <th className="px-6 py-4 text-right">Tenure</th>
              <th className="px-6 py-4 text-right">Monthly EMI</th>
              <th className="px-6 py-4 text-right">Remaining Balance</th>
              <th className="px-6 py-4 text-center">Status</th>
              <th className="px-6 py-4 text-center">Payment</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="9" className="py-10 text-center text-gray-500">
                  <div className="flex justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                  </div>
                </td>
              </tr>
            ) : filteredLoans.map((loan) => {
              const isPaymentAllowed = loan.paymentEnabled && loan.status !== 'completed';
              
              return (
                <tr key={loan._id || loan.id} className="border-t hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="font-medium">{loan.employeeId}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium">{loan.employeeName}</div>
                    <div className="text-xs text-gray-500">
                      {loan.division} | {loan.location}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-semibold">₹{loan.amount.toLocaleString("en-IN")}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <span>{loan.tenureMonths}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="font-medium">₹{calcMonthlyDeduction(loan).toLocaleString("en-IN")}</div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className={`font-bold ${remainingBalance(loan) === 0 ? 'text-green-600' : 'text-[#262760]'}`}>
                      ₹{remainingBalance(loan).toLocaleString("en-IN")}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(loan.status)}`}>
                      {loan.status.charAt(0).toUpperCase() + loan.status.slice(1).replace('-', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex flex-col items-center">
                      {/* Toggle Button */}
                      <button
                        onClick={() => togglePayment(loan._id)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${loan.paymentEnabled ? 'bg-green-500' : 'bg-gray-300'}`}
                        title={loan.paymentEnabled ? "Click to disable payments" : "Click to enable payments"}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${loan.paymentEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                        />
                      </button>
                      
                      {/* Status Text */}
                      <span className={`text-xs mt-1 font-medium ${loan.paymentEnabled ? 'text-green-600' : 'text-red-600'}`}>
                        {loan.paymentEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                      
                      {/* Payment Status Info */}
                      {!isPaymentAllowed && loan.status !== 'completed' && (
                        <span className="text-xs text-gray-500 mt-1">
                          {loan.status === 'on-hold' ? 'Loan on hold' : 'Payments disabled'}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-center gap-2">
                      <button 
                        onClick={() => viewLoan(loan)} 
                        className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="View Details"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={() => editLoan(loan)} 
                        className="p-2 bg-yellow-50 text-yellow-600 hover:bg-yellow-100 rounded-lg"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button 
                        onClick={() => downloadPDF(loan)} 
                        className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg"
                        title="Download PDF"
                      >
                        <Download size={18} />
                      </button>
                      <button 
                        onClick={() => deleteLoan(loan._id)} 
                        className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {!loading && filteredLoans.length === 0 && (
              <tr>
                <td colSpan="9" className="py-10 text-center text-gray-500">
                  <div className="flex flex-col items-center">
                    <AlertCircle size={48} className="text-gray-300 mb-2" />
                    <p className="text-lg">No loans found matching your filters</p>
                    <p className="text-sm text-gray-400 mt-1">Try adjusting your search criteria</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD LOAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={saveLoan}
            className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#262760]">Add New Loan</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <select 
                  name="employeeId" 
                  value={form.employeeId}
                  onChange={handleEmployeeChange}
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                >
                  <option value="">Select Employee</option>
                  {employees.map((emp) => (
                    <option key={emp._id || emp.employeeId} value={emp.employeeId}>
                      {emp.employeeId}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <input 
                  name="employeeName" 
                  value={form.employeeName}
                  readOnly
                  placeholder="Full Name" 
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                <input 
                  name="amount" 
                  type="number" 
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000" 
                  max="1000000"
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenure (Months) *</label>
                <input 
                  name="tenureMonths" 
                  type="number" 
                  value={form.tenureMonths}
                  onChange={handleChange}
                  placeholder="12" 
                  max="60"
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <select 
                  name="location" 
                  value={form.location}
                  onChange={handleChange}
                  disabled
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100 cursor-not-allowed"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Hosur">Hosur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Division</label>
                <select 
                  name="division" 
                  value={form.division}
                  onChange={handleChange}
                  disabled
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760] bg-gray-100 cursor-not-allowed"
                >
                  <option value="SDS">SDS</option>
                  <option value="TEKLA">TEKLA</option>
                  <option value="DAS(Software)">DAS(Software)</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-[#262760]"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => {
                  setShowAddModal(false);
                  setForm(initialForm);
                }} 
                className="border px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-[#262760] text-white px-4 py-2 rounded-lg hover:bg-[#1e1f4d] transition-colors"
              >
                Submit Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* EDIT LOAN MODAL */}
      {showEditModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form
            onSubmit={updateLoan}
            className="bg-white p-6 rounded-lg w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl"
          >
            <h2 className="text-xl font-semibold mb-4 text-[#262760]">Edit Loan - {selectedLoan.id}</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Employee ID *</label>
                <input 
                  name="employeeId" 
                  value={form.employeeId}
                  onChange={handleChange}
                  placeholder="E001" 
                  maxLength={10}
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Employee Name *</label>
                <input 
                  name="employeeName" 
                  value={form.employeeName}
                  onChange={handleChange}
                  placeholder="Full Name" 
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Loan Amount *</label>
                <input 
                  name="amount" 
                  type="number" 
                  value={form.amount}
                  onChange={handleChange}
                  placeholder="50000" 
                  max="1000000"
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tenure (Months) *</label>
                <input 
                  name="tenureMonths" 
                  type="number" 
                  value={form.tenureMonths}
                  onChange={handleChange}
                  placeholder="12" 
                  max="60"
                  className="border p-2 w-full rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <select 
                  name="location" 
                  value={form.location}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="Chennai">Chennai</option>
                  <option value="Hosur">Hosur</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Division</label>
                <select 
                  name="division" 
                  value={form.division}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="SDS">SDS</option>
                  <option value="TEKLA">TEKLA</option>
                  <option value="DAS(Software)">DAS(Software)</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Electrical">Electrical</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Start Date</label>
                <input 
                  name="startDate" 
                  type="date" 
                  value={form.startDate}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Status</label>
                <select 
                  name="status" 
                  value={form.status}
                  onChange={handleChange}
                  className="border p-2 w-full rounded-lg"
                >
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="on-hold">On Hold</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <button 
                type="button" 
                onClick={() => {
                  setShowEditModal(false);
                  setSelectedLoan(null);
                  setForm(initialForm);
                }} 
                className="border px-4 py-2 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="bg-[#262760] text-white px-4 py-2 rounded-lg hover:bg-[#1e1f4d]"
              >
                Update Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-[#262760] to-[#3a3b8c] text-white p-6">
              <h2 className="text-2xl font-semibold mb-2">Loan Details</h2>
              <p className="text-blue-100">Complete information about the loan</p>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Employee Details Card */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-5 border border-blue-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <User className="text-blue-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-blue-900">Employee Details</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Employee ID:</span>
                      <span className="font-semibold text-blue-900">{selectedLoan.employeeId}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Full Name:</span>
                      <span className="font-semibold text-blue-900">{selectedLoan.employeeName}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Location:</span>
                      <div className="flex items-center gap-2">
                        <Building size={14} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.location}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Division:</span>
                      <span className="font-semibold bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                        {selectedLoan.division}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Loan ID:</span>
                      <span className="font-bold text-[#262760]">{selectedLoan.id}</span>
                    </div>
                  </div>
                </div>

                {/* Loan Details Card */}
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-5 border border-green-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-green-100 p-2 rounded-lg">
                      <CreditCard className="text-green-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-green-900">Loan Details</h3>
                  </div>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Total Amount:</span>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-green-600" />
                        <span className="font-bold text-lg text-green-900">
                          ₹{selectedLoan.amount.toLocaleString("en-IN")}
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Tenure:</span>
                      <div className="flex items-center gap-2">
                        <Clock size={14} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.tenureMonths} months</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Start Date:</span>
                      <div className="flex items-center gap-2">
                        <Calendar size={14} className="text-gray-400" />
                        <span className="font-semibold">{selectedLoan.startDate}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Monthly EMI:</span>
                      <span className="font-bold text-green-900">
                        ₹{calcMonthlyDeduction(selectedLoan).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Paid Months:</span>
                      <span className="font-semibold text-green-900">{selectedLoan.paidMonths}</span>
                    </div>
                  </div>
                </div>

                {/* Payment Status Card */}
                <div className="md:col-span-2 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-purple-100 p-2 rounded-lg">
                      <Power className="text-purple-600" size={24} />
                    </div>
                    <h3 className="text-xl font-semibold text-purple-900">Payment Status</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Remaining Balance</div>
                      <div className="text-2xl font-bold text-[#262760]">
                        ₹{remainingBalance(selectedLoan).toLocaleString("en-IN")}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Status</div>
                      <div className={`inline-block px-4 py-1 rounded-full font-semibold ${getStatusColor(selectedLoan.status)}`}>
                        {selectedLoan.status.charAt(0).toUpperCase() + selectedLoan.status.slice(1).replace('-', ' ')}
                      </div>
                    </div>
                    <div className="bg-white p-4 rounded-lg shadow-sm">
                      <div className="text-sm text-gray-500 mb-1">Payment Status</div>
                      <div className="flex items-center gap-2">
                        <div className={`relative inline-flex h-6 w-11 items-center rounded-full ${selectedLoan.paymentEnabled ? 'bg-green-500' : 'bg-red-500'}`}>
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedLoan.paymentEnabled ? 'translate-x-6' : 'translate-x-1'}`}
                          />
                        </div>
                        <span className={`font-semibold ${selectedLoan.paymentEnabled ? 'text-green-600' : 'text-red-600'}`}>
                          {selectedLoan.paymentEnabled ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm text-gray-600 mb-2">
                      <span>Payment Progress</span>
                      <span>{selectedLoan.paidMonths} of {selectedLoan.tenureMonths} months</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className="bg-gradient-to-r from-green-500 to-emerald-500 h-3 rounded-full transition-all duration-500"
                        style={{ width: `${(selectedLoan.paidMonths / selectedLoan.tenureMonths) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t p-4 flex justify-end">
              <button 
                onClick={() => setShowViewModal(false)} 
                className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e1f4d] transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}