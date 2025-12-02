// src/pages/insurance/NewInsuranceClaim.jsx
import React, { useState } from 'react';
import AddInsuranceModal from '../../components/Forms/AddInsuranceModal';
import { 
  ArrowLeftIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

const NewInsuranceClaim = ({ onBack }) => {
  const [showAddModal, setShowAddModal] = useState(false);

  const handleAddClaim = (newClaimData) => {
    // Handle the new claim data here
    console.log('New claim data:', newClaimData);
    setShowAddModal(false);
    // You might want to show a success message or redirect
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
         
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-blue-100 mb-6">
              <PlusIcon className="h-10 w-10 text-blue-600" />
            </div>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Create New Insurance Claim</h2>
            
            
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <PlusIcon className="h-6 w-6 mr-3" />
              Start New Claim
            </button>

            {/* Additional Information */}
            <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="p-4">
                <div className="text-blue-600 font-semibold mb-2">Step 1</div>
                <h4 className="font-medium text-gray-900 mb-2">Fill Claim Form</h4>
                <p className="text-sm text-gray-600">Provide treatment details and patient information</p>
              </div>
              <div className="p-4">
                <div className="text-blue-600 font-semibold mb-2">Step 2</div>
                <h4 className="font-medium text-gray-900 mb-2">Upload Documents</h4>
                <p className="text-sm text-gray-600">Submit medical bills and supporting documents</p>
              </div>
              <div className="p-4">
                <div className="text-blue-600 font-semibold mb-2">Step 3</div>
                <h4 className="font-medium text-gray-900 mb-2">Submit for Review</h4>
                <p className="text-sm text-gray-600">Our team will review and process your claim</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Insurance Modal */}
        {showAddModal && (
          <AddInsuranceModal
            onClose={() => setShowAddModal(false)}
            onSubmit={handleAddClaim}
          />
        )}
      </div>
    </div>
  );
};

export default NewInsuranceClaim;