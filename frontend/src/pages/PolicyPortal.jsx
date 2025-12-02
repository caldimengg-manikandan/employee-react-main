// src/pages/PolicyPortal.jsx
import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  CheckIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  UserCircleIcon
} from '@heroicons/react/24/outline';

const PolicyPortal = () => {
  const [policyTabs, setPolicyTabs] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingTitle, setEditingTitle] = useState(null);
  const [tempTitle, setTempTitle] = useState('');

  const role = localStorage.getItem('role') || 'employee';
  const isAdmin = role === 'admin';

  const policyIcons = {
    "Leave Policy": "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    "Health Insurance": "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
    "Allowances": "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "Bonus": "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
    "Loss of Pay": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
    "Holiday Benefit": "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z",
    "Deployment": "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    "PF & Gratuity": "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
    "Reward & Recognition": "M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z",
    "Separation Policy": "M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16",
    "Whistleblower Policy": "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    "Confidentiality Policy": "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z",
    "Permission Policy": "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    "New Policy": "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  };

  const defaultPolicies = [
    {
      id: 1,
      title: "Leave Policy",
      content: `<div class="content-header">
                  <h2>Leave Policy</h2>
                </div>
                <div class="content-body">
                  <h3>Annual Leave Entitlement</h3>
                  <p>All full-time employees are entitled to 18 days of paid leave per calendar year. Leave accrues at a rate of 1.5 days per month.</p>
                  
                  <h3>Leave Application Process</h3>
                  <ul>
                    <li>Leave requests must be submitted at least 3 working days in advance</li>
                    <li>For leaves exceeding 5 consecutive days, approval must be obtained 2 weeks in advance</li>
                    <li>Medical leaves require a doctor's certificate for absences exceeding 3 days</li>
                  </ul>
                  
                  <h3>Carry Forward Policy</h3>
                  <p>Employees may carry forward up to 5 unused leave days to the next calendar year. These must be utilized by March 31st.</p>
                </div>`
    },
    {
      id: 2,
      title: "Health Insurance",
      content: `<div class="content-header">
                  <h2>Health Insurance Benefits</h2>
                </div>
                <div class="content-body">
                  <h3>Coverage Details</h3>
                  <p>Our comprehensive health insurance plan covers:</p>
                  <ul>
                    <li>Hospitalization expenses up to ₹5,00,000 per year</li>
                    <li>Pre-existing conditions after 1 year of continuous coverage</li>
                    <li>Maternity benefits up to ₹50,000</li>
                    <li>Annual health check-up worth ₹2,000</li>
                  </ul>
                  
                  <h3>Dependent Coverage</h3>
                  <p>Employees may enroll:</p>
                  <ul>
                    <li>Spouse</li>
                    <li>Up to 2 children (below 25 years)</li>
                    <li>Parents (additional premium applies)</li>
                  </ul>
                  
                  <h3>Network Hospitals</h3>
                  <p>Cashless treatment available at 5,000+ network hospitals across India.</p>
                </div>`
    },
    {
      id: 3,
      title: "Allowances",
      content: `<div class="content-header">
                  <h2>Employee Allowances</h2>
                </div>
                <div class="content-body">
                  <h3>Standard Allowances</h3>
                  <table class="policy-table">
                    <thead>
                      <tr>
                        <th>Allowance</th>
                        <th>Amount</th>
                        <th>Taxability</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Transportation</td>
                        <td>₹3,000/month</td>
                        <td>Exempt up to ₹1,600/month</td>
                      </tr>
                      <tr>
                        <td>Meal</td>
                        <td>₹2,500/month</td>
                        <td>Fully exempt</td>
                      </tr>
                      <tr>
                        <td>Internet</td>
                        <td>₹1,000/month</td>
                        <td>Fully taxable</td>
                      </tr>
                    </tbody>
                  </table>
                  
                  <h3>Special Allowances</h3>
                  <p>Project-based allowances may be provided for:</p>
                  <ul>
                    <li>On-site deployments</li>
                    <li>Shift differentials</li>
                    <li>Hazardous work conditions</li>
                  </ul>
                </div>`
    },
    {
      id: 4,
      title: "Separation Policy",
      content: `<div class="content-header">
                  <h2>Separation Policy</h2>
                  <p>To ensure a smooth and professional exit process for employees leaving the organization.</p>
                </div>
                <div class="content-body">
                  <h3>1.1 RESIGNATION & NOTICE PERIOD</h3>
                  
                  <h4>TYPES OF SEPARATIONS</h4>
                  <ul>
                    <li><strong>Resignation</strong>: Voluntary exit initiated by the employee.</li>
                    <li><strong>Termination</strong>: Involuntary exit due to performance issues, misconduct, or redundancy.</li>
                    <li><strong>Retirement</strong>: Exit upon reaching the company's retirement age.</li>
                    <li><strong>End of Agreement</strong>: Separation upon completion of a contractual term.</li>
                  </ul>
                  
                  <h4>NOTICE PERIOD</h4>
                  <ul>
                    <li>Employees must serve a notice period of 2 months.</li>
                    <li>Exceptions may be made with mutual agreement.</li>
                  </ul>
                  
                  <h4>TRAINEE BOND AGREEMENT</h4>
                  <ul>
                    <li>Trainees are required to serve a minimum of 3 years as per the bond agreement.</li>
                    <li>If a trainee resigns formally or informally before completing this period, they must pay the amount specified in the bond agreement.</li>
                  </ul>
                  
                  <h4>CONFIDENTIALITY</h4>
                  <ul>
                    <li>Employees must honor confidentiality agreements even after separation.</li>
                  </ul>
                  
                  <h3>1.2 EXIT FORMALITIES</h3>
                  <ul>
                    <li>Submit a formal resignation letter to HR department.</li>
                    <li>Serve the notice period unless waived by the management.</li>
                    <li>Complete a handover of responsibilities and company property to immediate superiors.</li>
                    <li>Please note any damage to company property due to mishandling other than the normal wear and tear will be construed as loss to company property and hence will be deducted from the accruals owed by the company.</li>
                  </ul>
                  
                  <h3>1.3 POLICY ON NOTICE PERIOD SALARY AND FINAL SETTLEMENT</h3>
                  
                  <h4>1.3.1 SALARY DURING NOTICE PERIOD</h4>
                  <ul>
                    <li>Employees serving their notice period will continue to receive their salary as per the regular payroll cycle. However, the salary for the final month of employment will be processed only after the successful completion of the full notice period.</li>
                  </ul>
                  
                  <h4>1.3.2 FINAL SETTLEMENT PROCESS</h4>
                  <ul>
                    <li>Upon completion of the notice period, the final settlement process will be initiated. This includes:
                      <ul>
                        <li>Salary for the last working month (excluding any deductions for leave or pending dues)</li>
                        <li>Leave encashment (if applicable)</li>
                        <li>Payment of any pending allowances or reimbursements</li>
                        <li>Deductions for any outstanding dues or advances</li>
                      </ul>
                    </li>
                    <li>The final settlement process may take a minimum of 15 days and a maximum of 45 days from the employee's last working day to be fully processed.</li>
                  </ul>
                  
                  <h4>1.3.3 LEAVE DURING NOTICE PERIOD</h4>
                  <ul>
                    <li>Employees are not eligible to take any leave (Casual Leave, Sick Leave, or Privilege Leave) during their notice period.</li>
                    <li>Any leave taken during the notice period will be treated as Leave Without Pay (LOP).</li>
                    <li>The corresponding LOP will be deducted from the final settlement amount.</li>
                  </ul>
                </div>`
    }
  ];

  useEffect(() => {
    // Load from session storage or use defaults
    const savedPolicies = sessionStorage.getItem('policy_tabs');
    const savedActiveTab = sessionStorage.getItem('active_policy_tab');
    
    if (savedPolicies) {
      setPolicyTabs(JSON.parse(savedPolicies));
    } else {
      setPolicyTabs(defaultPolicies);
    }
    
    if (savedActiveTab) {
      setActiveTab(parseInt(savedActiveTab));
    }
    
    setLoading(false);
  }, []);

  useEffect(() => {
    // Save to session storage whenever policies change
    sessionStorage.setItem('policy_tabs', JSON.stringify(policyTabs));
    sessionStorage.setItem('active_policy_tab', activeTab.toString());
  }, [policyTabs, activeTab]);

  const handleAddPolicy = () => {
    const newPolicy = {
      id: Date.now(),
      title: "New Policy",
      content: `<div class="content-header">
                  <h2>New Policy</h2>
                </div>
                <div class="content-body">
                  <p>Edit this content to create your new policy.</p>
                </div>`
    };
    
    setPolicyTabs(prev => [...prev, newPolicy]);
    setActiveTab(policyTabs.length);
  };

  const handleDeletePolicy = (index) => {
    if (window.confirm(`Are you sure you want to delete the "${policyTabs[index].title}" policy?`)) {
      const newTabs = policyTabs.filter((_, i) => i !== index);
      setPolicyTabs(newTabs);
      
      if (activeTab >= index && activeTab > 0) {
        setActiveTab(activeTab - 1);
      }
    }
  };

  const handleTitleEdit = (index) => {
    setEditingTitle(index);
    setTempTitle(policyTabs[index].title);
  };

  const handleTitleSave = (index) => {
    const updatedTabs = policyTabs.map((tab, i) => 
      i === index ? { ...tab, title: tempTitle } : tab
    );
    setPolicyTabs(updatedTabs);
    setEditingTitle(null);
  };

  const handleTitleCancel = () => {
    setEditingTitle(null);
    setTempTitle('');
  };

  const handleContentUpdate = (index, newContent) => {
    const updatedTabs = policyTabs.map((tab, i) => 
      i === index ? { ...tab, content: newContent } : tab
    );
    setPolicyTabs(updatedTabs);
  };

  const handleSaveChanges = async () => {
    try {
      // Simulate API call
      console.log('Saving policies:', policyTabs);
      alert('Policy changes saved successfully!');
    } catch (error) {
      console.error('Error saving policies:', error);
      alert('Failed to save policy changes');
    }
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-xl font-semibold">Caldim Engineering Pvt. Ltd. - Employee Policies</h1>
          <div className="flex items-center gap-3">
            <span className="bg-white/20 px-2 py-1 rounded text-sm">
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
            <UserCircleIcon className="h-6 w-6" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full py-6 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Content Panel (Left Side) */}
            <div className="flex-1 p-6 lg:p-8 overflow-y-auto">
              {policyTabs.length > 0 ? (
                policyTabs.map((policy, index) => (
                  <div
                    key={policy.id}
                    className={`tab-content ${index === activeTab ? 'block' : 'hidden'}`}
                  >
                    {isAdmin ? (
                      <div
                        contentEditable
                        dangerouslySetInnerHTML={{ __html: policy.content }}
                        onBlur={(e) => handleContentUpdate(index, e.target.innerHTML)}
                        className="outline-none p-5 rounded-lg border border-dashed border-gray-300 bg-gray-50 min-h-[400px] focus:border-blue-500 focus:bg-white policy-content-editable"
                      />
                    ) : (
                      <div 
                        dangerouslySetInnerHTML={{ __html: policy.content }}
                        className="policy-content-readonly"
                      />
                    )}
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <p>No policies available.</p>
                </div>
              )}
            </div>

            {/* Tabs Sidebar (Right Side) */}
            <div className="w-full lg:w-80 bg-gray-50 border-t lg:border-t-0 lg:border-l border-gray-200 flex flex-col">
              <div className="p-4 bg-blue-600 text-white font-semibold text-lg">
                POLICY CATEGORIES
              </div>
              
              {/* Tabs Container */}
              <div className="flex-1 overflow-y-auto max-h-96 lg:max-h-none p-2">
                {policyTabs.map((policy, index) => {
                  const iconPath = policyIcons[policy.title] || policyIcons["New Policy"];
                  return (
                    <div
                      key={policy.id}
                      className={`tab flex items-center gap-3 p-4 rounded-lg mb-2 cursor-pointer transition-all ${
                        index === activeTab
                          ? 'bg-blue-50 text-blue-600 font-medium shadow-sm border-2 border-blue-200'
                          : 'hover:bg-blue-50 hover:text-blue-600'
                      }`}
                      onClick={() => setActiveTab(index)}
                    >
                      <svg className="h-5 w-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={iconPath} />
                      </svg>
                      
                      <div className="flex-1 min-w-0">
                        {editingTitle === index ? (
                          <input
                            type="text"
                            value={tempTitle}
                            onChange={(e) => setTempTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleTitleSave(index);
                              if (e.key === 'Escape') handleTitleCancel();
                            }}
                            className="w-full bg-transparent border-b border-blue-300 outline-none"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate">{policy.title}</span>
                        )}
                      </div>

                      {isAdmin && (
                        <div className="flex items-center gap-1">
                          {editingTitle === index ? (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTitleSave(index);
                                }}
                                className="p-1 text-green-600 hover:text-green-700"
                              >
                                <CheckIcon className="h-4 w-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTitleEdit(index);
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600"
                              >
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeletePolicy(index);
                                }}
                                className="p-1 text-red-400 hover:text-red-600"
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons - Only for Admin */}
              {isAdmin && (
                <div className="p-4 border-t border-gray-200 flex flex-wrap gap-2">
                  <button
                    onClick={handleAddPolicy}
                    className="btn-primary flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    <PlusIcon className="h-4 w-4" />
                    Add Policy
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="btn-primary flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                  >
                    <CheckIcon className="h-4 w-4" />
                    Save Changes
                  </button>
                </div>
              )}
              
              {/* Export PDF Button - Available for all users */}
              <div className="p-4 border-t border-gray-200">
                <button
                  onClick={handleExportPDF}
                  className="btn-outline flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium w-full justify-center"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  Export PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white text-center py-5">
        <p>&copy; 2025 Caldim Engineering Pvt. Ltd. All rights reserved.</p>
        <div className="flex justify-center gap-5 mt-2">
          <a href="#" className="text-white/80 hover:text-white hover:underline text-sm">Privacy Policy</a>
          <a href="#" className="text-white/80 hover:text-white hover:underline text-sm">Terms of Service</a>
          <a href="#" className="text-white/80 hover:text-white hover:underline text-sm">Contact HR</a>
        </div>
      </footer>

      {/* Additional CSS for better styling */}
      <style jsx>{`
        .policy-content-editable:focus {
          border-color: #3b82f6;
          background-color: white;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .policy-content-readonly {
          pointer-events: none;
        }

        .policy-content-readonly h2,
        .policy-content-readonly h3,
        .policy-content-readonly h4 {
          color: #1f2937;
          margin-bottom: 0.5rem;
        }

        .policy-content-readonly p,
        .policy-content-readonly li {
          color: #4b5563;
          line-height: 1.6;
        }

        .policy-table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
        }

        .policy-table th,
        .policy-table td {
          border: 1px solid #e5e7eb;
          padding: 0.75rem;
          text-align: left;
        }

        .policy-table th {
          background-color: #f9fafb;
          font-weight: 600;
        }

        @media print {
          header, .tabs-sidebar, .action-buttons, footer {
            display: none !important;
          }
          .content-panel {
            padding: 0 !important;
          }
          .tab-content {
            display: block !important;
            page-break-after: always;
          }
        }
      `}</style>
    </div>
  );
};

export default PolicyPortal;