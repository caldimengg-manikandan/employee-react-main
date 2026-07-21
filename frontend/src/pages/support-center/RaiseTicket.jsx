import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supportAPI } from '../../services/api';
import { 
  Upload, MessageSquare, AlertCircle, Send, CheckCircle, X, 
  FileText, ArrowLeft, Sparkles, Monitor, HelpCircle,
  CheckCircle2, Zap
} from 'lucide-react';
import confetti from 'canvas-confetti';

const RaiseTicket = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState({
    mainCategory: 'IT Queries',
    subCategory: '',
    priority: 'Medium',
    subject: '',
    description: ''
  });

  const mainCategories = [
    { 
      id: 'IT Queries', 
      title: 'IT Queries', 
      subtitle: 'Hardware, Software, Email & Tech Issues',
      icon: Monitor, 
      activeBg: 'bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600',
      activeBorder: 'border-blue-500',
      activeText: 'text-white'
    },
    { 
      id: 'Non-IT Queries', 
      title: 'Non-IT Queries', 
      subtitle: 'HR, Payroll, Leave & General Issues',
      icon: HelpCircle, 
      activeBg: 'bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600',
      activeBorder: 'border-purple-500',
      activeText: 'text-white'
    }
  ];

  const itSubCategories = [
    'Laptop Issue',
    'Desktop Issue',
    'Monitor Issue',
    'Keyboard Issue',
    'Mouse Issue',
    'Headset Issue',
    'Printer Issue',
    'Software Installation',
    'Outlook / Email Issue',
    'VPN Issue',
    'Internet Issue',
    'Password Reset',
    'Login Issue',
    'Application Access Issue',
    'Technical Support',
    'Portal Bug / Error',
    'Other IT Support'
  ];

  const nonItSubCategories = [
    'Attendance Issue',
    'Leave Management Issue',
    'Timesheet Issue',
    'Payroll & Salary Issue',
    'PF / ESI Issue',
    'Appraisal Issue',
    'Employee Letter / Document Issue',
    'Portal Bug / Error',
    'Exit Approval Issues',
    'General Query',
    'Other'
  ];

  const priorities = [
    { label: 'Low', color: 'bg-blue-500 text-white shadow-blue-500/30', inactive: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
    { label: 'Medium', color: 'bg-amber-500 text-white shadow-amber-500/30', inactive: 'text-amber-600 bg-amber-50 hover:bg-amber-100' },
    { label: 'High', color: 'bg-orange-500 text-white shadow-orange-500/30', inactive: 'text-orange-600 bg-orange-50 hover:bg-orange-100' },
    { label: 'Critical', color: 'bg-rose-600 text-white shadow-rose-600/30', inactive: 'text-rose-600 bg-rose-50 hover:bg-rose-100' }
  ];

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (selectedFiles.length + files.length > 5) {
      alert('You can only upload up to 5 files.');
      return;
    }
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.mainCategory) {
      alert('Please select a Main Category.');
      return;
    }
    if (!formData.subCategory) {
      alert('Please select a Sub Category.');
      return;
    }

    setIsLoading(true);

    const submissionData = new FormData();
    submissionData.append('mainCategory', formData.mainCategory);
    submissionData.append('subCategory', formData.subCategory);
    submissionData.append('category', formData.subCategory);
    submissionData.append('priority', formData.priority);
    submissionData.append('subject', formData.subject);
    submissionData.append('description', formData.description);
    
    selectedFiles.forEach(file => {
      submissionData.append('attachments', file);
    });

    try {
      await supportAPI.createTicket(submissionData);
      setSuccess(true);
      
      confetti({
        particleCount: 180,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#4F1A6F', '#7c3aed', '#3b82f6', '#ec4899', '#10b981']
      });

      setTimeout(() => navigate('/support/my-tickets'), 3000);
    } catch (err) {
      alert('Failed to raise ticket. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[75vh] flex flex-col items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-md w-full text-center border border-emerald-100 animate-in fade-in zoom-in duration-300 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-emerald-400/10 rounded-full blur-2xl"></div>
          <div className="w-20 h-20 bg-gradient-to-tr from-emerald-500 to-teal-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-extrabold text-gray-800 mb-2">Ticket Raised Successfully!</h2>
          <p className="text-gray-600 mb-6 text-sm">Our support team has been notified and will process your query shortly. Redirecting you to your tickets...</p>
          <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full animate-progress-fast"></div>
          </div>
        </div>
      </div>
    );
  }

  const currentSubCategories = formData.mainCategory === 'IT Queries' 
    ? itSubCategories 
    : formData.mainCategory === 'Non-IT Queries' 
    ? nonItSubCategories 
    : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col lg:flex-row">
      {/* Left Decorative Banner */}
      <div className="lg:w-1/3 bg-gradient-to-br from-[#1A0E2E] via-[#311145] to-[#120720] p-8 lg:p-12 text-white flex flex-col justify-between relative overflow-hidden">
        <div className="relative z-10">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-violet-200 hover:text-white transition-all group mb-8"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span className="text-sm font-semibold tracking-wide uppercase">Back to Support</span>
          </button>

          <div className="space-y-6">
            <div className="w-16 h-16 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center backdrop-blur-md shadow-xl border border-white/20">
              <Zap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-4xl font-extrabold leading-tight">
              Submit Your <br />
              <span className="bg-gradient-to-r from-violet-300 via-pink-300 to-amber-200 bg-clip-text text-transparent">Support Query</span>
            </h1>
            <p className="text-sm text-violet-100/80 max-w-sm leading-relaxed">
              Select your query type below. IT and Non-IT tickets are routed instantly to dedicated support specialists.
            </p>
          </div>

          <div className="mt-12 space-y-6">
            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
              <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0 border border-blue-400/30">
                <Monitor className="w-5 h-5 text-blue-300" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">IT Support Queue</h4>
                <p className="text-xs text-violet-200/70">Routed directly to IT System Administrators</p>
              </div>
            </div>

            <div className="flex gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-all">
              <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center shrink-0 border border-purple-400/30">
                <HelpCircle className="w-5 h-5 text-purple-300" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">HR & Admin Queue</h4>
                <p className="text-xs text-violet-200/70">Routed to HR, Payroll & Operations Teams</p>
              </div>
            </div>

            {/* Support Animation GIF */}
            <div className="relative group pt-4">
              <div className="absolute inset-0 bg-violet-400/20 rounded-3xl blur-2xl group-hover:bg-violet-400/40 transition-all duration-500"></div>
              <img 
                src="https://www.stratanetworks.nz/wp-content/uploads/2021/12/animation_640_kwnxzzbe.gif" 
                alt="Support Animation" 
                className="relative z-10 w-full max-w-[180px] mx-auto rounded-2xl mix-blend-lighten opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
              />
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 mt-8 border-t border-white/10 flex items-center justify-between">
          <p className="text-xs text-violet-300 font-medium">CALDIM Support Portal</p>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span className="text-xs text-emerald-300 font-bold">Support Active</span>
          </div>
        </div>

        {/* Decorative Blurred Orbs */}
        <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl"></div>
        <div className="absolute top-40 -right-20 w-40 h-40 bg-pink-500/20 rounded-full blur-3xl"></div>
      </div>

      {/* Right Form Area */}
      <div className="flex-1 p-6 lg:p-12 overflow-y-auto">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Raise Support Ticket</h2>
            </div>
            <button
              type="button"
              onClick={() => navigate('/support/my-tickets')}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 hover:text-[#4F1A6F] hover:border-[#4F1A6F]/30 hover:bg-[#4F1A6F]/5 font-bold rounded-2xl shadow-sm transition-all text-sm w-fit"
            >
              <FileText className="w-4 h-4 text-[#4F1A6F]" />
              My Tickets History
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Main Category Tab Selection */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase flex items-center gap-2">
                Select Main Category <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mainCategories.map((cat) => {
                  const isSelected = formData.mainCategory === cat.id;
                  const Icon = cat.icon;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, mainCategory: cat.id, subCategory: '' })}
                      className={`p-5 rounded-2xl text-left border-2 transition-all duration-300 flex items-start gap-4 cursor-pointer relative overflow-hidden group ${
                        isSelected
                          ? `${cat.activeBg} ${cat.activeBorder} shadow-lg shadow-indigo-500/20 transform scale-[1.02]`
                          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300 hover:shadow-md'
                      }`}
                    >
                      <div className={`p-3 rounded-xl ${isSelected ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600 group-hover:bg-gray-200'}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className={`font-bold text-base ${isSelected ? 'text-white' : 'text-gray-800'}`}>
                            {cat.title}
                          </h3>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-white animate-in zoom-in duration-200" />
                          )}
                        </div>
                        <p className={`text-xs mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500'}`}>
                          {cat.subtitle}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Sub Category Chips */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase flex items-center gap-2">
                Select Sub Category <span className="text-red-500">*</span>
              </label>

              <div className="flex flex-wrap gap-2.5 p-4 bg-white border border-gray-200 rounded-2xl max-h-[220px] overflow-y-auto shadow-inner">
                {currentSubCategories.map((sub) => {
                  const isSelected = formData.subCategory === sub;
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => setFormData({ ...formData, subCategory: sub })}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-2 border ${
                        isSelected
                          ? formData.mainCategory === 'IT Queries'
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 scale-105'
                            : 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-500/20 scale-105'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 hover:border-gray-300'
                      }`}
                    >
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {sub}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Priority Level */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase">Priority Level</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {priorities.map((p) => {
                  const isSelected = formData.priority === p.label;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => setFormData({ ...formData, priority: p.label })}
                      className={`py-3 px-4 rounded-xl text-xs font-extrabold uppercase tracking-wider transition-all duration-200 border ${
                        isSelected
                          ? `${p.color} border-transparent shadow-md scale-105`
                          : `${p.inactive} border-gray-200`
                      }`}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject Line */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase flex items-center gap-2">
                Subject Line <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Brief title summarizing the issue..."
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all outline-none text-gray-800 font-medium shadow-sm hover:border-gray-300"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              />
            </div>

            {/* Full Description */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase flex items-center gap-2">
                Full Description <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                rows="5"
                placeholder="Describe the problem in detail so our team can resolve it quickly..."
                className="w-full px-5 py-4 bg-white border border-gray-200 rounded-2xl focus:ring-4 focus:ring-purple-500/10 focus:border-purple-600 transition-all outline-none resize-none text-gray-800 font-medium shadow-sm hover:border-gray-300"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              ></textarea>
            </div>

            {/* Evidence & File Upload */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-600 tracking-wider uppercase">Evidence & Attachments</label>
              <div 
                onClick={() => fileInputRef.current.click()}
                className="relative group overflow-hidden bg-white border-2 border-dashed border-gray-200 rounded-3xl p-8 flex flex-col items-center justify-center gap-3 hover:border-purple-500 hover:bg-purple-50/30 transition-all cursor-pointer shadow-sm"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple
                  className="hidden"
                  accept="image/*,.pdf,.doc,.docx"
                />
                <div className="w-14 h-14 bg-purple-50 rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-300 shadow-sm border border-purple-100">
                  <Upload className="w-7 h-7 text-purple-600" />
                </div>
                <div className="text-center">
                  <p className="text-gray-900 font-bold text-base">Click or drag files to upload attachments</p>
                  <p className="text-gray-400 text-xs mt-1">Images, PDFs or Word Documents (Max 5 files, 5MB each)</p>
                </div>
              </div>

              {selectedFiles.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 bg-purple-100 text-purple-700 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div className="truncate">
                          <p className="text-xs font-bold text-gray-800 truncate">{file.name}</p>
                          <p className="text-[10px] text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={() => removeFile(idx)}
                        className="p-1.5 hover:bg-rose-50 rounded-xl text-rose-500 transition-all shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
              <div className="flex items-center gap-2 text-gray-500 text-xs">
                <AlertCircle className="w-4 h-4 text-purple-600" />
                <span>Ticket updates will be sent to your registered email.</span>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => navigate(-1)}
                  className="px-6 py-3.5 text-gray-600 font-bold hover:text-gray-900 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className={`px-10 py-3.5 bg-gradient-to-r from-purple-700 via-indigo-700 to-blue-700 hover:from-purple-800 hover:to-blue-800 text-white font-bold rounded-2xl shadow-xl shadow-indigo-500/25 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 text-sm ${
                    isLoading ? 'opacity-70 cursor-not-allowed' : ''
                  }`}
                >
                  {isLoading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      Submit Ticket
                      <Send className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RaiseTicket;
