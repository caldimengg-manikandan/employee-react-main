import React, { useState, useEffect } from 'react';
import { X, Upload, CheckCircle, ShieldAlert } from 'lucide-react';
import { documentTemplateAPI } from '../../services/api';

const DirectorSignatureModal = ({ isOpen, onClose, onSaveSuccess }) => {
  const [name, setName] = useState('Dr. Manikandan S');
  const [designation, setDesignation] = useState('Managing Director & CEO');
  const [companyName, setCompanyName] = useState('CALDIM Technologies Private Limited');
  const [signatureImage, setSignatureImage] = useState('');
  const [digitalSeal, setDigitalSeal] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (isOpen) {
      fetchProfile();
    }
  }, [isOpen]);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await documentTemplateAPI.getDirectorProfile();
      if (res.data?.success && res.data?.data) {
        const p = res.data.data;
        setName(p.name || 'Dr. Manikandan S');
        setDesignation(p.designation || 'Managing Director & CEO');
        setCompanyName(p.companyName || 'CALDIM Technologies Private Limited');
        setSignatureImage(p.signatureImage || '');
        setDigitalSeal(p.digitalSeal || '');
      }
    } catch (err) {
      console.error('Error fetching Director profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e, setter) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image file size must be less than 2MB' });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setter(reader.result);
      setMessage({ type: 'success', text: 'Image uploaded successfully' });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: '', text: '' });

    try {
      const payload = {
        name,
        designation,
        companyName,
        signatureImage,
        digitalSeal
      };

      const res = await documentTemplateAPI.updateDirectorProfile(payload);
      if (res.data?.success) {
        setMessage({ type: 'success', text: 'Director Signature & Profile updated successfully!' });
        if (onSaveSuccess) onSaveSuccess(res.data.data);
        setTimeout(() => {
          onClose();
        }, 1200);
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.message || 'Failed to update Director signature' });
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-xl w-full border border-gray-100 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 px-6 py-4 flex justify-between items-center text-white">
          <div>
            <h3 className="text-lg font-bold">Director Signature & Stamp Settings</h3>
            <p className="text-xs text-purple-200">
              Upload official signature & seal for document approvals
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition p-1 rounded-lg hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {message.text && (
            <div
              className={`p-3.5 rounded-lg text-xs font-medium flex items-center space-x-2 ${
                message.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
              }`}
            >
              {message.type === 'error' ? <ShieldAlert className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
              <span>{message.text}</span>
            </div>
          )}

          {loading ? (
            <div className="py-8 text-center text-gray-500 text-sm">Loading signature settings...</div>
          ) : (
            <>
              {/* Director Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Dr. Manikandan S"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Designation <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    placeholder="e.g. Managing Director & CEO"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Signature Image Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Director Digital Signature Image (PNG/JPEG)
                </label>
                <div className="flex items-center space-x-4 border border-dashed border-gray-300 p-3 rounded-lg bg-gray-50">
                  {signatureImage ? (
                    <img
                      src={signatureImage}
                      alt="Signature Preview"
                      className="h-14 max-w-[140px] object-contain border border-gray-200 bg-white p-1 rounded"
                    />
                  ) : (
                    <div className="h-14 w-28 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
                      No Signature
                    </div>
                  )}

                  <label className="cursor-pointer bg-white border border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1 shadow-sm transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Signature</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setSignatureImage)}
                    />
                  </label>

                  {signatureImage && (
                    <button
                      type="button"
                      onClick={() => setSignatureImage('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Digital Seal / Stamp Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Company Stamp / Digital Seal (Optional)
                </label>
                <div className="flex items-center space-x-4 border border-dashed border-gray-300 p-3 rounded-lg bg-gray-50">
                  {digitalSeal ? (
                    <img
                      src={digitalSeal}
                      alt="Seal Preview"
                      className="h-14 w-14 object-contain border border-gray-200 bg-white p-1 rounded"
                    />
                  ) : (
                    <div className="h-14 w-14 bg-white border border-gray-200 rounded flex items-center justify-center text-[10px] text-gray-400">
                      No Stamp
                    </div>
                  )}

                  <label className="cursor-pointer bg-white border border-purple-200 text-purple-700 hover:bg-purple-50 px-3 py-1.5 rounded-md text-xs font-medium flex items-center space-x-1 shadow-sm transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Stamp</span>
                    <input
                      type="file"
                      accept="image/png, image/jpeg"
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, setDigitalSeal)}
                    />
                  </label>

                  {digitalSeal && (
                    <button
                      type="button"
                      onClick={() => setDigitalSeal('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium rounded-md shadow-sm disabled:opacity-50"
                >
                  {saving ? 'Saving Profile...' : 'Save Signature & Profile'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default DirectorSignatureModal;
