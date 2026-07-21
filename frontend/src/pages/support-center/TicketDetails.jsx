import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supportAPI, BASE_URL } from '../../services/api';
import { 
  Send, Paperclip, Clock, CheckCircle2, 
  AlertCircle, ArrowLeft, User, Calendar, Tag, ShieldAlert, FileText, Activity
} from 'lucide-react';

const TicketDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [comments, setComments] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [internalRemarks, setInternalRemarks] = useState('');
  const [resolutionRemarks, setResolutionRemarks] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const user = JSON.parse(sessionStorage.getItem('user') || '{}');
  const role = String(user.role || '').toLowerCase();
  const isAdminOrHr = ['admin', 'hr', 'director', 'manager', 'it_admin'].includes(role);
  
  const isOwner = Boolean(
    ticket && (
      !isAdminOrHr ||
      String(ticket.employeeId?._id || ticket.employeeId) === String(user._id) ||
      (ticket.employeeId?.employeeId && user.employeeId && String(ticket.employeeId.employeeId).toLowerCase() === String(user.employeeId).toLowerCase()) ||
      (ticket.employeeId?.email && user.email && String(ticket.employeeId.email).toLowerCase() === String(user.email).toLowerCase())
    )
  );

  useEffect(() => {
    fetchDetails();
  }, [id]);

  const fetchDetails = async () => {
    try {
      const res = await supportAPI.getTicketById(id);
      setTicket(res.data.ticket);
      setComments(res.data.comments);
      if (res.data.ticket) {
        setSelectedStatus(res.data.ticket.status);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      const res = await supportAPI.addComment(id, { message: newMessage });
      setComments([...comments, res.data]);
      setNewMessage('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsSending(false);
    }
  };

  const updateStatus = async (newStatus) => {
    setIsUpdatingStatus(true);
    try {
      await supportAPI.updateStatus(id, { 
        status: newStatus, 
        comment: `Status changed to ${newStatus}` 
      });
      fetchDetails();
    } catch (err) {
      console.error(err);
      alert('Failed to update ticket status.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) return <div className="p-10 text-center font-medium text-gray-500">Loading details...</div>;
  if (!ticket) return <div className="p-10 text-center text-red-500 font-bold">Ticket not found.</div>;

  const statusWorkflowOptions = [
    'Open',
    'Assigned',
    'In Progress',
    'Waiting for Employee',
    'Resolved',
    'Closed'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <button 
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 font-medium transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to List
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Ticket Info & Chat */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-purple-700 bg-purple-50 px-3 py-1 rounded-lg border border-purple-100 uppercase tracking-wider">
                    {ticket.ticketNumber || ticket.ticketId}
                  </span>
                  {ticket.mainCategory && (
                    <span className="text-xs font-bold text-gray-700 bg-gray-100 px-3 py-1 rounded-lg">
                      {ticket.mainCategory}
                    </span>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-800 mt-3">{ticket.subject}</h1>
              </div>
              <span className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase border ${
                ticket.status === 'Open' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                ticket.status === 'Assigned' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                ticket.status === 'In Progress' ? 'bg-amber-50 text-amber-700 border-amber-100' :
                ticket.status === 'Waiting for Employee' ? 'bg-cyan-50 text-cyan-700 border-cyan-100' :
                ticket.status === 'Resolved' ? 'bg-green-50 text-green-700 border-green-100' :
                'bg-gray-50 text-gray-700 border-gray-100'
              }`}>
                {ticket.status}
              </span>
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-6 flex items-center gap-4 text-xs font-semibold text-gray-600">
              <div className="flex items-center gap-1.5">
                <Tag className="w-4 h-4 text-purple-600" />
                <span>Sub Category: <strong className="text-gray-800">{ticket.subCategory || ticket.category}</strong></span>
              </div>
              <span>•</span>
              <div>
                Priority: <strong className={ticket.priority === 'Critical' ? 'text-red-600' : 'text-blue-600'}>{ticket.priority}</strong>
              </div>
            </div>

            <p className="text-gray-700 whitespace-pre-wrap leading-relaxed text-base">
              {ticket.description}
            </p>

            {/* Resolution Remarks Display */}
            {ticket.resolutionRemarks && (
              <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-2xl">
                <h4 className="text-xs font-bold text-green-800 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-green-600" /> Resolution Notes
                </h4>
                <p className="text-sm text-green-900 font-medium whitespace-pre-wrap">{ticket.resolutionRemarks}</p>
              </div>
            )}

            {ticket.attachments && ticket.attachments.length > 0 && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Evidence & Attachments</h3>
                <div className="flex flex-wrap gap-4">
                  {ticket.attachments.map((file, idx) => (
                    <a 
                      key={idx}
                      href={`${BASE_URL}${file.url}?token=${sessionStorage.getItem('token')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all group"
                    >
                      <Paperclip className="w-4 h-4 text-gray-400 group-hover:text-blue-600" />
                      <span className="text-sm font-bold text-gray-700 group-hover:text-blue-700">{file.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-8 pt-6 border-t border-gray-100 flex flex-wrap gap-6 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>Raised by <strong className="text-gray-800">{ticket.employeeId?.name || 'N/A'}</strong> ({ticket.employeeId?.employeeId || 'N/A'})</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span>{new Date(ticket.createdAt).toLocaleString()}</span>
              </div>
            </div>
          </div>



          {/* Conversation */}
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 max-h-[500px] overflow-y-auto border border-gray-100">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest px-2 mb-4">Discussion & Comments</h3>
            {comments.length === 0 ? (
              <p className="text-xs text-gray-400 italic text-center py-4">No comments added yet.</p>
            ) : (
              comments.map((comment) => (
                <div 
                  key={comment._id}
                  className={`flex ${comment.userId._id === user._id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-[80%] p-4 rounded-2xl shadow-sm ${
                    comment.userId._id === user._id 
                      ? 'bg-[#262760] text-white rounded-tr-none' 
                      : 'bg-white text-gray-800 rounded-tl-none border border-gray-100'
                  }`}>
                    <div className="flex justify-between items-center gap-4 mb-1">
                      <span className="text-[10px] font-bold opacity-75">{comment.userId.name}</span>
                      <span className="text-[10px] opacity-75">{new Date(comment.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{comment.message}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Reply Form */}
          {ticket.status !== 'Closed' && (
            <form onSubmit={handleSendMessage} className="relative">
              <textarea
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-4 pr-16 rounded-2xl border border-gray-200 shadow-md focus:ring-2 focus:ring-[#262760] focus:border-transparent outline-none transition-all resize-none min-h-[100px]"
              />
              <button
                type="submit"
                disabled={isSending}
                className="absolute right-4 bottom-4 p-3 bg-[#262760] text-white rounded-xl hover:bg-[#1e1f4a] disabled:opacity-50 transition-all shadow-md"
              >
                <Send className="w-5 h-5" />
              </button>
            </form>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-4">Actions</h3>
            <div className="space-y-3">
              {/* Employee Actions: Close Ticket & Reopen Ticket */}
              {!isAdminOrHr && ticket.status === 'Resolved' && (
                <>
                  <button 
                    onClick={() => updateStatus('Closed')}
                    className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Close Ticket
                  </button>
                  <button 
                    onClick={() => updateStatus('Reopened')}
                    className="w-full py-2.5 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                  >
                    <AlertCircle className="w-4 h-4" /> Reopen Ticket
                  </button>
                </>
              )}

              {!isAdminOrHr && ticket.status === 'Closed' && (
                <button 
                  onClick={() => updateStatus('Reopened')}
                  className="w-full py-2.5 bg-yellow-600 text-white rounded-xl font-bold hover:bg-yellow-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                >
                  <AlertCircle className="w-4 h-4" /> Reopen Ticket
                </button>
              )}

              {/* Admin / IT Admin Processing Actions */}
              {isAdminOrHr && (
                <>
                  {/* When ticket is Open or Reopened by employee, show full starting processing buttons */}
                  {['Open', 'Reopened'].includes(ticket.status) && (
                    <>
                      <button 
                        onClick={() => updateStatus('In Review')}
                        className="w-full py-2.5 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <Clock className="w-4 h-4" /> Mark as In Review
                      </button>
                      <button 
                        onClick={() => updateStatus('In Progress')}
                        className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <Clock className="w-4 h-4" /> Mark as In Progress
                      </button>
                      <button 
                        onClick={() => updateStatus('Resolved')}
                        className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                      </button>
                    </>
                  )}

                  {ticket.status === 'In Review' && (
                    <>
                      <button 
                        onClick={() => updateStatus('In Progress')}
                        className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <Clock className="w-4 h-4" /> Mark as In Progress
                      </button>
                      <button 
                        onClick={() => updateStatus('Resolved')}
                        className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                      </button>
                    </>
                  )}

                  {['Assigned', 'In Progress', 'Waiting for Employee'].includes(ticket.status) && (
                    <>
                      {ticket.status !== 'In Progress' && (
                        <button 
                          onClick={() => updateStatus('In Progress')}
                          className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-bold hover:bg-amber-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                          <Clock className="w-4 h-4" /> Mark as In Progress
                        </button>
                      )}
                      <button 
                        onClick={() => updateStatus('Resolved')}
                        className="w-full py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <CheckCircle2 className="w-4 h-4" /> Mark as Resolved
                      </button>
                    </>
                  )}

                  {ticket.status === 'Resolved' && (
                    <button 
                      onClick={() => updateStatus('Closed')}
                      className="w-full py-2.5 bg-gray-800 text-white rounded-xl font-bold hover:bg-gray-900 transition-all flex items-center justify-center gap-2 text-sm shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Close Ticket
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketDetails;
