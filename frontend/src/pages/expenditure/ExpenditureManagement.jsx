import React, { useState, useEffect } from "react";
import {
  Eye,
  FileText,
  Plus,
  Trash2,
  Download,
  Filter,
  Search,
  Save,
  Edit,
  X,
  TrendingDown,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  CreditCard,
  Wallet,
  Banknote,
  Receipt,
  File,
  ExternalLink
} from "lucide-react";
import { message, Popconfirm, Modal } from "antd";
import { expenditureAPI, BASE_URL } from "../../services/api";

const ExpenditureManagement = () => {
  const [activeTab, setActiveTab] = useState("manage");
  const [viewMode, setViewMode] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  /* ---------------- MASTER DATA ---------------- */
  const expenditureTypes = [
    "Milk",
    "Food",
    "Maid Salary",
    "Bakery",
    "Intern Stipend",
    "LinkedIn Subscription",
    "The Cake Home",
    "Flower Bill",
    "Electricity Bill",
    "AirFiber Bill",
    "Others"
  ];

  const paymentModes = [
    "Net Banking",
    "UPI",
    "Credit Card",
    "Cheque",
    "Cash"
  ];

  const documentTypes = [
    "Invoice",
    "Voucher",
    "Not Applicable"
  ];

  const locations = ["Chennai", "Hosur"];
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthNames = {
    "Jan": "January", "Feb": "February", "Mar": "March", "Apr": "April",
    "May": "May", "Jun": "June", "Jul": "July", "Aug": "August",
    "Sep": "September", "Oct": "October", "Nov": "November", "Dec": "December"
  };
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  /* ---------------- MANAGE TAB STATES ---------------- */
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [location, setLocation] = useState("");
  const [budgetAllocated, setBudgetAllocated] = useState("");

  const [expenditures, setExpenditures] = useState([]);
  const [saveLoading, setSaveLoading] = useState(false);
  const [savingMessage, setSavingMessage] = useState("");

  const [newExpense, setNewExpense] = useState({
    type: "",
    customType: "",
    paymentMode: "",
    amount: "",
    documentType: "",
    file: null,
    fileName: "",
    file: null,
    fileName: "",
    remarks: "",
    date: ""
  });

  /* ---------------- SUMMARY TAB STATES ---------------- */
  const [summaryLocation, setSummaryLocation] = useState("");
  const [summaryYear, setSummaryYear] = useState(new Date().getFullYear().toString());
  const [loading, setLoading] = useState(false);
  const [summaryData, setSummaryData] = useState([]);

  /* ---------------- MODAL STATES ---------------- */
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [detailedRecord, setDetailedRecord] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [currentDocument, setCurrentDocument] = useState(null);
  const [documentType, setDocumentType] = useState("");

  // New States for Validation and Editing
  // New States for Validation and Editing
  const [errors, setErrors] = useState({});
  const [summaryErrors, setSummaryErrors] = useState({});
  const [editingExpenditureId, setEditingExpenditureId] = useState(null);

  const monthMap = {
    "Jan": 0, "Feb": 1, "Mar": 2, "Apr": 3, "May": 4, "Jun": 5,
    "Jul": 6, "Aug": 7, "Sep": 8, "Oct": 9, "Nov": 10, "Dec": 11
  };

  const getMonthDateRange = () => {
    if (!month || !year) return { min: "", max: "", disabled: true };
    const monthIndex = monthMap[month];
    if (monthIndex === undefined) return { min: "", max: "", disabled: true };

    const yearNum = parseInt(year);
    // First day: yyyy-mm-01
    const min = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-01`;
    // Last day:
    const lastDay = new Date(yearNum, monthIndex + 1, 0).getDate();
    const max = `${yearNum}-${String(monthIndex + 1).padStart(2, '0')}-${lastDay}`;
    return { min, max, disabled: false };
  };

  /* ---------------- CALCULATIONS ---------------- */
  const budgetSpent = expenditures.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);
  const remainingBalance = parseFloat(budgetAllocated || 0) - budgetSpent;
  const budgetStatus = remainingBalance >= 0 ? "success" : "danger";
  const budgetStatusText = remainingBalance >= 0
    ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
    : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

  /* ---------------- INITIAL LOAD ---------------- */
  useEffect(() => {
    testAPIConnection();
  }, []);

  // Auto-load summary when switching to Summary tab or changing year/location
  useEffect(() => {
    if (activeTab === "summary" && summaryYear) {
      loadSummary();
    }
  }, [activeTab, summaryYear, summaryLocation]);

  // Check for existing record when Month, Year, Location changes
  useEffect(() => {
    if (month && year && location && !viewMode) {
      checkExistingRecord();
    }
  }, [month, year, location]);

  const checkExistingRecord = async () => {
    try {
      // Check if a record already exists for this combination
      const res = await expenditureAPI.getSummary({ year, location });
      if (res.data && res.data.success) {
        // Look for exact match on month
        const existing = res.data.data.find(r => r.month === month);

        if (existing) {
          const confirmLoad = window.confirm(
            `A record for ${month} ${year} in ${location} already exists.\n\n` +
            `You cannot create a duplicate record.\n` +
            `Click OK to load the existing record for editing/adding expenditures.\n` +
            `Click Cancel to change the selection.`
          );

          if (confirmLoad) {
            loadRecordForEditing(existing._id || existing.id);
          } else {
            // Clear selection to prevent user from trying to save
            setMonth("");
          }
        }
      }
    } catch (err) {
      console.error("Error checking for existing record:", err);
    }
  };

  const testAPIConnection = async () => {
    try {
      console.log("Testing API connection...");
      const response = await expenditureAPI.healthCheck();
      console.log("✅ API Connection successful:", response.data);
    } catch (error) {
      console.error("❌ API Connection failed:", error);
      message.error(`⚠️ Cannot connect to server. Please make sure backend is running on http://localhost:5003 - Error: ${error.message}`);
    }
  };

  /* ---------------- DOCUMENT FUNCTIONS ---------------- */
  const viewUploadedFile = (fileObject, fileName) => {
    if (!fileObject) {
      message.warning("No file to view");
      return;
    }

    if (fileObject.constructor && fileObject.constructor.name === 'File') {
      const fileURL = URL.createObjectURL(fileObject);
      setCurrentDocument({
        file: fileURL,
        name: fileName || fileObject.name,
        type: fileObject.type
      });
      setDocumentType(fileObject.type.startsWith('image/') ? 'image' :
        fileObject.type === 'application/pdf' ? 'pdf' : 'file');
      setDocumentModalOpen(true);
    } else if (typeof fileObject === 'string') {
      let fileUrl = fileObject;
      if (fileObject.startsWith('/uploads')) {
        fileUrl = `${BASE_URL}${fileObject}`;
      }
      
      setCurrentDocument({
        file: fileUrl,
        name: fileName || "Document",
        type: "file"
      });
      
      const extension = fileName ? fileName.split('.').pop().toLowerCase() : '';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(extension)) {
        setDocumentType('image');
      } else if (extension === 'pdf') {
        setDocumentType('pdf');
      } else {
        setDocumentType("file");
      }
      setDocumentModalOpen(true);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        message.error('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        message.error('File size should be less than 5MB');
        return;
      }

      setNewExpense({
        ...newExpense,
        file: file,
        fileName: file.name
      });
    }
  };

  /* ---------------- MANAGE TAB FUNCTIONS ---------------- */
  const addExpenditure = async () => {
    let type = newExpense.type;
    if (type === "Others" && newExpense.customType.trim()) {
      type = newExpense.customType;
    }

    // Validation
    const newErrors = {};
    // Check Master Fields
    if (!month) newErrors.month = "Month is required";
    if (!year) newErrors.year = "Year is required";
    if (!location) newErrors.location = "Location is required";
    if (!budgetAllocated) newErrors.budgetAllocated = "Budget Allocated is required";

    // Check Expenditure Fields
    if (!type) newErrors.type = true;
    if (!newExpense.paymentMode) newErrors.paymentMode = true;
    if (!newExpense.amount) newErrors.amount = true;
    if (!newExpense.date) newErrors.date = true;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      // alert("Please fill all required fields correctly.");
      return;
    }

    if (parseFloat(newExpense.amount) <= 0) {
      message.error("Amount must be greater than 0");
      return;
    }

    let filePath = newExpense.filePath || "";
    // Upload File if present and new
    if (newExpense.file && typeof newExpense.file === 'object') {
        try {
            const formData = new FormData();
            formData.append('file', newExpense.file);
            const hide = message.loading('Uploading file...', 0);
            const response = await expenditureAPI.uploadFile(formData);
            hide();
            
            if (response.data.success) {
                filePath = response.data.filePath;
                message.success("File uploaded successfully");
            }
        } catch (error) {
            console.error("File upload failed", error);
            message.error("File upload failed");
            return;
        }
    } else if (typeof newExpense.file === 'string') {
        filePath = newExpense.file;
    }

    if (editingExpenditureId) {
      // Update existing
      setExpenditures(expenditures.map(exp =>
        exp.id === editingExpenditureId ? {
          ...exp,
          type: type,
          paymentMode: newExpense.paymentMode,
          amount: parseFloat(newExpense.amount) || 0,
          date: newExpense.date,
          documentType: newExpense.documentType || 'Not Applicable',
          file: filePath,
          filePath: filePath,
          fileName: newExpense.fileName,
          remarks: newExpense.remarks
        } : exp
      ));
      setEditingExpenditureId(null);
    } else {
      // Add new
      const newExpenditure = {
        id: Date.now() + Math.random(), // Unique ID
        type: type,
        paymentMode: newExpense.paymentMode,
        amount: parseFloat(newExpense.amount) || 0,
        date: newExpense.date,
        documentType: newExpense.documentType || 'Not Applicable',
        file: filePath,
        filePath: filePath,
        fileName: newExpense.fileName,
        remarks: newExpense.remarks,
        sNo: expenditures.length + 1
      };
      setExpenditures([...expenditures, newExpenditure]);
    }

    // Reset Form
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      filePath: "",
      fileName: "",
      remarks: "",
      date: ""
    });
    setErrors({});
  };

  const removeExpense = (id) => {
    setExpenditures(expenditures.filter((e) => e.id !== id));
    // Update serial numbers
    setExpenditures(prev => prev.map((item, index) => ({
      ...item,
      sNo: index + 1
    })));
    message.success("Expenditure deleted successfully");
  };

  const editExpense = (id) => {
    const expenseToEdit = expenditures.find(e => e.id === id);
    if (expenseToEdit) {
      setNewExpense({
        type: expenseToEdit.type,
        customType: expenseToEdit.type === "Others" ? expenseToEdit.type : "",
        paymentMode: expenseToEdit.paymentMode,
        amount: expenseToEdit.amount,
        documentType: expenseToEdit.documentType,
        file: expenseToEdit.file,
        filePath: expenseToEdit.filePath,
        fileName: expenseToEdit.fileName,
        remarks: expenseToEdit.remarks,
        date: expenseToEdit.date
      });
      setEditingExpenditureId(id);
      setErrors({});
      // removeExpense(id); // Don't remove for better UX
    }
  };

  const clearForm = () => {
    setMonth("");
    setYear("");
    setLocation("");
    setBudgetAllocated("");
    setExpenditures([]);
    setSelectedRecord(null);
    setViewMode(false);
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      filePath: "",
      fileName: "",
      remarks: "",
      date: ""
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  /* ---------------- CANCEL EDIT FUNCTION ---------------- */
  const cancelEdit = () => {
    setNewExpense({
      type: "",
      customType: "",
      paymentMode: "",
      amount: "",
      documentType: "",
      file: null,
      filePath: "",
      fileName: "",
      remarks: "",
      date: ""
    });
    setErrors({});
    setEditingExpenditureId(null);
  };

  /* ---------------- SAVE FUNCTION WITH PROPER DB INTEGRATION ---------------- */
  const saveRecord = async () => {
    // Validate required fields
    if (!month || !year || !location || !budgetAllocated) {
      message.error("Month, Year, Location, and Budget Allocated are required");
      return;
    }

    if (expenditures.length === 0) {
      message.warning("Please add at least one expenditure record");
      return;
    }

    // Prepare record data
    const record = {
      month,
      year: parseInt(year),
      location,
      budgetAllocated: parseFloat(budgetAllocated || 0),
      expenditures: expenditures.map(e => ({
        type: e.type,
        paymentMode: e.paymentMode,
        amount: parseFloat(e.amount || 0),
        date: e.date,
        documentType: e.documentType || 'Not Applicable',
        fileName: e.fileName || '',
        filePath: e.filePath || '',
        remarks: e.remarks || ''
        // Note: file object is not included as it needs separate handling
      }))
    };

    try {
      setSaveLoading(true);
      setSavingMessage("Saving record to database...");

      console.log('📤 Preparing to save record:', record);

      let response;
      if (viewMode && selectedRecord) {
        console.log('✏️ Updating existing record:', selectedRecord._id);
        response = await expenditureAPI.updateRecord(selectedRecord._id, record);
      } else {
        console.log('➕ Creating new record');
        response = await expenditureAPI.saveMonthlyRecord(record);
      }

      console.log('✅ API Response:', response.data);

      if (response.data && response.data.success) {
        message.success(`✅ Record ${viewMode ? 'updated' : 'saved'} successfully in database!`);

        // Update summary filters to match the saved record
        setSummaryYear(year);
        setSummaryLocation(location);

        // Switch to summary tab to show the saved data
        setActiveTab("summary");

        clearForm();
      } else {
        message.error(`❌ ${viewMode ? 'Update' : 'Save'} failed: ${response.data?.message || "Unknown error"}`);
      }
    } catch (err) {
      console.error("❌ Save error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";

      // Special handling for duplicate record error
      if (err.response?.status === 400 && errorMessage.includes("already exists")) {
        message.error(`❌ Cannot save: A record for this period already exists. Please check the 'Summary' tab to find and edit the existing record.`);
      } else {
        message.error(`❌ Save failed: ${errorMessage}`);
      }

      // Detailed error logging
      if (err.response) {
        console.error("Error status:", err.response.status);
        console.error("Error data:", err.response.data);
        console.error("Error config:", err.response.config);
      }
    } finally {
      setSaveLoading(false);
      setSavingMessage("");
    }
  };

  /* ---------------- SUMMARY TAB FUNCTIONS ---------------- */
  const loadSummary = async () => {
    if (!summaryYear) {
      setSummaryErrors({ summaryYear: "Year is required" });
      return;
    }
    setSummaryErrors({});

    try {
      setLoading(true);
      const params = { year: summaryYear };

      if (summaryLocation && summaryLocation !== "Select All") {
        params.location = summaryLocation;
      }

      console.log('📊 Loading summary with params:', params);
      const res = await expenditureAPI.getSummary(params);
      console.log('📊 Summary response:', res.data);

      if (res.data && res.data.success && res.data.data) {
        const processedData = res.data.data.map((record, index) => {
          const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
          const budgetAllocated = record.budget || record.budgetAllocated || 0;
          const totalBalance = budgetAllocated - totalExpenditure;
          const status = totalBalance >= 0 ? "success" : "danger";
          const statusText = totalBalance >= 0
            ? `Within limit (+₹${totalBalance.toLocaleString('en-IN')})`
            : `Over spent (₹${Math.abs(totalBalance).toLocaleString('en-IN')})`;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            totalExpenditure,
            budgetAllocated,
            totalBalance,
            status,
            statusText
          };
        });

        setSummaryData(processedData);
        console.log('📊 Processed summary data:', processedData);
      } else if (res.data && Array.isArray(res.data.data)) {
        // Handle case where data is directly an array (unwrapped success flag)
        const processedData = res.data.data.map((record, index) => {
          const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
          const budgetAllocated = record.budget || record.budgetAllocated || 0;
          const totalBalance = budgetAllocated - totalExpenditure;
          const status = totalBalance >= 0 ? "success" : "danger";
          const statusText = totalBalance >= 0
            ? `Within limit (+₹${totalBalance.toLocaleString('en-IN')})`
            : `Over spent (₹${Math.abs(totalBalance).toLocaleString('en-IN')})`;

          return {
            ...record,
            id: record._id || record.id,
            sNo: index + 1,
            totalExpenditure,
            budgetAllocated,
            totalBalance,
            status,
            statusText
          };
        });
        setSummaryData(processedData);
      } else {
        console.log('📊 No data found in response');
        setSummaryData([]);
      }
    } catch (err) {
      console.error("❌ Summary error:", err);
      const errorMessage = err.response?.data?.message || err.message || "Unknown error";
      message.error(`❌ Error loading summary data: ${errorMessage}`);
      setSummaryData([]);
    } finally {
      setLoading(false);
    }
  };

  const viewRecordDetails = async (recordId) => {
    try {
      setLoading(true);
      console.log('📄 Fetching record details for ID:', recordId);
      const res = await expenditureAPI.getRecordById(recordId);
      console.log('📄 Record details response:', res.data);

      if (res.data && res.data.success) {
        const record = res.data.data;

        // Calculate totals
        const totalExpenditure = record.expenditures?.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0) || 0;
        const budgetAllocated = record.budget || record.budgetAllocated || 0;
        const remainingBalance = budgetAllocated - totalExpenditure;
        const budgetStatus = remainingBalance >= 0 ? "success" : "danger";
        const budgetStatusText = remainingBalance >= 0
          ? `Within limit (+₹${remainingBalance.toLocaleString('en-IN')})`
          : `Over spent (₹${Math.abs(remainingBalance).toLocaleString('en-IN')})`;

        setDetailedRecord({
          ...record,
          budgetAllocated,
          budgetSpent: totalExpenditure,
          remainingBalance,
          budgetStatus,
          budgetStatusText
        });
        setViewModalOpen(true);
      } else {
        message.warning("No record found");
      }
    } catch (err) {
      console.error("❌ Error loading record details:", err);
      message.error("Failed to load record details");
    } finally {
      setLoading(false);
    }
  };

  const deleteRecord = async (recordId) => {
    try {
      console.log('🗑️ Deleting record:', recordId);
      await expenditureAPI.deleteRecord(recordId);
      message.success("✅ Record deleted successfully from database");

      // Refresh summary if in summary tab
      if (activeTab === "summary" && summaryYear) {
        loadSummary();
      }

      // Clear form if it was the selected record
      if (selectedRecord && selectedRecord._id === recordId) {
        clearForm();
      }
    } catch (err) {
      console.error("❌ Delete error:", err);
      message.error("Failed to delete record from database");
    }
  };

  const loadRecordForEditing = async (recordId) => {
    try {
      setLoading(true);
      console.log('✏️ Loading record for editing:', recordId);
      const res = await expenditureAPI.getRecordById(recordId);

      if (res.data && res.data.success) {
        const record = res.data.data;
        setSelectedRecord(record);
        setViewMode(true);

        // Set basic info
        setMonth(record.month);
        setYear(record.year.toString());
        setLocation(record.location);
        setBudgetAllocated((record.budget || record.budgetAllocated || 0).toString());

        // Set expenditures with serial numbers
        const expendituresWithSNo = record.expenditures?.map((exp, index) => ({
          ...exp,
          file: exp.filePath || exp.file,
          id: exp._id || Date.now() + Math.random(),
          sNo: index + 1
        })) || [];

        setExpenditures(expendituresWithSNo);

        // Switch to manage tab
        setActiveTab("manage");

        message.success("Record loaded for editing. Make changes and click 'Update Record' to save.");
      } else {
        message.error("Failed to load record");
      }
    } catch (err) {
      console.error("❌ Error loading record:", err);
      message.error("Failed to load record for editing");
    } finally {
      setLoading(false);
    }
  };

  /* ---------------- EXPORT FUNCTIONS ---------------- */
  const exportToCSV = () => {
    if (!month || !year || !location || !budgetAllocated) {
      message.warning("Please fill all required fields: Month, Year, Location, and Budget Allocated");
      return;
    }

    const headers = ["Month", "Year", "Location", "Budget Allocated (₹)", "Budget Spent (₹)", "Remaining Balance (₹)", "Status"];
    const mainRow = [
      month,
      year,
      location,
      budgetAllocated,
      budgetSpent.toFixed(2),
      remainingBalance.toFixed(2),
      budgetStatusText
    ];

    const expenditureHeaders = ["S.No", "Date", "Type of Expenditure", "Mode of Payment", "Amount (₹)", "Documents", "Remarks"];
    const expenditureRows = expenditures.map(exp => [
      exp.sNo,
      exp.date,
      exp.type,
      exp.paymentMode,
      exp.amount,
      exp.fileName || "-",
      exp.remarks || "-"
    ]);

    let csvContent = "EXPENDITURE MANAGEMENT RECORD\n\n";
    csvContent += "Summary:\n";
    csvContent += headers.join(',') + '\n';
    csvContent += mainRow.join(',') + '\n\n';

    csvContent += "Expenditure Details:\n";
    csvContent += expenditureHeaders.join(',') + '\n';
    expenditureRows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenditure_${month}_${year}_${location}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportSummaryToCSV = () => {
    if (summaryData.length === 0) {
      message.warning("No summary data to export");
      return;
    }

    // Modified headers - removed Year and Location from individual rows
    const headers = ["S.No", "Month", "Budget Allocated (₹)", "Budget Spent (₹)", "Total Balance (₹)", "Budget Status"];

    const rows = summaryData.map(row => {
      return [
        row.sNo,
        row.month,
        row.budgetAllocated?.toFixed(2) || "0.00",
        row.totalExpenditure?.toFixed(2) || "0.00",
        row.totalBalance?.toFixed(2) || "0.00",
        row.statusText || "-"
      ];
    });

    // Add overall summary with Year and Location in header
    let csvContent = `EXPENDITURE SUMMARY REPORT - ${summaryYear}`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += ` - ${summaryLocation}`;
    }
    csvContent += '\n\n';

    csvContent += headers.join(',') + '\n';
    rows.forEach(row => {
      csvContent += row.join(',') + '\n';
    });

    // Calculate overall summary
    const overallSummary = summaryData.reduce((acc, row) => {
      return {
        totalBudgetAllocated: acc.totalBudgetAllocated + (row.budgetAllocated || 0),
        totalBudgetSpent: acc.totalBudgetSpent + (row.totalExpenditure || 0),
        monthsCount: acc.monthsCount + 1
      };
    }, { totalBudgetAllocated: 0, totalBudgetSpent: 0, monthsCount: 0 });

    const overallBalance = overallSummary.totalBudgetAllocated - overallSummary.totalBudgetSpent;

    csvContent += '\nOverall Summary:\n';
    csvContent += `Year,${summaryYear}\n`;
    if (summaryLocation && summaryLocation !== "Select All") {
      csvContent += `Location,${summaryLocation}\n`;
    }
    csvContent += `Total Budget Allocated,₹${overallSummary.totalBudgetAllocated.toFixed(2)}\n`;
    csvContent += `Total Budget Spent,₹${overallSummary.totalBudgetSpent.toFixed(2)}\n`;
    csvContent += `Overall Balance,₹${overallBalance.toFixed(2)}\n`;
    csvContent += `Average Monthly Spend,₹${(overallSummary.totalBudgetSpent / overallSummary.monthsCount).toFixed(2)}\n`;
    csvContent += `Number of Months,${overallSummary.monthsCount}\n`;

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenditure_summary_${summaryYear}_${summaryLocation || 'all'}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">

        <div className="flex items-center gap-3">
          {activeTab === "manage" && (
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
              disabled={!month || !year || !location}
            >
              <Download className="w-4 h-4" />
              Export CSV
            </button>
          )}
          {activeTab === "summary" && summaryData.length > 0 && (
            <button
              onClick={exportSummaryToCSV}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export Summary
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6">
        <div className="flex border-b">
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === "manage"
              ? "border-b-2 border-[#262760] text-[#262760]"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => setActiveTab("manage")}
          >
            Manage Expenditure
          </button>
          <button
            className={`px-6 py-3 font-medium text-sm transition-colors ${activeTab === "summary"
              ? "border-b-2 border-[#262760] text-[#262760]"
              : "text-gray-500 hover:text-gray-700"
              }`}
            onClick={() => {
              setActiveTab("summary");
              setMonth(""); // Reset month filter
            }}
          >
            View Summary
          </button>
        </div>
      </div>

      {/* MANAGE TAB */}
      {activeTab === "manage" && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {/* Header Information */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Enter Monthly Details</h3>
                {viewMode && selectedRecord && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
                    Editing: {monthNames[month] || month} {year} - {location}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.month ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={month}
                    onChange={(e) => {
                      setMonth(e.target.value);
                      if (errors.month) setErrors({ ...errors, month: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Month</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                  {errors.month && <p className="text-red-500 text-xs mt-1">{errors.month}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.year ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={year}
                    onChange={(e) => {
                      setYear(e.target.value);
                      if (errors.year) setErrors({ ...errors, year: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Year</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.location ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={location}
                    onChange={(e) => {
                      setLocation(e.target.value);
                      if (errors.location) setErrors({ ...errors, location: null });
                    }}
                    required
                    disabled={viewMode}
                  >
                    <option value="">Select Location</option>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                  {errors.location && <p className="text-red-500 text-xs mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Budget Allocated (₹) *</label>
                  <input
                    type="text"
                    placeholder="Enter budget amount"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.budgetAllocated ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={budgetAllocated}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits and a single decimal point
                      if (/^\d*\.?\d*$/.test(value) && value.length <= 8) {
                        setBudgetAllocated(value);
                      }
                      if (errors.budgetAllocated) setErrors({ ...errors, budgetAllocated: null });
                    }}
                    required
                  />
                  {errors.budgetAllocated && <p className="text-red-500 text-xs mt-1">{errors.budgetAllocated}</p>}
                </div>
              </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-700 mb-1">Budget Allocated</p>
                    <p className="text-2xl font-bold text-blue-800">
                      ₹{parseFloat(budgetAllocated || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                  <TrendingUp className="w-8 h-8 text-blue-500" />
                </div>
              </div>

              <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-700 mb-1">Budget Spent</p>
                    <p className="text-2xl font-bold text-red-800">
                      ₹{budgetSpent.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-red-600">{expenditures.length} records</p>
                  </div>
                  <TrendingDown className="w-8 h-8 text-red-500" />
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${budgetStatus === "danger" ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-700 mb-1">Remaining Balance</p>
                    <p className={`text-2xl font-bold ${budgetStatus === "danger" ? 'text-red-600' : 'text-green-600'}`}>
                      ₹{remainingBalance.toLocaleString('en-IN')}
                    </p>
                    <p className="text-xs text-gray-600">
                      {budgetStatusText}
                    </p>
                  </div>
                  {budgetStatus === "danger" ? (
                    <AlertCircle className="w-8 h-8 text-red-500" />
                  ) : (
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  )}
                </div>
              </div>
            </div>

            {/* Add New/Edit Expenditure Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">{editingExpenditureId ? "Edit Expenditure" : "Add New Expenditure"}</h3>
              <div className="grid grid-cols-1 md:grid-cols-8 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.type ? 'border-red-500' : ''}`}
                    value={newExpense.type}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, type: e.target.value });
                      if (errors.type) setErrors({ ...errors, type: null });
                    }}
                    required
                  >
                    <option value="">Select Type</option>
                    {expenditureTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                  {errors.type && <p className="text-red-500 text-xs mt-1">Type is required</p>}
                  {newExpense.type === "Others" && (
                    <input
                      type="text"
                      placeholder="Enter custom type"
                      className="w-full mt-2 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                      value={newExpense.customType}
                      onChange={(e) => setNewExpense({ ...newExpense, customType: e.target.value })}
                    />
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Mode *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.paymentMode ? 'border-red-500' : ''}`}
                    value={newExpense.paymentMode}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, paymentMode: e.target.value });
                      if (errors.paymentMode) setErrors({ ...errors, paymentMode: null });
                    }}
                    required
                  >
                    <option value="">Select Mode</option>
                    {paymentModes.map(mode => (
                      <option key={mode} value={mode}>{mode}</option>
                    ))}
                  </select>
                  {errors.paymentMode && <p className="text-red-500 text-xs mt-1">Payment Mode is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                  <input
                    type="text"
                    placeholder="Amount"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.amount ? 'border-red-500' : ''}`}
                    value={newExpense.amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      // Only allow digits and a single decimal point
                      if (/^\d*\.?\d*$/.test(value) && value.length <= 8) {
                        setNewExpense({ ...newExpense, amount: value });
                      }
                      if (errors.amount) setErrors({ ...errors, amount: null });
                    }}
                    required
                  />
                  {errors.amount && <p className="text-red-500 text-xs mt-1">Amount is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${errors.date ? 'border-red-500' : ''} disabled:bg-gray-100 disabled:text-gray-500`}
                    value={newExpense.date}
                    onChange={(e) => {
                      setNewExpense({ ...newExpense, date: e.target.value });
                      if (errors.date) setErrors({ ...errors, date: null });
                    }}
                    required
                    disabled={getMonthDateRange().disabled}
                    min={getMonthDateRange().min}
                    max={getMonthDateRange().max}
                  />
                  {errors.date && <p className="text-red-500 text-xs mt-1">Date is required</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={newExpense.documentType}
                    onChange={(e) => setNewExpense({ ...newExpense, documentType: e.target.value })}
                  >
                    <option value="">Select</option>
                    {documentTypes.map(doc => (
                      <option key={doc} value={doc}>{doc}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload File</label>
                  <div className="flex items-center">
                    <label className="cursor-pointer bg-white border rounded-lg px-3 py-2 hover:bg-gray-50 w-full">
                      <span className="text-gray-600 text-sm">{newExpense.fileName || "Choose file"}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        accept=".jpg,.jpeg,.png,.pdf"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Remarks</label>
                  <input
                    type="text"
                    placeholder="Remarks"
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={newExpense.remarks}
                    onChange={(e) => setNewExpense({ ...newExpense, remarks: e.target.value })}
                  />
                </div>

                <div className="flex items-end gap-2">
                  {editingExpenditureId && (
                    <button
                      onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors w-full flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      Cancel
                    </button>
                  )}
                  <button
                    onClick={addExpenditure}
                    className="px-4 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors w-full flex items-center justify-center gap-2"
                  >
                    {editingExpenditureId ? <Edit className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingExpenditureId ? "Update" : "Add"}
                  </button>
                </div>
              </div>
            </div>

            {/* Expenditure Table */}
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Expenditure Records ({expenditures.length} items)
              </h3>

              <div className="overflow-x-auto border rounded-lg">
                <table className="w-full">
                  <thead className="bg-[#262760]">
                    <tr>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">S.No</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Date</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Type of Expenditure</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Mode of Payment</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Amount (₹)</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Documents</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Location</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Remarks</th>
                      <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenditures.map(exp => (
                      <tr key={exp.id} className="border-t hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-center">{exp.sNo}</td>
                        <td className="px-4 py-3">{exp.date}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{exp.type}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-gray-600">
                            {exp.paymentMode === "Credit Card" && <CreditCard className="w-4 h-4" />}
                            {exp.paymentMode === "UPI" && <Receipt className="w-4 h-4" />}
                            {exp.paymentMode === "Net Banking" && <Banknote className="w-4 h-4" />}
                            {exp.paymentMode === "Cash" && <Wallet className="w-4 h-4" />}
                            {exp.paymentMode === "Cheque" && <FileText className="w-4 h-4" />}
                            {exp.paymentMode}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          ₹{parseFloat(exp.amount || 0).toLocaleString('en-IN')}
                        </td>
                        <td className="px-4 py-3">
                          {exp.fileName ? (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => viewUploadedFile(exp.file || exp.filePath, exp.fileName)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View Document"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <span className="text-sm text-gray-600 truncate max-w-[120px]">
                                {exp.fileName}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{location || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-gray-600">{exp.remarks || "-"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => editExpense(exp.id)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <Popconfirm
                              title="Delete Expenditure"
                              description="Are you sure you want to delete this expenditure?"
                              onConfirm={() => removeExpense(exp.id)}
                              okText="Yes"
                              cancelText="No"
                              disabled={!!editingExpenditureId}
                            >
                              <button
                                className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                title="Delete"
                                disabled={!!editingExpenditureId}
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </Popconfirm>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {expenditures.length === 0 && (
                      <tr>
                        <tr>
                          <td colSpan="9" className="px-4 py-8 text-center text-gray-500">
                            No expenditure records added yet. Add your first expenditure above.
                          </td>
                        </tr>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save/Update Button */}
            <div className="flex justify-end gap-3">
              <button
                onClick={clearForm}
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Clear Form
              </button>
              <button
                onClick={saveRecord}
                disabled={saveLoading}
                className="px-6 py-3 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                {saveLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {savingMessage || (viewMode ? "Updating..." : "Saving...")}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {viewMode ? "Update Record" : "Save Monthly Record"}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SUMMARY TAB - MODIFIED TABLE (Removed Year and Location columns) */}
      {activeTab === "summary" && (
        <div className="bg-white rounded-lg shadow border">
          <div className="p-6">
            {/* Filters with Year and Location in header */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Summary Filters - {summaryYear} {summaryLocation && summaryLocation !== "Select All" ? `- ${summaryLocation}` : ""}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                  >
                    <option value="">All Months</option>
                    {months.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year *</label>
                  <select
                    className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent ${summaryErrors.summaryYear ? 'border-red-500' : ''}`}
                    value={summaryYear}
                    onChange={(e) => {
                      setSummaryYear(e.target.value);
                      if (summaryErrors.summaryYear) setSummaryErrors({ ...summaryErrors, summaryYear: null });
                    }}
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                  {summaryErrors.summaryYear && <p className="text-red-500 text-xs mt-1">{summaryErrors.summaryYear}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <select
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#262760] focus:border-transparent"
                    value={summaryLocation}
                    onChange={(e) => setSummaryLocation(e.target.value)}
                  >
                    <option value="">Select All</option>
                    {locations.map(l => (
                      <option key={l} value={l}>{l}</option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    onClick={loadSummary}
                    className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050] transition-colors w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Filter className="w-4 h-4" />
                        Load Summary
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Summary Header showing Year and Location */}
            {summaryData.length > 0 && !loading && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-800">
                      Summary for {summaryYear}
                      {summaryLocation && summaryLocation !== "Select All" ? ` - ${summaryLocation}` : " (All Locations)"}
                    </h4>
                    <p className="text-sm text-gray-600">
                      {summaryData.length} month{summaryData.length !== 1 ? 's' : ''} of data
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Records: {summaryData.length}</p>
                    <p className="text-sm text-gray-600">Generated: {new Date().toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Table - MODIFIED: Removed Year and Location columns */}
            <div className="overflow-x-auto border rounded-lg mb-6">
              <table className="w-full">
                <thead className="bg-[#262760]">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">S.No</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Month</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Location</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Allocated (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Spent (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Total Balance (₹)</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Budget Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-8 text-center">
                        <div className="flex justify-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#262760]"></div>
                        </div>
                      </td>
                    </tr>
                  ) : summaryData.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="px-4 py-12 text-center text-gray-500">
                        <div className="flex flex-col items-center">
                          <Calendar className="w-12 h-12 text-gray-300 mb-4" />
                          <p className="text-lg font-medium text-gray-600">No summary data</p>
                          <p className="text-gray-500 mt-1">Select year and click "Load Summary"</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    summaryData
                      .filter(row => !month || row.month === month)
                      .map((row) => (
                        <tr key={row.id} className="border-t hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-center">{row.sNo}</td>
                          <td className="px-4 py-3 font-medium">
                            {monthNames[row.month] || row.month}
                          </td>
                          <td className="px-4 py-3">
                            {row.location || "-"}
                          </td>
                          <td className="px-4 py-3">
                            ₹{row.budgetAllocated?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className="px-4 py-3 text-red-600">
                            ₹{row.totalExpenditure?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className={`px-4 py-3 font-bold ${row.totalBalance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            ₹{row.totalBalance?.toLocaleString('en-IN') || '0'}
                          </td>
                          <td className={`px-4 py-3 ${row.status === "danger" ? 'text-red-600' : 'text-green-600'}`}>
                            <div className="flex items-center gap-2">
                              {row.status === "danger" ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : (
                                <CheckCircle className="w-4 h-4" />
                              )}
                              <span className="text-sm">{row.statusText}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => viewRecordDetails(row.id)}
                                className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="View Details"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => loadRecordForEditing(row.id)}
                                className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                                title="Edit Record"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <Popconfirm
                                title="Delete Record"
                                description="Are you sure you want to delete this record? This action cannot be undone."
                                onConfirm={() => deleteRecord(row.id)}
                                okText="Yes, Delete"
                                cancelText="Cancel"
                                okButtonProps={{ danger: true }}
                              >
                                <button
                                  className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                                  title="Delete Record"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </Popconfirm>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Overall Summary Statistics */}
            {summaryData.length > 0 && !loading && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <h4 className="font-medium text-gray-700 mb-2">Total Budget Allocated</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    ₹{summaryData.reduce((sum, row) => sum + (row.budgetAllocated || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    {summaryData.length} months
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                  <h4 className="font-medium text-gray-700 mb-2">Total Budget Spent</h4>
                  <p className="text-2xl font-bold text-red-600">
                    ₹{summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    Total expenditure
                  </p>
                </div>
                <div className={`p-4 rounded-lg border ${summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                  <h4 className="font-medium text-gray-700 mb-2">Overall Balance</h4>
                  <p className={`text-2xl font-bold ${summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {summaryData.reduce((sum, row) => sum + (row.totalBalance || 0), 0) < 0 ? "Over Budget" : "Within Budget"}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-100">
                  <h4 className="font-medium text-gray-700 mb-2">Avg. Monthly Spend</h4>
                  <p className="text-2xl font-bold text-purple-600">
                    ₹{(summaryData.reduce((sum, row) => sum + (row.totalExpenditure || 0), 0) / summaryData.length).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">
                    Average per month
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* DETAIL VIEW MODAL */}
      {viewModalOpen && detailedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  Expenditure Details - {monthNames[detailedRecord.month] || detailedRecord.month} {detailedRecord.year} - {detailedRecord.location}
                </h2>
                <p className="text-gray-600 mt-1">
                  Budget Allocated: ₹{detailedRecord.budgetAllocated?.toLocaleString('en-IN')} |
                  Status: <span className={detailedRecord.budgetStatus === "danger" ? "text-red-600" : "text-green-600"}>
                    {detailedRecord.budgetStatusText}
                  </span>
                </p>
              </div>
              <button
                onClick={() => setViewModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-700 mb-1">Budget Allocated</p>
                  <p className="text-2xl font-bold text-blue-800">
                    ₹{Number(detailedRecord.budgetAllocated || 0).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-700 mb-1">Budget Spent</p>
                  <p className="text-2xl font-bold text-red-800">
                    ₹{Number(detailedRecord.budgetSpent || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    {detailedRecord.expenditures?.length || 0} expenditure records
                  </p>
                </div>
                <div className={`p-4 rounded-lg ${Number(detailedRecord.remainingBalance || 0) < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                  <p className="text-sm text-gray-700 mb-1">Remaining Balance</p>
                  <p className={`text-2xl font-bold ${Number(detailedRecord.remainingBalance || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                    ₹{Number(detailedRecord.remainingBalance || 0).toLocaleString('en-IN')}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {detailedRecord.budgetStatusText}
                  </p>
                </div>
              </div>

              {detailedRecord.expenditures && detailedRecord.expenditures.length > 0 && (
                <div className="overflow-x-auto border rounded-lg">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">S.No</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Type</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Payment Mode</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount (₹)</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Document</th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailedRecord.expenditures?.map((exp, idx) => (
                        <tr key={idx} className="border-t hover:bg-gray-50">
                          <td className="px-4 py-3 text-center">{idx + 1}</td>
                          <td className="px-4 py-3">{new Date(exp.date).toLocaleDateString()}</td>
                          <td className="px-4 py-3 font-medium text-gray-900">{exp.type}</td>
                          <td className="px-4 py-3">
                            <div className="text-gray-600">{exp.paymentMode}</div>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            ₹{Number(exp.amount || 0).toLocaleString('en-IN')}
                          </td>
                          <td className="px-4 py-3">
                            {exp.fileName ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => viewUploadedFile(exp.file || exp.filePath, exp.fileName)}
                                  className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <span className="text-sm text-gray-600">{exp.fileName}</span>
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-sm text-gray-600">{exp.remarks || "-"}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t pt-6 flex justify-end gap-3">
                <button
                  onClick={() => setViewModalOpen(false)}
                  className="px-6 py-2 bg-[#262760] text-white rounded-lg hover:bg-[#1e2050]"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setViewModalOpen(false);
                    loadRecordForEditing(detailedRecord._id);
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Edit Record
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT VIEW MODAL */}
      {documentModalOpen && currentDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-white border-b p-6 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800">Document Viewer</h2>
              <button
                onClick={() => setDocumentModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6">
              {documentType === 'image' ? (
                <div className="flex justify-center">
                  <img
                    src={currentDocument.file}
                    alt={currentDocument.name}
                    className="max-w-full max-h-[70vh] object-contain"
                  />
                </div>
              ) : documentType === 'pdf' ? (
                <div className="h-[70vh]">
                  <iframe
                    src={currentDocument.file}
                    className="w-full h-full border-0"
                    title={currentDocument.name}
                  />
                </div>
              ) : (
                <div className="text-center py-12">
                  <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 mb-4">Document: {currentDocument.name}</p>
                  <button
                    onClick={() => window.open(currentDocument.file, '_blank')}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 mx-auto"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Open Document
                  </button>
                </div>
              )}

              <div className="border-t pt-6 flex justify-between items-center">
                <div>
                  <p className="text-sm text-gray-600">File: {currentDocument.name}</p>
                  <p className="text-xs text-gray-500">Type: {documentType.toUpperCase()}</p>
                </div>
                <button
                  onClick={() => {
                    const a = document.createElement('a');
                    a.href = currentDocument.file;
                    a.download = currentDocument.name;
                    a.click();
                  }}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Download
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenditureManagement;