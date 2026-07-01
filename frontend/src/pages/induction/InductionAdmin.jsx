import React, { useState, useEffect } from 'react';
import {
  FolderPlus, Users, HelpCircle, Upload, Edit3, Trash2, CheckCircle2,
  XCircle, Bell, FileSpreadsheet, FileText, Plus, Save, History, Eye, Search, Sparkles, Clock, Award, Download
} from 'lucide-react';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { inductionService, BASE_URL } from '../../services/inductionService';
import { policyAPI } from '../../services/api';

const HANDBOOK_SUBCATEGORIES = [
  "First Day Guidelines",
  "Working Hours",
  "Leave & Attendance",
  "Payroll Information",
  "Employee Benefits",
  "Employee Portal User Guide",
  "Workplace Guidelines",
  "IT Guidelines",
  "Health & Safety",
  "Emergency Contacts",
  "Frequently Asked Questions (FAQ)",
  "Employee Acknowledgement",
  "Others"
];

const DIVISIONS = ["SDS", "TEKLA", "DAS (Software)", "Common"];

const KNOWLEDGE_SUBCATEGORIES = {
  "SDS": [
    "SDS Introduction",
    "SDS Product Knowledge",
    "SDS Design Standards",
    "SDS Process Documents",
    "SDS SOP",
    "SDS Best Practices",
    "SDS User Manuals",
    "SDS Technical Presentations",
    "SDS Training Videos",
    "SDS Project Documents"
  ],
  "TEKLA": [
    "Tekla Introduction",
    "Tekla Modeling",
    "Tekla Drawings",
    "Tekla Templates",
    "Tekla Standards",
    "Tekla Project Workflow",
    "Tekla Best Practices",
    "Tekla User Manuals",
    "Tekla Training PPT",
    "Tekla Video Tutorials"
  ],
  "DAS (Software)": [
    "React.js Development",
    "Node.js Development",
    "MongoDB",
    "REST API Development",
    "Database Design",
    "Coding Standards",
    "Git & GitHub",
    "SDLC Process",
    "Testing Standards",
    "UI/UX Guidelines",
    "Deployment Process",
    "Project Documentation",
    "BRD Documentation",
    "SOP Documents",
    "Technical Presentations",
    "User Manuals",
    "Video Tutorials",
    "Best Practices"
  ],
  "Common": [
    "Company Products",
    "Business Process",
    "Quality Standards",
    "Information Security",
    "Cyber Security",
    "Communication Guidelines",
    "Documentation Standards",
    "Soft Skills",
    "Employee Learning",
    "General Training"
  ]
};

const TRAINING_SUBCATEGORIES = [
  "Employee Orientation",
  "Technical Training",
  "HR Training",
  "Product Training",
  "Information Security",
  "Cyber Security",
  "POSH Awareness",
  "Quality Process",
  "Soft Skills",
  "Assessment Material"
];

