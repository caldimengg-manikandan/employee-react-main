import React, { useState, useEffect } from 'react';
import {
  Sparkles, Award, CheckCircle2, Circle, Clock, BookOpen, ShieldCheck,
  FileText, Video, HelpCircle, Star, Send, Download, Eye, CheckSquare,
  ChevronRight, Users, Briefcase, Heart, Building2, TrendingUp, AlertCircle, Play, FileSpreadsheet
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inductionService, BASE_URL } from '../../services/inductionService';
import { policyAPI } from '../../services/api';

const InductionPortal = () => {
  const [activeTab, setActiveTab] = useState('welcome');
  const [progress, setProgress] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [assessment, setAssessment] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search/Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPolicyCategory, setSelectedPolicyCategory] = useState('ALL');

  // Preview Modal
  const [previewDoc, setPreviewDoc] = useState(null);

  // Quiz States
  const [quizAnswers, setQuizAnswers] = useState({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  // Feedback States
  const [rating, setRating] = useState(5);
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [progRes, docsRes, quizRes, cfgRes, polRes] = await Promise.all([
        inductionService.getMyProgress(),
        inductionService.getDocuments(),
        inductionService.getAssessment(),
        inductionService.getConfig(),
        policyAPI.list().catch(() => ({ data: [] }))
      ]);
      setProgress(progRes.data);

      const portalPolicies = (Array.isArray(polRes.data) ? polRes.data : []).map(p => ({
        _id: p._id,
        title: p.title,
        category: 'policy',
        subCategory: 'Policy Portal',
        description: p.content ? p.content.replace(/<[^>]*>?/gm, '').replace(/#/g, '').slice(0, 130) + '...' : 'Official company policy from Policy Portal.',
        fileType: 'portal',
        content: p.content,
        version: 1,
        isPortalPolicy: true
      }));

      setDocuments([...(docsRes.data || []), ...portalPolicies]);
      if (quizRes.data && Array.isArray(quizRes.data.questions)) {
        const seenQ = new Set();
        const uniqueQ = [];
        quizRes.data.questions.forEach(q => {
          const norm = (q.question || '').trim().toLowerCase();
          if (norm && !seenQ.has(norm)) {
            seenQ.add(norm);
            uniqueQ.push(q);
          }
        });
        quizRes.data.questions = uniqueQ;
      }
      setAssessment(quizRes.data);
      setConfig(cfgRes.data);
      if (progRes.data && progRes.data.feedback && progRes.data.feedback.submittedAt) {
        setRating(progRes.data.feedback.rating || 5);
        setComments(progRes.data.feedback.comments || '');
        setSuggestions(progRes.data.feedback.suggestions || '');
        setFeedbackSubmitted(true);
      }
      if (progRes.data && progRes.data.assessmentAttempts && progRes.data.assessmentAttempts.length > 0) {
        const passedAttempt = progRes.data.assessmentAttempts.find(a => a.passed) || progRes.data.assessmentAttempts[progRes.data.assessmentAttempts.length - 1];
        if (passedAttempt.passed) {
          setQuizSubmitted(true);
          setQuizScore({
            score: passedAttempt.score,
            total: passedAttempt.totalQuestions,
            pct: passedAttempt.percentage,
            passed: true
          });
        }
      }
      if (progRes.data && progRes.data.progressPercentage === 100) {
        triggerConfetti();
      }
      const isFirstSix = progRes.data?.isExistingEmployee === true ? false : progRes.data?.isExistingEmployee === false ? true : (user?.dateOfJoining || user?.joiningDate || progRes.data?.dateOfJoining) ? ((new Date() - new Date(user?.dateOfJoining || user?.joiningDate || progRes.data?.dateOfJoining)) / (1000 * 60 * 60 * 24) <= 185) : true;
      if (!isFirstSix) {
        setActiveTab(prev => prev === 'welcome' ? 'overview' : prev);
      }
    } catch (err) {
      console.error("Failed to load induction data:", err);
      setError("Failed to load your onboarding data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!progress || !documents.length) return;

    const isFirstSixMonths = progress?.isExistingEmployee === true ? false : progress?.isExistingEmployee === false ? true : (user.dateOfJoining || user.joiningDate || progress?.dateOfJoining) ? ((new Date() - new Date(user.dateOfJoining || user.joiningDate || progress?.dateOfJoining)) / (1000 * 60 * 60 * 24) <= 185) : true;

    const modules = [
      { id: 'Company Policies', category: 'policy' },
      { id: 'Employee Handbook', category: 'handbook' },
      { id: 'Knowledge Sharing', category: 'knowledge' },
      { id: 'Training Material', category: 'training' },
    ];
    if (isFirstSixMonths) {
      modules.push({ id: 'Assessment', category: 'assessment' });
    }

    modules.forEach(mod => {
      const isAcked = progress?.acknowledgements?.some(a => a.policyName === mod.id);
      if (!isAcked) {
        let isCompleted = false;
        if (mod.category === 'assessment') {
          isCompleted = progress?.assessmentAttempts?.some(a => a.passed);
        } else {
          const mandatoryDocs = documents.filter(d => d.category === mod.category && d.isMandatory !== false);
          if (mandatoryDocs.length > 0) {
            const readCount = mandatoryDocs.filter(doc => progress?.readDocuments?.includes(doc._id || doc.title)).length;
            if (readCount >= mandatoryDocs.length) {
              isCompleted = true;
            }
          }
        }

        if (isCompleted) {
          recordAction('acknowledge', { policyName: mod.id });
        }
      }
    });
  }, [progress?.readDocuments, progress?.assessmentAttempts, documents]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 }
    });
  };

  const recordAction = async (actionType, data) => {
    try {
      const res = await inductionService.recordAction(actionType, data);
      setProgress(res.data);
      if (res.data.progressPercentage === 100 && (!progress || progress.progressPercentage < 100)) {
        triggerConfetti();
      }
    } catch (err) {
      console.error("Failed to record action:", err);
    }
  };

  const handleReadDoc = (doc) => {
    setPreviewDoc(doc);
    recordAction('read_doc', { docId: doc._id || doc.title });
  };

  const handleCompleteTraining = (trainingName) => {
    recordAction('complete_training', { trainingName });
  };

  const handleToggleAck = (policyName) => {
    const exists = progress?.acknowledgements?.some(a => a.policyName === policyName);
    if (!exists) {
      recordAction('acknowledge', { policyName });
    }
  };

  const handleQuizSubmit = () => {
    if (!assessment || !assessment.questions) return;
    let correct = 0;
    assessment.questions.forEach((q, idx) => {
      if (quizAnswers[idx] === q.correctOptionIndex) {
        correct += 1;
      }
    });
    const total = assessment.questions.length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= (assessment.passingPercentage || 70);

    setQuizScore({ score: correct, total, pct, passed });
    setQuizSubmitted(true);

    recordAction('submit_quiz', {
      attempt: { score: correct, totalQuestions: total, percentage: pct, passed }
    });
  };

  const handleFeedbackSubmit = (e) => {
    e.preventDefault();
    recordAction('submit_feedback', {
      feedback: { rating, comments, suggestions }
    });
    setFeedbackSubmitted(true);
  };

  const downloadCertificate = () => {
    const printWindow = window.open('', '_blank');
    const dateStr = progress?.completedAt ? new Date(progress.completedAt).toLocaleDateString() : new Date().toLocaleDateString();
    printWindow.document.write(`
      <html>
        <head>
          <title>Induction Completion Certificate</title>
          <style>
            body { font-family: 'Georgia', serif; text-align: center; padding: 50px; background: #fdfbf7; }
            .cert-box { border: 10px solid #1e3a8a; padding: 60px; max-width: 800px; margin: 0 auto; background: white; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
            h1 { font-size: 42px; color: #1e3a8a; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 2px; }
            h2 { font-size: 24px; color: #475569; font-weight: normal; margin-bottom: 40px; }
            .name { font-size: 38px; font-weight: bold; color: #0f172a; border-bottom: 2px solid #cbd5e1; display: inline-block; padding: 0 40px 10px; margin-bottom: 30px; }
            p { font-size: 18px; color: #334155; line-height: 1.6; }
            .footer { margin-top: 60px; display: flex; justify-content: space-between; padding: 0 40px; }
            .sig { border-top: 1px solid #64748b; padding-top: 10px; width: 200px; font-weight: bold; color: #1e3a8a; }
          </style>
        </head>
        <body>
          <div class="cert-box">
            <h1>Certificate of Completion</h1>
            <h2>Employee Induction & Onboarding Program</h2>
            <p>This is to certify that</p>
            <div class="name">${progress?.employeeName || user.name || 'Employee'}</div>
            <p>has successfully completed the mandatory onboarding activities, policy acknowledgements, and information security assessments.</p>
            <p><strong>Date Certified:</strong> ${dateStr}</p>
            <div class="footer">
              <div class="sig">Human Resources</div>
              <div class="sig">Authorized Signatory</div>
            </div>
          </div>
          <script>window.print();</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading your Onboarding Journey...</p>
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'welcome', label: 'Welcome', icon: Heart },
    { id: 'overview', label: 'Company Overview', icon: Building2 },
    { id: 'policies', label: 'Company Policies', icon: ShieldCheck },
    { id: 'handbook', label: 'Employee Handbook', icon: BookOpen },
    { id: 'knowledge', label: 'Knowledge Sharing', icon: FileText },
    { id: 'training', label: 'Mandatory Training', icon: Video },
    { id: 'assessment', label: 'Assessment', icon: HelpCircle },
    { id: 'acknowledgement', label: 'Acknowledgement', icon: CheckSquare },
    { id: 'feedback', label: 'Feedback', icon: Star },
    { id: 'completion', label: 'Completion', icon: Award }
  ];

  const pct = progress?.progressPercentage || 0;
  const isFirstSixMonthsUser = progress?.isExistingEmployee === true ? false : progress?.isExistingEmployee === false ? true : (user?.dateOfJoining || user?.joiningDate || progress?.dateOfJoining) ? ((new Date() - new Date(user?.dateOfJoining || user?.joiningDate || progress?.dateOfJoining)) / (1000 * 60 * 60 * 24) <= 185) : true;
  const filteredTabs = tabs.filter(t => {
    if (!isFirstSixMonthsUser) {
      return !['welcome', 'assessment'].includes(t.id);
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-16">


      {/* Navigation Tabs */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm overflow-x-auto">
        <div className="max-w-7xl mx-auto flex space-x-1 p-2">
          {filteredTabs.map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${isActive
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 scale-[1.02]'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                  }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">


        {/* WELCOME SECTION TAB */}
        {activeTab === 'welcome' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-8">
              {config?.welcomeBannerUrl ? (
                <div className="w-full h-64 rounded-2xl overflow-hidden shadow-md">
                  <img src={config.welcomeBannerUrl.startsWith('http') ? config.welcomeBannerUrl : `${BASE_URL}${config.welcomeBannerUrl}`} alt="Welcome Banner" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="bg-gradient-to-r from-pink-500 via-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-md text-center">
                  <Heart className="w-16 h-16 mx-auto mb-4 animate-bounce" />
                  <h2 className="text-3xl font-extrabold mb-2">Welcome to Your New Journey!</h2>
                  <p className="text-lg opacity-90 max-w-2xl mx-auto">We are thrilled to embark on this path of innovation, collaboration, and growth together with you.</p>
                </div>
              )}



              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* 1. Directors (CEO) Message */}
                <div className="bg-purple-50/60 p-6 rounded-2xl border border-purple-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold">MD</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Managing Director / CEO Message</h4>
                        <p className="text-xs text-purple-600 font-semibold">Executive Leadership</p>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                      {config?.welcomeMessageCEO || "Dear Team Member, welcome! Your unique talents and perspectives are vital to our mission. We encourage you to innovate boldly, collaborate openly, and make a lasting impact."}
                    </p>
                  </div>
                </div>

                {/* 2. GM Message */}
                <div className="bg-blue-50/60 p-6 rounded-2xl border border-blue-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">GM</div>
                      <div>
                        <h4 className="font-bold text-slate-900">General Manager (GM) Message</h4>
                        <p className="text-xs text-blue-600 font-semibold">Operations & Execution</p>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                      {config?.welcomeMessageGM || "Welcome! As part of our operational core, we value efficiency, clear communication, and collaborative execution. I look forward to working with you to achieve milestones together."}
                    </p>
                  </div>
                </div>

                {/* 3. HR Message */}
                <div className="bg-indigo-50/60 p-6 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">HR</div>
                      <div>
                        <h4 className="font-bold text-slate-900">Message from HR</h4>
                        <p className="text-xs text-indigo-600 font-semibold">People & Culture Team</p>
                      </div>
                    </div>
                    <p className="text-slate-700 leading-relaxed whitespace-pre-line text-sm">
                      {config?.welcomeMessageHR || "Welcome aboard! We are thrilled to have you join our dynamic family. Our HR team is dedicated to supporting your continuous growth, well-being, and professional journey every step of the way."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. COMPANY OVERVIEW TAB */}
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fadeIn">
            {/* 1. Hero Card: About Our Company */}
            <div className="bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4338ca] text-white p-8 rounded-3xl relative overflow-hidden shadow-xl border border-indigo-500/20">
              <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-pink-500/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20"></div>
              <div className="relative z-10 space-y-4 max-w-4xl">
                <div className="inline-flex items-center gap-2 bg-indigo-500/30 border border-indigo-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
                  <Building2 className="w-3.5 h-3.5 text-yellow-300" />
                  Corporate Identity
                </div>
                <h2 className="text-3xl font-black tracking-tight bg-gradient-to-r from-white via-slate-100 to-indigo-100 bg-clip-text text-transparent">About Our Company</h2>
                <p className="text-indigo-100 leading-relaxed text-lg whitespace-pre-line font-medium">
                  {config?.aboutCompany || "Founded with a vision to revolutionize technological excellence and client satisfaction, we have grown into a premier global software engineering firm. We pride ourselves on innovation, integrity, and fostering a collaborative workplace where every team member can thrive."}
                </p>
              </div>
            </div>

            {/* 2. Three Pillars: Vision, Mission, Values */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Vision Card */}
              <div className="bg-gradient-to-br from-[#1e3a8a] to-[#3b82f6] text-white p-8 rounded-3xl shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group flex flex-col justify-between border border-blue-400/20">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <TrendingUp className="w-32 h-32 text-white" />
                </div>
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-2xl mb-3 tracking-tight">Our Vision</h3>
                  <p className="text-blue-100 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {config?.vision || "To be the global benchmark for digital engineering solutions, empowering enterprise transformation with unmatched quality and agility."}
                  </p>
                </div>
              </div>

              {/* Mission Card */}
              <div className="bg-gradient-to-br from-[#581c87] to-[#a855f7] text-white p-8 rounded-3xl shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group flex flex-col justify-between border border-purple-400/20">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Heart className="w-32 h-32 text-white" />
                </div>
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-2xl mb-3 tracking-tight">Our Mission</h3>
                  <p className="text-purple-100 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {config?.mission || "Delivering state-of-the-art software products that solve real-world problems while nurturing an inclusive and continuous learning culture."}
                  </p>
                </div>
              </div>

              {/* Values Card */}
              <div className="bg-gradient-to-br from-[#065f46] to-[#10b981] text-white p-8 rounded-3xl shadow-lg hover:scale-[1.02] transition-all duration-300 relative overflow-hidden group flex flex-col justify-between border border-emerald-400/20">
                <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform duration-500">
                  <Award className="w-32 h-32 text-white" />
                </div>
                <div>
                  <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center mb-6 backdrop-blur-md border border-white/20">
                    <Award className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-extrabold text-2xl mb-3 tracking-tight">Core Values</h3>
                  <p className="text-emerald-100 text-sm leading-relaxed whitespace-pre-line font-medium">
                    {config?.coreValues || "• Customer Obsession\n• Ownership & Accountability\n• Uncompromising Integrity\n• Collaborative Innovation"}
                  </p>
                </div>
              </div>
            </div>

            {/* 3. History & Structure Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* History Section */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden border-t-4 border-indigo-600 flex flex-col justify-between">
                <div className="space-y-4">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                    <span className="p-2 bg-indigo-50 rounded-xl text-indigo-600"><Clock className="w-5 h-5" /></span>
                    Company History & Journey
                  </h3>
                  <p className="text-slate-600 leading-relaxed text-sm whitespace-pre-line font-medium">
                    {config?.companyHistory || "Starting as a dynamic tech boutique over a decade ago, our company has steadily expanded its global footprint, launching groundbreaking enterprise products and cultivating a world-class team across multiple continents."}
                  </p>
                </div>
              </div>

              {/* Org Structure Flow */}
              <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm relative overflow-hidden border-t-4 border-violet-600 flex flex-col justify-between">
                <div className="space-y-6">
                  <h3 className="text-xl font-extrabold text-slate-900 flex items-center gap-2.5">
                    <span className="p-2 bg-violet-50 rounded-xl text-violet-600"><Users className="w-5 h-5" /></span>
                    Organizational Path
                  </h3>
                  
                  {/* Dynamic flowchart mapping from hierarchical string */}
                  <div className="flex flex-col gap-3">
                    {(config?.organizationStructure || "Executive Leadership -> Divisional Directors -> Engineering & Product Managers -> Core Scrum Teams & Specialists.")
                      .split(/->|→/)
                      .map((step, sIdx, arr) => (
                        <div key={sIdx} className="flex flex-col items-start w-full">
                          <div className="flex items-center gap-3 w-full bg-slate-50 border border-slate-100 px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-800 shadow-sm">
                            <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center text-xs font-bold">{sIdx + 1}</span>
                            <span>{step.trim()}</span>
                          </div>
                          {sIdx < arr.length - 1 && (
                            <div className="w-full flex justify-start pl-7 py-1">
                              <ChevronRight className="w-4 h-4 text-violet-500 rotate-90" />
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Meet the Leadership Team */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-6 bg-gradient-to-b from-pink-500 to-indigo-600 rounded-full"></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Meet Our Leadership</h3>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {config?.leadershipTeam && config.leadershipTeam.length > 0 ? (
                  config.leadershipTeam.map((leader, i) => (
                    <div key={i} className="bg-white border border-slate-200 p-6 rounded-3xl text-center shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group">
                      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500"></div>
                      <div className="p-1 bg-gradient-to-tr from-pink-500 via-purple-500 to-blue-500 rounded-full mx-auto w-20 h-20 shadow-inner flex items-center justify-center bg-white group-hover:scale-105 transition-transform duration-300 mb-4">
                        <div className="w-full h-full rounded-full bg-slate-900 text-white flex items-center justify-center text-xl font-bold font-mono shadow-md">
                          {leader.name ? leader.name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase() : 'L'}
                        </div>
                      </div>
                      <h4 className="font-extrabold text-slate-950 text-base group-hover:text-indigo-600 transition-colors">{leader.name}</h4>
                      <p className="text-purple-600 text-xs font-bold uppercase tracking-wider mt-1">{leader.role}</p>
                      
                      {leader.exp && (
                        <div className="inline-block mt-3 px-3 py-1 bg-indigo-50 text-indigo-700 text-[10px] rounded-full font-bold uppercase tracking-wider">
                          {leader.exp}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-span-4 text-center py-12 text-slate-500 bg-slate-50 rounded-3xl border border-slate-200 font-semibold">
                    No leadership team members configured yet by HR.
                  </div>
                )}
              </div>
            </div>

            {/* 5. Office Locations */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-6 bg-gradient-to-b from-emerald-500 to-teal-600 rounded-full"></div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">Our Office Locations</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {config?.officeLocations && config.officeLocations.length > 0 ? (
                  config.officeLocations.map((loc, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-6 rounded-3xl shadow-sm hover:shadow-md transition-all group flex items-start gap-4 hover:border-emerald-500">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-all shadow-inner">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-950 mb-1.5 text-base">{loc.name}</h4>
                        <p className="text-slate-600 text-sm whitespace-pre-line leading-relaxed font-semibold">{loc.address}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 p-6 rounded-3xl shadow-sm group flex items-start gap-4 col-span-3">
                    <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 border border-emerald-100 shrink-0">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-slate-950 mb-1.5 text-base">Global Headquarters</h4>
                      <p className="text-slate-600 text-sm font-semibold">Tech Park, Innovation Boulevard, Suite 400</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3. COMPANY POLICIES TAB */}
        {activeTab === 'policies' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Company Policies</h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.filter(d => d.category === 'policy').length > 0 ? (
                documents.filter(d => d.category === 'policy').map((doc) => {
                  const isRead = progress?.readDocuments?.includes(doc._id || doc.title);
                  return (
                    <div key={doc._id} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-all flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center gap-2">
                            <span className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md border border-indigo-100">
                              {doc.subCategory || 'Policy'}
                            </span>
                            <span className={`px-2 py-0.5 text-xs font-bold rounded-md ${doc.isMandatory !== false ? 'bg-rose-100 text-rose-800' : 'bg-slate-100 text-slate-600'}`}>
                              {doc.isMandatory !== false ? 'MANDATORY' : 'OPTIONAL'}
                            </span>
                          </div>
                          {isRead ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Read
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-md">
                              <Circle className="w-3.5 h-3.5" /> Pending
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg">{doc.title}</h3>
                        <p className="text-slate-500 text-sm mt-2">{doc.description}</p>
                      </div>
                      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs text-slate-400">
                          {doc.isPortalPolicy ? 'Policy Portal • LIVE' : `Ver ${doc.version || 1}.0`} • {doc.effectiveDate ? new Date(doc.effectiveDate).toLocaleDateString() : 'Effective Now'}
                        </span>
                        <button
                          onClick={() => handleReadDoc(doc)}
                          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-all"
                        >
                          <Eye className="w-4 h-4" /> {doc.isPortalPolicy ? 'Read Policy' : 'Read Document'}
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No policy documents uploaded yet by HR.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. EMPLOYEE HANDBOOK TAB */}
        {activeTab === 'handbook' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Employee Handbook</h2>
              <p className="text-slate-500 text-sm mt-1">Everything you need to know about day-to-day office life and employee perks.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.filter(d => d.category === 'handbook').length > 0 ? (
                documents.filter(d => d.category === 'handbook').map((doc) => (
                  <div key={doc._id} className="bg-white border border-indigo-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div className="flex gap-4">
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 font-bold text-lg">
                        📖
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-lg">{doc.title}</h3>
                        <p className="text-slate-600 text-sm mt-1 leading-relaxed">{doc.description || doc.subCategory}</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between items-center">
                      <span className="text-xs font-semibold text-slate-400">{doc.fileName}</span>
                      <button
                        onClick={() => handleReadDoc(doc)}
                        className="text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Read Handbook Section
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No handbook sections uploaded yet by HR.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 5. KNOWLEDGE SHARING TAB */}
        {activeTab === 'knowledge' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Knowledge Repository</h2>
                <p className="text-slate-500 text-sm">Access technical presentations, SOP documents, and training recordings.</p>
              </div>
              <input
                type="text"
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full sm:w-64 border border-slate-300 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {documents.filter(d => d.category === 'knowledge' && d.title.toLowerCase().includes(searchQuery.toLowerCase())).length > 0 ? (
                documents.filter(d => d.category === 'knowledge' && d.title.toLowerCase().includes(searchQuery.toLowerCase())).map((doc) => (
                  <div key={doc._id} className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-shadow">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">{doc.division ? `${doc.division} - ` : ''}{doc.subCategory}</span>
                        <span className="text-xs text-slate-400 font-medium">v{doc.version || 1}.0</span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{doc.title}</h3>
                      <p className="text-slate-500 text-xs mt-2 line-clamp-3 leading-relaxed">{doc.description}</p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <span className="text-xs text-slate-400 uppercase font-semibold">{doc.fileType}</span>
                      <button
                        onClick={() => handleReadDoc(doc)}
                        className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-xl transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" /> View Resource
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="col-span-3 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No knowledge repository resources uploaded yet by HR.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 6. MANDATORY TRAINING TAB */}
        {activeTab === 'training' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900">Mandatory Training Modules</h2>
              <p className="text-slate-500 text-sm mt-1">Watch all required orientation sessions to fulfill your compliance requirements.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {documents.filter(d => d.category === 'training').length > 0 ? (
                documents.filter(d => d.category === 'training').map((item, idx) => {
                  const trainingName = item.title || item.subCategory || `Training Module ${idx + 1}`;
                  const isCompleted = progress?.completedTrainings?.includes(trainingName) || progress?.completedTrainings?.includes(item.subCategory) || progress?.completedTrainings?.includes(item.title);
                  return (
                    <div key={item._id || idx} className={`border rounded-2xl p-6 transition-all flex flex-col justify-between ${isCompleted ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-slate-200'}`}>
                      <div>
                        <div className="flex justify-between items-start mb-2">
                          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> {item.fileSize ? `${Math.max(10, Math.round(item.fileSize / 1000000))} mins` : '15 mins'}
                          </span>
                          {isCompleted ? (
                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-100 px-2.5 py-1 rounded-md">
                              <CheckCircle2 className="w-4 h-4" /> Completed
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-xs font-semibold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">
                              <Circle className="w-4 h-4" /> Action Required
                            </span>
                          )}
                        </div>
                        <h3 className="font-bold text-slate-900 text-lg mt-2">{trainingName}</h3>
                        <p className="text-slate-600 text-sm mt-1">{item.description || 'Mandatory onboarding training session.'}</p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-200/60 flex items-center justify-between">
                        <button
                          onClick={() => setPreviewDoc(item)}
                          className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800 text-sm font-semibold"
                        >
                          <Play className="w-4 h-4 fill-current" /> Watch Session
                        </button>

                        {!isCompleted && (
                          <button
                            onClick={() => handleCompleteTraining(trainingName)}
                            className="bg-slate-900 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm"
                          >
                            Mark as Completed ✓
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-2 text-center py-12 text-slate-500 bg-white rounded-2xl border border-slate-200">
                  No mandatory training modules uploaded yet by HR.
                </div>
              )}
            </div>
          </div>
        )}

        {/* 7. ASSESSMENT TAB */}
        {activeTab === 'assessment' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm text-center">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <HelpCircle className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900">Mandatory Induction Quiz</h2>
              <p className="text-slate-500 text-sm mt-1">
                Test your knowledge on company policies, ethics, and information security. Passing percentage is <strong className="text-indigo-600 font-bold">{assessment?.passingPercentage || 70}%</strong>.
              </p>

              {(() => {
                const passedAttempt = progress?.assessmentAttempts?.find(a => a.passed);
                const displayScore = quizScore || (passedAttempt ? {
                  score: passedAttempt.score,
                  total: passedAttempt.totalQuestions,
                  pct: passedAttempt.percentage,
                  passed: true
                } : null);

                if (displayScore) {
                  return (
                    <div className={`mt-6 p-6 rounded-2xl border ${displayScore.passed ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                      {displayScore.passed && <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-2" />}
                      <h3 className="text-xl font-bold mb-1">
                        {displayScore.passed ? '🎉 Congratulations! You Passed!' : '⚠️ Attempt Did Not Meet Passing Criteria'}
                      </h3>
                      <p className="text-sm font-medium mb-3">
                        Your Score: {displayScore.score} / {displayScore.total} ({displayScore.pct}%)
                      </p>
                      {displayScore.passed ? (
                        <div className="bg-white/80 p-4 rounded-xl border border-emerald-200 text-xs font-semibold text-emerald-900 max-w-md mx-auto">
                          ✓ You have successfully completed the mandatory induction assessment. Look under Acknowledgement tab for your verified digital signature.
                        </div>
                      ) : (
                        <button
                          onClick={() => { setQuizSubmitted(false); setQuizScore(null); setQuizAnswers({}); }}
                          className="mt-4 bg-rose-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-sm hover:bg-rose-700"
                        >
                          Try Again
                        </button>
                      )}
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {!(quizScore?.passed || progress?.assessmentAttempts?.some(a => a.passed)) && !quizSubmitted && assessment?.questions?.map((q, qIdx) => (
              <div key={q.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-base">
                  {qIdx + 1}. {q.question}
                </h3>
                <div className="space-y-2">
                  {q.options.map((opt, optIdx) => (
                    <label
                      key={optIdx}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${quizAnswers[qIdx] === optIdx
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 font-medium'
                          : 'border-slate-200 hover:bg-slate-50'
                        }`}
                    >
                      <input
                        type="radio"
                        name={`question-${qIdx}`}
                        checked={quizAnswers[qIdx] === optIdx}
                        onChange={() => setQuizAnswers({ ...quizAnswers, [qIdx]: optIdx })}
                        className="w-4 h-4 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="text-sm">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            {!(quizScore?.passed || progress?.assessmentAttempts?.some(a => a.passed)) && !quizSubmitted && assessment?.questions?.length > 0 && (
              <div className="text-center pt-4">
                <button
                  onClick={handleQuizSubmit}
                  disabled={Object.keys(quizAnswers).length < assessment.questions.length}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold px-8 py-3.5 rounded-xl shadow-lg shadow-indigo-200 transition-all"
                >
                  Submit Assessment Quiz
                </button>
              </div>
            )}
          </div>
        )}

        {/* 8. ACKNOWLEDGEMENT TAB */}
        {activeTab === 'acknowledgement' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Digital Policy Acknowledgement</h2>
              <p className="text-slate-600 text-sm leading-relaxed mb-6">
                By checking the boxes below, you legally verify and acknowledge that you have read, understood, and agree to strictly comply with all stated company policies and ethical guidelines.
              </p>

              {(() => {
                const isFirstSixMonths = progress?.isExistingEmployee === true ? false : progress?.isExistingEmployee === false ? true : (user?.dateOfJoining || user?.joiningDate || progress?.dateOfJoining) ? ((new Date() - new Date(user?.dateOfJoining || user?.joiningDate || progress?.dateOfJoining)) / (1000 * 60 * 60 * 24) <= 185) : true;

                const ackModules = [
                  { id: 'Company Policies', label: 'Company Policies', category: 'policy', tabKey: 'policies' },
                  { id: 'Employee Handbook', label: 'Employee Handbook', category: 'handbook', tabKey: 'handbook' },
                  { id: 'Knowledge Sharing', label: 'Knowledge Sharing', category: 'knowledge', tabKey: 'knowledge' },
                  { id: 'Training Material', label: 'Training Material', category: 'training', tabKey: 'training' },
                ];

                if (isFirstSixMonths) {
                  ackModules.push({ id: 'Assessment', label: 'Induction Assessment Quiz', category: 'assessment', tabKey: 'assessment' });
                }

                return (
                  <div className="space-y-4">
                    {ackModules.map((mod) => {
                      const ack = progress?.acknowledgements?.find(a => a.policyName === mod.id);

                      let totalMandatory = 0;
                      let readCount = 0;
                      let isFullyRead = false;

                      if (mod.category === 'assessment') {
                        isFullyRead = progress?.assessmentAttempts?.some(a => a.passed);
                      } else {
                        const mandatoryDocs = documents.filter(d => d.category === mod.category && d.isMandatory !== false);
                        totalMandatory = mandatoryDocs.length;
                        readCount = mandatoryDocs.filter(doc => progress?.readDocuments?.includes(doc._id || doc.title)).length;
                        isFullyRead = totalMandatory === 0 || readCount >= totalMandatory;
                      }

                      const isCompleted = ack || (isFullyRead && (totalMandatory > 0 || mod.category === 'assessment'));

                      return (
                        <div
                          key={mod.id}
                          onClick={() => {
                            if (isCompleted) return;
                            if (!isFullyRead) {
                              alert(mod.category === 'assessment'
                                ? "Please complete and pass the Induction Assessment Quiz first!"
                                : `Please read all mandatory documents in ${mod.label} (${readCount}/${totalMandatory} read) before acknowledging.`);
                              return;
                            }
                            handleToggleAck(mod.id);
                          }}
                          className={`p-5 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all ${
                            isCompleted
                              ? 'bg-emerald-50/60 border-emerald-300'
                              : isFullyRead
                                ? 'bg-indigo-50/30 border-indigo-300 cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/60 shadow-sm'
                                : 'bg-slate-50 border-slate-200 opacity-80'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 border ${
                              isCompleted
                                ? 'bg-emerald-600 border-emerald-600 text-white'
                                : isFullyRead
                                  ? 'border-indigo-600 text-indigo-600 bg-white'
                                  : 'border-slate-300 bg-slate-100 text-slate-300'
                            }`}>
                              {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <Circle className="w-3.5 h-3.5" />}
                            </div>
                            <div>
                              <span className="font-bold text-slate-800 text-sm sm:text-base block">{mod.label}</span>
                              {!isCompleted && !isFullyRead && (
                                <span className="text-xs text-amber-600 font-semibold block mt-0.5">
                                  {mod.category === 'assessment'
                                    ? 'Requires passing quiz score'
                                    : `Must read all mandatory files (${readCount}/${totalMandatory} read)`}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="sm:text-right w-full sm:w-auto flex flex-col items-start sm:items-end">
                            {isCompleted ? (
                              <div>
                                <span className="text-xs text-emerald-700 font-bold bg-emerald-100 px-2.5 py-1 rounded-md block mb-1">
                                  ✓ {ack?.digitalSignature || 'Completed & Digitally Verified'}
                                </span>
                                <span className="text-[11px] text-slate-500 block">
                                  {ack?.employeeName || progress?.employeeName || user.name || 'Employee'} ({ack?.employeeId || progress?.employeeId || user.employeeId || 'Emp ID'}) • {new Date(ack?.acknowledgedAt || Date.now()).toLocaleDateString()}
                                </span>
                              </div>
                            ) : isFullyRead ? (
                              <span className="text-xs bg-[#262760] text-white font-bold px-3.5 py-2 rounded-xl shadow-sm hover:bg-[#1e2050] transition-colors inline-block">
                                Click to Acknowledge
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveTab(mod.tabKey);
                                }}
                                className="text-xs text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 font-bold px-3 py-1.5 rounded-xl transition-colors"
                              >
                                Go to {mod.label} →
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* 9. FEEDBACK TAB */}
        {activeTab === 'feedback' && (
          <div className="max-w-2xl mx-auto bg-white p-8 rounded-3xl border border-slate-200 shadow-sm animate-fadeIn">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Onboarding Experience Feedback</h2>
            <p className="text-slate-500 text-sm mb-6">Your insights help us continuously refine and improve our induction journey for future hires.</p>

            {feedbackSubmitted ? (
              <div className="p-6 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
                <h3 className="font-bold text-emerald-900 text-lg">Thank You for Your Feedback!</h3>
                <p className="text-emerald-700 text-sm">Your response has been saved. We greatly value your thoughts!</p>
              </div>
            ) : (
              <form onSubmit={handleFeedbackSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Overall Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className={`p-2 rounded-lg transition-all ${rating >= star ? 'text-yellow-400 bg-yellow-50' : 'text-slate-300'}`}
                      >
                        <Star className="w-8 h-8 fill-current" />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Comments or Highlighted Experiences</label>
                  <textarea
                    rows={3}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    placeholder="Share what you enjoyed most about the onboarding journey..."
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Suggestions for Improvement</label>
                  <textarea
                    rows={3}
                    value={suggestions}
                    onChange={(e) => setSuggestions(e.target.value)}
                    placeholder="Any topics or materials you felt were missing?"
                    className="w-full border border-slate-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" /> Submit Feedback
                </button>
              </form>
            )}
          </div>
        )}

        {/* 10. COMPLETION TAB */}
        {activeTab === 'completion' && (
          !isFirstSixMonthsUser ? (
            <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-b from-white via-emerald-50/40 to-white p-10 rounded-3xl border border-emerald-200/80 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/30 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                
                <div className="w-24 h-24 bg-gradient-to-tr from-emerald-500 to-teal-600 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200 animate-pulse">
                  <CheckCircle2 className="w-12 h-12" />
                </div>

                <span className="inline-block px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-3 tracking-wide uppercase">
                  Continuous Compliance & Policy Refresher
                </span>

                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {pct === 100 ? 'All Refresher Policies Acknowledged! 🎉' : 'Refresher In Progress'}
                </h2>
                <p className="text-slate-600 max-w-lg mx-auto mt-2 text-sm leading-relaxed">
                  As an existing team member, your document readings and digital acknowledgements are logged automatically. HR verification is not required for annual or ongoing compliance updates.
                </p>

                {/* Big Percentage Showcase */}
                <div className="my-8 py-6 px-10 bg-white/90 backdrop-blur-md rounded-2xl border border-emerald-100 shadow-sm inline-block min-w-[240px]">
                  <span className="text-xs text-slate-400 font-bold uppercase tracking-wider block mb-1">Refresher Progress</span>
                  <div className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    {pct}%
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mt-4 text-left">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Status Date</span>
                    <p className="font-bold text-slate-800 text-base mt-0.5">
                      {progress?.updatedAt ? new Date(progress.updatedAt).toLocaleDateString() : 'Today'}
                    </p>
                  </div>
                  <div className="bg-emerald-50/70 p-4 rounded-2xl border border-emerald-200 shadow-sm">
                    <span className="text-xs text-emerald-600 font-semibold uppercase">Registry Status</span>
                    <p className="font-bold text-emerald-700 text-base mt-0.5 flex items-center gap-1.5">
                      Auto-Verified ✓
                    </p>
                  </div>
                </div>

                {pct === 100 && (
                  <div className="mt-8">
                    <button
                      onClick={downloadCertificate}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-emerald-200 transition-all transform hover:scale-105"
                    >
                      <Download className="w-5 h-5" /> Download Summary Record
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto text-center space-y-8 animate-fadeIn">
              <div className="bg-gradient-to-b from-white via-indigo-50/30 to-white p-10 rounded-3xl border border-indigo-100 shadow-xl relative overflow-hidden">
                <div className="w-24 h-24 bg-gradient-to-tr from-yellow-400 to-amber-500 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200 animate-bounce">
                  <Award className="w-12 h-12" />
                </div>

                <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {pct === 100 ? 'Induction Completed Successfully! 🎉' : 'Onboarding In Progress'}
                </h2>
                <p className="text-slate-600 max-w-lg mx-auto mt-2 leading-relaxed">
                  {pct === 100
                    ? 'Congratulations! You have fulfilled all mandatory training modules, quizzes, and policy acknowledgements.'
                    : `You have completed ${pct}% of your induction workflow. Please complete remaining mandatory modules to unlock your certificate.`}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mt-8 text-left">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 font-semibold uppercase">Completion Date</span>
                    <p className="font-bold text-slate-800 text-base mt-0.5">
                      {progress?.completedAt ? new Date(progress.completedAt).toLocaleDateString() : pct === 100 ? 'Today' : 'Pending'}
                    </p>
                  </div>
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                    <span className="text-xs text-slate-400 font-semibold uppercase">HR Verification</span>
                    <p className={`font-bold text-base mt-0.5 ${progress?.hrVerified ? 'text-emerald-600' : 'text-amber-600'}`}>
                      {progress?.hrVerified ? 'Verified ✓' : 'Pending Review'}
                    </p>
                  </div>
                </div>

                {pct === 100 && (
                  <div className="mt-8">
                    <button
                      onClick={downloadCertificate}
                      className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-indigo-300 transition-all transform hover:scale-105"
                    >
                      <Download className="w-5 h-5" /> Download Completion Certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* Preview Modal */}
      {previewDoc && (() => {
        const docTitleName = previewDoc.title || previewDoc.subCategory;
        const isDocCompleted = previewDoc.category === 'policy'
          ? progress?.acknowledgements?.some(a => a.policyName === previewDoc.title)
          : (progress?.completedTrainings?.includes(docTitleName) || progress?.completedTrainings?.includes(previewDoc.subCategory) || progress?.completedTrainings?.includes(previewDoc.title));
        const absoluteUrl = previewDoc.fileUrl?.startsWith('http') 
          ? previewDoc.fileUrl 
          : `${BASE_URL}${previewDoc.fileUrl}`;
        const isLocalUrl = absoluteUrl.includes('localhost') || absoluteUrl.includes('127.0.0.1') || absoluteUrl.includes('192.168.');
        
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-[#262760] text-white">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-violet-200 uppercase tracking-wider">
                    {previewDoc.division ? `${previewDoc.division} - ` : ''}{previewDoc.category}
                  </span>
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
                    <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                      {previewDoc.fileUrl ? (
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
                      ) : (
                        <span className="text-xs font-semibold text-slate-400">No Attachment</span>
                      )}
                      <div className="flex gap-3">
                        {previewDoc.fileUrl && (
                          <a
                            href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-4 py-2 rounded-xl text-xs shadow-sm transition-all"
                          >
                            <Download className="w-3.5 h-3.5" /> Download File
                          </a>
                        )}
                        {!progress?.isExistingEmployee && (
                          isDocCompleted ? (
                            <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-4 py-2 rounded-xl text-xs shadow-sm">
                              <CheckCircle2 className="w-4 h-4" /> Completed
                            </span>
                          ) : (
                            <button
                              onClick={() => {
                                handleCompleteTraining(docTitleName);
                                alert(`Marked "${docTitleName}" as completed.`);
                              }}
                              className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs shadow-md transition-all"
                            >
                              Mark as Completed ✓
                            </button>
                          )
                        )}
                      </div>
                    </div>
                  </div>
                ) : (previewDoc.fileType === 'video' || previewDoc.fileName?.endsWith('.mp4') || previewDoc.fileName?.endsWith('.mov') || previewDoc.fileName?.endsWith('.avi') || previewDoc.fileName?.endsWith('.webm')) ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <video 
                      controls 
                      autoPlay
                      onEnded={() => {
                        if (!isDocCompleted) {
                          handleCompleteTraining(docTitleName);
                          alert(`Congratulations! You have completed watching "${docTitleName}".`);
                        }
                      }}
                      className="w-full max-w-3xl rounded-2xl shadow-lg bg-black max-h-[55vh]"
                    >
                      <source src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`} type="video/mp4" />
                      Your browser does not support video playback.
                    </video>
                    <div className="flex gap-3">
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
                      {!progress?.isExistingEmployee && (
                        isDocCompleted ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleCompleteTraining(docTitleName);
                              alert(`Marked "${docTitleName}" as completed.`);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
                          >
                            Mark as Completed ✓
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (previewDoc.fileType === 'pdf' || previewDoc.fileName?.endsWith('.pdf')) ? (
                  <div className="w-full h-full flex flex-col items-center gap-4">
                    <iframe
                      src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                      className="w-full h-[55vh] rounded-2xl border border-slate-200 shadow-md bg-white"
                      title="PDF Preview"
                    />
                    <div className="flex gap-3">
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
                      {!progress?.isExistingEmployee && (
                        isDocCompleted ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleCompleteTraining(docTitleName);
                              alert(`Marked "${docTitleName}" as completed.`);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
                          >
                            Mark as Completed ✓
                          </button>
                        )
                      )}
                    </div>
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
                    <div className="flex gap-3">
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
                      {!progress?.isExistingEmployee && (
                        isDocCompleted ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleCompleteTraining(docTitleName);
                              alert(`Marked "${docTitleName}" as completed.`);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
                          >
                            Mark as Completed ✓
                          </button>
                        )
                      )}
                    </div>
                  </div>
                ) : (previewDoc.fileType === 'image' || previewDoc.fileName?.endsWith('.png') || previewDoc.fileName?.endsWith('.jpg') || previewDoc.fileName?.endsWith('.jpeg') || previewDoc.fileName?.endsWith('.gif') || previewDoc.fileName?.endsWith('.svg')) ? (
                  <div className="w-full flex flex-col items-center gap-4">
                    <img
                      src={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                      alt={previewDoc.title}
                      className="max-w-full max-h-[55vh] object-contain rounded-2xl shadow-md bg-white"
                    />
                    <div className="flex gap-3">
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
                      {!progress?.isExistingEmployee && (
                        isDocCompleted ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-5 py-2.5 rounded-xl text-xs shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleCompleteTraining(docTitleName);
                              alert(`Marked "${docTitleName}" as completed.`);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md transition-all"
                          >
                            Mark as Completed ✓
                          </button>
                        )
                      )}
                    </div>
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
                    <div className="flex gap-3 justify-center">
                      {previewDoc.fileUrl && (
                        <a
                          href={previewDoc.fileUrl?.startsWith('http') ? previewDoc.fileUrl : `${BASE_URL}${previewDoc.fileUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 bg-[#262760] hover:bg-[#1e2050] text-white font-bold px-6 py-3 rounded-xl shadow-md"
                        >
                          <Download className="w-4 h-4" /> Download / Open File
                        </a>
                      )}
                      {!progress?.isExistingEmployee && (
                        isDocCompleted ? (
                          <span className="inline-flex items-center gap-1.5 bg-emerald-100 text-emerald-800 font-bold px-5 py-3 rounded-xl text-xs shadow-sm">
                            <CheckCircle2 className="w-4 h-4" /> Completed
                          </span>
                        ) : (
                          <button
                            onClick={() => {
                              handleCompleteTraining(docTitleName);
                              alert(`Marked "${docTitleName}" as completed.`);
                            }}
                            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-5 py-3 rounded-xl text-xs shadow-md transition-all"
                          >
                            Mark as Completed ✓
                          </button>
                        )
                      )}
                    </div>
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

export default InductionPortal;
