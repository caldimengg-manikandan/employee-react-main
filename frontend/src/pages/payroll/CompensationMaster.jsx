import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Eye,
  Download,
  Filter,
  Save,
  X,
  Mail,
  Paperclip
} from "lucide-react";
import { employeeAPI, compensationAPI, mailAPI } from "../../services/api";

const initialCompensation = {
  employeeId: "",
  name: "",
  department: "",
  designation: "",
  grade: "",
  location: "",
  effectiveDate: new Date().toISOString().split("T")[0],
  basicDA: "",
  hra: "",
  specialAllowance: "",
  gratuity: "",
  pf: "",
  esi: "",
  tax: "",
  professionalTax: "",
  bonus: "",
  variablePay: "",
  modeBasicDA: "amount",
  modeHra: "amount",
  modeSpecialAllowance: "amount",
  modeGratuity: "amount",
  modePf: "amount",
  modeEsi: "amount",
  modeTax: "amount",
  modeProfessionalTax: "amount",
  modeBonus: "amount",
  modeVariablePay: "amount"
};

const CompensationMaster = () => {
  const [compensation, setCompensation] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [formData, setFormData] = useState(initialCompensation);
  const [search, setSearch] = useState("");
  const [filterDepartment, setFilterDepartment] = useState("");
  const [filterDesignation, setFilterDesignation] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [departments, setDepartments] = useState([]);
  const [designations, setDesignations] = useState([]);
  const [locations, setLocations] = useState(["Hosur", "Chennai"]);
  const [employees, setEmployees] = useState([]);
  const [viewItem, setViewItem] = useState(null);

  // Email state
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailData, setEmailData] = useState({
    to: "",
    cc: "",
    subject: "Compensation Details / Offer Letter",
    message: "",
    attachments: [] // Array of { filename, content, encoding }
  });
  const [selectedCompensation, setSelectedCompensation] = useState(null); // Store current comp for HTML generation

  useEffect(() => {
    const loadData = async () => {
      try {
        const [empRes, compRes] = await Promise.all([
          employeeAPI.getAllEmployees(),
          compensationAPI.getAll()
        ]);

        const list = Array.isArray(empRes.data) ? empRes.data : [];
        setEmployees(list);
        const depts = [...new Set(list.map(e => e.department || e.division).filter(Boolean))];
        const desigs = [...new Set(list.map(e => e.designation || e.position || e.role).filter(Boolean))];
        const locs = [...new Set(list.map(e => e.location).filter(Boolean))];
        setDepartments(depts);
        setDesignations(desigs);
        if (locs.length > 0) setLocations(locs);

        if (Array.isArray(compRes.data)) {
          setCompensation(compRes.data);
        }
      } catch (error) {
        console.error("Error loading data", error);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let data = [...compensation];
    if (search.trim()) {
      const term = search.toLowerCase();
      data = data.filter(t =>
        (t.name || "").toLowerCase().includes(term) ||
        (t.department || "").toLowerCase().includes(term) ||
        (t.designation || "").toLowerCase().includes(term) ||
        (t.location || "").toLowerCase().includes(term)
      );
    }
    if (filterDepartment) {
      data = data.filter(t => (t.department || "") === filterDepartment);
    }
    if (filterDesignation) {
      data = data.filter(t => (t.designation || "") === filterDesignation);
    }
    if (filterLocation) {
      data = data.filter(t => (t.location || "") === filterLocation);
    }
    return data;
  }, [compensation, search, filterDepartment, filterDesignation, filterLocation]);

  const handleOpenAdd = () => {
    setEditingIndex(null);
    setFormData(initialCompensation);
    setOpenDialog(true);
  };

  const handleEdit = (index) => {
    setEditingIndex(index);
    setFormData(compensation[index]);
    setOpenDialog(true);
  };

  const handleDelete = async (index) => {
    if (!window.confirm("Are you sure you want to delete this compensation?")) return;
    try {
      const id = compensation[index]._id;
      await compensationAPI.delete(id);
      const next = [...compensation];
      next.splice(index, 1);
      setCompensation(next);
    } catch (error) {
      console.error("Error deleting compensation", error);
      alert("Failed to delete compensation");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEmployeeSelect = (e) => {
    const empId = e.target.value;
    const emp = employees.find(emp => emp.employeeId === empId);
    if (emp) {
      setFormData(prev => ({
        ...prev,
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department || prev.department,
        designation: emp.designation || prev.designation,
        location: emp.location || prev.location
      }));
    } else {
      setFormData(prev => ({ ...prev, employeeId: "" }));
    }
  };

  const handleOpenEmail = (comp) => {
    const emp = employees.find(e => e.employeeId === comp.employeeId);
    const email = emp?.email || "";
    setSelectedCompensation(comp);
    
    // Default introductory message
    const message = `Dear ${comp.name},

We are pleased to share your compensation details with you. Please find the breakdown below.

Should you have any questions, feel free to reach out to us.

Best regards,
HR Team`;

    setEmailData({
      to: email,
      cc: "",
      subject: "Compensation Details - " + comp.name,
      message: message,
      attachments: []
    });
    setEmailModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const newAttachments = [];
    for (const file of files) {
      const reader = new FileReader();
      const promise = new Promise((resolve) => {
        reader.onload = (e) => {
          const content = e.target.result.split(',')[1]; // Get base64 content
          resolve({
            filename: file.name,
            content: content,
            encoding: 'base64'
          });
        };
      });
      reader.readAsDataURL(file);
      newAttachments.push(await promise);
    }

    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));
  };

  const removeAttachment = (index) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  const generateHTML = (message, comp) => {
    if (!comp) return "";
    
    const formatCurrency = (val) => {
        if (!val) return "0";
        return isNaN(val) ? val : Number(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    return `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 800px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #262760; padding: 20px; text-align: center;">
          <h2 style="color: white; margin: 0;">Compensation Details</h2>
        </div>
        
        <div style="padding: 30px;">
          <div style="font-size: 16px; line-height: 1.6; color: #555; white-space: pre-wrap;">
            ${message.replace(/\n/g, '<br>')}
          </div>

          <div style="margin-top: 30px; background-color: #f9fafb; padding: 20px; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Employee Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; width: 40%;">Name</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.name}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Designation</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.designation}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Department</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.department}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Location</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.location}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280;">Effective Date</td>
                <td style="padding: 8px 0; font-weight: 600;">${comp.effectiveDate}</td>
              </tr>
            </table>
          </div>

          <div style="margin-top: 30px;">
            <h3 style="color: #262760; border-bottom: 2px solid #e5e7eb; padding-bottom: 10px;">Salary Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
              <thead style="background-color: #f3f4f6;">
                <tr>
                  <th style="padding: 12px; text-align: left; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Component</th>
                  <th style="padding: 12px; text-align: right; color: #4b5563; font-weight: 600; border: 1px solid #e5e7eb;">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Basic + DA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.basicDA}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">HRA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.hra}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Special Allowance</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.specialAllowance}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">PF (Employer)</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.pf}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">ESI (Employer)</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.esi}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Gratuity</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.gratuity}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Bonus</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.bonus || 0}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Variable Pay</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${comp.variablePay || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div style="margin-top: 30px; font-size: 12px; color: #9ca3af; text-align: center;">
            <p>This is a system generated email. Please do not reply directly to this email unless instructed.</p>
          </div>
        </div>
      </div>
    `;
  };

  const handleSendEmail = async () => {
    if (!emailData.to) {
      alert("Please enter a recipient email address.");
      return;
    }
    
    try {
      setSendingEmail(true);
      
      const htmlContent = generateHTML(emailData.message, selectedCompensation);

      await mailAPI.send({
        email: emailData.to,
        cc: emailData.cc,
        subject: emailData.subject,
        message: emailData.message, // Fallback text
        html: htmlContent,          // Rich HTML
        attachments: emailData.attachments
      });
      
      alert("Email sent successfully!");
      setEmailModalOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "", attachments: [] });
      setSelectedCompensation(null);
    } catch (error) {
      console.error("Error sending email", error);
      alert("Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const handleSubmit = async () => {
    const payload = { ...formData };
    if (!payload.name || !payload.department || !payload.designation) return;

    try {
      if (editingIndex !== null) {
        const id = compensation[editingIndex]._id;
        const res = await compensationAPI.update(id, payload);
        const next = [...compensation];
        next[editingIndex] = res.data;
        setCompensation(next);
      } else {
        const res = await compensationAPI.create(payload);
        setCompensation(prev => [res.data, ...prev]);
      }
      setOpenDialog(false);
      setEditingIndex(null);
      setFormData(initialCompensation);
    } catch (error) {
      console.error("Error saving compensation", error);
      alert("Failed to save compensation");
    }
  };

  const exportCSV = () => {
    const cols = [
      "name","department","designation","grade","location","effectiveDate",
      "basicDA","hra","specialAllowance","gratuity","pf","esi","tax","professionalTax","bonus","variablePay",
      "modeBasicDA","modeHra","modeSpecialAllowance","modeGratuity","modePf","modeEsi","modeTax","modeProfessionalTax","modeBonus","modeVariablePay"
    ];
    const header = cols.join(",");
    const rows = compensation.map(t =>
      cols.map(k => String(t[k] ?? "")).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `CompensationMaster_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <div className="p-6">
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex flex-wrap gap-4 items-end">
        <div className="flex items-center gap-2">
          <Search size={18} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, department, designation"
            className="border rounded px-3 py-2 w-80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Department</label>
          <select
            className="border rounded px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterDepartment}
            onChange={(e) => setFilterDepartment(e.target.value)}
          >
            <option value="">All</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Designation</label>
          <select
            className="border rounded px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterDesignation}
            onChange={(e) => setFilterDesignation(e.target.value)}
          >
            <option value="">All</option>
            {designations.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Location</label>
          <select
            className="border rounded px-3 py-2 w-48 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
          >
            <option value="">All</option>
            {locations.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>
        <div className="ml-auto flex gap-2">
          <button
            onClick={handleOpenAdd}
            className="bg-[#262760] text-white px-4 py-2 rounded flex items-center gap-2 hover:bg-[#1e2050]"
          >
            <Plus size={18} />
            New Compensator
          </button>
          <button
            onClick={exportCSV}
            className="bg-gray-200 text-gray-700 px-4 py-2 rounded flex items-center gap-2 hover:bg-gray-300"
          >
            <Download size={18} />
            Export
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-[#262760]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Compensator Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Designation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Location</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Basic/DA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">HRA</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Special Allow.</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">PF</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">ESI</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Tax</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-white uppercase tracking-wider">Gratuity</th>
                <th className="px-6 py-3 text-center text-xs font-medium text-white uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-6 py-8 text-center text-gray-500">No compensation found</td>
                </tr>
              ) : filtered.map((t, idx) => (
                <tr key={idx} className="hover:bg-indigo-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-semibold">{t.name}</div>
                    <div className="text-xs text-gray-500">Effective: {t.effectiveDate}</div>
                  </td>
                  <td className="px-6 py-4">{t.department || "-"}</td>
                  <td className="px-6 py-4">{t.designation || "-"}</td>
                  <td className="px-6 py-4">{t.location || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.basicDA || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.hra || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.specialAllowance || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.pf || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.esi || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.tax || "-"}</td>
                  <td className="px-6 py-4 text-right">{t.gratuity || "-"}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <button
                        onClick={() => setViewItem(t)}
                        className="text-indigo-600 hover:text-indigo-900 p-1 rounded-full hover:bg-indigo-50"
                        title="View"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleEdit(compensation.indexOf(t))}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded-full hover:bg-blue-50"
                        title="Edit"
                      >
                        <Edit2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(compensation.indexOf(t))}
                        className="text-red-600 hover:text-red-900 p-1 rounded-full hover:bg-red-50"
                        title="Delete"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleOpenEmail(t)}
                        className="text-green-600 hover:text-green-900 p-1 rounded-full hover:bg-green-50"
                        title="Send Email"
                      >
                        <Mail className="h-5 w-5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {openDialog && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-3xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="font-semibold text-lg">{editingIndex !== null ? "Edit Compensation" : "New Compensation"}</div>
              <button onClick={() => { setOpenDialog(false); setEditingIndex(null); }} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* <div>
                  <label className="block text-sm font-medium mb-1">Select Employee</label>
                  <select 
                    value={formData.employeeId || ""} 
                    onChange={handleEmployeeSelect} 
                    className="border rounded px-3 py-2 w-full"
                  >
                    <option value="">-- Select Employee --</option>
                    {employees.map(e => (
                      <option key={e._id} value={e.employeeId}>
                        {e.name} ({e.employeeId})
                      </option>
                    ))}
                  </select>
                </div> */}
                <div>
                  <label className="block text-sm font-medium mb-1">Compensation Name</label>
                  <input name="name" value={formData.name} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Effective Date</label>
                  <input type="date" name="effectiveDate" value={formData.effectiveDate} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Department</label>
                  <select name="department" value={formData.department} onChange={handleChange} className="border rounded px-3 py-2 w-full">
                    <option value="">Select</option>
                    {departments.map(d => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Designation</label>
                  <select name="designation" value={formData.designation} onChange={handleChange} className="border rounded px-3 py-2 w-full">
                    <option value="">Select</option>
                    {designations.map(d => (<option key={d} value={d}>{d}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Grade</label>
                  <input name="grade" value={formData.grade} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Location</label>
                  <select name="location" value={formData.location} onChange={handleChange} className="border rounded px-3 py-2 w-full">
                    <option value="">Select</option>
                    {locations.map(l => (<option key={l} value={l}>{l}</option>))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Basic/DA</label>
                  <div className="flex gap-2">
                    <input name="basicDA" value={formData.basicDA} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeBasicDA" value={formData.modeBasicDA} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">HRA</label>
                  <div className="flex gap-2">
                    <input name="hra" value={formData.hra} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeHra" value={formData.modeHra} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Special Allowance</label>
                  <div className="flex gap-2">
                    <input name="specialAllowance" value={formData.specialAllowance} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeSpecialAllowance" value={formData.modeSpecialAllowance} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Gratuity</label>
                  <div className="flex gap-2">
                    <input name="gratuity" value={formData.gratuity} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeGratuity" value={formData.modeGratuity} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">PF</label>
                  <div className="flex gap-2">
                    <input name="pf" value={formData.pf} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modePf" value={formData.modePf} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">ESI</label>
                  <div className="flex gap-2">
                    <input name="esi" value={formData.esi} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeEsi" value={formData.modeEsi} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Tax</label>
                  <div className="flex gap-2">
                    <input name="tax" value={formData.tax} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeTax" value={formData.modeTax} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Professional Tax</label>
                  <div className="flex gap-2">
                    <input name="professionalTax" value={formData.professionalTax} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeProfessionalTax" value={formData.modeProfessionalTax} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Bonus</label>
                  <div className="flex gap-2">
                    <input name="bonus" value={formData.bonus} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeBonus" value={formData.modeBonus} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="block text-sm font-medium mb-1">Variable Pay</label>
                  <div className="flex gap-2">
                    <input name="variablePay" value={formData.variablePay} onChange={handleChange} placeholder="Value" className="border rounded px-3 py-2 w-full" />
                    <select name="modeVariablePay" value={formData.modeVariablePay} onChange={handleChange} className="border rounded px-3 py-2">
                      <option value="amount">₹</option>
                      <option value="percent">% of base</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 border-t flex justify-end gap-2">
              <button
                onClick={() => { setOpenDialog(false); setEditingIndex(null); }}
                className="px-4 py-2 rounded border bg-white text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 rounded bg-[#262760] text-white flex items-center gap-2 hover:bg-[#1e2050]"
              >
                <Save size={18} />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewItem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center">
              <div className="font-semibold text-lg">Compensation</div>
              <button onClick={() => setViewItem(null)} className="p-2 text-gray-500 hover:text-gray-700">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><div className="text-xs text-gray-500">Name</div><div className="font-semibold">{viewItem.name || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Effective</div><div className="font-semibold">{viewItem.effectiveDate || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Department</div><div className="font-semibold">{viewItem.department || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Designation</div><div className="font-semibold">{viewItem.designation || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Grade</div><div className="font-semibold">{viewItem.grade || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Location</div><div className="font-semibold">{viewItem.location || "-"}</div></div>
              </div>
              <div className="grid grid-cols-2 gap-4 mt-2">
                <div><div className="text-xs text-gray-500">Basic/DA</div><div className="font-semibold">{viewItem.basicDA || "-"}</div></div>
                <div><div className="text-xs text-gray-500">HRA</div><div className="font-semibold">{viewItem.hra || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Special Allowance</div><div className="font-semibold">{viewItem.specialAllowance || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Gratuity</div><div className="font-semibold">{viewItem.gratuity || "-"}</div></div>
                <div><div className="text-xs text-gray-500">PF</div><div className="font-semibold">{viewItem.pf || "-"}</div></div>
                <div><div className="text-xs text-gray-500">ESI</div><div className="font-semibold">{viewItem.esi || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Tax</div><div className="font-semibold">{viewItem.tax || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Professional Tax</div><div className="font-semibold">{viewItem.professionalTax || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Bonus</div><div className="font-semibold">{viewItem.bonus || "-"}</div></div>
                <div><div className="text-xs text-gray-500">Variable Pay</div><div className="font-semibold">{viewItem.variablePay || "-"}</div></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Modal */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-[#262760] text-white">
              <div className="font-semibold text-lg flex items-center gap-2">
                <Mail size={20} />
                Send Email
              </div>
              <button onClick={() => setEmailModalOpen(false)} className="p-1 hover:bg-white/10 rounded">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">To</label>
                <input
                  type="email"
                  value={emailData.to}
                  onChange={(e) => setEmailData({...emailData, to: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="recipient@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CC</label>
                <input
                  type="text"
                  value={emailData.cc}
                  onChange={(e) => setEmailData({...emailData, cc: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="cc@example.com, hr@example.com"
                />
                <p className="text-xs text-gray-500 mt-1">Separate multiple emails with commas</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <input
                  type="text"
                  value={emailData.subject}
                  onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message Body</label>
                <textarea
                  value={emailData.message}
                  onChange={(e) => setEmailData({...emailData, message: e.target.value})}
                  rows={6}
                  className="border rounded px-3 py-2 w-full focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                  placeholder="Enter your message here..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  Note: A formatted compensation table will be automatically appended to this message.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Attachments</label>
                <div className="flex items-center gap-2 mb-2">
                  <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded border border-gray-300 flex items-center gap-2 text-sm transition-colors">
                    <Paperclip size={16} />
                    Attach Files
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      onChange={handleFileChange}
                    />
                  </label>
                  <span className="text-xs text-gray-500">Supported: PDF, Doc, Images</span>
                </div>
                
                {emailData.attachments.length > 0 && (
                  <ul className="space-y-1 bg-gray-50 p-2 rounded border border-gray-200">
                    {emailData.attachments.map((file, idx) => (
                      <li key={idx} className="flex justify-between items-center text-sm p-1 hover:bg-gray-100 rounded">
                        <div className="flex items-center gap-2 truncate">
                           <Paperclip size={14} className="text-gray-400" />
                           <span className="truncate max-w-[200px]">{file.filename}</span>
                        </div>
                        <button 
                          onClick={() => removeAttachment(idx)}
                          className="text-red-500 hover:text-red-700 p-1"
                        >
                          <X size={14} />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2 border-t mt-4">
                <button
                  onClick={() => setEmailModalOpen(false)}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                  disabled={sendingEmail}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendEmail}
                  className="px-4 py-2 bg-[#262760] text-white rounded hover:bg-[#1e2050] flex items-center gap-2 disabled:opacity-70"
                  disabled={sendingEmail}
                >
                  {sendingEmail ? (
                    <>Sending...</>
                  ) : (
                    <>
                      <Mail size={16} />
                      Send Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationMaster;