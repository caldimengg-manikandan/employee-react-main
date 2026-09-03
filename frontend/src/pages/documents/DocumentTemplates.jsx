import React, { useState, useEffect } from 'react';
import { FileText, Sparkles, RefreshCw, Save, FolderOpen, Eye, Trash2, CheckCircle, AlertCircle } from 'lucide-react';
import { documentTemplateAPI } from '../../services/api';
import LetterheadPreview from '../../components/documents/LetterheadPreview';

const DocumentTemplates = () => {
  const [documentTitle, setDocumentTitle] = useState('');
  const [documentContent, setDocumentContent] = useState('');
  const [location, setLocation] = useState('Chennai');
  const [savedDocuments, setSavedDocuments] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [activeView, setActiveView] = useState('CREATE'); // 'CREATE' | 'SAVED'

  useEffect(() => {
    fetchSavedDocuments();
  }, []);

  const fetchSavedDocuments = async () => {
    setLoadingDocs(true);
    try {
      const res = await documentTemplateAPI.getDocuments();
      if (res.data?.success) {
        setSavedDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Error loading saved documents:', err);
    } finally {
      setLoadingDocs(false);
    }
  };

  // Save Document Function
  const handleSaveDocument = async () => {
    if (!documentTitle.trim()) {
      setMessage({ type: 'error', text: 'Please enter a document name / title before saving.' });
      return;
    }

    if (!documentContent.trim()) {
      setMessage({ type: 'error', text: 'Please enter document content before saving.' });
      return;
    }

    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        templateId: 'CUSTOM',
        templateName: documentTitle,
        employeeId: 'EMP-GENERAL',
        employeeDetails: { name: 'General Document', location },
        title: documentTitle,
        content: documentContent,
        submitNow: false
      };

      const res = await documentTemplateAPI.createDocument(payload);
      if (res.data?.success) {
        setMessage({ type: 'success', text: `Document "${documentTitle}" saved successfully!` });
        fetchSavedDocuments();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to save document.' });
    } finally {
      setSaving(false);
    }
  };

  // Load Saved Document into Editor & Preview
  const handleLoadDocument = (doc) => {
    setDocumentTitle(doc.title);
    setDocumentContent(doc.content);
    setLocation(doc.employeeDetails?.location || 'Chennai');
    setActiveView('CREATE');
    setMessage({ type: 'success', text: `Loaded "${doc.title}" into editor and letterhead preview.` });
  };

  // Delete Saved Document
  const handleDeleteDocument = async (id, title) => {
    if (!window.confirm(`Are you sure you want to delete "${title}"?`)) return;
    try {
      const res = await documentTemplateAPI.archiveDocument(id);
      if (res.data?.success || res.status === 200) {
        setSavedDocuments((prev) => prev.filter((d) => d._id !== id));
        setMessage({ type: 'success', text: `Deleted "${title}" successfully.` });
        fetchSavedDocuments();
      }
    } catch (err) {
      console.error('Error deleting document:', err);
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to delete document.' });
    }
  };

  const handleReset = () => {
    setDocumentTitle('');
    setDocumentContent('');
    setLocation('Chennai');
    setMessage({ type: '', text: '' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#1b2752] to-[#111936] p-5 rounded-2xl text-white shadow-xl border-b-4 border-[#ff7900]">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-[#ff7900] flex items-center justify-center text-white font-bold shadow-md">
            <FileText className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-wide">CALDIM Letterhead Document Generator</h1>
            <p className="text-xs text-gray-300">Create, save, preview, print, or download official documents.</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setActiveView(activeView === 'CREATE' ? 'SAVED' : 'CREATE')}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-[#ff7900] hover:bg-[#e06b00] text-white rounded-lg text-xs font-bold transition shadow"
          >
            <FolderOpen className="w-4 h-4" />
            <span>{activeView === 'CREATE' ? `View Saved Documents (${savedDocuments.length})` : 'Back to Generator'}</span>
          </button>

          <button
            onClick={handleReset}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold transition border border-white/20"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Notification Banner */}
      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center justify-between shadow-sm transition ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center space-x-2">
            {message.type === 'error' ? <AlertCircle className="w-4 h-4 text-red-600" /> : <CheckCircle className="w-4 h-4 text-emerald-600" />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-gray-400 hover:text-gray-700 font-extrabold">
            ×
          </button>
        </div>
      )}

      {/* MAIN VIEW 1: GENERATOR & LIVE PREVIEW */}
      {activeView === 'CREATE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Control Panel */}
          <div className="lg:col-span-5 bg-white p-6 rounded-2xl shadow-md border border-gray-100 space-y-5">
            <h2 className="text-xs font-extrabold text-[#1b2752] uppercase tracking-wider border-b pb-2">
              Enter Document Details
            </h2>

            {/* 1. Document Name Input */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Document Name / Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#1b2752] focus:outline-none bg-slate-50"
                placeholder="e.g. Relieving & Experience Certificate"
              />
            </div>

            {/* 2. Location Select Input */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Location (Determines Authorized Signature) <span className="text-red-500">*</span>
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 border border-gray-300 rounded-xl text-xs font-bold text-gray-900 focus:ring-2 focus:ring-[#1b2752] focus:outline-none bg-slate-50"
              >
                <option value="Chennai">Chennai Location (Signature: Uvaraj)</option>
                <option value="Hosur">Hosur Location (Signature: Bala)</option>
              </select>
            </div>

            {/* 3. Document Content Input */}
            <div>
              <label className="block text-xs font-extrabold text-gray-800 mb-1.5">
                Document Content / Body <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={11}
                value={documentContent}
                onChange={(e) => setDocumentContent(e.target.value)}
                className="w-full p-3.5 border border-gray-300 rounded-xl text-xs font-mono focus:ring-2 focus:ring-[#1b2752] focus:outline-none leading-relaxed bg-slate-900 text-slate-100 shadow-inner"
                placeholder="Enter your document text here..."
              />
            </div>

            {/* Save Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveDocument}
                disabled={saving}
                className="w-full py-3 bg-[#1b2752] hover:bg-[#121b3b] text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center space-x-2"
              >
                <Save className="w-4 h-4 text-[#ff7900]" />
                <span>{saving ? 'Saving Document...' : 'Save Document to System'}</span>
              </button>
            </div>
          </div>

          {/* Right Live Preview */}
          <div className="lg:col-span-7 bg-white p-6 rounded-2xl shadow-md border border-gray-100 flex flex-col items-center">
            <div className="w-full flex justify-between items-center mb-4 border-b pb-2">
              <h2 className="text-sm font-bold text-[#1b2752] flex items-center space-x-1.5 uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-[#ff7900]" />
                <span>Official CALDIM Letterhead Preview</span>
              </h2>
            </div>

            {documentTitle || documentContent ? (
              <LetterheadPreview
                documentNumber="CAL-DOC-LIVE"
                title={documentTitle || 'OFFICIAL DOCUMENT'}
                content={documentContent}
                location={location}
                employeeDetails={{ location }}
                status="Active"
                showActions={true}
                onSave={handleSaveDocument}
              />
            ) : (
              <div className="py-36 text-center text-gray-400 space-y-2">
                <FileText className="w-12 h-12 mx-auto text-gray-300 stroke-1" />
                <p className="text-xs font-medium">Type a document name and text on the left to see the live letterhead preview.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MAIN VIEW 2: SAVED DOCUMENTS TABLE */}
      {activeView === 'SAVED' && (
        <div className="bg-white rounded-2xl shadow-md border border-gray-100 p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-4">
            <div>
              <h2 className="text-base font-bold text-[#1b2752]">Saved Documents Repository</h2>
              <p className="text-xs text-gray-500">All saved letterhead documents are stored here. Click "Load & Preview" to open any saved document.</p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#1b2752] text-white font-extrabold uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Document Title / Name</th>
                  <th className="p-3.5">Location / Signature</th>
                  <th className="p-3.5">Saved Date</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {savedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-400 font-medium">
                      No saved documents yet. Type a document name and click "Save Document" to store it here.
                    </td>
                  </tr>
                ) : (
                  savedDocuments.map((doc) => (
                    <tr key={doc._id} className="hover:bg-slate-50 transition">
                      <td className="p-3.5 font-bold text-gray-900">{doc.title}</td>
                      <td className="p-3.5">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          (doc.employeeDetails?.location || '').toLowerCase().includes('hosur')
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {doc.employeeDetails?.location || 'Chennai'} Signature
                        </span>
                      </td>
                      <td className="p-3.5 text-gray-500">{new Date(doc.createdAt).toLocaleDateString()}</td>
                      <td className="p-3.5 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleLoadDocument(doc)}
                            className="flex items-center space-x-1 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-xs transition"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Load & Preview</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDocument(doc._id, doc.title)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentTemplates;
