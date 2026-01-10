'use client';

import { useState } from 'react';
import { Upload, FileText, Briefcase, TrendingUp } from 'lucide-react';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorMessage from '@/components/ErrorMessage';
import dynamic from 'next/dynamic';
const MarketMap = dynamic(() => import('@/components/features/MarketMap'), { ssr: false });
import SkillGapAnalysis from '@/components/features/SkillGapAnalysis';

interface JobMatch {
  id: string;
  title: string;
  company: string;
  description: string;
  skills: string[];
  level: string;
  category: string;
  score: number;
  originalUrl?: string;
  analysis?: {
    missingSkills: string[];
    matchedSkills: string[];
    extraSkills: string[];
    matchPercentage: number;
  };
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [error, setError] = useState<string>('');
  const [visualization, setVisualization] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);



  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const validTypes = ['.pdf', '.docx'];
      const fileExtension = '.' + droppedFile.name.split('.').pop()?.toLowerCase();
      
      if (validTypes.includes(fileExtension)) {
        setFile(droppedFile);
        setError('');
      } else {
        setError('Invalid file type. Please upload a PDF or DOCX.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError('');
    setMatches([]);

    try {
      const formData = new FormData();
      formData.append('resume', file);

      const response = await fetch('/api/recommend', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || data.error || 'Failed to process resume');
      }

      setMatches(data.matches);
      setVisualization(data.visualization);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-full mb-4">
            <Briefcase className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Resume-Job Matcher
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Upload your resume and discover the best matching job opportunities using AI-powered semantic matching
          </p>
        </div>

        {/* Privacy Notice - Phase 5.3 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 max-w-2xl mx-auto">
          <p className="text-sm text-blue-800 text-center">
            🔒 <strong>Privacy:</strong> Your resume is processed in-memory only and never stored on our servers.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8 max-w-2xl mx-auto">
          <form onSubmit={handleSubmit}>


            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors cursor-pointer ${
                isDragging 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-300 hover:border-blue-500'
              }`}
            >
              <Upload className={`w-12 h-12 mx-auto mb-4 ${isDragging ? 'text-blue-600' : 'text-gray-400'}`} />
              <label className="cursor-pointer block">
                <span className={`text-lg font-medium ${isDragging ? 'text-blue-700' : 'text-gray-700'}`}>
                  {file ? file.name : (isDragging ? 'Drop matches here!' : 'Click or Drag to upload resume')}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              <p className={`text-sm mt-2 ${isDragging ? 'text-blue-600' : 'text-gray-500'}`}>
                PDF or DOCX (Max 5MB)
              </p>
            </div>

            {file && (
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-6 bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Analyzing Resume...' : 'Find Matching Jobs'}
              </button>
            )}
          </form>

          {loading && <LoadingSpinner />}

          {error && <ErrorMessage message={error} />}
        </div>


        {/* Results Section */}
        {matches.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="w-6 h-6 text-blue-600" />
              <h2 className="text-2xl font-bold text-gray-900">
                Top {matches.length} Matching Jobs
              </h2>
            </div>

            {/* Feature 2: Market Map Visualization */}
            {visualization && <MarketMap data={visualization} />}
            
            <div className="h-8"></div>

            <div className="space-y-4">
              {matches.map((job, index) => (
                <div
                  key={job.id}
                  className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow border border-gray-100"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {job.title}
                      </h3>
                      <p className="text-gray-600">{job.company}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                        {(job.score * 100).toFixed(1)}% Match
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{job.level}</p>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-4 line-clamp-3">
                    {job.description}
                  </p>

                  <div className="flex flex-wrap gap-2">
                    {job.analysis ? (
                        // Use analysis skills if available, otherwise fallback
                        job.analysis.matchedSkills.slice(0, 5).map(skill => (
                             <span key={skill} className="px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm border border-green-100">
                               {skill}
                             </span>
                        ))
                    ) : (
                        job.skills.map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                          >
                            {skill}
                          </span>
                        ))
                    )}
                  </div>

                  {/* Feature 1: Skill Gap Analysis */}
                  {job.analysis && <SkillGapAnalysis analysis={job.analysis} />}
                  
                  <div className="mt-4 pt-4 border-t border-gray-50">
                    <a 
                      href={job.originalUrl || `https://www.indeed.com/jobs?q=${encodeURIComponent(`${job.title} ${job.company}`)}&l=`} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium hover:underline"
                    >
                      Apply Now <TrendingUp className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
