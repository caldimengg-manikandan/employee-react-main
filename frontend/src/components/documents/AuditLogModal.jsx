import React from 'react';
import { X, Clock, User, CheckCircle2, XCircle, FileText, Download, Printer } from 'lucide-react';

const AuditLogModal = ({ isOpen, onClose, document }) => {
  if (!isOpen || !document) return null;

  const logs = document.auditLog || [];

  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">CREATED</span>;
      case 'UPDATED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-800">UPDATED</span>;
      case 'SUBMITTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-800">SUBMITTED</span>;
      case 'APPROVED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">APPROVED</span>;
      case 'REJECTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">REJECTED</span>;
      case 'DOWNLOADED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-800">DOWNLOADED</span>;
      case 'PRINTED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">PRINTED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-800">{action}</span>;
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'APPROVED':
        return <CheckCircle2 className="w-4 h-4 text-emerald-600" />;
      case 'REJECTED':
        return <XCircle className="w-4 h-4 text-rose-600" />;
      case 'DOWNLOADED':
        return <Download className="w-4 h-4 text-indigo-600" />;
      case 'PRINTED':
        return <Printer className="w-4 h-4 text-slate-600" />;
      default:
        return <FileText className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full border border-gray-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-slate-900 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h3 className="text-base font-bold">Document Audit Trail</h3>
            <p className="text-xs text-slate-400 font-mono">
              {document.documentNumber} — {document.title}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Timeline */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No audit logs recorded for this document.</p>
          ) : (
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-6">
              {logs.map((log, index) => (
                <div key={index} className="relative pl-6">
                  {/* Dot Icon */}
                  <div className="absolute -left-[17px] top-0 bg-white p-0.5 rounded-full border border-slate-300">
                    {getActionIcon(log.action)}
                  </div>

                  <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-1">
                    <div className="flex items-center justify-between">
                      {getActionBadge(log.action)}
                      <span className="text-[10px] text-gray-400 font-mono flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </span>
                    </div>

                    <div className="text-xs text-gray-700 font-medium flex items-center space-x-1 pt-1">
                      <User className="w-3.5 h-3.5 text-gray-400" />
                      <span>{log.performedBy?.name || 'System User'} ({log.performedBy?.role || 'User'})</span>
                    </div>

                    {log.notes && (
                      <p className="text-xs text-gray-600 bg-white p-2 rounded border border-gray-100 mt-1 italic">
                        "{log.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-gray-50 border-t border-gray-100 px-6 py-3 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 text-white text-xs font-medium rounded-md hover:bg-slate-900 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditLogModal;
