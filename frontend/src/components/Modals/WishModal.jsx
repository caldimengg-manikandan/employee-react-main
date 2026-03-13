import React, { useState } from 'react';
import { celebrationAPI } from '../../services/api';
import { XMarkIcon, PaperAirplaneIcon, FaceSmileIcon } from '@heroicons/react/24/outline';

const WishModal = ({ isOpen, onClose, employee }) => {
    const [message, setMessage] = useState('');
    const [media, setMedia] = useState('');
    const [visibility, setVisibility] = useState('Public');
    const [sending, setSending] = useState(false);

    const emojis = ['🎂', '🎉', '🎈', '✨', '💐', '🥂', '🍰', '🎁', '🎊', '🎀'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!message.trim()) return;

        setSending(true);
        try {
            await celebrationAPI.sendWish({
                receiverEmployeeId: employee.employeeId,
                receiverName: employee.name,
                message,
                media,
                visibility
            });
            onClose();
        } catch (error) {
            console.error("Error sending wish:", error);
            alert("Failed to send wish. Please try again.");
        } finally {
            setSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-zoom-in">
                <div className="px-6 py-4 flex items-center justify-between border-b border-gray-100">
                    <h3 className="text-xl font-bold text-gray-900">Send Celebration Wish</h3>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <XMarkIcon className="h-6 w-6 text-gray-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex items-center mb-6 p-4 bg-indigo-50 rounded-2xl border border-indigo-100">
                        <div className="h-12 w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg mr-4">
                            {employee?.name?.charAt(0)}
                        </div>
                        <div>
                            <div className="font-bold text-indigo-900">{employee?.name}</div>
                            <div className="text-sm text-indigo-600 font-medium">{employee?.department} • {employee?.designation}</div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Your Message</label>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Type your cheerful wish here..."
                                className="w-full h-32 px-4 py-3 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 transition-all outline-none resize-none"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Add an Emoji</label>
                            <div className="flex flex-wrap gap-2">
                                {emojis.map(emoji => (
                                    <button
                                        key={emoji}
                                        type="button"
                                        onClick={() => setMessage(prev => prev + ' ' + emoji)}
                                        className="text-2xl hover:scale-125 transition-transform"
                                    >
                                        {emoji}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value="Public"
                                        checked={visibility === 'Public'}
                                        onChange={(e) => setVisibility(e.target.value)}
                                        className="hidden"
                                    />
                                    <span className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                        visibility === 'Public' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'
                                    }`}>Public</span>
                                </label>
                                <label className="flex items-center cursor-pointer">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value="Private"
                                        checked={visibility === 'Private'}
                                        onChange={(e) => setVisibility(e.target.value)}
                                        className="hidden"
                                    />
                                    <span className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                                        visibility === 'Private' ? 'bg-indigo-600 text-white shadow-md' : 'bg-gray-100 text-gray-500'
                                    }`}>Private</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-2xl hover:bg-gray-50 transition-all uppercase text-sm tracking-wider"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={sending}
                            className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 shadow-lg shadow-indigo-200 transition-all uppercase text-sm tracking-wider flex items-center justify-center"
                        >
                            {sending ? 'Sending...' : (
                                <>
                                    <PaperAirplaneIcon className="h-5 w-5 mr-3" />
                                    Send Wish
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default WishModal;
