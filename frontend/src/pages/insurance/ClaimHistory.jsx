// src/pages/insurance/ClaimHistory.jsx
import React, { useState } from 'react';
import { 
  ArrowLeftIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

// Import the components (make sure these files exist in the correct location)
import ViewInsurance from '../../components/Forms/ViewInsurance';
import EditInsurance from '../../components/Forms/EditInsurance';

const ClaimHistory = ({ onBack }) => {
  const [viewingClaim, setViewingClaim] = useState(null);
  const [editingClaim, setEditingClaim] = useState(null);
  const [claims, setClaims] = useState([
    {
      id: 'CLM-001',
      employeeName: 'John Doe',
      employeeId: 'EMP001',
      claimNumber: 'IC-2024-001',
      memberName: 'John Doe',
      treatment: 'Dental Surgery',
      sumInsured: 50000,
      requestedAmount: 45000,
      claimDate: '2024-01-15',
      closeDate: '2024-02-01',
      status: 'Approved',
      paymentStatus: 'Paid',
      dateOfAdmission: '2024-01-10',
      dateOfDischarge: '2024-01-14',
      bankName: 'HDFC Bank',
      accountNumber: 'XXXXXX1234',
      relationship: 'Single',
      mobile: '+91 9876543210'
    },
    {
      id: 'CLM-002',
      employeeName: 'Jane Smith',
      employeeId: 'EMP002',
      claimNumber: 'IC-2024-002',
      memberName: 'Jane Smith',
      treatment: 'Eye Checkup',
      sumInsured: 30000,
      requestedAmount: 12000,
      claimDate: '2024-01-20',
      closeDate: '2024-02-05',
      status: 'Approved',
      paymentStatus: 'Paid',
      dateOfAdmission: '2024-01-18',
      dateOfDischarge: '2024-01-18',
      bankName: 'ICICI Bank',
      accountNumber: 'XXXXXX5678',
      relationship: 'Married',
      mobile: '+91 9876543211',
      spouseName: 'Mike Smith',
      children: [
        { name: 'Emma Smith', age: '8' },
        { name: 'Noah Smith', age: '5' }
      ]
    },
    {
      id: 'CLM-003',
      employeeName: 'Robert Wilson',
      employeeId: 'EMP003',
      claimNumber: 'IC-2024-003',
      memberName: 'Robert Wilson',
      treatment: 'Heart Surgery',
      sumInsured: 200000,
      requestedAmount: 185000,
      claimDate: '2024-02-01',
      closeDate: '',
      status: 'Pending',
      paymentStatus: 'Pending',
      dateOfAdmission: '2024-01-28',
      dateOfDischarge: '2024-02-05',
      bankName: 'SBI',
      accountNumber: 'XXXXXX9012',
      relationship: 'Married',
      mobile: '+91 9876543212',
      spouseName: 'Sarah Wilson',
      children: [
        { name: 'Liam Wilson', age: '12' }
      ]
    }
  ]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Approved':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleEdit = (claim) => {
    setEditingClaim(claim);
  };

  const handleDelete = (claimId) => {
    if (window.confirm('Are you sure you want to delete this claim?')) {
      setClaims(prev => prev.filter(claim => claim.id !== claimId));
    }
  };

  const handleUpdateClaim = (updatedClaimData) => {
    setClaims(prev => prev.map(claim => 
      claim.id === editingClaim.id 
        ? { 
            ...claim, 
            ...updatedClaimData,
            status: updatedClaimData.claimStatus,
            paymentStatus: updatedClaimData.paymentStatus
          }
        : claim
    ));
    setEditingClaim(null);
    alert('Claim updated successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 mr-4"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Claim History</h1>
            <p className="text-gray-600">View all your previous insurance claims</p>
          </div>
        </div>

        {/* Claims Table */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-blue-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Claim Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Treatment & Member
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Dates
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-blue-700 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {claims.map((claim) => (
                  <tr key={claim.id} className="hover:bg-gray-50 transition-colors duration-150">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{claim.claimNumber}</div>
                        <div className="text-sm text-gray-500">{claim.employeeName}</div>
                        <div className="text-xs text-gray-400">{claim.employeeId}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{claim.treatment}</div>
                      <div className="text-sm text-gray-500">{claim.memberName}</div>
                      <div className="text-xs text-gray-400">{claim.relationship}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">₹{claim.requestedAmount?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">Insured: ₹{claim.sumInsured?.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(claim.claimDate).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {claim.closeDate ? `Closed: ${new Date(claim.closeDate).toLocaleDateString()}` : 'Open'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(claim.status)}`}>
                          {claim.status}
                        </span>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(claim.paymentStatus)}`}>
                          {claim.paymentStatus}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setViewingClaim(claim)}
                          className="text-blue-600 hover:text-blue-900 p-1 transition-colors duration-150"
                          title="View Claim Details"
                        >
                          <EyeIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleEdit(claim)}
                          className="text-green-600 hover:text-green-900 p-1 transition-colors duration-150"
                          title="Edit Claim"
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(claim.id)}
                          className="text-red-600 hover:text-red-900 p-1 transition-colors duration-150"
                          title="Delete Claim"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {claims.length === 0 && (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <DocumentTextIcon className="h-12 w-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">No claim history</h3>
              <p className="text-gray-600">Your processed claims will appear here.</p>
            </div>
          )}
        </div>

        {/* View Insurance Modal */}
        {viewingClaim && (
          <ViewInsurance 
            claim={viewingClaim} 
            onClose={() => setViewingClaim(null)} 
          />
        )}

        {/* Edit Insurance Modal */}
        {editingClaim && (
          <EditInsurance 
            claim={editingClaim} 
            onClose={() => setEditingClaim(null)} 
            onUpdate={handleUpdateClaim}
          />
        )}
      </div>
    </div>
  );
};

export default ClaimHistory;
