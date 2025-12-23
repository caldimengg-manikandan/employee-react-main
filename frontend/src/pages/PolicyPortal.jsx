// src/pages/AdminPolicyPortal.jsx
import React, { useState, useEffect } from 'react';
import { policyAPI } from '../services/api';
import { 
  PlusIcon,
  CheckIcon,
  TrashIcon,
  PencilIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

const AdminPolicyPortal = () => {
  const [policies, setPolicies] = useState([]);
  const [activePolicy, setActivePolicy] = useState(null);
  const [editingContent, setEditingContent] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [content, setContent] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState(null);
  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = user.role || 'employees';
  const isReadOnly = role === 'employees' || role === 'projectmanager';

  // Load policies from backend on component mount
  useEffect(() => {
    const fetchPolicies = async () => {
      try {
        const res = await policyAPI.list();
        const items = Array.isArray(res.data) ? res.data : [];
        setPolicies(items);
        if (items.length > 0) {
          setActivePolicy(items[0]);
          setContent(items[0].content || '');
          setPolicyTitle(items[0].title || '');
        }
      } catch (err) {
        // silent fail
      }
    };
    fetchPolicies();
  }, []);

  // Add new policy
  const handleAddPolicy = async () => {
    try {
      const res = await policyAPI.create({
        title: 'New Policy',
        content: '# New Policy\n\nAdd your policy content here...'
      });
      const created = res.data;
      const updatedPolicies = [...policies, created];
      setPolicies(updatedPolicies);
      setActivePolicy(created);
      setContent(created.content || '');
      setPolicyTitle(created.title || '');
      setEditingContent(true);
      setEditingTitle(true);
    } catch (err) {
      // silent fail
    }
  };

  // Delete policy
  const handleDeletePolicy = async (id) => {
    try {
      await policyAPI.remove(id);
      const updatedPolicies = policies.filter(policy => policy._id !== id);
      setPolicies(updatedPolicies);
      if (activePolicy && activePolicy._id === id) {
        if (updatedPolicies.length > 0) {
          setActivePolicy(updatedPolicies[0]);
          setContent(updatedPolicies[0].content || '');
          setPolicyTitle(updatedPolicies[0].title || '');
        } else {
          setActivePolicy(null);
          setContent('');
          setPolicyTitle('');
        }
      }
    } catch (err) {
      // silent fail
    } finally {
      setShowDeleteConfirm(false);
      setPolicyToDelete(null);
    }
  };

  // Save policy changes
  const handleSaveChanges = async () => {
    if (!activePolicy) return;
    try {
      const res = await policyAPI.update(activePolicy._id, {
        title: policyTitle,
        content: content
      });
      const updated = res.data;
      const updatedPolicies = policies.map(policy =>
        policy._id === updated._id ? updated : policy
      );
      setPolicies(updatedPolicies);
      setActivePolicy(updated);
    } catch (err) {
      // silent fail
    } finally {
      setEditingContent(false);
      setEditingTitle(false);
    }
  };

  // Handle policy selection
  const handleSelectPolicy = (policy) => {
    setActivePolicy(policy);
    setContent(policy.content);
    setPolicyTitle(policy.title);
    setEditingContent(false);
    setEditingTitle(false);
  };

  // Handle content editing
  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  // Handle title editing
  const handleTitleChange = (e) => {
    setPolicyTitle(e.target.value);
  };

  // Format markdown content for display
  const formatContentForDisplay = (text) => {
    if (!text) return '';
    
    return text
      .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold mb-3">$1</h1>')
      .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold mt-4 mb-2">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-base font-medium mt-3 mb-2">$1</h3>')
      .replace(/^- (.*$)/gm, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '</p><p class="mb-2">')
      .replace(/\n---\n/g, '<hr class="my-4 border-gray-300">');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Left Column - Policy Content */}
          <div className="lg:w-2/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              {activePolicy ? (
                <>
                  {/* Policy Title Bar */}
                  <div className="border-b border-gray-200 px-6 py-4">
                    <div className="flex justify-between items-center">
                      <div className="flex-1">
                        {editingTitle ? (
                          <input
                            type="text"
                            value={policyTitle}
                            onChange={handleTitleChange}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-lg font-semibold"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleSaveChanges();
                              }
                            }}
                          />
                        ) : (
                          <h2 className="text-lg font-semibold text-gray-900">
                            {policyTitle}
                          </h2>
                        )}
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-gray-500">
                          Updated: {activePolicy.updatedAt ? new Date(activePolicy.updatedAt).toISOString().split('T')[0] : ''}
                        </span>
                        {!isReadOnly && (
                          <button
                            onClick={() => {
                              if (editingTitle) {
                                handleSaveChanges();
                              } else {
                                setEditingTitle(true);
                              }
                            }}
                            className="p-2 text-gray-600 hover:text-blue-600"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Content Area */}
                  <div className="p-6">
                    {editingContent ? (
                      <div>
                        <textarea
                          value={content}
                          onChange={handleContentChange}
                          className="w-full h-[400px] p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                          placeholder="# Enter policy content here"
                        />
                      </div>
                    ) : (
                      <div className="prose max-w-none">
                        <div 
                          className="policy-content"
                          dangerouslySetInnerHTML={{ __html: formatContentForDisplay(content) }}
                        />
                      </div>
                    )}
                    
                    {/* Edit Content Button */}
                    {!isReadOnly && (
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <button
                          onClick={() => {
                            if (editingContent) {
                              handleSaveChanges();
                            } else {
                              setEditingContent(true);
                            }
                          }}
                          className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                        >
                          {editingContent ? (
                            <>
                              <CheckIcon className="h-4 w-4 mr-2" />
                              Save Content
                            </>
                          ) : (
                            <>
                              <PencilIcon className="h-4 w-4 mr-2" />
                              Edit Content
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="p-12 text-center">
                  <DocumentTextIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Policy Selected</h3>
                  <p className="text-gray-500 mb-6">Select a policy from the list or create a new one</p>
                  {!isReadOnly && (
                    <button
                      onClick={handleAddPolicy}
                      className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      <PlusIcon className="h-4 w-4 mr-2" />
                      Create New Policy
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Policy List */}
          <div className="lg:w-1/3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200 px-4 py-3">
                <h3 className="text-base font-semibold text-gray-900">POLICIES LIST</h3>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  {policies.map((policy) => (
                    <div
                      key={policy._id}
                      className={`group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors ${
                        activePolicy?._id === policy._id
                          ? 'bg-blue-50 border border-blue-200'
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => handleSelectPolicy(policy)}
                    >
                      <div className="flex items-center">
                        <DocumentTextIcon className={`h-4 w-4 mr-3 ${
                          activePolicy?._id === policy._id ? 'text-blue-600' : 'text-gray-400'
                        }`} />
                      <div>
                          <div className={`text-sm font-medium ${
                            activePolicy?._id === policy._id ? 'text-blue-700' : 'text-gray-700'
                          }`}>
                            {policy.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            Updated: {policy.updatedAt ? new Date(policy.updatedAt).toISOString().split('T')[0] : ''}
                          </div>
                        </div>
                      </div>
                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setPolicyToDelete(policy._id);
                            setShowDeleteConfirm(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Empty state */}
                {policies.length === 0 && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p className="text-sm text-gray-500">No policies yet</p>
                  </div>
                )}

                {/* Add Policy Button */}
                <div className="mt-6">
                  {!isReadOnly && (
                    <button
                      onClick={handleAddPolicy}
                      className="w-full flex items-center justify-center px-4 py-2.5 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-colors group"
                    >
                      <PlusIcon className="h-4 w-4 mr-2 group-hover:text-blue-600" />
                      <span className="text-sm font-medium">Add New Policy</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Policy</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this policy? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setPolicyToDelete(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePolicy(policyToDelete)}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
                >
                  Delete Policy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom CSS */}
      <style jsx>{`
        .policy-content h1 {
          font-size: 1.25rem;
          font-weight: bold;
          color: #111827;
          margin-bottom: 0.75rem;
        }

        .policy-content h2 {
          font-size: 1.125rem;
          font-weight: 600;
          color: #374151;
          margin-top: 1rem;
          margin-bottom: 0.5rem;
        }

        .policy-content h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #4b5563;
          margin-top: 0.75rem;
          margin-bottom: 0.25rem;
        }

        .policy-content p {
          color: #6b7280;
          margin-bottom: 0.5rem;
          line-height: 1.5;
        }

        .policy-content ul {
          margin-left: 1rem;
          margin-bottom: 0.5rem;
        }

        .policy-content li {
          color: #6b7280;
          margin-bottom: 0.25rem;
          position: relative;
        }

        .policy-content li:before {
          content: "•";
          color: #3b82f6;
          font-weight: bold;
          position: absolute;
          left: -1rem;
        }

        .policy-content hr {
          border: none;
          border-top: 1px solid #e5e7eb;
          margin: 1rem 0;
        }

        .policy-content strong {
          font-weight: 600;
          color: #111827;
        }

        .policy-content em {
          font-style: italic;
        }

        .prose {
          color: #374151;
        }
      `}</style>
    </div>
  );
};

export default AdminPolicyPortal;