import React from 'react';
import { CheckCircle, Circle, Clock } from 'lucide-react';

const WorkflowTracker = ({ currentStageId, userFlow }) => {
  if (!userFlow || userFlow.length === 0) return null;

  // Find index of current stage to determine status of other stages
  const currentIndex = userFlow.findIndex(step => step.id === currentStageId);
  
  return (
    <div className="w-full py-6">
      <div className="flex items-center justify-between w-full relative">
        {/* Progress Bar Background */}
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-full h-1 bg-gray-200 -z-10" />
        
        {/* Progress Bar Fill */}
        <div 
          className="absolute left-0 top-1/2 transform -translate-y-1/2 h-1 bg-indigo-600 -z-10 transition-all duration-500"
          style={{ width: `${(currentIndex / (userFlow.length - 1)) * 100}%` }}
        />

        {userFlow.map((step, index) => {
          const isCompleted = index < currentIndex;
          const isCurrent = index === currentIndex;
          const isUpcoming = index > currentIndex;

          return (
            <div key={step.id} className="flex flex-col items-center bg-white px-2">
              <div 
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors duration-300
                  ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : ''}
                  ${isCurrent ? 'bg-white border-indigo-600 text-indigo-600' : ''}
                  ${isUpcoming ? 'bg-white border-gray-300 text-gray-300' : ''}
                `}
              >
                {isCompleted ? (
                  <CheckCircle size={20} />
                ) : isCurrent ? (
                  <Clock size={20} />
                ) : (
                  <Circle size={20} />
                )}
              </div>
              <div className="mt-2 text-center">
                <div 
                  className={`text-sm font-medium
                    ${isCompleted ? 'text-indigo-600' : ''}
                    ${isCurrent ? 'text-indigo-600' : ''}
                    ${isUpcoming ? 'text-gray-500' : ''}
                  `}
                >
                  {step.label}
                </div>
                <div className="text-xs text-gray-400 max-w-[120px] hidden sm:block">
                  {step.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default WorkflowTracker;