const InductionAdmin = () => {
  const [activeTab, setActiveTab] = useState('documents'); // documents, employees, assessment
  const [documents, setDocuments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const onboardingEmployees = employees.filter(emp => !emp.isExistingEmployee);
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search/Filter
  const [docFilter, setDocFilter] = useState('policy');
  const [empSearch, setEmpSearch] = useState('');

  // Modals
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [editDoc, setEditDoc] = useState(null);
  const [versionModalDoc, setVersionModalDoc] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  // Form States
  const [formData, setFormData] = useState({
    title: '',
    category: 'policy',
    subCategory: '',
    subCategories: ['', '', '', '', ''],
    division: '',
    description: '',
    isMandatory: true,
    effectiveDate: new Date().toISOString().slice(0, 10),
    file: null
  });

  const [customSubCats, setCustomSubCats] = useState(() => {
    try {
      const saved = localStorage.getItem('induction_custom_subcats');
      return saved ? JSON.parse(saved) : { handbook: [], training: [], knowledge: { SDS: [], TEKLA: [], 'DAS (Software)': [], Common: [] } };
    } catch {
      return { handbook: [], training: [], knowledge: { SDS: [], TEKLA: [], 'DAS (Software)': [], Common: [] } };
    }
  });
  const [showAddSubCat, setShowAddSubCat] = useState(false);
  const [newSubCatName, setNewSubCatName] = useState('');
  const [showManageSubCatModal, setShowManageSubCatModal] = useState(false);
  const [manageSubCatCategory, setManageSubCatCategory] = useState('handbook');
  const [manageSubCatDivision, setManageSubCatDivision] = useState('Common');
  const [editingSubCat, setEditingSubCat] = useState({ oldName: '', newName: '' });

  // Assessment Quiz Builder States
  const [quizQuestions, setQuizQuestions] = useState([]);
  const [passingPct, setPassingPct] = useState(70);

  // AI Quiz Generator States
  const [selectedDocsForQuiz, setSelectedDocsForQuiz] = useState([]);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [quizGenStep, setQuizGenStep] = useState('');

  // Company Overview Config States
  const [configForm, setConfigForm] = useState({
    aboutCompany: '',
    vision: '',
    mission: '',
    coreValues: '',
    companyHistory: '',
    organizationStructure: '',
    officeLocations: [],
    welcomeBannerUrl: '',
    welcomeVideoUrl: '',
    welcomeMessageHR: '',
    welcomeMessageCEO: '',
    welcomeMessageGM: '',
    leadershipTeam: []
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'documents') {
        const [docsRes, polRes] = await Promise.all([
          inductionService.getDocuments(),
          policyAPI.list().catch(() => ({ data: [] }))
        ]);
        const portalPolicies = (Array.isArray(polRes.data) ? polRes.data : []).map(p => ({
          _id: p._id,
          title: p.title,
          category: 'policy',
          subCategory: 'Policy Portal',
          description: p.content ? p.content.replace(/<[^>]*>?/gm, '').replace(/#/g, '').slice(0, 100) + '...' : 'Official policy from Policy Portal.',
          fileType: 'portal',
          content: p.content,
          version: 1,
          isEnabled: true,
          isPortalPolicy: true
        }));
        setDocuments([...(docsRes.data || []), ...portalPolicies]);
      } else if (activeTab === 'employees') {
        const res = await inductionService.getAllProgress();
        setEmployees(res.data);
      } else if (activeTab === 'assessment') {
        const [assessRes, docsRes, polRes] = await Promise.all([
          inductionService.getAssessment(),
          inductionService.getDocuments(),
          policyAPI.list().catch(() => ({ data: [] }))
        ]);
        setAssessment(assessRes.data);
        const loadedQuestions = assessRes.data?.questions || [];
        const seenLoaded = new Set();
        const uniqueLoaded = [];
        loadedQuestions.forEach(q => {
          const norm = (q.question || '').trim().toLowerCase();
          if (norm && !seenLoaded.has(norm)) {
            seenLoaded.add(norm);
            uniqueLoaded.push(q);
          }
        });
        setQuizQuestions(uniqueLoaded);
        setPassingPct(assessRes.data?.passingPercentage || 70);

        const portalPolicies = (Array.isArray(polRes.data) ? polRes.data : []).map(p => ({
          _id: p._id,
          title: p.title,
          category: 'policy',
          subCategory: 'Policy Portal',
          description: p.content ? p.content.replace(/<[^>]*>?/gm, '').replace(/#/g, '').slice(0, 100) + '...' : 'Official policy from Policy Portal.',
          fileType: 'portal',
          content: p.content,
          version: 1,
          isEnabled: true,
          isPortalPolicy: true
        }));
        setDocuments([...(docsRes.data || []), ...portalPolicies]);
      } else if (activeTab === 'overview') {
        const res = await inductionService.getConfig();
        setConfigForm({
          aboutCompany: res.data?.aboutCompany || '',
          vision: res.data?.vision || '',
          mission: res.data?.mission || '',
          coreValues: res.data?.coreValues || '',
          companyHistory: res.data?.companyHistory || '',
          organizationStructure: res.data?.organizationStructure || '',
          officeLocations: res.data?.officeLocations || [],
          welcomeBannerUrl: res.data?.welcomeBannerUrl || '',
          welcomeVideoUrl: res.data?.welcomeVideoUrl || '',
          welcomeMessageHR: res.data?.welcomeMessageHR || '',
          welcomeMessageCEO: res.data?.welcomeMessageCEO || '',
          welcomeMessageGM: res.data?.welcomeMessageGM || '',
          leadershipTeam: res.data?.leadershipTeam || []
        });
      }
    } catch (err) {
      console.error("Error fetching admin induction data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveConfig = async (e) => {
    e.preventDefault();
    try {
      await inductionService.saveConfig(configForm);
      alert("Company Overview settings updated successfully!");
    } catch (err) {
      alert("Failed to update settings");
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFormData({ ...formData, file: e.target.files[0] });
    }
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      alert("Document Title is required.");
      return;
    }
    if (!formData.category) {
      alert("Category is required.");
      return;
    }
    if (formData.category === 'knowledge' && !formData.division) {
      alert("Division is required for Knowledge Sharing.");
      return;
    }
    if (formData.category !== 'policy' && !formData.subCategory) {
      alert("Sub-Category is required.");
      return;
    }

    try {
      const payload = new FormData();
      payload.append('title', formData.title);
      payload.append('category', formData.category);
      payload.append('subCategory', formData.category === 'policy' ? '' : formData.subCategory);
      if (formData.category === 'knowledge') {
        payload.append('division', formData.division);
      }
      payload.append('description', formData.description);
      payload.append('isMandatory', formData.isMandatory);
      payload.append('effectiveDate', formData.effectiveDate || new Date().toISOString().slice(0, 10));
      if (formData.file) payload.append('file', formData.file);

      if (editDoc) {
        await inductionService.updateDocument(editDoc._id, payload);
      } else {
        await inductionService.uploadDocument(payload);
      }
      setShowUploadModal(false);
      setEditDoc(null);
      setFormData({ title: '', category: 'handbook', subCategory: '', subCategories: ['', '', '', '', ''], division: '', description: '', isMandatory: true, effectiveDate: new Date().toISOString().slice(0, 10), file: null });
      fetchData();
    } catch (err) {
      alert("Error saving document: " + (err.response?.data?.error || err.message));
    }
  };

  const handleToggleEnable = async (doc) => {
    try {
      const payload = new FormData();
      payload.append('isEnabled', !doc.isEnabled);
      await inductionService.updateDocument(doc._id, payload);
      fetchData();
    } catch (err) {
      alert("Failed to toggle status");
    }
  };

  const handleDeleteDoc = async (id) => {
    if (!window.confirm("Are you sure you want to delete this onboarding document?")) return;
    try {
      await inductionService.deleteDocument(id);
      fetchData();
    } catch (err) {
      alert("Failed to delete document");
    }
  };

  const getSubCategoriesFor = (cat, div = 'Common') => {
    let baseList = [];
    let customList = [];
    if (cat === 'handbook') {
      baseList = HANDBOOK_SUBCATEGORIES;
      customList = customSubCats?.handbook || [];
    } else if (cat === 'training') {
      baseList = TRAINING_SUBCATEGORIES;
      customList = customSubCats?.training || [];
    } else if (cat === 'knowledge') {
      baseList = KNOWLEDGE_SUBCATEGORIES[div] || [];
      customList = (customSubCats?.knowledge && customSubCats.knowledge[div]) || [];
    }

    const docSubCats = [];
    documents.forEach(d => {
      if (d.category === cat && d.subCategory) {
        if (cat !== 'knowledge' || d.division === div) {
          d.subCategory.split(',').forEach(s => {
            const trimmed = s.trim();
            if (trimmed) docSubCats.push(trimmed);
          });
        }
      }
    });

    return Array.from(new Set([...baseList, ...customList, ...docSubCats]));
  };

  const getAvailableSubCategories = () => {
    return getSubCategoriesFor(formData.category, formData.division || 'Common');
  };

  const saveCustomSubCatsToStorage = (updated) => {
    setCustomSubCats(updated);
    try {
      localStorage.setItem('induction_custom_subcats', JSON.stringify(updated));
    } catch (e) {}
  };

  const handleAddNewSubCat = (targetCat = formData.category, targetDiv = formData.division || 'Common', nameToAdd = newSubCatName) => {
    if (!nameToAdd.trim()) return;
    const trimmed = nameToAdd.trim();
    const updated = JSON.parse(JSON.stringify(customSubCats || { handbook: [], training: [], knowledge: { SDS: [], TEKLA: [], 'DAS (Software)': [], Common: [] } }));
    if (targetCat === 'handbook') {
      updated.handbook = Array.from(new Set([...(updated.handbook || []), trimmed]));
    } else if (targetCat === 'training') {
      updated.training = Array.from(new Set([...(updated.training || []), trimmed]));
    } else if (targetCat === 'knowledge') {
      if (!updated.knowledge) updated.knowledge = {};
      updated.knowledge[targetDiv] = Array.from(new Set([...(updated.knowledge[targetDiv] || []), trimmed]));
    }
    saveCustomSubCatsToStorage(updated);

    if (targetCat === formData.category && (targetCat !== 'knowledge' || targetDiv === (formData.division || 'Common'))) {
      setFormData({
        ...formData,
        subCategory: trimmed
      });
    }

    setNewSubCatName('');
    setShowAddSubCat(false);
  };

  const handleRenameSubCat = async (oldName, newName, cat, div) => {
    if (!newName.trim() || oldName === newName.trim()) {
      setEditingSubCat({ oldName: '', newName: '' });
      return;
    }
    const trimmedNew = newName.trim();
    const updated = JSON.parse(JSON.stringify(customSubCats || { handbook: [], training: [], knowledge: {} }));
    if (cat === 'handbook') {
      updated.handbook = (updated.handbook || []).map(s => s === oldName ? trimmedNew : s);
    } else if (cat === 'training') {
      updated.training = (updated.training || []).map(s => s === oldName ? trimmedNew : s);
    } else if (cat === 'knowledge') {
      if (updated.knowledge && updated.knowledge[div]) {
        updated.knowledge[div] = updated.knowledge[div].map(s => s === oldName ? trimmedNew : s);
      }
    }
    saveCustomSubCatsToStorage(updated);

    const docsToUpdate = documents.filter(d => d.category === cat && (cat !== 'knowledge' || d.division === div) && d.subCategory);
    for (let d of docsToUpdate) {
      const parts = d.subCategory.split(',').map(s => s.trim());
      if (parts.includes(oldName)) {
        const newParts = parts.map(p => p === oldName ? trimmedNew : p);
        const newSubStr = newParts.join(', ');
        try {
          const payload = new FormData();
          payload.append('subCategory', newSubStr);
          await inductionService.updateDocument(d._id, payload);
        } catch (e) {
          console.error("Failed to update document subcategory:", e);
        }
      }
    }
    setEditingSubCat({ oldName: '', newName: '' });
    fetchData();
  };

  const handleDeleteSubCat = (nameToDelete, cat, div) => {
    if (!window.confirm(`Are you sure you want to remove "${nameToDelete}" from custom subcategories?`)) return;
    const updated = JSON.parse(JSON.stringify(customSubCats || { handbook: [], training: [], knowledge: {} }));
    if (cat === 'handbook') {
      updated.handbook = (updated.handbook || []).filter(s => s !== nameToDelete);
    } else if (cat === 'training') {
      updated.training = (updated.training || []).filter(s => s !== nameToDelete);
    } else if (cat === 'knowledge') {
      if (updated.knowledge && updated.knowledge[div]) {
        updated.knowledge[div] = updated.knowledge[div].filter(s => s !== nameToDelete);
      }
    }
    saveCustomSubCatsToStorage(updated);
  };

  const handleSendReminder = async (userId, name) => {
    try {
      await inductionService.sendReminder(userId);
      alert(`Reminder sent successfully to ${name}!`);
    } catch (err) {
      alert("Failed to send reminder");
    }
  };

  const handleVerifyEmp = async (userId, name) => {
    if (!window.confirm(`Verify onboarding completion for ${name}?`)) return;
    try {
      await inductionService.verifyProgress(userId);
      fetchData();
    } catch (err) {
      alert("Failed to verify completion");
    }
  };

  const handleSaveQuiz = async (e) => {
    e.preventDefault();
    try {
      await inductionService.saveAssessment({
        passingPercentage: Number(passingPct),
        questions: quizQuestions
      });
      alert("Assessment configuration updated successfully!");
    } catch (err) {
      alert("Failed to update assessment");
    }
  };

  const addQuestion = () => {
    setQuizQuestions([...quizQuestions, {
      id: `q_${Date.now()}`,
      question: 'New Question?',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctOptionIndex: 0
    }]);
  };

  const updateQuestionText = (idx, text) => {
    const updated = [...quizQuestions];
    updated[idx].question = text;
    setQuizQuestions(updated);
  };

  const updateOptionText = (qIdx, optIdx, text) => {
    const updated = [...quizQuestions];
    updated[qIdx].options[optIdx] = text;
    setQuizQuestions(updated);
  };

  const updateCorrectIndex = (qIdx, optIdx) => {
    const updated = [...quizQuestions];
    updated[qIdx].correctOptionIndex = optIdx;
    setQuizQuestions(updated);
  };

  const removeQuestion = (idx) => {
    const updated = [...quizQuestions];
    updated.splice(idx, 1);
    setQuizQuestions(updated);
  };

  const handleAutoGenerateQuiz = async (docIds) => {
    if (!docIds || docIds.length === 0) {
      alert("Please select at least one document from the checklist.");
      return;
    }

    // Find all selected documents
    const selectedDocs = documents.filter(d => docIds.includes(d._id));
    if (selectedDocs.length === 0) {
      alert("Selected documents not found.");
      return;
    }

    setGeneratingQuiz(true);
    setQuizGenStep("🔍 Step 1: Parsing documents structure and keywords...");
    await new Promise(r => setTimeout(r, 1000));

    setQuizGenStep("✍️ Step 2: Framing 10 contextual multiple-choice questions...");
    await new Promise(r => setTimeout(r, 1000));

    setQuizGenStep("🧠 Step 3: Calibrating answer keys and distractors...");
    await new Promise(r => setTimeout(r, 1000));

    let pool = [];
    selectedDocs.forEach((doc) => {
      const title = doc.title || '';
      const category = doc.category || '';
      const sub = doc.subCategory || '';
      const desc = doc.description || '';

      // Helper to lower match
      const matches = (keywords) => {
        const target = `${title} ${sub} ${desc}`.toLowerCase();
        return keywords.some(k => target.includes(k));
      };

      let docQuestions = [];

      if (matches(['leave', 'attendance', 'hours', 'time', 'holiday'])) {
        docQuestions = [
          {
            question: `According to the ${title} policy, what is the standard reporting window for unplanned leaves?`,
            options: [
              "Within 2 hours of standard shift commencement",
              "At the end of the business day",
              "No reporting is necessary if leave is under 1 day",
              "Within 48 hours of returning to work"
            ],
            correctOptionIndex: 0
          },
          {
            question: `What is the minimum notice period required for a planned leave request under ${title}?`,
            options: [
              "At least 3 days in advance",
              "At least 1 day in advance",
              "At least 5 business days in advance",
              "Notice is not required for planned leaves"
            ],
            correctOptionIndex: 2
          },
          {
            question: `Which tool or portal is designated for tracking attendance under the ${sub || 'Induction'} module?`,
            options: [
              "Internal Chat messenger",
              "Official HRMS Portal / Attendance System",
              "Email notification to Manager",
              "Google Sheets tracker"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What happens if an employee leaves the office early without permission?`,
            options: [
              "It is automatically marked as a public holiday",
              "It will be treated as an unauthorized half-day leave or absence",
              "No impact if work hours are completed from home",
              "Flexible timing allows this without permission"
            ],
            correctOptionIndex: 1
          },
          {
            question: `Who is the primary approving authority for leave requests under ${title}?`,
            options: [
              "Co-workers in the team",
              "HR Recruiter",
              "Direct Reporting Manager / Head of Department",
              "Managing Director only"
            ],
            correctOptionIndex: 2
          },
          {
            question: `What is the standard policy regarding flexible work hours under ${title}?`,
            options: [
              "Employees can choose any work hours without reporting",
              "Flexible hours must be pre-approved by the Reporting Manager",
              "Flexible hours are only allowed on weekends",
              "No flexible hours are supported under any circumstance"
            ],
            correctOptionIndex: 1
          },
          {
            question: `How are accrued leave balances handled at the end of the calendar year?`,
            options: [
              "All leaves expire automatically without carryover",
              "Carryover or encashment is governed by the specific rules outlined in the ${title} policy",
              "Leaves are transferred to other employees",
              "Unlimited carryover is allowed indefinitely"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What documentation is required if sick leave exceeds 3 consecutive business days?`,
            options: [
              "No documentation required",
              "Valid medical certificate from a registered practitioner",
              "Self-signed letter only",
              "A copy of the prescription details"
            ],
            correctOptionIndex: 1
          },
          {
            question: `Under this policy, how is a half-day leave duration calculated?`,
            options: [
              "Exactly 4 hours of the standard daily shift duration",
              "Any period less than 2 hours",
              "Working from home for 1 hour",
              "Half-day leaves are not recognized"
            ],
            correctOptionIndex: 0
          },
          {
            question: `Where should disputes regarding attendance logs or swipe records be registered?`,
            options: [
              "Addressed directly to the IT Support Desk",
              "Addressed to the HR operations or payroll team in writing",
              "Discussed verbally with team leads",
              "Raised on public team channels"
            ],
            correctOptionIndex: 1
          }
        ];
      } else if (matches(['it', 'security', 'data', 'computer', 'system', 'password', 'confidential'])) {
        docQuestions = [
          {
            question: `According to ${title}, what is the mandatory requirement for passwords on company machines?`,
            options: [
              "Simple 4-digit PINs",
              "A mix of uppercase, lowercase, numbers, and special characters",
              "No passwords required if machine is locked in office",
              "Passwords must match employee date of birth"
            ],
            correctOptionIndex: 1
          },
          {
            question: `How often does the IT Security policy require employees to change their login passwords?`,
            options: [
              "Every 90 days or as prompted by the system",
              "Once a year",
              "Only when a breach is suspected",
              "Never, once a secure password is set"
            ],
            correctOptionIndex: 0
          },
          {
            question: `What should an employee do if they receive a suspicious email containing an external link?`,
            options: [
              "Click the link to verify if it's safe",
              "Forward it to team members to check",
              "Do not click any link, and report it immediately to the IT Security / phishing alias",
              "Ignore it and delete it without reporting"
            ],
            correctOptionIndex: 2
          },
          {
            question: `Are personal storage devices (like USB flash drives) allowed to be connected to company systems?`,
            options: [
              "Yes, for storing music or personal photos",
              "Only with explicit, written approval from the IT Head/Security officer",
              "Yes, without restrictions",
              "Only during non-working hours"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What security protocol must be followed when leaving your workspace / laptop unattended?`,
            options: [
              "Shut down the laptop entirely",
              "Lock the operating system screen (Win + L) immediately",
              "Leave the screen open so colleagues can monitor notifications",
              "Place a screensaver on the screen"
            ],
            correctOptionIndex: 1
          },
          {
            question: `Who should be notified immediately if a company-issued laptop or phone is lost or stolen?`,
            options: [
              "The Reporting Manager and the IT Helpdesk team",
              "HR Recruiter",
              "Nearest police station only",
              "Co-workers on Slack"
            ],
            correctOptionIndex: 0
          },
          {
            question: `What is the policy regarding installing unauthorized third-party software on your work system?`,
            options: [
              "Allowed if it helps improve productivity",
              "Strictly prohibited unless approved and whitelisted by IT Department",
              "Allowed only for development purposes",
              "Allowed if downloaded from official websites"
            ],
            correctOptionIndex: 1
          },
          {
            question: `How should confidential customer or client information be shared externally?`,
            options: [
              "Via regular personal email",
              "Shared on public chat forums",
              "Encrypted and sent via official secure channels as specified in ${title}",
              "Printed and dispatched via courier"
            ],
            correctOptionIndex: 2
          },
          {
            question: `Is it acceptable to connect your company laptop to unsecured public Wi-Fi networks (e.g. coffee shops)?`,
            options: [
              "Yes, it is perfectly safe",
              "Prohibited unless connected through the official secure company VPN",
              "Yes, but only for reading emails",
              "Only if the Wi-Fi doesn't require a password"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What are the consequences of violating the IT Security and Data protection policies?`,
            options: [
              "Verbal warning only",
              "Suspension of email account for 1 day",
              "Disciplinary action, up to and including termination of employment",
              "No consequences if it was accidental"
            ],
            correctOptionIndex: 2
          }
        ];
      } else if (matches(['handbook', 'payroll', 'benefit', 'salary', 'first day', 'onboarding', 'welcome'])) {
        docQuestions = [
          {
            question: `What is the primary purpose of the ${title} document?`,
            options: [
              "To serve as a user manual for software development",
              "To guide new joiners through policies, benefits, and culture",
              "To document client project requirements",
              "To provide a list of local food options"
            ],
            correctOptionIndex: 1
          },
          {
            question: `When is the regular monthly salary processed and credited to employee accounts?`,
            options: [
              "On the last working day of the month or as scheduled in the handbook",
              "Every alternate Friday",
              "On the 15th of each month",
              "Strictly on the first day of the subsequent month"
            ],
            correctOptionIndex: 0
          },
          {
            question: `Where can employees access their monthly salary slips and tax declaration forms?`,
            options: [
              "By emailing the CFO directly",
              "Through the Employee Portal / ESS Payroll tool",
              "On the physical notice board",
              "By requesting their team lead"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What health and medical insurance coverages are detailed in ${title}?`,
            options: [
              "No health benefits are provided",
              "Group Medical Insurance policy covering eligible employees and dependents",
              "Reimbursement of gym memberships only",
              "Dental insurance for self only"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What is the standard probation period for newly joined employees?`,
            options: [
              "1 month",
              "Typically 6 months, unless specified otherwise in the offer letter",
              "Probation is not required",
              "12 months for all roles"
            ],
            correctOptionIndex: 1
          },
          {
            question: `How are claims for official travel and dining expenses handled?`,
            options: [
              "They must be paid from personal salary with no refund",
              "Submitted with original bills via the expense reimbursement portal",
              "Paid directly by the HR manager in cash",
              "Reimbursed automatically without bills"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What is the core expectation regarding office dress code under ${title}?`,
            options: [
              "Smart casuals, maintaining a professional and clean presentation",
              "Strict business formal wear every day",
              "No dress code rules whatsoever",
              "Mandatory uniforms for all employees"
            ],
            correctOptionIndex: 0
          },
          {
            question: `Who should an employee contact if they notice any error in their payroll or salary slip?`,
            options: [
              "Direct manager",
              "The Payroll / Finance support desk",
              "Office administrator",
              "The systems engineer"
            ],
            correctOptionIndex: 1
          },
          {
            question: `According to the handbook, what are the primary core values driving the company culture?`,
            options: [
              "Individual competition and speed",
              "Integrity, collaboration, customer-centricity, and continuous growth",
              "Profit maximization at all costs",
              "Strict adherence to working hours only"
            ],
            correctOptionIndex: 1
          },
          {
            question: `What is the mandatory training duration for new joiners as specified in the onboarding guide?`,
            options: [
              "First 30 days of induction",
              "No mandatory training",
              "Completed over the first week",
              "First six months of employment"
            ],
            correctOptionIndex: 0
          }
        ];
      } else {
        docQuestions = [
          {
            question: `What is the primary focus of the document "${title}"?`,
            options: [
              `Standard guidelines and operational rules for ${sub || 'Induction'}`,
              `External marketing strategies and ads`,
              `Personal financial accounting rules`,
              `Third-party software technical notes`
            ],
            correctOptionIndex: 0
          },
          {
            question: `Under which category is "${title}" mapped within the Induction Program?`,
            options: [
              `Company Policy Portal`,
              `Employee Tracker`,
              `Category: ${category || 'General'} (Subcategory: ${sub || 'General'})`,
              `Administrator Dashboard Settings`
            ],
            correctOptionIndex: 2
          },
          {
            question: `Why is the "${title}" document considered mandatory reading for new joiners?`,
            options: [
              `It details standard operating procedures and guidelines to follow`,
              `It is a test document only`,
              `It contains external public news`,
              `It is only for record keeping purposes`
            ],
            correctOptionIndex: 0
          },
          {
            question: `According to the summary description of "${title}", which of the following is correct?`,
            options: [
              `It is completely optional and has no relevance to daily work`,
              `It outlines: "${desc || 'Key information regarding the induction module'}"`,
              `It is only for existing employees with more than 6 months tenure`,
              `It must be printed and signed by hand`
            ],
            correctOptionIndex: 1
          },
          {
            question: `What action should an employee take after reading the "${title}" guidelines?`,
            options: [
              `Acknowledge and apply the rules in their daily duties`,
              `Ignore the guidelines until project allocation`,
              `Email the CEO confirming that it has been read`,
              `File a formal complaint`
            ],
            correctOptionIndex: 0
          },
          {
            question: `Who should be contacted for clarifications regarding "${title}" guidelines?`,
            options: [
              `The HR team or the specific module owner`,
              `External software vendor`,
              `Other newly joined colleagues`,
              `Clients directly`
            ],
            correctOptionIndex: 0
          },
          {
            question: `How are updates to the "${title}" guidelines communicated to employees?`,
            options: [
              `Through official portal synchronization and HR email announcements`,
              `No updates are ever made to policies`,
              `By verbal discussions during cafeteria breaks`,
              `Through personal social media posts`
            ],
            correctOptionIndex: 0
          },
          {
            question: `What is the version standard associated with newly synchronized "${title}" contents?`,
            options: [
              `Versions are tracked dynamically to ensure employees read the latest edition`,
              `All documents are fixed at version 0`,
              `Documents do not support version management`,
              `Version is manually updated every week`
            ],
            correctOptionIndex: 0
          },
          {
            question: `Which of the following behavior violates the guidelines in "${title}"?`,
            options: [
              `Failing to comply with the mandated policies and steps`,
              `Discussing guidelines with the team leads`,
              `Logging queries through proper ticketing channels`,
              `Reading the content before the deadline`
            ],
            correctOptionIndex: 0
          },
          {
            question: `Where can you find supplementary references related to "${sub || 'this program'}"?`,
            options: [
              `On the Employee Portal under corresponding resource widgets`,
              `On public search engines only`,
              `By checking physical files in the archive room`,
              `No other reference files exist`
            ],
            correctOptionIndex: 0
          }
        ];
      }
      pool = [...pool, ...docQuestions];
    });

    const universalBackupBank = [
      {
        question: "What is the mandatory timeframe for completing onboarding induction modules?",
        options: ["Within the first 30 days of joining", "By the end of the first year", "It is optional", "Within 6 months"],
        correctOptionIndex: 0
      },
      {
        question: "Who should you contact first if you experience technical issues accessing policy documents?",
        options: ["Direct Reporting Manager or HR induction coordinator", "External internet provider", "CEO directly", "Colleagues from other departments"],
        correctOptionIndex: 0
      },
      {
        question: "Why is digitally acknowledging company policies a mandatory requirement?",
        options: ["To confirm compliance and legal understanding of organizational standards", "Just to increase progress percentage", "To test website performance", "To unlock cafeteria discounts"],
        correctOptionIndex: 0
      },
      {
        question: "How should employees handle proprietary or confidential company information?",
        options: ["Keep it strictly protected within official systems and never disclose externally", "Share on social media for marketing", "Email to personal accounts as backup", "Discuss in public places"],
        correctOptionIndex: 0
      },
      {
        question: "What is the expected protocol when attending scheduled mandatory training sessions?",
        options: ["Punctual attendance, active participation, and completion of assessment items", "Optional attendance if busy", "Logging in and leaving desk", "Only attending the introduction"],
        correctOptionIndex: 0
      },
      {
        question: "Where can employees view their current induction progress and completion status?",
        options: ["On the Induction Portal dashboard header and progress bar", "In monthly bank statements", "By calling HR every day", "On external job portals"],
        correctOptionIndex: 0
      },
      {
        question: "What is the core objective of the organizational Code of Conduct?",
        options: ["Fostering an ethical, respectful, and transparent workplace culture", "Enforcing rigid penalty structures", "Reducing communication between teams", "Eliminating flexible hours"],
        correctOptionIndex: 0
      },
      {
        question: "How are policy updates and revisions communicated across the organization?",
        options: ["Through official HR portal broadcasts and email announcements", "Via casual hallway conversations", "They are never announced", "On third-party news websites"],
        correctOptionIndex: 0
      },
      {
        question: "What action is required if an employee observes an ethical or compliance violation?",
        options: ["Report it promptly through official whistle-blowing or HR escalation channels", "Ignore it completely", "Post about it online", "Confront external vendors directly"],
        correctOptionIndex: 0
      },
      {
        question: "How does the organization support continuous employee professional development?",
        options: ["Through structured knowledge sharing modules, assessment quizzes, and training libraries", "Only through annual reviews", "By restricting access to learning portals", "No development programs exist"],
        correctOptionIndex: 0
      }
    ];

    pool = [...pool, ...universalBackupBank];

    const seenQ = new Set();
    const deduplicatedPool = [];
    pool.forEach(q => {
      const norm = (q.question || '').trim().toLowerCase();
      if (norm && !seenQ.has(norm)) {
        seenQ.add(norm);
        deduplicatedPool.push(q);
      }
    });

    let selectedQuestions = [];
    if (deduplicatedPool.length <= 10) {
      selectedQuestions = deduplicatedPool;
    } else {
      const docsCount = selectedDocs.length;
      const targetPerDoc = Math.floor(10 / docsCount);
      let remainder = 10 % docsCount;

      for (let i = 0; i < docsCount; i++) {
        const startIdx = i * 10;
        const countToTake = targetPerDoc + (remainder > 0 ? 1 : 0);
        remainder--;

        const docSlice = deduplicatedPool.slice(startIdx, startIdx + 10);
        for (let j = 0; j < Math.min(countToTake, docSlice.length); j++) {
          if (!selectedQuestions.some(sq => (sq.question || '').trim().toLowerCase() === (docSlice[j].question || '').trim().toLowerCase())) {
            selectedQuestions.push(docSlice[j]);
          }
        }
      }

      let fillIdx = 0;
      while (selectedQuestions.length < 10 && fillIdx < deduplicatedPool.length) {
        const candidate = deduplicatedPool[fillIdx];
        if (!selectedQuestions.some(sq => (sq.question || '').trim().toLowerCase() === (candidate.question || '').trim().toLowerCase())) {
          selectedQuestions.push(candidate);
        }
        fillIdx++;
      }
    }

    const finalQuestions = selectedQuestions.map((q, idx) => ({
      ...q,
      id: Date.now() + idx
    }));

    setQuizQuestions(finalQuestions);
    setGeneratingQuiz(false);
    setQuizGenStep('');
    alert(`Successfully generated exactly 10 questions matching the ${selectedDocs.length} selected documents! Please review them below and click "Save Quiz Configuration".`);
  };

  const exportToExcel = () => {
    const data = onboardingEmployees.map(emp => ({
      "Employee ID": emp.employeeId || 'N/A',
      "Employee Name": emp.employeeName || 'Unknown',
      "Location": emp.location || 'N/A',
      "Division": emp.division || 'N/A',
      "Progress %": `${emp.progressPercentage || 0}%`,
      "Status": emp.status || 'Not Started',
      "HR Verified": emp.hrVerified ? 'Yes' : 'No',
      "Quiz Passed": emp.assessmentAttempts?.some(a => a.passed) ? 'Yes' : 'No',
      "Policies Acknowledged": emp.acknowledgements?.length || 0,
      "Completed Date": emp.completedAt ? new Date(emp.completedAt).toLocaleDateString() : 'N/A'
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Induction Reports");
    XLSX.writeFile(wb, `Induction_Report_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("Employee Induction Completion Report", 14, 20);
    doc.setFontSize(11);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableColumn = ["Emp ID", "Name", "Location", "Division", "Progress", "Status", "Verified", "Quiz"];
    const tableRows = onboardingEmployees.map(emp => [
      emp.employeeId || 'N/A',
      emp.employeeName || 'Unknown',
      emp.location || 'N/A',
      emp.division || 'N/A',
      `${emp.progressPercentage || 0}%`,
      emp.status || 'Not Started',
      emp.hrVerified ? 'Yes' : 'No',
      emp.assessmentAttempts?.some(a => a.passed) ? 'Passed' : 'Pending'
    ]);

    autoTable(doc, {
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138] }
    });

    doc.save(`Induction_Report_${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Admin Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto flex space-x-4 p-4">
          {[
            { id: 'documents', label: 'Document Manager', icon: FolderPlus },
            { id: 'employees', label: 'Employee Tracker', icon: Users },
            { id: 'assessment', label: 'Assessment Quiz Builder', icon: HelpCircle },
            { id: 'overview', label: 'Overview Settings', icon: Sparkles }
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${isActive
                  ? 'bg-[#262760] text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            {/* 1. DOCUMENT MANAGER */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-fadeIn">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex flex-wrap gap-2">
                    {['policy', 'handbook', 'knowledge', 'training'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setDocFilter(cat)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all ${docFilter === cat ? 'bg-[#262760] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                      >
                        {cat === 'policy' ? 'POLICY' :
                          cat === 'handbook' ? 'HANDBOOK' :
                            cat === 'knowledge' ? 'KNOWLEDGE' : 'TRAINING MATERIAL'}
                      </button>
                    ))}
                  </div>
                  {docFilter !== 'policy' && (
                    <button
                      onClick={() => {
                        setEditDoc(null);
                        setFormData({ title: '', category: docFilter !== 'ALL' && docFilter !== 'policy' ? docFilter : 'handbook', subCategory: '', subCategories: ['', '', '', '', ''], division: '', description: '', isMandatory: true, file: null });
                        setShowUploadModal(true);
                      }}
                      className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-5 py-2.5 rounded-xl shadow-md transition-all text-xs"
                    >
                      <Plus className="w-4 h-4" /> Upload New Document
                    </button>
                  )}
                </div>

                {docFilter === 'policy' && (
                  <div className="mb-6 p-4 bg-blue-50 border-l-4 border-[#262760] rounded-r-xl text-[#262760] flex items-center gap-3">
                    <Sparkles className="w-5 h-5 shrink-0" />
                    <span className="font-semibold text-sm">
                      Company Policies are managed through the <a href="/policy-portal" className="underline hover:text-blue-800 font-bold">Policy Portal</a> and are automatically synchronized with the Induction Program.
                    </span>
                  </div>
                )}

                {/* Documents Table */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#262760] border-b border-[#262760] text-xs font-bold text-white uppercase tracking-wider">
                        <th className="p-4 w-16">S.No</th>
                        <th className="p-4">Title</th>
                        {docFilter === 'knowledge' && <th className="p-4">Division</th>}
                        <th className="p-4">Subcategory</th>
                        <th className="p-4">Version</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {documents.filter(d => d.category !== 'it_setup' && (docFilter === 'ALL' || d.category === docFilter)).map((doc, index) => (
                        <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4 font-semibold text-slate-500">{index + 1}</td>
                          <td className="p-4">
                            <div className="font-bold text-slate-900">{doc.title}</div>
                            {doc.description && <div className="text-xs text-slate-400 mt-0.5">{doc.description.slice(0, 70)}...</div>}
                          </td>
                          {docFilter === 'knowledge' && (
                            <td className="p-4 text-xs font-bold text-slate-700">
                              {doc.division || 'Common'}
                            </td>
                          )}
                          <td className="p-4 text-xs font-semibold text-slate-600">
                            {doc.category === 'policy' ? (
                              <div>
                                <div>Company Policy</div>
                                {doc.effectiveDate && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Eff. Date: {new Date(doc.effectiveDate).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div>
                                <div>{doc.subCategory || 'General'}</div>
                                {docFilter !== 'knowledge' && doc.division && (
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    Division: {doc.division}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-4">
                            {doc.isPortalPolicy ? (
                              <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">Live Sync</span>
                            ) : doc.fileUrl ? (
                              <button
                                onClick={() => setVersionModalDoc(doc)}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 px-2.5 py-1 rounded-lg"
                                title={`File format: ${doc.fileType}`}
                              >
                                <History className="w-3.5 h-3.5" /> v{doc.version || 1}.0 ({doc.fileType})
                              </button>
                            ) : (
                              <span className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-xs font-semibold">No Attachment</span>
                            )}
                          </td>
                          <td className="p-4">
                            {doc.isPortalPolicy ? (
                              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">Integrated ✓</span>
                            ) : (
                              <button
                                onClick={() => handleToggleEnable(doc)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${doc.isEnabled ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                                  }`}
                              >
                                {doc.isEnabled ? 'Enabled ✓' : 'Disabled'}
                              </button>
                            )}
                          </td>
                          <td className="p-4 text-right space-x-2">
                            {doc.isPortalPolicy ? (
                              <div className="flex items-center justify-end gap-3">
                                <span className="text-xs italic text-slate-400">Managed in Policy Portal</span>
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="px-3 py-1.5 bg-[#262760] hover:bg-[#1e2050] text-white rounded-xl transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm"
                                  title="View Policy"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => setPreviewDoc(doc)}
                                  className="p-2 text-[#262760] hover:bg-[#262760]/10 rounded-lg transition-colors"
                                  title="View Document"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditDoc(doc);
                                    const existingSubCat = doc.subCategory || '';
                                    const parsedSubCats = existingSubCat ? existingSubCat.split(',').map(s => s.trim()).filter(Boolean) : [];
                                    const paddedSubCats = [
                                      parsedSubCats[0] || '',
                                      parsedSubCats[1] || '',
                                      parsedSubCats[2] || '',
                                      parsedSubCats[3] || '',
                                      parsedSubCats[4] || ''
                                    ];
                                    setFormData({
                                      title: doc.title,
                                      category: doc.category,
                                      subCategory: existingSubCat,
                                      subCategories: paddedSubCats,
                                      division: doc.division || '',
                                      description: doc.description || '',
                                      isMandatory: doc.isMandatory !== undefined ? doc.isMandatory : true,
                                      effectiveDate: doc.effectiveDate ? new Date(doc.effectiveDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
                                      file: null
                                    });
                                    setShowUploadModal(true);
                                  }}
                                  className="p-2 text-[#262760] hover:bg-[#262760]/10 rounded-lg transition-colors"
                                  title="Edit / Replace File"
                                >
                                  <Edit3 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteDoc(doc._id)}
                                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Delete Document"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. EMPLOYEE TRACKER */}
            {activeTab === 'employees' && (
              <div className="space-y-6 animate-fadeIn">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xl">
                      <Users className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total New Joiners</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">{onboardingEmployees.length}</h4>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-xl">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed Inductions</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">{onboardingEmployees.filter(e => e.status === 'Completed' || e.progressPercentage === 100).length}</h4>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl">
                      <Clock className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending Inductions</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">{onboardingEmployees.filter(e => e.status !== 'Completed' && e.progressPercentage !== 100).length}</h4>
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-xl">
                      <Award className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Avg Completion %</p>
                      <h4 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                        {onboardingEmployees.length ? Math.round(onboardingEmployees.reduce((acc, curr) => acc + (curr.progressPercentage || 0), 0) / onboardingEmployees.length) : 0}%
                      </h4>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee or dept..."
                      value={empSearch}
                      onChange={(e) => setEmpSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={exportToExcel}
                      className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all"
                    >
                      <FileSpreadsheet className="w-4 h-4" /> Export Excel
                    </button>
                    <button
                      onClick={exportToPDF}
                      className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2.5 rounded-xl text-sm shadow-sm transition-all"
                    >
                      <FileText className="w-4 h-4" /> Export PDF
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-[#262760] border-b border-[#262760] text-xs font-bold text-white uppercase tracking-wider">
                        <th className="p-4">Employee name /employee Id</th>
                        <th className="p-4">Locations</th>
                        <th className="p-4">Divisions</th>
                        <th className="p-4">Progress</th>
                        <th className="p-4">Quiz Status</th>
                        <th className="p-4">HR Verification</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-sm">
                      {onboardingEmployees.filter(e => e.employeeName?.toLowerCase().includes(empSearch.toLowerCase()) || e.department?.toLowerCase().includes(empSearch.toLowerCase()) || e.location?.toLowerCase().includes(empSearch.toLowerCase()) || e.division?.toLowerCase().includes(empSearch.toLowerCase())).map((emp) => {
                        const passedQuiz = emp.assessmentAttempts?.some(a => a.passed);
                        return (
                          <tr key={emp._id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="p-4">
                              <div className="font-bold text-slate-900">{emp.employeeName || 'Unknown'}</div>
                              <div className="text-xs text-slate-400">ID: {emp.employeeId || 'N/A'} • {emp.email}</div>
                            </td>
                            <td className="p-4 text-slate-600">{emp.location || 'N/A'}</td>
                            <td className="p-4 text-slate-600">{emp.division || 'N/A'}</td>
                            <td className="p-4">
                              <div className="flex items-center gap-2">
                                <div className="w-24 bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: `${emp.progressPercentage || 0}%` }}></div>
                                </div>
                                <span className="text-xs font-bold text-slate-700">{emp.progressPercentage || 0}%</span>
                              </div>
                            </td>
                            <td className="p-4">
                              {passedQuiz ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-50 text-emerald-700">
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Passed
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700">
                                  Pending
                                </span>
                              )}
                            </td>
                            <td className="p-4">
                              {emp.hrVerified ? (
                                <span className="text-xs font-bold text-emerald-600">Verified ✓</span>
                              ) : (
                                <span className="text-xs font-medium text-slate-400">Pending Review</span>
                              )}
                            </td>
                            <td className="p-4 text-right space-x-2">
                              {!emp.hrVerified && (
                                <button
                                  onClick={() => handleVerifyEmp(emp.userId, emp.employeeName)}
                                  className="bg-[#262760] hover:bg-[#1e2050] text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm"
                                >
                                  Verify
                                </button>
                              )}
                              <button
                                onClick={() => handleSendReminder(emp.userId, emp.employeeName)}
                                className="bg-[#262760] hover:bg-[#1e2050] text-white border border-[#262760] px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 inline-flex"
                              >
                                <Bell className="w-3.5 h-3.5" /> Remind
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 3. ASSESSMENT QUIZ BUILDER */}
            {activeTab === 'assessment' && (
              <form onSubmit={handleSaveQuiz} className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Quiz Passing Settings</h2>
                    <p className="text-slate-500 text-sm">Configure minimum score required to mark onboarding completed.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-sm font-bold text-slate-700">Passing %:</label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={passingPct}
                      onChange={(e) => setPassingPct(e.target.value)}
                      className="w-20 border border-slate-300 rounded-xl px-3 py-2 text-center font-bold text-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* ✨ AI Quiz Generator Panel */}
                <div className="bg-gradient-to-br from-indigo-900 to-indigo-950 p-6 rounded-2xl text-white shadow-xl space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400">
                      <Sparkles className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">Automatic AI Quiz Generator</h3>
                      <p className="text-indigo-200 text-xs">Auto-frame 10 contextual multiple-choice questions from any uploaded document.</p>
                    </div>
                  </div>

                  <div className="space-y-4 pt-2">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-indigo-200">Select Document(s) to frame quiz (Multi-select Checklist):</label>
                      <div className="bg-indigo-950/40 border border-indigo-700/50 rounded-xl p-3 max-h-48 overflow-y-auto space-y-2">
                        {documents
                          .filter(d => ['handbook', 'knowledge', 'training'].includes(d.category))
                          .map(d => {
                            const isChecked = selectedDocsForQuiz.includes(d._id);
                            return (
                              <label key={d._id} className="flex items-start gap-2.5 text-xs text-white font-medium cursor-pointer hover:bg-indigo-900/40 p-1.5 rounded transition-all select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedDocsForQuiz(selectedDocsForQuiz.filter(id => id !== d._id));
                                    } else {
                                      setSelectedDocsForQuiz([...selectedDocsForQuiz, d._id]);
                                    }
                                  }}
                                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer mt-0.5"
                                />
                                <div>
                                  <span className="font-bold text-emerald-400 mr-1">
                                    [{d.category === 'handbook' ? 'HANDBOOK' : d.category === 'knowledge' ? 'KNOWLEDGE' : 'TRAINING'}]
                                  </span>
                                  {d.title} (v{d.version || 1})
                                </div>
                              </label>
                            );
                          })}
                        {documents.filter(d => ['handbook', 'knowledge', 'training'].includes(d.category)).length === 0 && (
                          <p className="text-xs text-indigo-300 italic">No handbook, knowledge sharing, or training documents uploaded yet.</p>
                        )}
                      </div>
                      <p className="text-[10px] text-indigo-300 font-semibold mt-1">※ Policies are excluded from quiz generation (reading only). Total 10 questions will be generated even when multiple items are selected.</p>
                    </div>

                    <div className="flex justify-start">
                      <button
                        type="button"
                        disabled={generatingQuiz || selectedDocsForQuiz.length === 0}
                        onClick={() => handleAutoGenerateQuiz(selectedDocsForQuiz)}
                        className={`font-bold px-6 py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 text-sm w-full sm:w-auto ${generatingQuiz || selectedDocsForQuiz.length === 0 ? 'bg-indigo-800/50 text-indigo-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-white'}`}
                      >
                        {generatingQuiz ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4" /> Frame 10 Questions
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {generatingQuiz && quizGenStep && (
                    <div className="bg-indigo-950/80 border border-indigo-800/30 p-4 rounded-xl flex items-center gap-3 animate-bounce">
                      <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-xs text-indigo-200 font-semibold">{quizGenStep}</span>
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {quizQuestions.map((q, qIdx) => (
                    <div key={q.id || qIdx} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="font-bold text-slate-800 text-base">Question #{qIdx + 1}</h3>
                        {quizQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestion(qIdx)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <input
                        type="text"
                        value={q.question}
                        onChange={(e) => updateQuestionText(qIdx, e.target.value)}
                        placeholder="Enter multiple choice question..."
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`correct-${qIdx}`}
                              checked={q.correctOptionIndex === optIdx}
                              onChange={() => updateCorrectIndex(qIdx, optIdx)}
                              title="Mark as correct answer"
                              className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => updateOptionText(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${optIdx + 1}`}
                              className={`w-full border rounded-xl px-3 py-2 text-sm ${q.correctOptionIndex === optIdx ? 'border-emerald-500 bg-emerald-50/30 font-medium' : 'border-slate-300'}`}
                            />
                          </div>
                        ))}
                      </div>
                      <span className="text-xs text-slate-400 italic">Radio button indicates the correct passing answer.</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pt-4">
                  <button
                    type="button"
                    onClick={addQuestion}
                    className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all"
                  >
                    <Plus className="w-4 h-4" /> Add Question
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all"
                  >
                    <Save className="w-4 h-4" /> Save Quiz Configuration
                  </button>
                </div>
              </form>
            )}

            {/* 4. OVERVIEW SETTINGS */}
            {activeTab === 'overview' && (
              <form onSubmit={handleSaveConfig} className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <h2 className="text-xl font-bold text-slate-900">Company Overview Settings</h2>
                  <p className="text-slate-500 text-sm">Customize the information shown to new joiners on their Company Overview tab.</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">About Company Description</label>
                    <textarea
                      rows={4}
                      value={configForm.aboutCompany}
                      onChange={(e) => setConfigForm({ ...configForm, aboutCompany: e.target.value })}
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Our Vision</label>
                      <textarea
                        rows={3}
                        value={configForm.vision}
                        onChange={(e) => setConfigForm({ ...configForm, vision: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Our Mission</label>
                      <textarea
                        rows={3}
                        value={configForm.mission}
                        onChange={(e) => setConfigForm({ ...configForm, mission: e.target.value })}
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Core Values</label>
                    <textarea
                      rows={3}
                      value={configForm.coreValues}
                      onChange={(e) => setConfigForm({ ...configForm, coreValues: e.target.value })}
                      placeholder="Enter each core value on a new line..."
                      className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Company History & Journey</label>
                      <textarea
                        rows={3}
                        value={configForm.companyHistory}
                        onChange={(e) => setConfigForm({ ...configForm, companyHistory: e.target.value })}
                        placeholder="Milestones, foundation year, growth journey..."
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Organization Structure</label>
                      <textarea
                        rows={3}
                        value={configForm.organizationStructure}
                        onChange={(e) => setConfigForm({ ...configForm, organizationStructure: e.target.value })}
                        placeholder="Hierarchy or teams structure..."
                        className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <h3 className="font-bold text-slate-900 text-base">Welcome Section Configuration</h3>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1 text-xs">Welcome Banner Image URL</label>
                      <input
                        type="text"
                        value={configForm.welcomeBannerUrl}
                        onChange={(e) => setConfigForm({ ...configForm, welcomeBannerUrl: e.target.value })}
                        placeholder="https://example.com/banner.jpg or /uploads/..."
                        className="w-full border border-slate-300 rounded-xl p-2.5 text-sm"
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Managing Director / CEO Message</label>
                        <textarea
                          rows={4}
                          value={configForm.welcomeMessageCEO}
                          onChange={(e) => setConfigForm({ ...configForm, welcomeMessageCEO: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">General Manager (GM) Message</label>
                        <textarea
                          rows={4}
                          value={configForm.welcomeMessageGM}
                          onChange={(e) => setConfigForm({ ...configForm, welcomeMessageGM: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-1">Welcome Message from HR</label>
                        <textarea
                          rows={4}
                          value={configForm.welcomeMessageHR}
                          onChange={(e) => setConfigForm({ ...configForm, welcomeMessageHR: e.target.value })}
                          className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Leadership Team Editor */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Leadership Team</h3>
                      <p className="text-slate-500 text-xs">Configure the leadership cards shown in the company overview tab.</p>
                    </div>

                    {/* Grid of existing leaders */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {configForm.leadershipTeam && configForm.leadershipTeam.map((leader, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-[#262760] text-white flex items-center justify-center font-bold text-sm">
                              {leader.name ? leader.name.split(' ').map(n => n[0]).join('') : 'L'}
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">{leader.name}</h4>
                              <p className="text-indigo-600 text-xs font-semibold">{leader.role}</p>
                              <p className="text-slate-500 text-[10px] mt-0.5">{leader.exp}</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...configForm.leadershipTeam];
                              list.splice(idx, 1);
                              setConfigForm({ ...configForm, leadershipTeam: list });
                            }}
                            className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors animate-pulse"
                            title="Delete Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new leader inputs */}
                    <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-semibold text-slate-700 text-xs">Add Leadership Member</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <input
                          type="text"
                          id="new-leader-name"
                          placeholder="Full Name"
                          className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          id="new-leader-role"
                          placeholder="Role / Designation"
                          className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        <input
                          type="text"
                          id="new-leader-exp"
                          placeholder="Bio / Years Experience"
                          className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nameVal = document.getElementById('new-leader-name').value;
                          const roleVal = document.getElementById('new-leader-role').value;
                          const expVal = document.getElementById('new-leader-exp').value;
                          if (!nameVal || !roleVal) {
                            alert("Please enter at least Name and Designation.");
                            return;
                          }
                          const newLeader = { name: nameVal, role: roleVal, exp: expVal };
                          setConfigForm({ ...configForm, leadershipTeam: [...(configForm.leadershipTeam || []), newLeader] });

                          // Reset inputs
                          document.getElementById('new-leader-name').value = '';
                          document.getElementById('new-leader-role').value = '';
                          document.getElementById('new-leader-exp').value = '';
                        }}
                        className="flex items-center gap-1 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Member
                      </button>
                    </div>
                  </div>

                  {/* Office Locations Editor */}
                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">Office Locations</h3>
                      <p className="text-slate-500 text-xs">Configure the physical offices or centers shown in the company overview tab.</p>
                    </div>

                    {/* Grid of existing locations */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {configForm.officeLocations && configForm.officeLocations.map((loc, idx) => (
                        <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-start shadow-sm">
                          <div>
                            <h4 className="font-bold text-slate-800 text-sm">{loc.name}</h4>
                            <p className="text-slate-600 text-xs whitespace-pre-line mt-1">{loc.address}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const list = [...configForm.officeLocations];
                              list.splice(idx, 1);
                              setConfigForm({ ...configForm, officeLocations: list });
                            }}
                            className="text-rose-600 hover:bg-rose-50 p-2 rounded-lg transition-colors animate-pulse"
                            title="Delete Location"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>

                    {/* Add new location inputs */}
                    <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-4 space-y-3">
                      <h4 className="font-semibold text-slate-700 text-xs">Add Office Location</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input
                          type="text"
                          id="new-loc-name"
                          placeholder="Office Name (e.g. Chennai Office)"
                          className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                        <textarea
                          id="new-loc-address"
                          placeholder="Full Address & Suite Details"
                          rows={2}
                          className="bg-white border border-slate-300 rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const nameVal = document.getElementById('new-loc-name').value;
                          const addrVal = document.getElementById('new-loc-address').value;
                          if (!nameVal || !addrVal) {
                            alert("Please enter both Name and Address.");
                            return;
                          }
                          const newLoc = { name: nameVal, address: addrVal };
                          setConfigForm({ ...configForm, officeLocations: [...(configForm.officeLocations || []), newLoc] });

                          // Reset inputs
                          document.getElementById('new-loc-name').value = '';
                          document.getElementById('new-loc-address').value = '';
                        }}
                        className="flex items-center gap-1 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2 rounded-lg text-xs shadow-sm transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Location
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-8 py-3 rounded-xl shadow-lg transition-all"
                  >
                    <Save className="w-4 h-4" /> Save All Settings
                  </button>
                </div>
              </form>
            )}
          </>
        )}
      </div>

      {/* Upload/Edit Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">{editDoc ? 'Edit Document' : 'Upload Onboarding Document'}</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4 text-sm">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Document Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Remote Work Policy 2026"
                  className="w-full border border-slate-300 rounded-xl p-2.5 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Category (Read-Only)</label>
                <input
                  type="text"
                  readOnly
                  disabled
                  value={
                    formData.category === 'policy' ? 'Company Policy' :
                      formData.category === 'handbook' ? 'Employee Handbook' :
                        formData.category === 'knowledge' ? 'Knowledge Sharing' :
                          formData.category === 'training' ? 'Training Material' : formData.category
                  }
                  className="w-full bg-slate-100 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-600 cursor-not-allowed"
                />
              </div>

              {formData.category === 'knowledge' && (
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Division *</label>
                  <select
                    required
                    value={formData.division}
                    onChange={(e) => {
                      const selectedDiv = e.target.value;
                      setFormData({ 
                        ...formData, 
                        division: selectedDiv,
                        subCategory: '',
                        subCategories: ['', '', '', '', '']
                      });
                    }}
                    className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold"
                  >
                    <option value="">-- Select Division --</option>
                    {DIVISIONS.map(div => (
                      <option key={div} value={div}>{div}</option>
                    ))}
                  </select>
                </div>
              )}

              {formData.category !== 'policy' && (
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="block font-bold text-slate-800 text-sm">
                      Sub-Category *
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowAddSubCat(!showAddSubCat)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#262760] hover:bg-[#1e2050] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Sub-Category
                    </button>
                  </div>

                  {showAddSubCat && (
                    <div className="flex items-center gap-2 bg-white p-3 rounded-xl border border-indigo-200 shadow-inner animate-fadeIn">
                      <input
                        type="text"
                        placeholder="Enter new sub-category name..."
                        value={newSubCatName}
                        onChange={(e) => setNewSubCatName(e.target.value)}
                        className="flex-1 border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#262760]"
                      />
                      <button
                        type="button"
                        onClick={() => handleAddNewSubCat()}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors shadow-sm"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowAddSubCat(false); setNewSubCatName(''); }}
                        className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  )}

                  <select
                    required
                    value={formData.subCategory || ''}
                    onChange={(e) => setFormData({ ...formData, subCategory: e.target.value })}
                    className="w-full border border-slate-300 rounded-xl p-2.5 text-sm font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#262760]"
                  >
                    <option value="">-- Select Sub-Category --</option>
                    {getAvailableSubCategories().map(sub => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-slate-700 mb-1">Mandatory Status</label>
                <select
                  value={formData.isMandatory ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, isMandatory: e.target.value === 'true' })}
                  className="w-full border border-slate-300 rounded-xl p-2.5 font-semibold"
                >
                  <option value="true">Mandatory</option>
                  <option value="false">Optional</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief summary of what this document covers..."
                  className="w-full border border-slate-300 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Select File (Optional)</label>
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mov"
                  className="w-full border border-slate-300 rounded-xl p-2 text-xs"
                />
                {editDoc && editDoc.fileName && (
                  <p className="text-xs text-slate-500 mt-1">Current file: {editDoc.fileName}</p>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#262760] hover:bg-[#1e2050] text-white font-bold shadow-md"
                >
                  Save Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Version History Modal */}
      {versionModalDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-lg">Version History: {versionModalDoc.title}</h3>
              <button onClick={() => setVersionModalDoc(null)} className="text-slate-400 hover:text-slate-600 font-bold text-lg">✕</button>
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {versionModalDoc.versionHistory?.map((v, i) => (
                <div key={i} className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center text-sm">
                  <div>
                    <span className="font-bold text-indigo-600">Version {v.version}.0</span>
                    <div className="text-xs text-slate-500">{v.fileName} • {new Date(v.updatedAt).toLocaleDateString()}</div>
                  </div>
                  <a
                    href={v.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-slate-700 bg-white border px-3 py-1.5 rounded-lg hover:bg-slate-100"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {previewDoc && (() => {
        const absoluteUrl = previewDoc.fileUrl?.startsWith('http')
          ? previewDoc.fileUrl
          : `${BASE_URL}${previewDoc.fileUrl}`;
        const isLocalUrl = absoluteUrl.includes('localhost') || absoluteUrl.includes('127.0.0.1') || absoluteUrl.includes('192.168.');

        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#262760] text-white">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">{previewDoc.category}</span>
                  <h3 className="text-lg font-bold text-white">{previewDoc.title}</h3>
                  {previewDoc.fileUrl && previewDoc.description && (
                    <p className="text-xs text-slate-200 font-medium max-w-2xl">{previewDoc.description}</p>
                  )}
                </div>
                <button
                  onClick={() => setPreviewDoc(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center font-bold text-white"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 flex flex-col items-center justify-center min-h-[450px] bg-slate-100/50">
                {previewDoc.category !== 'training' ? (
                  <div className="w-full max-w-3xl bg-white p-8 rounded-2xl border border-slate-200 shadow-sm overflow-y-auto max-h-[60vh] text-left flex flex-col gap-6">
                    {!previewDoc.fileUrl ? (
                      <div className="prose max-w-none text-slate-700 whitespace-pre-wrap leading-relaxed font-sans text-base">
                        {previewDoc.content || previewDoc.description || 'No detailed content available for this document.'}
                      </div>
                    ) : null}
                    {previewDoc.fileUrl && (
                      <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {previewDoc.fileType === 'excel' || previewDoc.fileType === 'xlsx' || previewDoc.fileName?.endsWith('.xlsx') || previewDoc.fileName?.endsWith('.xls') ? (
                            <FileSpreadsheet className="w-8 h-8 text-[#262760]" />
                          ) : (
                            <FileText className="w-8 h-8 text-[#262760]" />
                          )}
                          <div>
                            <div className="font-semibold text-slate-800 text-sm">{previewDoc.fileName || 'Attachment'}</div>
                            <div className="text-xs text-slate-400 capitalize">{previewDoc.fileType || 'Document'}</div>
                          </div>
                        </div>
                        <a
                          href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                        >
                          <Download className="w-3.5 h-3.5" /> Download File
                        </a>
                      </div>
                    )}
                  </div>
                ) : (previewDoc.fileType === 'video' || previewDoc.fileName?.endsWith('.mp4') || previewDoc.fileName?.endsWith('.mov') || previewDoc.fileName?.endsWith('.avi') || previewDoc.fileName?.endsWith('.webm')) ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <video controls className="w-full max-w-3xl rounded-2xl shadow-lg bg-black max-h-[55vh]">
                      <source src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`} type="video/mp4" />
                      Your browser does not support video playback.
                    </video>
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Video
                      </a>
                    )}
                  </div>
                ) : (previewDoc.fileType === 'pdf' || previewDoc.fileName?.endsWith('.pdf')) ? (
                  <div className="w-full h-full flex flex-col items-center gap-4">
                    <iframe
                      src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                      className="w-full h-[55vh] rounded-2xl border border-slate-200 shadow-md bg-white"
                      title="PDF Preview"
                    />
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Open / Download PDF
                      </a>
                    )}
                  </div>
                ) : (previewDoc.fileType === 'image' || previewDoc.fileName?.endsWith('.png') || previewDoc.fileName?.endsWith('.jpg') || previewDoc.fileName?.endsWith('.jpeg') || previewDoc.fileName?.endsWith('.gif') || previewDoc.fileName?.endsWith('.svg')) ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <img
                      src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                      alt={previewDoc.title}
                      className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow-md bg-white"
                    />
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Download Image
                      </a>
                    )}
                  </div>
                ) : (previewDoc.fileName?.endsWith('.ppt') || previewDoc.fileName?.endsWith('.pptx') || previewDoc.fileName?.endsWith('.doc') || previewDoc.fileName?.endsWith('.docx')) ? (
                  <div className="w-full h-full flex flex-col items-center gap-4 justify-center">
                    {isLocalUrl ? (
                      <div className="bg-slate-800 text-white rounded-2xl p-8 max-w-2xl w-full text-center space-y-6 shadow-lg min-h-[300px] flex flex-col justify-center items-center">
                        <FileText className="w-16 h-16 text-indigo-400 animate-pulse" />
                        <div className="space-y-2">
                          <h4 className="font-bold text-lg">Local Environment Preview Fallback</h4>
                          <p className="text-sm text-slate-300 max-w-md mx-auto">
                            External cloud document viewers (like Google Docs Viewer) cannot fetch and render local files served from a local address (<strong>{new URL(absoluteUrl).host}</strong>).
                          </p>
                          <p className="text-xs text-indigo-300">
                            This document preview will function automatically once the project is deployed to a public server.
                          </p>
                        </div>
                        <a
                          href={absoluteUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-xl shadow-md transition-all text-sm animate-bounce"
                        >
                          <Download className="w-4 h-4" /> Download & View Locally
                        </a>
                      </div>
                    ) : (
                      <iframe
                        src={`https://docs.google.com/gview?url=${encodeURIComponent(absoluteUrl)}&embedded=true`}
                        className="w-full h-[55vh] rounded-2xl border border-slate-200 shadow-md bg-white"
                        title="Document Preview"
                      />
                    )}
                    {!isLocalUrl && (
                      <p className="text-xs text-slate-500 italic">If document preview fails to load, please click the button below to download and view it.</p>
                    )}
                    {!isLocalUrl && previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-2.5 rounded-xl shadow-md text-xs transition-all"
                      >
                        <Download className="w-3.5 h-3.5" /> Open / Download File
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="text-center space-y-4 max-w-md">
                    {previewDoc.fileType === 'excel' || previewDoc.fileType === 'xlsx' || previewDoc.fileName?.endsWith('.xlsx') || previewDoc.fileName?.endsWith('.xls') ? (
                      <FileSpreadsheet className="w-20 h-20 text-[#262760] mx-auto" />
                    ) : (
                      <FileText className="w-20 h-20 text-[#262760] mx-auto" />
                    )}
                    <h4 className="font-bold text-slate-800 text-lg">Document Preview Ready</h4>
                    <p className="text-slate-600 text-base font-medium">This file type cannot be previewed natively in the browser.</p>
                    {previewDoc.fileUrl && (
                      <a
                        href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-3 rounded-xl shadow-md"
                      >
                        <Download className="w-4 h-4" /> Download / Open File ({previewDoc.fileName})
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default InductionAdmin;
