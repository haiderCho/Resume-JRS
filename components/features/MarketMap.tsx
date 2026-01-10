'use client';

import React from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

interface MarketMapProps {
  data: {
    user: { x: number; y: number };
    jobs: Array<{
      id: string;
      title: string;
      company: string;
      x: number;
      y: number;
      score: number;
      isTopMatch: boolean;
    }>;
  };
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    if (data.type === 'user') {
      return (
        <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg">
          <p className="font-bold text-blue-600">You are here</p>
        </div>
      );
    }
    return (
      <div className="bg-white border border-gray-200 p-3 rounded-lg shadow-lg max-w-xs">
        <p className="font-bold text-gray-900">{data.title}</p>
        <p className="text-sm text-gray-600">{data.company}</p>
        <p className="text-xs text-green-600 mt-1">Match: {(data.score * 100).toFixed(0)}%</p>
      </div>
    );
  }
  return null;
};

export default function MarketMap({ data }: MarketMapProps) {
  // Combine user and job points into one dataset for rendering
  // We want two distinct series effectively, but Recharts Scatter can be customized with cells.
  
  const points = [
    { ...data.user, type: 'user', title: 'You', company: 'Candidate', score: 1 },
    ...data.jobs.map(j => ({ ...j, type: 'job' }))
  ];

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-900">Research Feature: Semantic Market Map</h3>
        <p className="text-sm text-gray-500">
          Visualizing your resume (Blue) relative to the job market (Gray/Green) using PCA Dimensionality Reduction.
          Closer points = higher similarity.
        </p>
      </div>
      
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis type="number" dataKey="x" name="PC1" hide />
            <YAxis type="number" dataKey="y" name="PC2" hide />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
            <Scatter name="Jobs" data={points} fill="#8884d8">
              {points.map((entry, index) => {
                 if (entry.type === 'user') {
                    return <Cell key={`cell-${index}`} fill="#2563EB" r={8} className="animate-pulse" />;
                 }
                 // Top matches are Green, others are Gray
                 // @ts-ignore
                 return <Cell key={`cell-${index}`} fill={entry.isTopMatch ? "#10B981" : "#E5E7EB"} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      
      <div className="flex gap-4 justify-center mt-4 text-xs font-medium text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-blue-600 animate-pulse"></div>
          <span>You</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
          <span>Top Matches</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-gray-200"></div>
          <span>Market Context</span>
        </div>
      </div>
    </div>
  );
}
