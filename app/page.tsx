"use client";

import { useState } from "react";
import { Upload, FileText, Briefcase, TrendingUp } from "lucide-react";
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
  };
}

export default function Home() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<JobMatch[]>([]);
  const [error, setError] = useState<string>("");
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
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-3xl font-bold text-gray-900">
                Market Analysis & Matches
              </h2>
              <span className="bg-blue-100 text-blue-800 px-4 py-1.5 rounded-full text-sm font-semibold">
                {matches.length} Opportunities Found
              </span>
            </div>

            {visualization && (
              <div className="mb-12 transform transition hover:scale-[1.01] duration-500">
                <MarketMap data={visualization} />
              </div>
            )}

            <div className="space-y-6">
              {matches.map((job, index) => (
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

                    <p className="text-gray-600 mb-6 leading-relaxed line-clamp-2 group-hover:line-clamp-none transition-all duration-300">
                      {job.description}
                    </p>

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
