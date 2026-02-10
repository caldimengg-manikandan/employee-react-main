import React, { useState } from 'react';
import { Save } from 'lucide-react';

const IncrementMaster = () => {
  // Initial data structure mirroring the image
  const [matrixData, setMatrixData] = useState([
    {
      id: 1,
      category: "Senior Project Manager, Project Manager",
      ratings: [
        { grade: 'ES', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '12%' },
        { grade: 'ME', belowTarget: '3%', metTarget: '4%', target1_1: '', target1_25: '6%', target1_5: '8%' },
        { grade: 'BE', belowTarget: '2%', metTarget: '2%', target1_1: '', target1_25: '3%', target1_5: '5%' }
      ]
    },
    {
      id: 2,
      category: "Assitant Project Managers, Team lead",
      ratings: [
        { grade: 'ES', belowTarget: '8%', metTarget: '10%', target1_1: '', target1_25: '13%', target1_5: '15%' },
        { grade: 'ME', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' },
        { grade: 'BE', belowTarget: '2%', metTarget: '3%', target1_1: '', target1_25: '5%', target1_5: '7%' }
      ]
    },
    {
      id: 3,
      category: "Senior Detailers, Checkers and Modelers",
      ratings: [
        { grade: 'ES', belowTarget: '10%', metTarget: '12%', target1_1: '', target1_25: '15%', target1_5: '20%' },
        { grade: 'ME', belowTarget: '5%', metTarget: '8%', target1_1: '', target1_25: '10%', target1_5: '15%' },
        { grade: 'BE', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '10%' }
      ]
    },
    {
      id: 4,
      category: "Trainees & Junior detailer, Modeler",
      ratings: [
        { grade: 'ES', belowTarget: '10%', metTarget: '15%', target1_1: '', target1_25: '20%', target1_5: '25%' },
        { grade: 'ME', belowTarget: '5%', metTarget: '10%', target1_1: '', target1_25: '15%', target1_5: '18%' },
        { grade: 'BE', belowTarget: '3%', metTarget: '5%', target1_1: '', target1_25: '8%', target1_5: '12%' }
      ]
    }
  ]);

  const handleInputChange = (categoryId, gradeIndex, field, value) => {
    setMatrixData(prevData => prevData.map(category => {
      if (category.id === categoryId) {
        const newRatings = [...category.ratings];
        newRatings[gradeIndex] = { ...newRatings[gradeIndex], [field]: value };
        return { ...category, ratings: newRatings };
      }
      return category;
    }));
  };

  const handleSave = () => {
    console.log("Saving Matrix Data:", matrixData);
    alert("Increment Matrix Saved Successfully!");
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20 p-8 font-sans">
      <div className="w-full mx-auto">
        <div className="flex justify-between items-center mb-6">
          
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[#262760] hover:bg-[#1e2050] focus:outline-none"
          >
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </button>
        </div>

        <div className="bg-white shadow overflow-hidden border border-gray-200 sm:rounded-lg overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border-collapse border border-gray-300">
            <thead className="bg-white">
              <tr>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '20%'}}>Category</th>
                <th className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100" style={{width: '10%'}}>Ratings</th>
                <th colSpan="5" className="border border-gray-300 px-4 py-2 text-center text-sm font-bold text-gray-900 bg-gray-100">Annual Increment %</th>
              </tr>
              <tr>
                <th className="border border-gray-300 bg-white"></th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900">Company Performance</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fff2cc]">Below Target</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">Met Target</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#deebf7]">1.1 X Target</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#fce4d6]">1.25 X Target</th>
                <th className="border border-gray-300 px-2 py-2 text-center text-xs font-bold text-gray-900 bg-[#e2efda]">1.5 X Target</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {matrixData.map((category) => (
                <React.Fragment key={category.id}>
                  {category.ratings.map((rating, index) => (
                    <tr key={`${category.id}-${rating.grade}`}>
                      {index === 0 && (
                        <td 
                          rowSpan={3} 
                          className="border border-gray-300 px-4 py-2 text-sm text-gray-900 font-medium align-middle bg-white"
                        >
                          {category.category}
                        </td>
                      )}
                      <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-900 font-bold">
                        {rating.grade}
                      </td>
                      <td className="border border-gray-300 px-2 py-1 bg-[#fff2cc]">
                        <input
                          type="text"
                          value={rating.belowTarget}
                          onChange={(e) => handleInputChange(category.id, index, 'belowTarget', e.target.value)}
                          className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 bg-[#deebf7]">
                         <input
                          type="text"
                          value={rating.metTarget}
                          onChange={(e) => handleInputChange(category.id, index, 'metTarget', e.target.value)}
                          className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 bg-[#deebf7]">
                         <input
                          type="text"
                          value={rating.target1_1}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_1', e.target.value)}
                          className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 bg-[#fce4d6]">
                         <input
                          type="text"
                          value={rating.target1_25}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_25', e.target.value)}
                          className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                        />
                      </td>
                      <td className="border border-gray-300 px-2 py-1 bg-[#e2efda]">
                         <input
                          type="text"
                          value={rating.target1_5}
                          onChange={(e) => handleInputChange(category.id, index, 'target1_5', e.target.value)}
                          className="w-full text-center border-none bg-transparent focus:ring-0 text-sm p-1"
                        />
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default IncrementMaster;