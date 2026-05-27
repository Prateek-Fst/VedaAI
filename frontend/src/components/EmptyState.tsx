'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

export const EmptyState: React.FC = () => {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-16 lg:py-24 max-w-2xl mx-auto animate-fade-in">
      {/* Premium SVG Vector Illustration */}
      <div className="relative w-64 h-64 mb-10 flex items-center justify-center">
        {/* Soft Background Circle */}
        <div className="absolute w-52 h-52 bg-gray-100 rounded-full -z-1"></div>
        
        {/* Little decorative shapes */}
        <div className="absolute top-8 right-6 text-blue-500 font-bold text-2xl rotate-12 animate-pulse">✦</div>
        <div className="absolute bottom-12 left-6 text-blue-400 font-bold text-xl rotate-45 animate-pulse delay-500">✧</div>
        <div className="absolute top-24 left-4 w-3.5 h-3.5 bg-yellow-400 rounded-full animate-bounce"></div>
        <div className="absolute right-10 bottom-20 w-3 h-3 bg-blue-500 rounded-full"></div>

        {/* Paper Document */}
        <svg
          width="120"
          height="150"
          viewBox="0 0 120 150"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute transform -translate-x-2 -translate-y-2 drop-shadow-md"
        >
          <rect width="120" height="150" rx="16" fill="white" />
          <rect x="20" y="25" width="40" height="10" rx="3" fill="#090d16" />
          <rect x="20" y="48" width="80" height="6" rx="2" fill="#e4e4e7" />
          <rect x="20" y="64" width="80" height="6" rx="2" fill="#e4e4e7" />
          <rect x="20" y="80" width="80" height="6" rx="2" fill="#e4e4e7" />
          <rect x="20" y="96" width="60" height="6" rx="2" fill="#e4e4e7" />
        </svg>

        {/* Magnifying Glass with Red X */}
        <svg
          width="130"
          height="130"
          viewBox="0 0 130 130"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="absolute transform translate-x-8 translate-y-8 drop-shadow-xl"
        >
          {/* Glass Circle */}
          <circle cx="55" cy="55" r="45" fill="#f4f4f5" fillOpacity="0.4" stroke="#d4d4d8" strokeWidth="6" />
          {/* Handle */}
          <path d="M87 87L115 115" stroke="#d4d4d8" strokeWidth="12" strokeLinecap="round" />
          {/* Red X */}
          <path d="M42 42L68 68" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
          <path d="M68 42L42 68" stroke="#ef4444" strokeWidth="8" strokeLinecap="round" />
        </svg>
      </div>

      {/* Texts */}
      <h2 className="text-2xl lg:text-3xl font-black text-gray-800 tracking-tight mb-4">
        No assignments yet
      </h2>
      <p className="text-sm lg:text-base text-gray-500 leading-relaxed max-w-md mx-auto mb-10 font-medium">
        Create your first assignment to start collecting and grading student submissions.
        You can set up rubrics, define marking criteria, and let AI assist with grading.
      </p>

      {/* Button */}
      <button
        onClick={() => router.push('/create')}
        className="flex items-center gap-2.5 py-4 px-8 bg-zinc-950 hover:bg-zinc-900 text-white font-bold text-sm tracking-wide rounded-full shadow-lg shadow-gray-200 active:scale-98 transition-all"
      >
        <Plus className="w-5 h-5 stroke-[2.5px]" />
        <span>Create Your First Assignment</span>
      </button>
    </div>
  );
};
