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
  Paperclip,
  ChevronDown,
  Calculator,
  FileText
} from "lucide-react";
import { employeeAPI, compensationAPI, mailAPI } from "../../services/api";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Salary Calculation Functions
const calculateSalaryFields = (salaryData) => {
  const basicDA = parseFloat(salaryData.basicDA) || 0;
  const hra = parseFloat(salaryData.hra) || 0;
  const specialAllowance = parseFloat(salaryData.specialAllowance) || 0;
  const gratuity = parseFloat(salaryData.gratuity) || 0;
  const pf = parseFloat(salaryData.pf) || 0;
  const esi = parseFloat(salaryData.esi) || 0;
  const tax = parseFloat(salaryData.tax) || 0;
  const professionalTax = parseFloat(salaryData.professionalTax) || 0;
  // const loanDeduction = parseFloat(salaryData.loanDeduction) || 0; // Not in initialCompensation but in Payroll
  // const lop = parseFloat(salaryData.lop) || 0; // Not in initialCompensation but in Payroll

  const totalEarnings = basicDA + hra + specialAllowance;
  const totalDeductions = pf + esi + tax + professionalTax; //  + loanDeduction + lop;
  const netSalary = totalEarnings - totalDeductions;
  const ctc = totalEarnings + gratuity;

  return {
    ...salaryData,
    totalEarnings,
    totalDeductions,
    netSalary,
    ctc
  };
};

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
  modeBasicDA: "amount",
  modeHra: "amount",
  modeSpecialAllowance: "amount",
  modeGratuity: "amount",
  modePf: "amount",
  modeEsi: "amount",
  modeTax: "amount",
  modeProfessionalTax: "amount",
  
  // Calculated Fields
  totalEarnings: 0,
  totalDeductions: 0,
  netSalary: 0,
  ctc: 0,

  // Bank Details
  bankName: "",
  accountNumber: "",
  ifscCode: "",

  // Additional Employee Details
  dateOfJoining: "",
  employmentType: "Permanent",
};


const headerSvg = "data:image/svg+xml;charset=utf-8,%3Csvg width='1000' height='128' viewBox='0 0 1000 128' xmlns='http://www.w3.org/2000/svg' preserveAspectRatio='none'%3E%3Cpath d='M0,0 L560,0 L490,128 L0,128 Z' fill='%231e2b58' /%3E%3Cpath d='M560,0 L610,0 L540,128 L490,128 Z' fill='%23f37021' /%3E%3C/svg%3E";

