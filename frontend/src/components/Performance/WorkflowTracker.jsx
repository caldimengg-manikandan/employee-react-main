import React from 'react';
import { 
  User, 
  Users, 
  FileText, 
  Award, 
  Send,
  Check,
  ChevronRight
} from 'lucide-react';

const WorkflowTracker = ({ currentStageId, userFlow }) => {
  if (!userFlow || userFlow.length === 0) return null;

  // Find index of current stage to determine status of other stages
  const currentIndex = userFlow.findIndex(step => step.id === currentStageId);
  
  // Helper to get icon based on stage ID
  const getIcon = (id) => {
    switch(id) {
      case 'appraisee': return User;
      case 'appraiser': return Users;
      case 'reviewer': return FileText;
      case 'director': return Award;
      case 'release': return Send;
      default: return User;
    }
  };

  return (
    <div className="w-full py-10 px-4">
      {/* Container */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full relative space-y-8 md:space-y-0">
        
        {/* Desktop Connecting Line Background */}
        <div className="hidden md:block absolute left-0 top-[60px] transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-20" />

        {userFlow.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;
          const StageIcon = getIcon(step.id);

          return (
            <div key={step.id} className="relative flex flex-row md:flex-col items-center w-full md:w-1/5 z-10">
              
              {/* Desktop Arrow Connector (between steps) */}
              {index < userFlow.length - 1 && (
                <div className="hidden md:block absolute top-[60px] left-1/2 w-full h-1 -z-10">
                   {/* We handle the coloring logic below based on completion */}
                   <div className={`h-full w-full ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`}></div>
                   {/* Arrow Head */}
                   <div className={`absolute right-0 -top-1.5 ${isCompleted ? 'text-green-500' : 'text-gray-200'}`}>
                     <ChevronRight size={16} fill="currentColor" />
                   </div>
                </div>
              )}

              {/* Date Box (Top) */}
              <div className="mb-4 hidden md:block">
                 <div className="bg-white border border-gray-200 px-3 py-1 rounded shadow-sm text-sm font-bold text-gray-700 whitespace-nowrap">
                   {step.date || 'TBD'}
                 </div>
              </div>

              {/* Main Step Circle */}
              <div className="flex flex-col items-center w-full">
                <div 
                  className={`
                    flex items-center justify-center w-16 h-16 rounded-full border-4 shadow-md transition-all duration-300
                    ${isCompleted 
                      ? 'bg-green-100 border-green-500 text-green-600' 
                      : isCurrent 
                        ? 'bg-blue-50 border-[#262760] text-[#262760] scale-110 ring-4 ring-blue-100' 
                        : 'bg-gray-50 border-gray-300 text-gray-400'
                    }
                  `}
                >
                  {isCompleted ? (
                    <Check size={28} strokeWidth={3} />
                  ) : (
                    <StageIcon size={isCurrent ? 28 : 24} />
                  )}
                </div>

                {/* Mobile View: Date & Label */}
                <div className="ml-4 md:ml-0 md:mt-4 w-full md:text-center">
                  <div className="md:hidden text-xs font-bold text-gray-500 mb-1">{step.date}</div>
                  <div 
                    className={`text-lg font-bold
                      ${isCompleted ? 'text-green-700' : ''}
                      ${isCurrent ? 'text-[#262760]' : ''}
                      ${isUpcoming ? 'text-gray-500' : ''}
                    `}
                  >
                    {step.label}
                  </div>
                  
                  {/* Description */}
                  <div className="text-xs text-gray-500 mt-1 md:max-w-[140px] md:mx-auto">
                    {step.description}
                  </div>
                </div>
              </div>

              {/* Mobile Connector Line (Vertical) */}
              {index !== userFlow.length - 1 && (
                <div className={`
                  md:hidden absolute left-8 top-16 bottom-[-32px] w-1 -z-10
                  ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}
                `} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTracker;