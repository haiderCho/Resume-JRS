import React, { useState } from 'react';
import { ChevronDown, ChevronUp, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

interface SkillGapProps {
  analysis: {
    missingSkills: string[];
    matchedSkills: string[];
    extraSkills: string[];
    matchPercentage: number;
  };
}

export default function SkillGapAnalysis({ analysis }: SkillGapProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  if (!analysis) return null;

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
      >
        <span className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-purple-500" />
          Skill Gap Analysis
        </span>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {isOpen && (
        <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Matches */}
          <div className="bg-green-50 rounded-lg p-3 border border-green-100">
            <h4 className="text-xs font-bold text-green-800 uppercase mb-2 flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Matched Skills
            </h4>
            <div className="flex flex-wrap gap-1">
              {analysis.matchedSkills.length > 0 ? (
                analysis.matchedSkills.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-white text-green-700 rounded border border-green-200 text-xs shadow-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-green-600 italic">No direct keyword matches found.</span>
              )}
            </div>
          </div>

          {/* Missing */}
          <div className="bg-red-50 rounded-lg p-3 border border-red-100">
            <h4 className="text-xs font-bold text-red-800 uppercase mb-2 flex items-center gap-1">
              <XCircle className="w-3 h-3" /> Missing from Resume
            </h4>
            <div className="flex flex-wrap gap-1">
              {analysis.missingSkills.length > 0 ? (
                analysis.missingSkills.map(skill => (
                  <span key={skill} className="px-2 py-0.5 bg-white text-red-700 rounded border border-red-200 text-xs shadow-sm">
                    {skill}
                  </span>
                ))
              ) : (
                <span className="text-xs text-red-600 italic">Perfect match! No missing skills detected.</span>
              )}
            </div>
          </div>
          
        </div>
      )}
    </div>
  );
}
