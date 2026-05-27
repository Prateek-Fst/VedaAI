'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore, IAssignment } from '@/store/useAssignmentStore';
import { Sidebar } from '@/components/Sidebar';
import { MobileNavbar } from '@/components/MobileNavbar';
import { EmptyState } from '@/components/EmptyState';
import { getSocket, joinAssignmentRoom } from '@/utils/socket';
import {
  Search,
  Filter,
  MoreVertical,
  Plus,
  Calendar,
  Sparkles,
  BookOpen,
  CheckCircle,
  Clock,
  Bell,
  AlertCircle
} from 'lucide-react';

export default function AssignmentsPage() {
  const router = useRouter();
  const {
    assignments,
    loading,
    fetchAssignments,
    deleteAssignment
  } = useAssignmentStore();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch assignments on mount
  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // Refetch when search/filter inputs change
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchAssignments(searchText, statusFilter);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, statusFilter, fetchAssignments]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setActiveDropdownId(null);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 4. Real-time updates via Socket.io for pending or processing assignments in the list
  useEffect(() => {
    const activeAssignments = assignments.filter(
      (a) => a.status === 'pending' || a.status === 'processing'
    );

    if (activeAssignments.length > 0) {
      const socket = getSocket();
      
      activeAssignments.forEach((a) => {
        joinAssignmentRoom(a._id);
      });

      const handleProgressUpdate = (payload: any) => {
        console.log('📡 List Page Socket Progress:', payload);
        if (payload.status === 'completed' || payload.status === 'failed') {
          // Re-fetch list to update status and questions
          fetchAssignments(searchText, statusFilter);
        }
      };

      socket.on('assignment-progress', handleProgressUpdate);

      return () => {
        socket.off('assignment-progress', handleProgressUpdate);
      };
    }
  }, [assignments, searchText, statusFilter, fetchAssignments]);

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm('Are you sure you want to delete this assignment?');
    if (confirmed) {
      const success = await deleteAssignment(id);
      if (success) {
        setActiveDropdownId(null);
      } else {
        alert('Failed to delete assignment.');
      }
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getStatusBadge = (status: IAssignment['status']) => {
    switch (status) {
      case 'completed':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Ready</span>
          </span>
        );
      case 'processing':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100 animate-pulse">
            <Clock className="w-3.5 h-3.5" />
            <span>Processing</span>
          </span>
        );
      case 'failed':
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-100">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Failed</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1.5 text-xs font-bold text-gray-500 bg-gray-50 px-2.5 py-1 rounded-full border border-gray-100">
            <Clock className="w-3.5 h-3.5" />
            <span>Queued</span>
          </span>
        );
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      {/* Desktop Sidebar */}
      <Sidebar
        assignmentsCount={assignments.length}
        mobileMenuOpen={mobileMenuOpen}
        setMobileMenuOpen={setMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
        {/* Mobile top bar */}
        <MobileNavbar onMenuToggle={() => setMobileMenuOpen(true)} />

        {/* Desktop Floating Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 sticky top-4 z-20 mx-6 my-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
            <button
              onClick={() => router.back()}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors"
            >
              ←
            </button>
            <span className="text-gray-400">/</span>
            <span>Assignment</span>
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-600 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-orange-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center gap-3.5 pl-4 border-l border-gray-200">
              <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-full overflow-hidden flex items-center justify-center shadow-inner shrink-0">
                <img src="/Avatar.svg" alt="Avatar" className="w-full h-full object-cover rounded-full" />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-800 flex items-center gap-1 cursor-pointer">
                  Delhi Public School <ChevronDown className="w-4 h-4 text-gray-400" />
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
          {/* Dashboard Title Section */}
          <div className="flex items-center gap-3.5 mb-8">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-md shadow-emerald-200"></span>
            <div className="flex flex-col">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-800 tracking-tight">Assignments</h1>
              <p className="text-sm text-gray-500 font-medium">Manage and create assignments for your classes.</p>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            {/* Filter Dropdown */}
            <div className="relative inline-block w-full md:w-56 shrink-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full appearance-none bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 py-3.5 px-4 pr-10 rounded-xl font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-orange-500/20"
              >
                <option value="">Filter By (All)</option>
                <option value="completed">Status: Completed</option>
                <option value="processing">Status: Processing</option>
                <option value="failed">Status: Failed</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <Filter className="w-4 h-4" />
              </div>
            </div>

            {/* Search Input */}
            <div className="relative w-full">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search Assignment"
                className="w-full bg-gray-50 border border-gray-200 py-3.5 pl-12 pr-4 rounded-xl font-semibold text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
              />
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>
          </div>

          {/* Core Grid / Loader / Empty states */}
          {loading && assignments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
              <p className="text-gray-500 font-bold text-sm tracking-wide">Loading assignments...</p>
            </div>
          ) : assignments.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-4 animate-fade-in w-full">
              {assignments.map((assignment) => (
                <div
                  key={assignment._id}
                  className={`bg-white rounded-2xl border border-gray-150 shadow-[0_8px_30px_rgb(0,0,0,0.03)] hover:shadow-md hover:border-gray-200 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between p-6 relative group gap-4 w-full ${
                    activeDropdownId === assignment._id ? 'z-40' : 'z-10'
                  }`}
                >
                  {/* Left side: Icon + Title & Metadata */}
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center font-bold text-orange-600 shadow-xs shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </div>
                    <div className="flex flex-col min-w-0 pr-4">
                      <h3
                        onClick={() => router.push(`/assignments/${assignment._id}`)}
                        className="text-base font-extrabold text-gray-800 leading-snug tracking-tight hover:text-orange-500 cursor-pointer truncate"
                      >
                        {assignment.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                          {assignment.subject}
                        </span>
                        <span className="text-[10px] text-gray-300 font-bold">•</span>
                        <span className="text-xs font-bold text-orange-600/90 bg-orange-50 px-2 py-0.5 rounded-md">
                          {assignment.classLevel}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Middle/Right: Dates + Status */}
                  <div className="flex flex-wrap items-center gap-4 md:gap-8 shrink-0 md:mr-16">
                    {/* Dates */}
                    <div className="flex items-center gap-6">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Assigned on</span>
                        <span className="text-xs font-extrabold text-gray-700 mt-0.5">{formatDate(assignment.createdAt)}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Due Date</span>
                        <span className="text-xs font-black text-rose-500 mt-0.5">{formatDate(assignment.dueDate)}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="min-w-[90px] flex justify-start md:justify-center">
                      {getStatusBadge(assignment.status)}
                    </div>
                  </div>

                  {/* Action dropdown button */}
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 md:translate-y-0 md:top-auto md:relative shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdownId(
                          activeDropdownId === assignment._id ? null : assignment._id
                        );
                      }}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Popover Action Menu */}
                    {activeDropdownId === assignment._id && (
                      <div
                        ref={dropdownRef}
                        className="absolute right-0 mt-2 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-30 py-1.5 animate-fade-in"
                      >
                        <button
                          onClick={() => {
                            setActiveDropdownId(null);
                            router.push(`/assignments/${assignment._id}`);
                          }}
                          className="w-full text-left px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                        >
                          View Assignment
                        </button>
                        <button
                          onClick={() => handleDelete(assignment._id)}
                          className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-50 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Removed desktop bottom duplicate Create button to eliminate duplicate creation actions on the dashboard, matching the primary-only design pattern */}
        </main>
      </div>

      {/* Inline animations styling helper */}
      <style jsx global>{`
        .transform {
          transition: transform 0.2s;
        }
        .active\\:scale-98:active {
          transform: scale(0.98);
        }
      `}</style>
    </div>
  );
}

// Chevron helper
function ChevronDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}
