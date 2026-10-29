// src/pages/PolicyPortal.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { policyAPI } from '../services/api';
import {
  Sparkles,
  BookOpen,
  ShieldCheck,
  FileText,
  Search,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Clock,
  Printer,
  Copy,
  CheckCheck,
  Eye,
  Code,
  Tag,
  AlertCircle,
  HelpCircle,
  FolderOpen,
  ArrowRight,
  ExternalLink
} from 'lucide-react';

const COLOR_PALETTES = [
  {
    name: 'indigo',
    badgeBg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    iconGradient: 'from-indigo-600 via-indigo-500 to-blue-500',
    activeBorder: 'border-indigo-500 ring-2 ring-indigo-500/20',
    activeBg: 'bg-gradient-to-r from-indigo-50/90 via-purple-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-indigo-500 to-blue-500',
    dotColor: 'bg-indigo-500',
    tag: 'Governance'
  },
  {
    name: 'purple',
    badgeBg: 'bg-purple-50 text-purple-700 border-purple-200',
    iconGradient: 'from-purple-600 via-fuchsia-500 to-pink-500',
    activeBorder: 'border-purple-500 ring-2 ring-purple-500/20',
    activeBg: 'bg-gradient-to-r from-purple-50/90 via-pink-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-purple-500 to-pink-500',
    dotColor: 'bg-purple-500',
    tag: 'Compliance'
  },
  {
    name: 'emerald',
    badgeBg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    iconGradient: 'from-emerald-500 via-teal-500 to-cyan-500',
    activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20',
    activeBg: 'bg-gradient-to-r from-emerald-50/90 via-teal-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-emerald-500 to-teal-500',
    dotColor: 'bg-emerald-500',
    tag: 'Conduct & Culture'
  },
  {
    name: 'amber',
    badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
    iconGradient: 'from-amber-500 via-orange-500 to-red-500',
    activeBorder: 'border-amber-500 ring-2 ring-amber-500/20',
    activeBg: 'bg-gradient-to-r from-amber-50/90 via-orange-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-amber-500 to-orange-500',
    dotColor: 'bg-amber-500',
    tag: 'Operations'
  },
  {
    name: 'rose',
    badgeBg: 'bg-rose-50 text-rose-700 border-rose-200',
    iconGradient: 'from-rose-500 via-pink-500 to-red-500',
    activeBorder: 'border-rose-500 ring-2 ring-rose-500/20',
    activeBg: 'bg-gradient-to-r from-rose-50/90 via-pink-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-rose-500 to-pink-500',
    dotColor: 'bg-rose-500',
    tag: 'Safety & Ethics'
  },
  {
    name: 'cyan',
    badgeBg: 'bg-cyan-50 text-cyan-800 border-cyan-200',
    iconGradient: 'from-cyan-500 via-blue-500 to-indigo-500',
    activeBorder: 'border-cyan-500 ring-2 ring-cyan-500/20',
    activeBg: 'bg-gradient-to-r from-cyan-50/90 via-blue-50/50 to-white',
    accentBar: 'bg-gradient-to-b from-cyan-500 to-blue-500',
    dotColor: 'bg-cyan-500',
    tag: 'IT & Security'
  }
];

const getPaletteForIndex = (index) => COLOR_PALETTES[index % COLOR_PALETTES.length];

