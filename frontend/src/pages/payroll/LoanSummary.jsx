import React, { useEffect, useState } from "react";
import { Eye, Download, Trash2, Plus } from "lucide-react";

export default function LoanSummary() {
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);

  /* -------- MODALS -------- */
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);

  const initialForm = {
    employeeId: "",
    employeeName: "",
    amount: "",
    tenureMonths: "",
    startDate: "",
  };

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    fetchLoans();
  }, []);

  /* -------- FETCH (DEMO) -------- */
  function fetchLoans() {
    setLoading(true);
    setTimeout(() => {
      setLoans([
        {
          id: "LN-1001",
          employeeId: "E001",
          employeeName: "Ravi Kumar",
          amount: 50000,
          tenureMonths: 10,
          startDate: "2025-06-01",
          paidMonths: 3,
        },
        {
          id: "LN-1002",
          employeeId: "E008",
          employeeName: "Meena S",
          amount: 120000,
          tenureMonths: 12,
          startDate: "2025-01-01",
          paidMonths: 6,
        },
      ]);
      setLoading(false);
    }, 400);
  }

  /* -------- HELPERS -------- */
  function calcMonthlyDeduction(loan) {
    if (!loan.amount || !loan.tenureMonths) return 0;
    return Math.round(loan.amount / loan.tenureMonths);
  }

  function remainingBalance(loan) {
    const paid = loan.paidMonths || 0;
    return Math.max(
      loan.amount - calcMonthlyDeduction(loan) * paid,
      0
    );
  }

  /* -------- ADD LOAN -------- */
  function handleChange(e) {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  }

  function saveLoan(e) {
    e.preventDefault();

    if (!form.employeeId || !form.employeeName || !form.amount || !form.tenureMonths) {
      alert("Please fill all required fields");
      return;
    }

    const payload = {
      id: `LN-${Math.floor(Math.random() * 9000) + 1000}`,
      employeeId: form.employeeId,
      employeeName: form.employeeName,
      amount: Number(form.amount),
      tenureMonths: Number(form.tenureMonths),
      startDate: form.startDate || new Date().toISOString().slice(0, 10),
      paidMonths: 0,
    };

    setLoans((prev) => [payload, ...prev]);
    setForm(initialForm);
    setShowAddModal(false);
  }

  /* -------- ACTIONS -------- */
  function viewLoan(loan) {
    setSelectedLoan(loan);
    setShowViewModal(true);
  }

  function downloadPDF(loan) {
    const content = `
Loan Statement

Loan ID   : ${loan.id}
Employee  : ${loan.employeeName} (${loan.employeeId})
Amount    : ₹${loan.amount}
Tenure    : ${loan.tenureMonths} months
Monthly   : ₹${calcMonthlyDeduction(loan)}
Remaining : ₹${remainingBalance(loan)}
`;

    const blob = new Blob([content], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Loan_${loan.id}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function deleteLoan(id) {
    if (!window.confirm("Are you sure you want to delete this loan?")) return;
    setLoans((prev) => prev.filter((l) => l.id !== id));
  }

  /* -------- UI -------- */
  return (
    <div className="p-6">
      <div className="flex justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Loan Summary</h1>
          <p className="text-gray-600">Manage employee loans</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-[#262760] text-white px-4 py-2 rounded flex items-center gap-2"
        >
          <Plus size={16} /> Add Loan
        </button>
      </div>

      <div className="bg-white shadow rounded-lg overflow-x-auto border">
        <table className="w-full min-w-[1000px]">
          <thead className="bg-[#262760] text-white">
            <tr>
              <th className="px-6 py-4">Loan ID</th>
              <th className="px-6 py-4">Employee</th>
              <th className="px-6 py-4 text-right">Amount</th>
              <th className="px-6 py-4 text-right">Tenure</th>
              <th className="px-6 py-4 text-right">Monthly</th>
              <th className="px-6 py-4 text-right">Remaining</th>
              <th className="px-6 py-4 text-center">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loans.map((loan) => (
              <tr key={loan.id} className="border-t hover:bg-gray-50">
                <td className="px-6 py-4">{loan.id}</td>
                <td className="px-6 py-4">
                  <div className="font-medium">{loan.employeeName}</div>
                  <div className="text-xs text-gray-500">ID: {loan.employeeId}</div>
                </td>
                <td className="px-6 py-4 text-right">
                  ₹{loan.amount.toLocaleString("en-IN")}
                </td>
                <td className="px-6 py-4 text-right">{loan.tenureMonths}</td>
                <td className="px-6 py-4 text-right">
                  ₹{calcMonthlyDeduction(loan)}
                </td>
                <td className="px-6 py-4 text-right font-semibold">
                  ₹{remainingBalance(loan)}
                </td>
                <td className="px-6 py-4 text-center">
                  <div className="flex justify-center gap-3">
                    <button onClick={() => viewLoan(loan)} title="View">
                      <Eye size={18} className="text-blue-600" />
                    </button>
                    <button onClick={() => downloadPDF(loan)} title="Download">
                      <Download size={18} className="text-green-600" />
                    </button>
                    <button onClick={() => deleteLoan(loan.id)} title="Delete">
                      <Trash2 size={18} className="text-red-600" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {loans.length === 0 && (
              <tr>
                <td colSpan="7" className="py-10 text-center text-gray-500">
                  No loans found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ADD LOAN MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <form
            onSubmit={saveLoan}
            className="bg-white p-6 rounded-lg w-full max-w-lg"
          >
            <h2 className="text-xl font-semibold mb-4">Add Loan</h2>

            <div className="grid grid-cols-2 gap-4">
              <input name="employeeId" placeholder="Employee ID" onChange={handleChange} className="border p-2" />
              <input name="employeeName" placeholder="Employee Name" onChange={handleChange} className="border p-2" />
              <input name="amount" type="number" placeholder="Amount" onChange={handleChange} className="border p-2" />
              <input name="tenureMonths" type="number" placeholder="Tenure (Months)" onChange={handleChange} className="border p-2" />
              <input name="startDate" type="date" onChange={handleChange} className="border p-2 col-span-2" />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button type="button" onClick={() => setShowAddModal(false)} className="border px-4 py-2 rounded">
                Cancel
              </button>
              <button type="submit" className="bg-[#262760] text-white px-4 py-2 rounded">
                Save Loan
              </button>
            </div>
          </form>
        </div>
      )}

      {/* VIEW MODAL */}
      {showViewModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">Loan Details</h2>
            <p><b>Employee:</b> {selectedLoan.employeeName}</p>
            <p><b>Loan ID:</b> {selectedLoan.id}</p>
            <p><b>Amount:</b> ₹{selectedLoan.amount}</p>
            <p><b>Tenure:</b> {selectedLoan.tenureMonths} months</p>
            <p className="font-semibold text-green-700">
              Remaining: ₹{remainingBalance(selectedLoan)}
            </p>

            <div className="flex justify-end mt-6">
              <button onClick={() => setShowViewModal(false)} className="border px-4 py-2 rounded">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
