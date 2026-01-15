"use client";

import { useState, useMemo } from "react";
import { Upload, FileText, Briefcase, TrendingUp, Filter, SortAsc, SortDesc, Star, AlertCircle, CheckCircle, ChevronDown, ChevronUp } from "lucide-react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import dynamic from "next/dynamic";
const MarketMap = dynamic(() => import("@/components/features/MarketMap"), {
  ssr: false,
});
import SkillGapAnalysis from "@/components/features/SkillGapAnalysis";

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
    sectionScores?: {
      experience: number;
      skills: number;
      education: number;
    };
    levelMatch?: number;
    candidateLevel?: string;
    scoringStrategy?: string;
  };
}

interface ResumeFeedback {
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  suggestions: {
    category: string;
    severity: 'critical' | 'warning' | 'tip';
    title: string;
    message: string;
    example?: string;
  }[];
  strengths: string[];
  summary: string;
}

type SortOption = 'score' | 'skillMatch' | 'company';
type FilterLevel = 'all' | 'entry' | 'mid' | 'senior' | 'lead';

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [error, setError] = useState<string>("");
  const [visualization, setVisualization] = useState<any>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [resumeFeedback, setResumeFeedback] = useState<ResumeFeedback | null>(null);
  const [experienceAnalysis, setExperienceAnalysis] = useState<any>(null);
  
  // Filter & Sort State
  const [sortBy, setSortBy] = useState<SortOption>('score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterLevel, setFilterLevel] = useState<FilterLevel>('all');
  const [minScore, setMinScore] = useState<number>(0);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedJobs, setExpandedJobs] = useState<Set<string>>(new Set());

  // Toggle job description expansion
  const toggleJobExpand = (jobId: string) => {
    setExpandedJobs(prev => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  };

  // Filtered & Sorted Matches
  const filteredMatches = useMemo(() => {
    let result = [...matches];
    
    // Filter by level
    if (filterLevel !== 'all') {
      result = result.filter(job => {
        const jobLevel = (job.level || '').toLowerCase();
        return jobLevel.includes(filterLevel);
      });
    }
    
    // Filter by minimum score
    if (minScore > 0) {
      result = result.filter(job => job.score * 100 >= minScore);
    }
    
    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'score':
          comparison = a.score - b.score;
          break;
        case 'skillMatch':
          comparison = (a.analysis?.matchPercentage || 0) - (b.analysis?.matchPercentage || 0);
          break;
        case 'company':
          comparison = a.company.localeCompare(b.company);
          break;
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });
    
    return result;
  }, [matches, sortBy, sortOrder, filterLevel, minScore]);

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
      const validTypes = [".pdf", ".docx"];
      const fileExtension =
        "." + droppedFile.name.split(".").pop()?.toLowerCase();

      if (validTypes.includes(fileExtension)) {
        setFile(droppedFile);
        setError("");
      } else {
        setError("Invalid file type. Please upload a PDF or DOCX.");
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setError("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    setError("");
    setMatches([]);

    try {
      const formData = new FormData();
      formData.append("resume", file);

      const response = await fetch("/api/recommend", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.details || data.error || "Failed to process resume"
        );
      }

      setMatches(data.matches);
      setVisualization(data.visualization);
      setResumeFeedback(data.resumeFeedback || null);
      setExperienceAnalysis(data.experienceAnalysis || null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <div className="container mx-auto px-4 py-16 max-w-5xl">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl shadow-lg mb-6 transform transition hover:scale-105">
            <Briefcase className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-4">
            Resume Matcher
          </h1>
          <p className="text-xl text-gray-500 max-w-2xl mx-auto">
            Analyze your resume against hundreds of job opportunities using
            advanced semantic analysis and AI-driven skill mapping.
          </p>
        </div>

        {/* Upload Section */}
        <div className="bg-white rounded-3xl shadow-xl overflow-hidden mb-12 border border-gray-100 transition-all hover:shadow-2xl max-w-3xl mx-auto">
          <div className="p-8 md:p-12">
            <form onSubmit={handleSubmit} className="space-y-8">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`border-3 border-dashed rounded-2xl p-10 text-center transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? "border-blue-500 bg-blue-50 scale-[1.02]"
                    : "border-gray-200 hover:border-blue-400 hover:bg-gray-50"
                }`}
              >
                <div
                  className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-colors ${
                    isDragging ? "bg-blue-200" : "bg-gray-100"
                  }`}
                >
                  <Upload
                    className={`w-8 h-8 ${
                      isDragging ? "text-blue-600" : "text-gray-400"
                    }`}
                  />
                </div>
                <label className="cursor-pointer block">
                  <span className="text-xl font-semibold text-gray-900 block mb-2">
                    {file
                      ? file.name
                      : isDragging
                      ? "Drop matches here!"
                      : "Upload your Resume"}
                  </span>
                  <span className="text-gray-500">
                    {file
                      ? "Ready to analyze"
                      : "Drag & drop or click to browse (PDF/DOCX)"}
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.docx"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
              </div>

              {file && (
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 px-8 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-70 disabled:cursor-wait transition-all shadow-md hover:shadow-lg transform active:scale-95"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner /> Analyzing...
                    </span>
                  ) : (
                    "Analyze Resume"
                  )}
                </button>
              )}
            </form>

            <div className="mt-6 flex items-center justify-center gap-2 text-sm text-gray-400">
              <span>🔒 Processed securely in-memory</span>
            </div>

            {error && (
              <div className="mt-6">
                <ErrorMessage message={error} />
              </div>
            )}
          </div>
        </div>

        {/* Results Section */}
        {matches.length > 0 && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Resume Feedback Panel */}
            {resumeFeedback && (
              <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">Resume Analysis</h3>
                  <div className="flex items-center gap-3">
                    <div className={`text-4xl font-black ${
                      resumeFeedback.grade === 'A' ? 'text-green-600' :
                      resumeFeedback.grade === 'B' ? 'text-blue-600' :
                      resumeFeedback.grade === 'C' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {resumeFeedback.grade}
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-gray-900">{resumeFeedback.overallScore}/100</div>
                      <div className="text-xs text-gray-500">Resume Score</div>
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{resumeFeedback.summary}</p>
                
                {/* Strengths */}
                {resumeFeedback.strengths.length > 0 && (
                  <div className="mb-4">
                    <div className="flex flex-wrap gap-2">
                      {resumeFeedback.strengths.map((strength, i) => (
                        <span key={i} className="inline-flex items-center gap-1 px-3 py-1 bg-green-50 text-green-700 rounded-full text-sm">
                          <CheckCircle className="w-3 h-3" /> {strength}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Suggestions */}
                {resumeFeedback.suggestions.length > 0 && (
                  <div className="space-y-2">
                    {resumeFeedback.suggestions.slice(0, 3).map((suggestion, i) => (
                      <div key={i} className={`p-3 rounded-lg border ${
                        suggestion.severity === 'critical' ? 'bg-red-50 border-red-200' :
                        suggestion.severity === 'warning' ? 'bg-yellow-50 border-yellow-200' :
                        'bg-blue-50 border-blue-200'
                      }`}>
                        <div className="flex items-start gap-2">
                          <AlertCircle className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            suggestion.severity === 'critical' ? 'text-red-600' :
                            suggestion.severity === 'warning' ? 'text-yellow-600' :
                            'text-blue-600'
                          }`} />
                          <div>
                            <div className="font-semibold text-gray-900">{suggestion.title}</div>
                            <div className="text-sm text-gray-600">{suggestion.message}</div>
                            {suggestion.example && (
                              <div className="text-sm text-gray-500 italic mt-1">→ {suggestion.example}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Experience Level Badge */}
                {experienceAnalysis && (
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-2 text-sm text-gray-600">
                    <Star className="w-4 h-4 text-yellow-500" />
                    Detected Level: <span className="font-semibold capitalize text-gray-900">{experienceAnalysis.level}</span>
                    {experienceAnalysis.yearsOfExperience && (
                      <span>• {experienceAnalysis.yearsOfExperience}+ years</span>
                    )}
                  </div>
                )}
              </div>
            )}
            
            {/* Header with Filter Toggle */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <h2 className="text-3xl font-bold text-gray-900">
                  Job Matches
                </h2>
                <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-semibold">
                  {filteredMatches.length} of {matches.length}
                </span>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-colors"
              >
                <Filter className="w-4 h-4" />
                Filters
                <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            {/* Filter Controls */}
            {showFilters && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort By</label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="score">Match Score</option>
                    <option value="skillMatch">Skill Match %</option>
                    <option value="company">Company Name</option>
                  </select>
                </div>
                
                {/* Sort Order */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Order</label>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc')}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-gray-50"
                  >
                    {sortOrder === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
                    {sortOrder === 'desc' ? 'Highest First' : 'Lowest First'}
                  </button>
                </div>
                
                {/* Filter Level */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
                  <select
                    value={filterLevel}
                    onChange={(e) => setFilterLevel(e.target.value as FilterLevel)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="all">All Levels</option>
                    <option value="entry">Entry / Junior</option>
                    <option value="mid">Mid Level</option>
                    <option value="senior">Senior</option>
                    <option value="lead">Lead / Staff</option>
                  </select>
                </div>
                
                {/* Min Score */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min Score: {minScore}%</label>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="10"
                    value={minScore}
                    onChange={(e) => setMinScore(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>
              </div>
            )}

            {visualization && (
              <div className="mb-12 transform transition hover:scale-[1.01] duration-500">
                <MarketMap data={visualization} />
              </div>
            )}

            <div className="space-y-6">
              {filteredMatches.map((job, index) => (
                <div
                  key={job.id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-blue-100 overflow-hidden"
                >
                  <div className="p-8">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
                      <div>
                        <h3 className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors mb-1">
                          {job.title}
                        </h3>
                        <p className="text-lg text-gray-600 font-medium">
                          {job.company}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="text-3xl font-black text-blue-600">
                              {(job.score * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs font-bold text-gray-400 uppercase tracking-wide">
                              Match Score
                            </div>
                          </div>
                          <div className="h-10 w-1 bg-gray-100 rounded-full"></div>
                          <div className="text-right">
                            {job.analysis?.sectionScores ? (
                              <div className="flex gap-3 text-sm">
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-gray-800">
                                    {(
                                      job.analysis.sectionScores.experience *
                                      100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                  <span className="text-[10px] text-gray-400 uppercase">
                                    Exp
                                  </span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-gray-800">
                                    {(
                                      job.analysis.sectionScores.skills * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                  <span className="text-[10px] text-gray-400 uppercase">
                                    Skills
                                  </span>
                                </div>
                                <div className="flex flex-col items-center">
                                  <span className="font-bold text-gray-800">
                                    {(
                                      job.analysis.sectionScores.education * 100
                                    ).toFixed(0)}
                                    %
                                  </span>
                                  <span className="text-[10px] text-gray-400 uppercase">
                                    Edu
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">N/A</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Job Description */}
                    <div className="mb-6">
                      <div className={`text-gray-600 leading-relaxed whitespace-pre-line ${expandedJobs.has(job.id) ? '' : 'line-clamp-3'}`}>
                        {job.description.split(/\n|\. /).filter(Boolean).map((sentence, i) => (
                          <span key={i}>
                            {sentence.trim()}{!sentence.endsWith('.') && i < job.description.split(/\n|\. /).length - 1 ? '. ' : ' '}
                          </span>
                        ))}
                      </div>
                      {job.description.length > 200 && (
                        <button
                          onClick={() => toggleJobExpand(job.id)}
                          className="mt-2 flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium transition-colors"
                        >
                          {expandedJobs.has(job.id) ? (
                            <>
                              <ChevronUp className="w-4 h-4" />
                              Show Less
                            </>
                          ) : (
                            <>
                              <ChevronDown className="w-4 h-4" />
                              Read More
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 mb-6">
                      {(job.analysis?.matchedSkills || job.skills)
                        .slice(0, 6)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-green-50 text-green-700 rounded-md text-sm font-medium border border-green-100"
                          >
                            {skill}
                          </span>
                        ))}
                      {(job.analysis?.missingSkills || [])
                        .slice(0, 3)
                        .map((skill) => (
                          <span
                            key={skill}
                            className="px-3 py-1 bg-red-50 text-red-600 rounded-md text-sm font-medium border border-red-100 opacity-60"
                          >
                            Missing: {skill}
                          </span>
                        ))}
                    </div>

                    {job.analysis && (
                      <SkillGapAnalysis analysis={job.analysis} />
                    )}

                    <div className="mt-6 pt-6 border-t border-gray-50 flex justify-end">
                      <a
                        href={job.originalUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-white bg-gray-900 hover:bg-black px-6 py-2.5 rounded-lg font-medium transition-colors shadow-lg shadow-gray-200"
                      >
                        View Job Details <TrendingUp className="w-4 h-4" />
                      </a>
                    </div>
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
