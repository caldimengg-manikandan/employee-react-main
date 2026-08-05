import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  FileSignature,
  Settings,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { documentTemplateAPI } from '../../services/api';
import LetterheadPreview from '../../components/documents/LetterheadPreview';
import DirectorSignatureModal from '../../components/documents/DirectorSignatureModal';
import AuditLogModal from '../../components/documents/AuditLogModal';

const DirectorDocumentApprovals = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState('Pending Director Approval');

  // Preview & Modal State
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isSigModalOpen, setIsSigModalOpen] = useState(false);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [auditDoc, setAuditDoc] = useState(null);

  const [message, setMessage] = useState({ type: '', text: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchDocuments();
  }, [statusFilter]);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentTemplateAPI.getDocuments({ status: statusFilter });
      if (res.data?.success) {
        setDocuments(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching approval documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (docId) => {
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await documentTemplateAPI.approveDocument(docId);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Document approved successfully and digital signature attached.' });
        setIsPreviewOpen(false);
        fetchDocuments();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to approve document' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedDoc) return;
    setActionLoading(true);
    setMessage({ type: '', text: '' });
    try {
      const res = await documentTemplateAPI.rejectDocument(selectedDoc._id, { reason: rejectionReason });
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Document rejected and sent back to HR with comments.' });
        setIsRejectModalOpen(false);
        setIsPreviewOpen(false);
        setRejectionReason('');
        fetchDocuments();
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to reject document' });
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Pending Director Approval':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 flex items-center gap-1"><Clock className="w-3 h-3"/> Pending Approval</span>;
      case 'Approved':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 flex items-center gap-1"><CheckCircle className="w-3 h-3"/> Approved</span>;
      case 'Rejected':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 flex items-center gap-1"><XCircle className="w-3 h-3"/> Rejected</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">{status}</span>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-7 h-7 text-indigo-400" />
            <h1 className="text-2xl font-black tracking-tight">Director Document Approval Center</h1>
          </div>
          <p className="text-xs text-indigo-200 mt-1">
            Review live A4 CALDIM letterhead previews, attach digital signature, approve, or reject official HR documents.
          </p>
        </div>

        {/* Signature Settings Button */}
        <button
          onClick={() => setIsSigModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-xs font-bold shadow-lg transition"
        >
          <Settings className="w-4 h-4" />
          <span>Signature & Stamp Settings</span>
        </button>
      </div>

      {message.text && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center justify-between ${
            message.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <span>{message.text}</span>
          <button onClick={() => setMessage({ type: '', text: '' })} className="text-gray-500 hover:text-gray-800">
            ×
          </button>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="bg-white p-4 rounded-2xl shadow-lg border border-gray-100 flex items-center justify-between">
        <div className="flex space-x-2">
          {['Pending Director Approval', 'Approved', 'Rejected', 'ALL'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                statusFilter === st
                  ? 'bg-indigo-900 text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {st === 'Pending Director Approval' ? 'Pending Approval' : st}
            </button>
          ))}
        </div>

        <span className="text-xs text-gray-500 font-medium">
          Total Documents: <strong>{documents.length}</strong>
        </span>
      </div>

      {/* Documents Grid / Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="py-16 text-center text-gray-400 text-xs font-medium">Loading approval documents...</div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-2">
            <FileSignature className="w-10 h-10 mx-auto text-gray-300 stroke-1" />
            <p className="text-xs font-medium">No documents currently matching "{statusFilter}".</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase tracking-wider">
                  <th className="p-3.5">Ref No</th>
                  <th className="p-3.5">Document Title</th>
                  <th className="p-3.5">Employee Name</th>
                  <th className="p-3.5">Submitted Date</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc._id} className="hover:bg-gray-50/80 transition">
                    <td className="p-3.5 font-mono font-bold text-indigo-950">{doc.documentNumber}</td>
                    <td className="p-3.5 font-semibold text-gray-900">{doc.title}</td>
                    <td className="p-3.5 font-medium text-gray-700">
                      {doc.employeeDetails?.name || doc.employeeId} ({doc.employeeId})
                    </td>
                    <td className="p-3.5 text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="p-3.5">{getStatusBadge(doc.status)}</td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          onClick={() => {
                            setSelectedDoc(doc);
                            setIsPreviewOpen(true);
                          }}
                          className="px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold transition flex items-center space-x-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review A4</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LIVE A4 REVIEW & APPROVAL MODAL */}
      {isPreviewOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[92vh] overflow-y-auto p-6 relative border border-gray-100 space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{selectedDoc.title}</h3>
                <p className="text-xs text-gray-500 font-mono">Ref: {selectedDoc.documentNumber}</p>
              </div>

              {/* Action Buttons inside Review Modal */}
              <div className="flex items-center space-x-3">
                {selectedDoc.status === 'Pending Director Approval' && (
                  <>
                    <button
                      onClick={() => setIsRejectModalOpen(true)}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center space-x-1"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject & Comment</span>
                    </button>

                    <button
                      onClick={() => handleApprove(selectedDoc._id)}
                      disabled={actionLoading}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-lg transition flex items-center space-x-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>{actionLoading ? 'Approving...' : 'Approve & Attach Signature'}</span>
                    </button>
                  </>
                )}

                <button
                  onClick={() => setIsPreviewOpen(false)}
                  className="text-gray-400 hover:text-gray-800 text-xl font-bold p-1"
                >
                  ✕
                </button>
              </div>
            </div>

            <LetterheadPreview
              documentNumber={selectedDoc.documentNumber}
              title={selectedDoc.title}
              content={selectedDoc.content}
              employeeDetails={selectedDoc.employeeDetails}
              directorSignature={selectedDoc.directorSignature}
              status={selectedDoc.status}
              showActions={true}
            />
          </div>
        </div>
      )}

      {/* REJECTION REASON MODAL */}
      {isRejectModalOpen && selectedDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 border border-gray-100 space-y-4">
            <h3 className="text-base font-bold text-gray-900 flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-rose-600" />
              <span>Reject Document & Send Back to HR</span>
            </h3>

            <p className="text-xs text-gray-600">
              Please provide feedback or specific reasons for rejecting <strong>{selectedDoc.documentNumber}</strong>.
            </p>

            <textarea
              rows={4}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-rose-500 focus:outline-none"
              placeholder="e.g. Please update salary details and designation before final issuance..."
            />

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setIsRejectModalOpen(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleReject}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-md shadow-sm"
              >
                {actionLoading ? 'Submitting...' : 'Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIRECTOR SIGNATURE SETTINGS MODAL */}
      <DirectorSignatureModal
        isOpen={isSigModalOpen}
        onClose={() => setIsSigModalOpen(false)}
        onSaveSuccess={() => {
          setMessage({ type: 'success', text: 'Director Signature updated successfully!' });
        }}
      />
    </div>
  );
};

export default DirectorDocumentApprovals;