const PolicyPortal = () => {
  const [policies, setPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [editingContent, setEditingContent] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const [titleError, setTitleError] = useState('');
  const [contentError, setContentError] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [originalContent, setOriginalContent] = useState('');
  const [isNewPolicy, setIsNewPolicy] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [editorTab, setEditorTab] = useState('write'); // 'write' | 'preview'

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || 'employees';
  const isReadOnly = role === 'employees' || role === 'projectmanager';
  const location = useLocation();

  // Load policies from backend
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await policyAPI.list();
        const items = Array.isArray(res.data) ? res.data : [];
        setPolicies(items);
      } catch (err) {
        console.error('Failed to fetch policies:', err);
      }
    };
    fetchPolicies();
  }, []);

  // Handle URL param or default selection
  useEffect(() => {
    if (policies.length === 0) return;

    const params = new URLSearchParams(location.search);
    const policyId = params.get('id');

    let targetPolicy = null;
    if (policyId) {
      targetPolicy = policies.find(p => p._id === policyId);
    }

    if (targetPolicy) {
      if (!activePolicy || activePolicy._id !== targetPolicy._id) {
        setActivePolicy(targetPolicy);
        setContent(targetPolicy.content || '');
        setPolicyTitle(targetPolicy.title || '');
        setOriginalTitle(targetPolicy.title || '');
        setOriginalContent(targetPolicy.content || '');
      }
    } else if (!activePolicy && policies.length > 0) {
      const first = policies[0];
      setActivePolicy(first);
      setContent(first.content || '');
      setPolicyTitle(first.title || '');
      setOriginalTitle(first.title || '');
      setOriginalContent(first.content || '');
    }
  }, [policies, location.search]);

  // Validate if title is unique
  const isTitleUnique = (title, currentPolicyId = null) => {
    const trimmedTitle = title.trim().toLowerCase();
    return !policies.some(
      policy =>
        policy.title.trim().toLowerCase() === trimmedTitle &&
        policy._id !== currentPolicyId
    );
  };

  // Add new policy draft
  const handleAddPolicy = () => {
    const newPolicyDraft = {
      _id: `temp-${Date.now()}`,
      title: 'New Policy',
      content: '# New Policy Title\n\n### 1. Purpose & Objective\nProvide a comprehensive summary of this policy...\n\n### 2. Scope & Applicability\nThis policy applies to all Caldim Engineering employees, contractors, and partners.\n\n### 3. Guidelines & Standards\n- Clear expectation 1\n- Clear expectation 2\n\n### 4. Compliance & Inquiries\nFor questions regarding this policy, please reach out to HR or Management.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isTemp: true
    };

    const updatedPolicies = [...policies, newPolicyDraft];
    setPolicies(updatedPolicies);
    setActivePolicy(newPolicyDraft);
    setContent(newPolicyDraft.content);
    setPolicyTitle(newPolicyDraft.title);
    setOriginalTitle(newPolicyDraft.title);
    setOriginalContent(newPolicyDraft.content);
    setIsNewPolicy(true);
    setEditingContent(true);
    setEditingTitle(true);
    setTitleError('');
    setContentError('');
    setEditorTab('write');
  };

  // Delete policy
  const handleDeletePolicy = async (id) => {
    try {
      if (id.startsWith('temp-')) {
        const updatedPolicies = policies.filter(policy => policy._id !== id);
        setPolicies(updatedPolicies);
        if (activePolicy && activePolicy._id === id) {
          if (updatedPolicies.length > 0) {
            const firstRealPolicy = updatedPolicies[0];
            setActivePolicy(firstRealPolicy);
            setContent(firstRealPolicy.content || '');
            setPolicyTitle(firstRealPolicy.title || '');
            setOriginalTitle(firstRealPolicy.title || '');
            setOriginalContent(firstRealPolicy.content || '');
          } else {
            setActivePolicy(null);
            setContent('');
            setPolicyTitle('');
            setOriginalTitle('');
            setOriginalContent('');
          }
        }
        setIsNewPolicy(false);
        setShowDeleteConfirm(false);
        setPolicyToDelete(null);
        return;
      }

      await policyAPI.remove(id);
      const updatedPolicies = policies.filter(policy => policy._id !== id);
      setPolicies(updatedPolicies);
      if (activePolicy && activePolicy._id === id) {
        if (updatedPolicies.length > 0) {
          setActivePolicy(updatedPolicies[0]);
          setContent(updatedPolicies[0].content || '');
          setPolicyTitle(updatedPolicies[0].title || '');
          setOriginalTitle(updatedPolicies[0].title || '');
          setOriginalContent(updatedPolicies[0].content || '');
        } else {
          setActivePolicy(null);
          setContent('');
          setPolicyTitle('');
          setOriginalTitle('');
          setOriginalContent('');
        }
      }
    } catch (err) {
      console.error('Failed to delete policy:', err);
      alert('Failed to delete policy. Please try again.');
    } finally {
      setShowDeleteConfirm(false);
      setPolicyToDelete(null);
    }
  };

  // Save changes
  const handleSaveChanges = async () => {
    if (!activePolicy) return;

    setIsSaving(true);
    let hasError = false;

    const trimmedTitle = policyTitle.trim();
    if (trimmedTitle.length === 0) {
      setTitleError('Title cannot be empty');
      hasError = true;
    } else if (trimmedTitle.length < 3) {
      setTitleError('Title must be at least 3 characters');
      hasError = true;
    } else if (trimmedTitle.length > 100) {
      setTitleError('Title must not exceed 100 characters');
      hasError = true;
    } else if (!isTitleUnique(trimmedTitle, activePolicy._id)) {
      setTitleError('A policy with this title already exists');
      hasError = true;
    } else {
      setTitleError('');
    }

    const trimmedContent = content.trim();
    if (trimmedContent.length === 0) {
      setContentError('Content cannot be empty');
      hasError = true;
    } else if (trimmedContent.length < 25) {
      setContentError('Content must be at least 25 characters');
      hasError = true;
    } else if (trimmedContent.length > 50000) {
      setContentError('Content must not exceed 50,000 characters');
      hasError = true;
    } else {
      setContentError('');
    }

    if (hasError) {
      setIsSaving(false);
      return;
    }

    try {
      let updated;
      if (activePolicy.isTemp || activePolicy._id.startsWith('temp-')) {
        const res = await policyAPI.create({
          title: trimmedTitle,
          content: trimmedContent
        });
        updated = res.data;

        const updatedPolicies = policies
          .filter(p => p._id !== activePolicy._id)
          .concat(updated);
        setPolicies(updatedPolicies);
        setIsNewPolicy(false);
      } else {
        const res = await policyAPI.update(activePolicy._id, {
          title: trimmedTitle,
          content: trimmedContent
        });
        updated = res.data;

        const updatedPolicies = policies.map(policy =>
          policy._id === updated._id ? updated : policy
        );
        setPolicies(updatedPolicies);
      }

      setActivePolicy(updated);
      setOriginalTitle(updated.title);
      setOriginalContent(updated.content);
      setPolicyTitle(updated.title);
      setContent(updated.content);
      setEditingContent(false);
      setEditingTitle(false);
      setTitleError('');
      setContentError('');
    } catch (err) {
      console.error('Failed to save policy:', err);
      if (err.response?.data?.message) {
        alert(`Error: ${err.response.data.message}`);
      } else {
        alert('Failed to save policy. Please try again.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectPolicy = (policy) => {
    if (isNewPolicy && activePolicy?.isTemp) {
      const confirmSwitch = window.confirm(
        'You have unsaved changes. Switching policies will discard them. Continue?'
      );
      if (!confirmSwitch) return;

      const updatedPolicies = policies.filter(p => p._id !== activePolicy._id);
      setPolicies(updatedPolicies);
      setIsNewPolicy(false);
    }

    setActivePolicy(policy);
    setContent(policy.content);
    setPolicyTitle(policy.title);
    setOriginalTitle(policy.title);
    setOriginalContent(policy.content);
    setEditingContent(false);
    setEditingTitle(false);
    setTitleError('');
    setContentError('');
  };

  const handleCancelTitleEdit = () => {
    setPolicyTitle(originalTitle);
    setEditingTitle(false);
    setTitleError('');
  };

  const handleCancelContentEdit = () => {
    if (isNewPolicy && activePolicy?.isTemp) {
      const updatedPolicies = policies.filter(p => p._id !== activePolicy._id);
      setPolicies(updatedPolicies);

      if (updatedPolicies.length > 0) {
        const firstPolicy = updatedPolicies[0];
        setActivePolicy(firstPolicy);
        setContent(firstPolicy.content);
        setPolicyTitle(firstPolicy.title);
        setOriginalTitle(firstPolicy.title);
        setOriginalContent(firstPolicy.content);
      } else {
        setActivePolicy(null);
        setContent('');
        setPolicyTitle('');
        setOriginalTitle('');
        setOriginalContent('');
      }

      setIsNewPolicy(false);
      setEditingContent(false);
      setEditingTitle(false);
      setContentError('');
      setTitleError('');
      return;
    }

    setContent(originalContent);
    setPolicyTitle(originalTitle);
    setEditingContent(false);
    setEditingTitle(false);
    setContentError('');
    setTitleError('');
  };

  const handleContentChange = (e) => {
    const newContent = e.target.value;
    setContent(newContent);

    if (newContent.trim().length === 0) {
      setContentError('Content cannot be empty');
    } else if (newContent.trim().length < 25) {
      setContentError(`Content must be at least 25 characters (current: ${newContent.trim().length})`);
    } else if (newContent.trim().length > 50000) {
      setContentError('Content must not exceed 50,000 characters');
    } else {
      setContentError('');
    }
  };

  const handleTitleChange = (e) => {
    const newTitle = e.target.value;
    setPolicyTitle(newTitle);

    if (newTitle.trim().length === 0) {
      setTitleError('Title cannot be empty');
    } else if (newTitle.trim().length < 3) {
      setTitleError('Title must be at least 3 characters');
    } else if (newTitle.trim().length > 100) {
      setTitleError('Title must not exceed 100 characters');
    } else if (!isTitleUnique(newTitle, activePolicy?._id)) {
      setTitleError('A policy with this title already exists');
    } else {
      setTitleError('');
    }
  };

  // Helper to insert formatting into content
  const insertFormatting = (prefix, suffix = '') => {
    const textarea = document.getElementById('policy-editor-textarea');
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end) || 'Text';
    const replacement = `${prefix}${selected}${suffix}`;
    const nextContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(nextContent);
  };

  const handleCopyContent = () => {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered policies list based on search
  const filteredPolicies = useMemo(() => {
    if (!searchQuery.trim()) return policies;
    const q = searchQuery.toLowerCase();
    return policies.filter(
      p => (p.title || '').toLowerCase().includes(q) || (p.content || '').toLowerCase().includes(q)
    );
  }, [policies, searchQuery]);

  // Read time estimate
  const estimatedReadTime = useMemo(() => {
    if (!content) return 1;
    const words = content.trim().split(/\s+/).length;
    return Math.max(1, Math.round(words / 180));
  }, [content]);

  // Format markdown content for display with vibrant colored elements
  const formatContentForDisplay = (text) => {
    if (!text) return '';

    return text
      .replace(/^# (.*$)/gm, '<h1 class="policy-h1">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="policy-h2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="policy-h3">$1</h3>')
      .replace(/^> (.*$)/gm, '<blockquote class="policy-quote"><span class="quote-text">$1</span></blockquote>')
      .replace(/^- (.*$)/gm, '<li class="policy-li">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-slate-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-700">$1</em>')
      .replace(/\n\n/g, '</p><p class="policy-p">')
      .replace(/\n---\n/g, '<hr class="my-6 border-slate-200">');
  };

  const activeIndex = policies.findIndex(p => p._id === activePolicy?._id);
  const activePalette = getPaletteForIndex(activeIndex >= 0 ? activeIndex : 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50/20 pb-16">
      {/* 🌟 VIBRANT HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white shadow-xl mb-8">
        {/* Glowing Decorative Background Circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -right-24 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 left-1/3 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold backdrop-blur-md mb-3">
                <Sparkles size={14} className="text-indigo-300 animate-pulse" />
                <span>Caldim Engineering • Official Governance & Guidelines</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white flex items-center gap-3">
                <span className="bg-gradient-to-r from-white via-indigo-100 to-cyan-200 bg-clip-text text-transparent">
                  Caldim Policies
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-300 font-bold border border-cyan-400/30">
                  PORTAL
                </span>
              </h1>
              <p className="mt-2 text-sm sm:text-base text-indigo-100/80 max-w-2xl leading-relaxed">
                Standard company operating procedures, workplace rules, codes of conduct, and organizational compliance guidelines.
              </p>
            </div>

            {/* Quick Stats Badges & Add Button */}
            <div className="flex flex-wrap items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Total Policies</div>
                  <div className="text-xl font-extrabold text-white">{policies.length} Active</div>
                </div>
              </div>

              {!isReadOnly && (
                <button
                  onClick={handleAddPolicy}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white font-bold text-sm shadow-lg shadow-purple-500/30 hover:shadow-xl hover:scale-105 active:scale-95 transition-all duration-200"
                >
                  <Plus size={18} strokeWidth={2.5} />
                  <span>New Policy</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 🧭 MAIN CONTENT CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ================= LEFT COLUMN: POLICY LIST & SEARCH ================= */}
          <div className="lg:w-1/3 order-2 lg:order-1">
            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden sticky top-6">
              {/* List Header & Search */}
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                      <FolderOpen size={16} />
                    </div>
                    <h3 className="font-bold text-slate-800 text-sm tracking-wide">
                      COMPANY POLICIES
                    </h3>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                    {filteredPolicies.length} Available
                  </span>
                </div>

                {/* Search Box */}
                <div className="relative">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search policies by keyword..."
                    className="w-full pl-9 pr-8 py-2 text-xs font-medium rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 bg-white transition-all shadow-inner"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Policy Items Scroll List */}
              <div className="p-3 sm:p-4 max-h-[calc(100vh-280px)] overflow-y-auto space-y-2.5">
                {filteredPolicies.map((policy, idx) => {
                  const isSelected = activePolicy?._id === policy._id;
                  const palette = getPaletteForIndex(idx);

                  return (
                    <div
                      key={policy._id}
                      onClick={() => handleSelectPolicy(policy)}
                      className={`group relative p-3.5 rounded-2xl cursor-pointer transition-all duration-200 border ${
                        isSelected
                          ? `${palette.activeBg} ${palette.activeBorder} shadow-md shadow-indigo-500/10`
                          : 'bg-white hover:bg-slate-50/80 border-slate-200/70 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      {/* Left accent bar on active */}
                      {isSelected && (
                        <div className={`absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full ${palette.accentBar}`} />
                      )}

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {/* Colorful Policy Icon */}
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 shadow-sm bg-gradient-to-br ${palette.iconGradient}`}
                          >
                            <FileText size={16} />
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4
                              className={`text-sm font-bold truncate transition-colors ${
                                isSelected ? 'text-slate-900' : 'text-slate-700 group-hover:text-indigo-600'
                              }`}
                            >
                              {policy.title}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border ${palette.badgeBg}`}
                              >
                                {palette.tag}
                              </span>
                              <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium">
                                <Clock size={11} className="text-slate-500" />
                                {policy.updatedAt ? new Date(policy.updatedAt).toISOString().split('T')[0] : 'Current'}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Actions / Delete */}
                        <div className="flex items-center gap-1">
                          {!isReadOnly && !policy.isTemp && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setPolicyToDelete(policy._id);
                                setShowDeleteConfirm(true);
                              }}
                              className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                              title="Delete Policy"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                          <ArrowRight
                            size={14}
                            className={`transition-transform duration-200 ${
                              isSelected ? 'text-indigo-600 translate-x-0.5' : 'text-slate-300 opacity-0 group-hover:opacity-100'
                            }`}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Empty State when searched or list is empty */}
                {filteredPolicies.length === 0 && (
                  <div className="text-center py-10 px-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                      <Search size={22} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">No matching policies</p>
                    <p className="text-xs text-slate-400 mt-1">Try adjusting your search query</p>
                  </div>
                )}

                {/* Add Policy Action (Dashed Card) */}
                {!isReadOnly && (
                  <button
                    onClick={handleAddPolicy}
                    className="w-full mt-2 flex items-center justify-center gap-2 p-3.5 rounded-2xl border-2 border-dashed border-indigo-200 bg-indigo-50/40 hover:bg-indigo-50 hover:border-indigo-400 text-indigo-700 font-bold text-xs transition-all duration-200 group"
                  >
                    <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                      <Plus size={14} strokeWidth={2.5} />
                    </div>
                    <span>Draft New Policy</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: POLICY VIEW & EDITOR ================= */}
          <div className="lg:w-2/3 order-1 lg:order-2">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200/80 overflow-hidden">
              {activePolicy ? (
                <>
                  {/* Policy Header Bar */}
                  <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50/70 via-white to-indigo-50/30">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      {/* Title & Icon */}
                      <div className="flex items-center gap-3.5 flex-1 min-w-0">
                        <div
                          className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${activePalette.iconGradient} text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0`}
                        >
                          <BookOpen size={24} />
                        </div>

                        <div className="flex-1 min-w-0">
                          {editingTitle ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={policyTitle}
                                  onChange={handleTitleChange}
                                  className={`w-full px-3 py-1.5 text-base sm:text-lg font-bold rounded-xl border bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                                    titleError ? 'border-rose-400' : 'border-indigo-300'
                                  }`}
                                  onKeyPress={(e) => {
                                    if (e.key === 'Enter') handleSaveChanges();
                                  }}
                                  autoFocus
                                />
                                <button
                                  onClick={handleSaveChanges}
                                  disabled={isSaving}
                                  className="p-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                                  title="Save Title"
                                >
                                  <Check size={16} />
                                </button>
                                <button
                                  onClick={handleCancelTitleEdit}
                                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600"
                                  title="Cancel"
                                >
                                  <X size={16} />
                                </button>
                              </div>
                              {titleError && (
                                <p className="text-xs text-rose-500 font-medium flex items-center gap-1">
                                  <AlertCircle size={12} /> {titleError}
                                </p>
                              )}
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 flex-wrap">
                              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                                {policyTitle}
                              </h2>
                              {!isReadOnly && (
                                <button
                                  onClick={() => {
                                    setOriginalTitle(policyTitle);
                                    setEditingTitle(true);
                                  }}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                                  title="Edit Policy Title"
                                >
                                  <Edit3 size={15} />
                                </button>
                              )}
                            </div>
                          )}

                          {/* Meta Badges */}
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Policy
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 text-xs font-semibold border border-purple-200">
                              <Clock size={12} />
                              {activePolicy.updatedAt
                                ? `Updated: ${new Date(activePolicy.updatedAt).toISOString().split('T')[0]}`
                                : 'Recent'}
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-200">
                              <FileText size={12} />
                              {estimatedReadTime} min read
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Header Utility Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={handleCopyContent}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                          title="Copy policy content"
                        >
                          {copied ? (
                            <>
                              <CheckCheck size={14} className="text-emerald-600" />
                              <span className="text-emerald-600">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy size={14} />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                        <button
                          onClick={handlePrint}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 bg-white border border-slate-200 hover:bg-slate-50 transition-colors shadow-sm"
                          title="Print policy"
                        >
                          <Printer size={14} />
                          <span>Print</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Policy Body Area */}
                  <div className="p-6 sm:p-8">
                    {editingContent ? (
                      /* ========== EDITOR MODE ========== */
                      <div className="space-y-4">
                        {/* Formatting Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-gradient-to-r from-slate-100 to-indigo-50/50 rounded-2xl border border-slate-200">
                          <div className="flex items-center gap-1 flex-wrap">
                            <button
                              type="button"
                              onClick={() => insertFormatting('**', '**')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 hover:bg-white hover:shadow-sm"
                              title="Bold"
                            >
                              B
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('*', '*')}
                              className="px-2.5 py-1 rounded-lg text-xs italic font-serif text-slate-700 hover:bg-white hover:shadow-sm"
                              title="Italic"
                            >
                              I
                            </button>
                            <div className="w-px h-4 bg-slate-300 mx-1" />
                            <button
                              type="button"
                              onClick={() => insertFormatting('# ')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm"
                              title="Heading 1"
                            >
                              H1
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('## ')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm"
                              title="Heading 2"
                            >
                              H2
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('### ')}
                              className="px-2.5 py-1 rounded-lg text-xs font-bold text-indigo-700 hover:bg-white hover:shadow-sm"
                              title="Heading 3"
                            >
                              H3
                            </button>
                            <div className="w-px h-4 bg-slate-300 mx-1" />
                            <button
                              type="button"
                              onClick={() => insertFormatting('- ')}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-white hover:shadow-sm"
                              title="Bullet List"
                            >
                              • List
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('> ')}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-white hover:shadow-sm"
                              title="Quote / Note"
                            >
                              ❝ Callout
                            </button>
                            <button
                              type="button"
                              onClick={() => insertFormatting('\n---\n')}
                              className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-700 hover:bg-white hover:shadow-sm"
                              title="Horizontal Line"
                            >
                              ― Line
                            </button>
                          </div>

                          {/* Editor Tabs */}
                          <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-slate-200">
                            <button
                              type="button"
                              onClick={() => setEditorTab('write')}
                              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                editorTab === 'write'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Code size={13} />
                              <span>Write</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditorTab('preview')}
                              className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                                editorTab === 'preview'
                                  ? 'bg-indigo-600 text-white shadow-sm'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Eye size={13} />
                              <span>Preview</span>
                            </button>
                          </div>
                        </div>

                        {/* Editor Input or Live Preview Tab */}
                        {editorTab === 'write' ? (
                          <div>
                            <textarea
                              id="policy-editor-textarea"
                              value={content}
                              onChange={handleContentChange}
                              className={`w-full h-[450px] p-4 text-sm font-mono leading-relaxed rounded-2xl border bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all ${
                                contentError ? 'border-rose-400' : 'border-slate-300'
                              }`}
                              placeholder="# Enter policy markdown content here..."
                            />
                            <div className="flex items-center justify-between text-xs text-slate-400 mt-2 px-1">
                              <span>Markdown formatting supported (# headings, - lists, **bold**)</span>
                              <span>{content.length} characters</span>
                            </div>
                          </div>
                        ) : (
                          <div className="h-[450px] p-6 overflow-y-auto rounded-2xl border border-slate-200 bg-white">
                            <div
                              className="policy-content"
                              dangerouslySetInnerHTML={{ __html: formatContentForDisplay(content) }}
                            />
                          </div>
                        )}

                        {contentError && (
                          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
                            <AlertCircle size={15} className="shrink-0" />
                            <span>{contentError}</span>
                          </div>
                        )}

                        {/* Save & Cancel Controls */}
                        <div className="flex items-center gap-3 pt-2">
                          <button
                            onClick={handleSaveChanges}
                            disabled={isSaving}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm shadow-md shadow-emerald-500/20 active:scale-95 transition-all"
                          >
                            {isSaving ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                <span>Saving...</span>
                              </>
                            ) : (
                              <>
                                <Check size={16} strokeWidth={2.5} />
                                <span>Save Changes</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleCancelContentEdit}
                            disabled={isSaving}
                            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition-colors"
                          >
                            <X size={16} />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* ========== VIEWER MODE ========== */
                      <div>
                        <div
                          className="policy-content max-w-none text-slate-700 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: formatContentForDisplay(content) }}
                        />

                        {/* Edit Button for Authorized Users */}
                        {!isReadOnly && (
                          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
                            <button
                              onClick={() => {
                                setOriginalContent(content);
                                setEditingContent(true);
                                setEditorTab('write');
                              }}
                              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-md shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                            >
                              <Edit3 size={15} />
                              <span>Edit Policy Content</span>
                            </button>

                            <button
                              onClick={() => {
                                setPolicyToDelete(activePolicy._id);
                                setShowDeleteConfirm(true);
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-rose-600 hover:bg-rose-50 font-semibold text-xs transition-colors"
                            >
                              <Trash2 size={14} />
                              <span>Delete Policy</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* No Policy Selected State */
                <div className="p-16 text-center">
                  <div className="w-20 h-20 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <BookOpen size={36} />
                  </div>
                  <h3 className="text-xl font-black text-slate-800">No Policy Selected</h3>
                  <p className="text-sm text-slate-500 max-w-md mx-auto mt-2">
                    Select a policy from the list on the left to read its terms, or create a brand new policy.
                  </p>
                  {!isReadOnly && (
                    <button
                      onClick={handleAddPolicy}
                      className="mt-6 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold text-sm shadow-md shadow-indigo-500/25 hover:scale-105 active:scale-95 transition-all"
                    >
                      <Plus size={18} strokeWidth={2.5} />
                      <span>Create New Policy</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ⚠️ DELETE CONFIRMATION MODAL */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-6 sm:p-7 text-center">
              <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-rose-100">
                <Trash2 size={28} />
              </div>
              <h3 className="text-xl font-black text-slate-900">Delete Policy?</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                Are you sure you want to permanently delete this policy? This action cannot be reversed.
              </p>
              <div className="flex items-center justify-center gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPolicyToDelete(null);
                  }}
                  className="px-5 py-2.5 text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePolicy(policyToDelete)}
                  className="px-5 py-2.5 text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 rounded-xl shadow-lg shadow-rose-500/25 transition-all"
                >
                  Yes, Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🎨 CUSTOM COLORFUL STYLES */}
      <style>{`
        .policy-h1 {
          font-size: 1.5rem;
          font-weight: 800;
          color: #0f172a;
          margin-top: 1.25rem;
          margin-bottom: 0.75rem;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
          letter-spacing: -0.025em;
        }

        .policy-h2 {
          font-size: 1.2rem;
          font-weight: 700;
          color: #1e293b;
          margin-top: 1.5rem;
          margin-bottom: 0.5rem;
          padding-left: 0.75rem;
          border-left: 4px solid #6366f1;
        }

        .policy-h3 {
          font-size: 1.05rem;
          font-weight: 700;
          color: #334155;
          margin-top: 1.25rem;
          margin-bottom: 0.4rem;
        }

        .policy-p {
          color: #475569;
          margin-bottom: 0.75rem;
          line-height: 1.7;
          font-size: 0.95rem;
        }

        .policy-quote {
          margin: 1rem 0;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(to right, #f5f3ff, #faf5ff);
          border-left: 4px solid #8b5cf6;
          border-radius: 0 0.75rem 0.75rem 0;
          font-style: italic;
          color: #4c1d95;
        }

        .policy-li {
          position: relative;
          padding-left: 1.5rem;
          margin-bottom: 0.4rem;
          color: #334155;
          line-height: 1.6;
          font-size: 0.95rem;
        }

        .policy-li::before {
          content: "";
          position: absolute;
          left: 0.35rem;
          top: 0.65rem;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: linear-gradient(135deg, #6366f1, #a855f7);
          box-shadow: 0 0 6px rgba(99, 102, 241, 0.5);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }

        .animate-fadeIn {
          animation: fadeIn 0.15s ease-out forwards;
        }

        @media print {
          body * {
            visibility: hidden;
          }
          .policy-content, .policy-content * {
            visibility: visible;
          }
          .policy-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default PolicyPortal;
