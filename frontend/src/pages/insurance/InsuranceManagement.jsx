// src/pages/insurance/InsuranceManagement.jsx
import React, { useState } from 'react';
import NewInsuranceClaim from './NewInsuranceClaim';
import ClaimHistory from './ClaimHistory';
import { 
  PlusIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const InsuranceManagement = () => {
  const [currentView, setCurrentView] = useState('main'); // 'main', 'newClaim', 'claimHistory'

  // Main landing page with buttons
  if (currentView === 'main') {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">Insurance Management</h1>
            
          </div>

          {/* Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* New Insurance Claim Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow duration-300">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-6">
                  <PlusIcon className="h-8 w-8 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">New Insurance Claim</h3>
                
                <button
                  onClick={() => setCurrentView('newClaim')}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create New Claim
                </button>
              </div>
            </div>

            {/* Claim History Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 hover:shadow-md transition-shadow duration-300">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-6">
                  <DocumentTextIcon className="h-8 w-8 text-green-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">Claim History</h3>
                
                <button
                  onClick={() => setCurrentView('claimHistory')}
                  className="w-full inline-flex items-center justify-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors duration-200"
                >
                  <DocumentTextIcon className="h-5 w-5 mr-2" />
                  View Claim History
                </button>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="mt-12 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">12</div>
                <div className="text-sm text-gray-600">Total Claims</div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">8</div>
                <div className="text-sm text-gray-600">Approved Claims</div>
              </div>
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">2</div>
                <div className="text-sm text-gray-600">Pending Claims</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render the appropriate component based on current view
  return (
    <div className="min-h-screen bg-gray-50">
      {currentView === 'newClaim' && (
        <NewInsuranceClaim onBack={() => setCurrentView('main')} />
      )}
      {currentView === 'claimHistory' && (
        <ClaimHistory onBack={() => setCurrentView('main')} />
      )}
    </div>
  );
};

export default InsuranceManagement;