const LetterHeader = () => (
  <div className="w-full h-32 relative overflow-hidden flex" style={{ width: '100%', height: '128px', position: 'relative', overflow: 'hidden', display: 'flex' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', zIndex: 0 }}>
      <img src={headerSvg} alt="" style={{ width: '100%', height: '100%', display: 'block', objectFit: 'fill' }} />
    </div>
    <div className="relative z-10 w-full flex" style={{ height: '100%' }}>
      <div className="w-[60%] flex items-center pl-8 pr-12" style={{ width: '60%', display: 'flex', alignItems: 'center', paddingLeft: '32px', paddingRight: '48px' }}>
        <div className="flex items-center gap-4" style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <img src="/images/steel-logo.png" alt="CALDIM" className="h-16 w-auto brightness-0 invert" style={{ height: '64px', width: 'auto', filter: 'brightness(0) invert(1)' }} />
          <div className="text-white" style={{ color: 'white' }}>
             <h1 className="text-4xl font-bold leading-none tracking-wide">CALDIM</h1>
             <p className="text-[11px] tracking-[0.2em] mt-1 text-orange-400 font-semibold">ENGINEERING PRIVATE LIMITED</p>
          </div>
        </div>
      </div>
      <div className="flex-1 flex flex-col justify-center items-end pr-8 pt-2" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'flex-end', paddingRight: '32px', paddingTop: '8px' }}>
        <div className="flex items-center mb-2" style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
          <span className="font-bold text-gray-800 mr-3 text-lg" style={{ fontWeight: 'bold', color: '#1f2937', marginRight: '12px', fontSize: '18px' }}>044-47860455</span>
          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
          </div>
        </div>
        <div className="flex items-start justify-end text-right" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end', textAlign: 'right' }}>
          <span className="text-sm font-semibold text-gray-700 w-64 leading-tight" style={{ fontSize: '14px', fontWeight: 600, color: '#374151', width: '256px', lineHeight: 1.25 }}>No.118, Minimac Center, Arcot Road, Valasaravakkam, Chennai - 600 087.</span>
          <div className="bg-[#1e2b58] rounded-full p-1.5 text-white w-7 h-7 flex items-center justify-center text-xs ml-3 mt-1 shadow-md" style={{ backgroundColor: '#1e2b58', borderRadius: '9999px', padding: '6px', color: 'white', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', marginLeft: '12px', marginTop: '4px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' }}>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4" style={{ width: '16px', height: '16px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);


const LetterFooter = () => (
  <div className="w-full flex items-end mt-auto relative" style={{ width: '100%', display: 'flex', alignItems: 'flex-end', marginTop: 'auto', position: 'relative' }}>
    <div className="bg-[#f37021] flex-1 mb-0" style={{ height: '8px', backgroundColor: '#f37021', flex: 1, marginBottom: 0 }}></div>
    <div className="relative text-white flex flex-col items-end justify-center" style={{ 
      position: 'relative', 
      minWidth: '350px', 
      height: '60px',
      background: 'linear-gradient(135deg, transparent 25px, #1e2b58 25px)',
      padding: '0 40px 0 60px', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'flex-end', 
      justifyContent: 'center' 
    }}>
      <div className="relative z-10" style={{ position: 'relative', zIndex: 10, textAlign: 'right' }}>
        <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', fontFamily: 'Arial, sans-serif' }}>Website : www.caldimengg.com</div>
        <div style={{ fontSize: '12px', fontWeight: 500, letterSpacing: '0.05em', marginTop: '4px', fontFamily: 'Arial, sans-serif' }}>CIN U74999TN2016PTC110683</div>
      </div>
    </div>
  </div>
);

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
  
  // New states for Payroll Details format
  const [errors, setErrors] = useState({});
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchTerm, setEmployeeSearchTerm] = useState('');
  const [employeeLookupError, setEmployeeLookupError] = useState('');

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

  // Popup & Dialog states
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageDialogConfig, setMessageDialogConfig] = useState({
    title: '',
    message: '',
    type: 'success' // success, error, warning, info
  });

  const showMessage = (title, message, type = 'success') => {
    setMessageDialogConfig({ title, message, type });
    setShowMessageDialog(true);
  };

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

  const handleDelete = (index) => {
    setItemToDelete(index);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (itemToDelete === null) return;
    try {
      const id = compensation[itemToDelete]._id;
      await compensationAPI.delete(id);
      const next = [...compensation];
      next.splice(itemToDelete, 1);
      setCompensation(next);
      setShowDeleteConfirm(false);
      setItemToDelete(null);
      showMessage('Success', 'Compensation deleted successfully', 'success');
    } catch (error) {
      console.error("Error deleting compensation", error);
      setShowDeleteConfirm(false);
      showMessage('Error', 'Failed to delete compensation', 'error');
    }
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setItemToDelete(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));

    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }

    // Auto-calculate salary fields
    const salaryFields = [
      'basicDA', 'hra', 'specialAllowance', 'gratuity',
      'pf', 'esi', 'tax', 'professionalTax'
    ];
    
    if (salaryFields.includes(name)) {
      // Use setTimeout to ensure we calculate with the latest value
      // Or just calculate with the new value directly
      const newData = { ...formData, [name]: value };
      const updatedData = calculateSalaryFields(newData);
      setFormData(updatedData);
    }
    
    // Auto-fill removed as per user request to allow manual entry
  };

  const handleOpenEmail = (comp) => {
    const emp = employees.find(e => e.employeeId === comp.employeeId);
    const email = emp?.email || "";
    setSelectedCompensation({
      ...comp,
      dateOfJoining: emp?.dateOfJoining,
      location: emp?.location || comp.location,
      designation: emp?.designation || comp.designation
    });
    
    // Default introductory message for Offer Letter
    const message = `Dear ${comp.name},

We are pleased to offer you employment with Caldim Engineering Private Limited.
Please find the detailed Offer Letter attached.

Should you have any questions, feel free to reach out to us.

Best regards,
HR Team`;

    setEmailData({
      to: email,
      cc: "",
      subject: "Offer of Employment at Caldim Engineering Pvt. Ltd.",
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

  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return isNaN(date.getTime()) ? dateString : date.toLocaleDateString('en-GB');
  };

  const generateHTML = (message, comp) => {
    if (!comp) return "";
    
    const formatCurrency = (val) => {
        if (!val) return "0";
        return isNaN(val) ? val : Number(val).toLocaleString('en-IN', { style: 'currency', currency: 'INR' });
    };

    // Calculate totals dynamically for the email template
    const basicDA = parseFloat(comp.basicDA) || 0;
    const hra = parseFloat(comp.hra) || 0;
    const specialAllowance = parseFloat(comp.specialAllowance) || 0;
    const pf = parseFloat(comp.pf) || 0;
    const professionalTax = parseFloat(comp.professionalTax) || 0;
    const esi = parseFloat(comp.esi) || 0;
    const tax = parseFloat(comp.tax) || 0;
    const gratuity = parseFloat(comp.gratuity) || 0;

    const totalEarnings = basicDA + hra + specialAllowance;
    const totalDeductions = pf + professionalTax + esi + tax;
    const netSalary = totalEarnings - totalDeductions;
    const ctc = totalEarnings + gratuity;

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
                <td style="padding: 8px 0; font-weight: 600;">${formatDate(comp.effectiveDate)}</td>
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
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(basicDA)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">HRA</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(hra)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Special Allowance</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(specialAllowance)}</td>
                </tr>
                <tr style="background-color: #f9fafb;">
                   <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Gross Earnings</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>${formatCurrency(totalEarnings)}</strong></td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb; background-color: #f3f4f6;" colspan="2"><strong>Deductions</strong></td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">PF Contribution</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(pf)}</td>
                </tr>
                <tr>
                  <td style="padding: 12px; border: 1px solid #e5e7eb;">Professional Tax</td>
                  <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(professionalTax)}</td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb;"><strong>Total Deductions</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;"><strong>${formatCurrency(totalDeductions)}</strong></td>
                </tr>
                <tr style="background-color: #eef2ff;">
                   <td style="padding: 12px; border: 1px solid #e5e7eb; color: #312e81;"><strong>Net Salary</strong></td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb; color: #312e81;"><strong>${formatCurrency(netSalary)}</strong></td>
                </tr>
                <tr>
                   <td style="padding: 12px; border: 1px solid #e5e7eb;">CTC (Monthly)</td>
                   <td style="padding: 12px; text-align: right; border: 1px solid #e5e7eb;">${formatCurrency(ctc)}</td>
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

  const handlePreviewLetter = async () => {
    try {
      // Small delay to ensure DOM is ready with new data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pages = ['offer-letter-p1', 'offer-letter-p2', 'offer-letter-p3', 'offer-letter-p4'];
      const pdf = new jsPDF('p', 'mm', 'a4');
      let pageAdded = false;

      for (let i = 0; i < pages.length; i++) {
        const element = document.getElementById(pages[i]);
        if (!element) continue;

        if (pageAdded) {
          pdf.addPage();
        }

        const canvas = await html2canvas(element, {
          scale: 1.5,
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        pageAdded = true;
      }
      
      const pdfBlob = pdf.output('bloburl');
      window.open(pdfBlob, '_blank');
      
    } catch (error) {
      console.error("Error generating preview", error);
      showMessage('Error', "Failed to generate preview", 'error');
    }
  };

  const attachCompensationLetter = async (silent = false) => {
    try {
      // Small delay to ensure DOM is ready with new data
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const pages = ['offer-letter-p1', 'offer-letter-p2', 'offer-letter-p3', 'offer-letter-p4'];
    const pdf = new jsPDF('p', 'mm', 'a4');
    let pageAdded = false;

    for (let i = 0; i < pages.length; i++) {
      const element = document.getElementById(pages[i]);
      if (!element) continue;

      if (pageAdded) {
        pdf.addPage();
      }

        const canvas = await html2canvas(element, {
          scale: 1.5, // Reduced scale to optimize file size
          useCORS: true,
          logging: false,
          backgroundColor: '#ffffff'
        });

        // Use JPEG with 0.8 quality for better compression
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Use JPEG format in PDF
        pdf.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);
        pageAdded = true;
      }
      
      // Get base64 without prefix
      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      
      console.log("PDF Generated. Size:", pdfBase64.length);

      const newAttachment = {
        filename: `Offer_Letter_${selectedCompensation.name.replace(/\s+/g, '_')}.pdf`,
        content: pdfBase64,
        encoding: 'base64'
      };
      
      setEmailData(prev => {
        // Remove any existing auto-generated compensation letters to prevent duplicates
        const filteredAttachments = prev.attachments.filter(
          att => !att.filename.startsWith('Compensation_Letter_') && !att.filename.startsWith('Offer_Letter_')
        );
        return {
          ...prev,
          attachments: [...filteredAttachments, newAttachment]
        };
      });
      
      if (!silent) showMessage('Success', "Offer Letter attached successfully!");
      
    } catch (error) {
      console.error("Error generating PDF", error);
      if (!silent) showMessage('Error', "Failed to generate PDF", 'error');
    }
  };

  // Auto-attach letter when email modal opens
  useEffect(() => {
    if (emailModalOpen && selectedCompensation) {
      attachCompensationLetter(true);
    }
  }, [emailModalOpen, selectedCompensation]);

  const handleSendEmail = async () => {
    if (!emailData.to) {
      showMessage('Validation', "Please enter a recipient email address.", 'warning');
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
      
      showMessage('Success', "Email sent successfully!", 'success');
      setEmailModalOpen(false);
      setEmailData({ to: "", cc: "", subject: "", message: "", attachments: [] });
      setSelectedCompensation(null);
    } catch (error) {
      console.error("Error sending email", error);
      showMessage('Error', `Failed to send email: ${error.response?.data?.message || error.message}`, 'error');
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
      showMessage('Success', "Compensation saved successfully!", 'success');
    } catch (error) {
      console.error("Error saving compensation", error);
      showMessage('Error', "Failed to save compensation", 'error');
    }
  };

  const exportCSV = () => {
    const cols = [
      "name","department","designation","grade","location","effectiveDate",
      "basicDA","hra","specialAllowance","gratuity","pf","esi","tax","professionalTax",
      "modeBasicDA","modeHra","modeSpecialAllowance","modeGratuity","modePf","modeEsi","modeTax","modeProfessionalTax"
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

  // Calculate totals dynamically for the template to ensure accuracy even if DB values are missing
  const calcBasicDA = selectedCompensation ? (parseFloat(selectedCompensation.basicDA) || 0) : 0;
  const calcHRA = selectedCompensation ? (parseFloat(selectedCompensation.hra) || 0) : 0;
  const calcSpecial = selectedCompensation ? (parseFloat(selectedCompensation.specialAllowance) || 0) : 0;
  const calcPF = selectedCompensation ? (parseFloat(selectedCompensation.pf) || 0) : 0;
  const calcProfessionalTax = selectedCompensation ? (parseFloat(selectedCompensation.professionalTax) || 0) : 0;
  const calcESI = selectedCompensation ? (parseFloat(selectedCompensation.esi) || 0) : 0;
  const calcTax = selectedCompensation ? (parseFloat(selectedCompensation.tax) || 0) : 0;
  const calcGratuity = selectedCompensation ? (parseFloat(selectedCompensation.gratuity) || 0) : 0;

  const calcTotalEarnings = calcBasicDA + calcHRA + calcSpecial;
  const calcTotalDeductions = calcPF + calcProfessionalTax + calcESI + calcTax;
  const calcNetSalary = calcTotalEarnings - calcTotalDeductions;
  const calcCTC = calcTotalEarnings + calcGratuity;

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
            Add Compensator
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
          <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="px-6 py-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
              <h2 className="text-xl font-semibold text-gray-800">
                {editingIndex !== null ? 'Edit Compensation' : 'Add Compensation'}
              </h2>
              <button
                onClick={() => { setOpenDialog(false); setEditingIndex(null); }}
                className="p-2 text-gray-400 hover:text-gray-600"
                title="Close"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form Content */}
            <div className="p-6 space-y-6">
                {/* Employee Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Compensator Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Compensator Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Designation *
                      </label>
                      <select
                        name="designation"
                        value={formData.designation}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Designation</option>
                        {designations.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Department *
                      </label>
                      <select
                        name="department"
                        value={formData.department}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Department</option>
                        {departments.map((d) => (
                          <option key={d} value={d}>{d}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location
                      </label>
                      <select
                        name="location"
                        value={formData.location}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Location</option>
                        {locations.map((l) => (
                          <option key={l} value={l}>{l}</option>
                        ))}
                      </select>
                    </div>
                    
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Effective Date
                      </label>
                      <input
                        type="date"
                        name="effectiveDate"
                        value={formData.effectiveDate}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Earnings */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Earnings & Allowances</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Basic + DA *', name: 'basicDA' },
                      { label: 'HRA *', name: 'hra' },
                      { label: 'Special Allowance', name: 'specialAllowance' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Benefits */}
                <div>
                  <h3 className="text-lg font-medium text-purple-900 mb-4">Benefits (Part of CTC)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'Gratuity', name: 'gratuity' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <h3 className="text-lg font-medium text-red-900 mb-4">Deductions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[
                      { label: 'PF Contribution', name: 'pf' },
                      { label: 'ESI Contribution', name: 'esi' },
                      { label: 'Income Tax', name: 'tax' },
                      { label: 'Professional Tax', name: 'professionalTax' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="number"
                            name={field.name}
                            value={formData[field.name]}
                            onChange={handleChange}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Salary Summary */}
                <div>
                  <h3 className="text-lg font-medium text-green-900 mb-4">Salary Summary</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Total Earnings', name: 'totalEarnings', color: 'text-green-600' },
                      { label: 'Total Deductions', name: 'totalDeductions', color: 'text-red-600' },
                      { label: 'Net Salary', name: 'netSalary', color: 'text-blue-600 font-bold' },
                      { label: 'Cost to Company (CTC)', name: 'ctc', color: 'text-purple-600' },
                    ].map((field) => (
                      <div key={field.name}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {field.label}
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                          <input
                            type="text"
                            value={formData[field.name]}
                            readOnly
                            className={`w-full pl-8 pr-3 py-2 bg-gray-50 border border-gray-300 rounded-lg ${field.color}`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

               
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2 sticky bottom-0 z-10">
              <button
                onClick={() => { setOpenDialog(false); setEditingIndex(null); }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] flex items-center gap-2"
              >
                <Save size={18} />
                {editingIndex !== null ? 'Update' : 'Save'}
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
                  onClick={handlePreviewLetter}
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50 flex items-center gap-2"
                  disabled={sendingEmail}
                >
                  <Eye size={16} />
                  Preview Letter
                </button>
               
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
      
      {/* Hidden PDF Template */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {/* Page 1: Offer Letter */}
        <div id="offer-letter-p1" className="bg-white relative w-[794px] mx-auto shadow-lg" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column' }}>
          
          {/* Header */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '28px', marginBottom: '20px', textDecoration: 'underline', fontFamily: '"Times New Roman", Times, serif', letterSpacing: '1px' }}>OFFER LETTER</div>
              
              <div style={{ textAlign: 'right', marginBottom: '15px', fontSize: '12pt', color: '#374151' }}>
                 Date: {new Date().toLocaleDateString('en-GB')}
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', color: '#1f2937' }}>
                 <strong>To,</strong><br />
                 <strong>{selectedCompensation?.name}</strong><br />
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', fontWeight: 'bold', color: '#1f2937' }}>
                 Subject: Offer of Employment at Caldim Engineering Pvt. Ltd.
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt', lineHeight: '1.6', color: '#374151', textAlign: 'justify' }}>
                 Dear {selectedCompensation?.name},<br /><br />
                 We are pleased to offer you employment with Caldim Engineering Private Limited (“the Company”) for the position of <strong>{selectedCompensation?.designation}</strong>, effective from <strong>{formatDate(selectedCompensation?.dateOfJoining)}</strong>.
                 <br/><br/>
                 Your appointment will be governed by the terms and conditions outlined below and further detailed in the Annexure – Terms & Conditions of Employment.
              </div>

              <div style={{ marginBottom: '10px', fontWeight: 'bold', fontSize: '12pt' }}>1. Compensation Structure</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '15px', fontSize: '11pt', border: '1px solid #e5e7eb' }}>
                 <thead>
                    <tr style={{ backgroundColor: '#f3f4f6' }}>
                       <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'left', color: '#1f2937' }}>Component</th>
                       <th style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right', color: '#1f2937' }}>Monthly (₹)</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Basic Salary</td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.basicDA || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                    </tr>
                    <tr>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>HRA</td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.hra || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                    </tr>
                  
                    <tr>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>Special Allowance</td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(selectedCompensation?.specialAllowance || 0).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                    </tr>
                    <tr style={{backgroundColor: '#f9fafb'}}>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px' }}><strong>Gross Salary</strong></td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}><strong>{Number(calcTotalEarnings).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</strong></td>
                    </tr>
                    <tr>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px' }}>PF Contribution </td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right' }}>{Number(calcPF).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</td>
                    </tr>
                    <tr style={{ backgroundColor: '#eef2ff' }}>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', color: '#312e81' }}><strong>Total CTC (Cost to Company)</strong></td>
                       <td style={{ border: '1px solid #d1d5db', padding: '6px', textAlign: 'right', color: '#312e81' }}><strong>{Number(calcCTC).toLocaleString('en-IN', {style:'currency', currency:'INR'})}</strong></td>
                    </tr>
                 </tbody>
              </table>
              
              <div style={{ fontSize: '11pt', fontStyle: 'italic', marginBottom: '10px' }}>
                  Note: Statutory deductions such as PF, Professional Tax, and Income Tax (if applicable) will be made as per prevailing laws.
              </div>

               <div style={{ marginTop: 'auto', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Continued in next page...)
              </div>

            </div>

            {/* Footer */}
            <div style={{ width: '100%' }}>
              <LetterFooter />
            </div>

          </div>
        </div>

        {/* Page 2: Annexure */}
        <div id="offer-letter-p2" className="bg-white relative w-[794px] mx-auto shadow-lg" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>2. Working Hours</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      Employees are expected to complete a minimum of 48 hours per week across 5 working days (Monday to Friday).
                      This translates to a minimum of 9 hours 30 minutes per day (including breaks) to be eligible for full-day pay.
                      For employees on shift schedules, the mandated daily hours are 8 hours 30 minutes.
                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>3. Place of Work</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                  Your initial place of work will be <strong>{selectedCompensation?.location || '[Location]'}</strong>. You may be transferred to any other department, branch, or client site as required by the Company.
                  </div>
              </div>

               <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>4. Probation Period</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      You will be on probation for a period of 6 months from your date of joining. Upon successful completion, your employment will be confirmed in writing.
                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>5. Notice Period</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      During probation, either party may terminate the employment with 15 days' notice. After confirmation, the notice period will be 2 months.
                  </div>
              </div>

              <div style={{ marginBottom: '15px', fontSize: '12pt' }}>
                  <strong>6. Employment Terms</strong>
                  <div style={{ fontSize: '11pt', marginTop: '5px', lineHeight: '1.6' }}>
                      Your employment is subject to the rules and regulations of the Company as applicable from time to time. You will be required to sign a Non-Disclosure Agreement (NDA) and other standard employment documents.
                  </div>
              </div>

              <div style={{ marginTop: '30px', fontSize: '11pt' }}>
                  <strong>Acknowledgement & Acceptance:</strong><br/>
                  I, <strong>{selectedCompensation?.name}</strong>, accept the offer of employment on the terms and conditions mentioned above and in the Annexure.<br/><br/>
                  Signature: ___________________________ Date: _______________________________
              </div>
              
               <div style={{ marginTop: 'auto', marginBottom: '20px', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Encl: Annexure - Terms & Conditions)
              </div>

            </div>

            {/* Footer */}
            <div style={{ width: '100%' }}>
              <LetterFooter />
            </div>

          </div>
        </div>

        {/* Page 3: Annexure */}
        <div id="offer-letter-p3" className="bg-white relative w-[794px] mx-auto shadow-lg" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
              
               <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: '16px', marginBottom: '20px', marginTop: '10px', textDecoration: 'underline' }}>
                    ANNEXURE<br/>TERMS & CONDITIONS OF EMPLOYMENT
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>1. Provident Fund (PF)</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Employees contribute 12% of basic salary towards PF as per statutory norms.</li>
                        <li>The Company contributes an equal 12% towards PF.</li>
                        <li>PF balances will be settled as per PF rules upon separation.</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>2. Gratuity</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Payable under the Payment of Gratuity Act, As per Indian Government norms</li>
                        <li>Formula: Gratuity = Basic × No. of Years × (15/26)</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>3. Leave Policy</strong>
                    <div style={{ paddingLeft: '10px', marginTop: '5px' }}>
                        <strong>Applicability:</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '10px', lineHeight: '1.6' }}>
                            <li>Experienced Employees: Leave benefits apply post-probation.</li>
                            <li>Trainees: 1 day leave/month during training. On confirmation, regular leave norms apply.</li>
                        </ul>
                        <strong>Entitlements:</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '10px', lineHeight: '1.6' }}>
                            <li>Casual Leave (CL): 0.5 day/month</li>
                            <li>Sick Leave (SL): 0.5 day/month (medical proof for extended absence)</li>
                            <li>Privilege/Earned Leave (PL/EL): 15 days/year. accumulable for up to 2 years - Encashment Formula: (Basic Salary / Total Days in Month) × Available PL</li>
                            <li>Bereavement Leave: 2 days paid leave for loss of immediate family</li>
                            <li>Sandwich Leave: Leaves adjoining holidays will be treated as continuous</li>
                        </ul>
                        <strong>Holidays</strong>
                        <ul style={{ listStyleType: 'circle', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                            <li>Declared holidays will be issued annually.</li>
                            <li>Saturdays and Sundays are holidays.</li>
                            <li>Employees working on holidays receive additional payment (not compensatory off), subject to 9-hour completion including breaks</li>
                        </ul>
                    </div>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>4. Monthly Permission</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>3 permissions/month, maximum of 1 hour each.</li>
                        <li>Even shorter durations count as one permission.</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>5. Bonus</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Pro-rata bonus applicable during the first year.</li>
                        <li>Standard annual bonus of ₹7,500 after one year of continuous service.</li>
                    </ul>
                </div>

               <div style={{ marginTop: 'auto', fontSize: '11pt', fontStyle: 'italic', textAlign: 'right' }}>
                  (Continued in next page...)
              </div>

            </div>

            {/* Footer */}
            <div style={{ width: '100%' }}>
              <LetterFooter />
            </div>

          </div>
        </div>

        {/* Page 4: Annexure Continued */}
        <div id="offer-letter-p4" className="bg-white relative w-[794px] mx-auto shadow-lg" style={{ width: '210mm', height: '297mm', backgroundColor: 'white', fontFamily: 'Arial, sans-serif', color: 'black', display: 'flex', flexDirection: 'column' }}>
          
           {/* Header (Same as Page 1) */}
            <LetterHeader />

          {/* Letter Pad Content Container */}
          <div className="relative z-10 flex flex-col" style={{ position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column', flex: 1 }}>
            
            {/* Main Content Area */}
            <div className="px-12 py-2 flex-grow" style={{ paddingLeft: '48px', paddingRight: '48px', paddingTop: '10px', paddingBottom: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column' }}>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>6. Health Insurance</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Coverage of ₹1,00,000 upon joining; ₹2,00,000 after 1 year.</li>
                        <li>Covers employee, spouse, and children only.</li>
                        <li>Governed by IRDAI guidelines.</li>
                    </ul>
                </div>
                
                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>7. General</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>Employee must comply with all Company policies and HR guidelines.</li>
                        <li>The Company reserves the right to modify or withdraw any policy or benefit as required by law or management decision.</li>
                    </ul>
                </div>

                <div style={{ marginBottom: '15px', fontSize: '11pt' }}>
                    <strong>8. Service Commitment (Bond)</strong>
                    <ul style={{ listStyleType: 'disc', paddingLeft: '20px', marginTop: '5px', marginBottom: '0px', lineHeight: '1.6' }}>
                        <li>The Employee undertakes to serve the Company for a minimum period of 2 years from the date of joining.</li>
                        <li>If the Employee voluntarily resigns or is terminated for cause before completion of 2 years, the Employee agrees to pay the Company a penalty of ₹1,00,000 (Rupees One Lakh only) as per Company policy.</li>
                        <li>This penalty covers training, onboarding, and other investments made by the Company.</li>
                    </ul>
                </div>
                
                <div style={{ marginTop: '30px', fontSize: '11pt' }}>
                  <strong>Employee Declaration:</strong><br/>
                  I have read and understood the terms stated in this Annexure and agree to abide by them during my employment with Caldim Engineering Pvt. Ltd.<br/><br/>
                  Signature: ___________________________ Name: ______________________________ Date: _______________________________
                </div>

            </div>

            {/* Footer */}
            <div style={{ width: '100%' }}>
              <LetterFooter />
            </div>

          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Deletion</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this compensation? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Dialog (Success/Error/Info) */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-xl">
            <h3 className={`text-lg font-semibold mb-4 ${
              messageDialogConfig.type === 'success' ? 'text-green-600' :
              messageDialogConfig.type === 'error' ? 'text-red-600' :
              messageDialogConfig.type === 'warning' ? 'text-yellow-600' :
              'text-blue-600'
            }`}>
              {messageDialogConfig.title}
            </h3>
            <p className="text-gray-600 mb-6 whitespace-pre-line">
              {messageDialogConfig.message}
            </p>
            <div className="flex justify-end">
              <button
                onClick={() => setShowMessageDialog(false)}
                className={`px-4 py-2 text-white rounded transition-colors ${
                  messageDialogConfig.type === 'success' ? 'bg-green-600 hover:bg-green-700' :
                  messageDialogConfig.type === 'error' ? 'bg-red-600 hover:bg-red-700' :
                  messageDialogConfig.type === 'warning' ? 'bg-yellow-600 hover:bg-yellow-700' :
                  'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompensationMaster;
