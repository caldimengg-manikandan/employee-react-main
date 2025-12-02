// src/components/forms/ViewInsurance.jsx
import React from 'react';

const ViewInsurance = ({ claim, onClose }) => {
  if (!claim) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800">Claim Details - {claim.claimNumber}</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Claim Information */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Claim Information</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Claim Number:</span>
                  <span className="text-sm text-gray-900">{claim.claimNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Member Name:</span>
                  <span className="text-sm text-gray-900">{claim.memberName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Treatment:</span>
                  <span className="text-sm text-gray-900">{claim.treatment}</span>
                </div>
              </div>
            </div>

            {/* Financial Details */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Financial Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Sum Insured:</span>
                  <span className="text-sm text-gray-900">₹{claim.sumInsured?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Requested Amount:</span>
                  <span className="text-sm text-gray-900">₹{claim.requestedAmount?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Treatment Dates */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Treatment Dates</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Admission Date:</span>
                  <span className="text-sm text-gray-900">{new Date(claim.dateOfAdmission).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Discharge Date:</span>
                  <span className="text-sm text-gray-900">{new Date(claim.dateOfDischarge).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            {/* Claim Dates & Status */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-3">Claim Status</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Claim Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                    {claim.status}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Payment Status:</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(claim.paymentStatus)}`}>
                    {claim.paymentStatus}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Claim Date:</span>
                  <span className="text-sm text-gray-900">{new Date(claim.claimDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm font-medium text-gray-700">Close Date:</span>
                  <span className="text-sm text-gray-900">
                    {claim.closeDate ? new Date(claim.closeDate).toLocaleDateString() : 'Open'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors duration-150"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Helper functions
const getStatusColor = (status) => {
  switch (status) {
    case 'Approved': return 'bg-green-100 text-green-800';
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getPaymentStatusColor = (status) => {
  switch (status) {
    case 'Paid': return 'bg-green-100 text-green-800';
    case 'Pending': return 'bg-yellow-100 text-yellow-800';
    case 'Rejected': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

export default ViewInsurance;