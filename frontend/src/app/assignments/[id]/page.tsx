'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAssignmentStore, IAssignment, IQuestion } from '@/store/useAssignmentStore';
import { Sidebar } from '@/components/Sidebar';
import { MobileNavbar } from '@/components/MobileNavbar';
import { getSocket, joinAssignmentRoom } from '@/utils/socket';
import {
  Download,
  RotateCw,
  Eye,
  EyeOff,
  Sparkles,
  ArrowLeft,
  Calendar,
  Clock,
  BookOpen
} from 'lucide-react';

export default function AssignmentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const assignmentId = params.id as string;

  const {
    currentAssignment,
    fetchAssignmentById,
    regenerateAssignment,
    generatingStatus,
    generatingProgress,
    generatingMessage,
    setGeneratingProgress,
    resetGenerating,
    setCurrentAssignment
  } = useAssignmentStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const worksheetRef = useRef<HTMLDivElement | null>(null);

  // 1. Fetch worksheet on mount
  useEffect(() => {
    if (assignmentId) {
      fetchAssignmentById(assignmentId);
    }
  }, [assignmentId, fetchAssignmentById]);

  // 2. Setup Socket.io for regeneration updates
  useEffect(() => {
    const isGenerating = generatingStatus === 'pending' || generatingStatus === 'processing';
    if (assignmentId && isGenerating) {
      joinAssignmentRoom(assignmentId);
      
      const socket = getSocket();
      socket.on('assignment-progress', (payload: any) => {
        console.log('📡 Details Socket Progress:', payload);
        
        setGeneratingProgress(payload.status, payload.progress, payload.message || '');
        
        if (payload.status === 'completed' && payload.data) {
          setCurrentAssignment(payload.data);
          setTimeout(() => {
            resetGenerating();
          }, 800);
        }
      });

      return () => {
        socket.off('assignment-progress');
      };
    }
  }, [assignmentId, generatingStatus, setGeneratingProgress, setCurrentAssignment, resetGenerating]);

  // 3. Polling fallback to reconcile state if socket events are missed during regeneration
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const isGenerating = generatingStatus === 'pending' || generatingStatus === 'processing';
    
    if (assignmentId && isGenerating) {
      intervalId = setInterval(async () => {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
          const res = await fetch(`${apiBase}/api/assignments/${assignmentId}`);
          if (res.ok) {
            const data = await res.json();
            console.log('📡 Details Polling Reconciler checked status:', data.status);
            
            if (data.status === 'completed') {
              setGeneratingProgress('completed', 100, 'Worksheet completed!');
              setCurrentAssignment(data);
              
              if (intervalId) clearInterval(intervalId);
              
              setTimeout(() => {
                resetGenerating();
              }, 800);
            } else if (data.status === 'failed') {
              setGeneratingProgress('failed', 100, data.error || 'AI generation failed');
              if (intervalId) clearInterval(intervalId);
            } else {
              // Reconcile status and progress locally
              const progressMap = {
                'pending': 10,
                'processing': 50,
                'completed': 100,
                'failed': 100
              };
              const mappedProgress = progressMap[data.status as keyof typeof progressMap] || 20;
              // Only update if the parsed status progress is ahead
              if (mappedProgress > generatingProgress) {
                setGeneratingProgress(data.status, mappedProgress, 'Regenerating question paper in progress...');
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Details Polling reconciliation failed:', err);
        }
      }, 1500); // Check every 1.5 seconds
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [assignmentId, generatingStatus, generatingProgress, setGeneratingProgress, setCurrentAssignment, resetGenerating]);

  if (!currentAssignment) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f3f4f6]">
        <div className="flex flex-col items-center">
          <div className="w-10 h-10 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
          <p className="text-gray-500 font-bold text-sm">Loading worksheet details...</p>
        </div>
      </div>
    );
  }

  const handleDownloadPDF = async () => {
    if (!worksheetRef.current) return;

    let restoreStylesheets: (() => void) | null = null;
    try {
      setIsPrinting(true);
      // Wait for React to re-render the DOM without screen-only items
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Intercept window.getComputedStyle to sanitize modern colors for html2canvas
      const originalGetComputedStyle = window.getComputedStyle;
      window.getComputedStyle = function (el, pseudoElt) {
        const style = originalGetComputedStyle(el, pseudoElt);
        
        const sanitizeColorStr = (val: string) => {
          if (!val || typeof val !== 'string') return val;
          if (val.includes('oklch') || val.includes('oklab') || val.includes('lab') || val.includes('lch')) {
            return val
              .replace(/oklch\([^)]+\)/g, 'rgb(0, 0, 0)')
              .replace(/oklab\([^)]+\)/g, 'rgb(0, 0, 0)')
              .replace(/lab\([^)]+\)/g, 'rgb(0, 0, 0)')
              .replace(/lch\([^)]+\)/g, 'rgb(0, 0, 0)');
          }
          return val;
        };

        return new Proxy(style, {
          get(target, prop) {
            if (prop === 'getPropertyValue') {
              return function (propertyName: string) {
                const value = target.getPropertyValue(propertyName);
                return sanitizeColorStr(value);
              };
            }
            const value = Reflect.get(target, prop);
            if (typeof value === 'function') {
              return value.bind(target);
            }
            if (typeof value === 'string') {
              return sanitizeColorStr(value);
            }
            return value;
          }
        });
      };

      restoreStylesheets = () => {
        window.getComputedStyle = originalGetComputedStyle;
      };

      // Import html2pdf dynamically in browser
      const html2pdf = (await import('html2pdf.js')).default;
      
      const element = worksheetRef.current;
      const opt = {
        margin: [10, 10, 15, 10] as [number, number, number, number], // standard printed A4 margins
        filename: `${currentAssignment.title.replace(/\s+/g, '_')}_worksheet.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };

      // Add temporary printing class
      element.classList.add('print-sheet');
      
      await html2pdf().from(element).set(opt as any).save();
      
      element.classList.remove('print-sheet');
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to generate PDF. Using standard print fallback instead.');
      window.print();
    } finally {
      if (restoreStylesheets) {
        restoreStylesheets();
      }
      setIsPrinting(false);
    }
  };

  const handleRegenerate = async () => {
    const confirmed = window.confirm('Are you sure you want to regenerate this worksheet using AI? This will replace existing questions.');
    if (confirmed) {
      await regenerateAssignment(currentAssignment._id);
    }
  };

  const getDifficultyBadge = (difficulty: IQuestion['difficulty']) => {
    switch (difficulty) {
      case 'easy':
        return (
          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Easy
          </span>
        );
      case 'hard':
        return (
          <span className="text-[10px] font-black text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Hard
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-black text-amber-600 bg-amber-50 border border-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Medium
          </span>
        );
    }
  };

  // Group questions by Section (mcq in Section A, all written types in Section B)
  const mcqs = currentAssignment.questions.filter((q) => q.type === 'mcq');
  const shorts = currentAssignment.questions.filter((q) => q.type !== 'mcq');

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      {/* Desktop Sidebar */}
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8 no-print">
        {/* Mobile Header */}
        <MobileNavbar onMenuToggle={() => setMobileMenuOpen(true)} />

        {/* Desktop Floating Header */}
        <header className="hidden lg:flex items-center justify-between px-8 py-4 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-gray-100 sticky top-4 z-20 mx-6 my-4">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-bold">
            <button
              onClick={() => router.push('/assignments')}
              className="p-1 hover:bg-gray-100 rounded-lg text-gray-700 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Assignments</span>
            </button>
          </div>

          <div className="flex items-center gap-6">
            <div className="w-9 h-9 bg-orange-50 border border-orange-100 rounded-full overflow-hidden flex items-center justify-center shadow-inner shrink-0">
              <img src="/Avatar.svg" alt="Avatar" className="w-full h-full object-cover rounded-full" />
            </div>
            <span className="text-sm font-black text-gray-800">Delhi Public School</span>
          </div>
        </header>

        {/* Details Wrapper */}
        <main className="flex-1 p-4 lg:p-10 max-w-5xl mx-auto w-full flex flex-col gap-6">
          {/* 1. Header Action bar wrapper (Screenshot 8 style) */}
          <div className="bg-zinc-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="flex flex-col gap-1.5 max-w-xl z-10">
              <span className="text-[10px] font-black text-orange-400 tracking-wider uppercase">Generated Worksheet Review</span>
              <p className="text-sm lg:text-base font-semibold leading-relaxed text-gray-250">
                Certainly! Here is your customized Question Paper for <span className="text-orange-400 font-bold">{currentAssignment.schoolName}</span>, Grade {currentAssignment.classLevel} {currentAssignment.subject} class:
              </p>
            </div>

            {/* Quick Actions Panel */}
            <div className="flex items-center gap-3 w-full md:w-auto z-10 shrink-0">
              {/* PDF button */}
              <button
                onClick={handleDownloadPDF}
                className="flex-1 md:flex-initial flex items-center justify-center gap-2 py-3 px-5 bg-white hover:bg-gray-100 text-zinc-950 font-bold rounded-full text-xs transition-all shadow-md active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-zinc-800 shrink-0" />
                <span>Download as PDF</span>
              </button>

              {/* Regenerate Action button */}
              <button
                onClick={handleRegenerate}
                className="flex items-center justify-center p-3 bg-zinc-850 hover:bg-zinc-800 text-orange-400 hover:text-white rounded-full transition-colors shadow-inner border border-zinc-800"
                title="Regenerate assignment using AI"
              >
                <RotateCw className="w-4.5 h-4.5" />
              </button>

              {/* Toggle Answer Key button */}
              <button
                onClick={() => setShowAnswerKey(!showAnswerKey)}
                className={`flex items-center justify-center p-3 rounded-full transition-colors border shadow-inner ${
                  showAnswerKey
                    ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                    : 'bg-zinc-850 hover:bg-zinc-800 text-gray-400 hover:text-white border-zinc-800'
                }`}
                title={showAnswerKey ? 'Hide Answer Key' : 'Show Answer Key'}
              >
                {showAnswerKey ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
              </button>
            </div>
            
            {/* Background design elements */}
            <div className="absolute right-0 bottom-0 w-64 h-64 bg-gradient-to-tr from-orange-500/10 to-red-500/5 rounded-full blur-2xl -z-1"></div>
          </div>

          {/* 2. Document Paper Sheet Wrapper (Optimized for both screen view and PDF print) */}
          <div
            ref={worksheetRef}
            className="bg-white rounded-3xl border border-gray-150 p-6 lg:p-14 shadow-sm min-h-[1056px] relative text-gray-800 font-serif leading-relaxed animate-fade-in flex flex-col justify-between"
          >
            {/* A4 Content Wrapper */}
            <div>
              {/* Board Paper Header (Centered) */}
              <div className="text-center mb-8 border-b-2 border-zinc-900 pb-5">
                <h2 className="text-xl lg:text-2xl font-black text-zinc-900 tracking-tight uppercase font-sans mb-1">
                  {currentAssignment.schoolName}
                </h2>
                <h3 className="text-sm lg:text-base font-bold text-zinc-700 tracking-wide font-sans mb-1">
                  Subject: {currentAssignment.subject}
                </h3>
                <h4 className="text-sm font-bold text-zinc-500 tracking-wide font-sans">
                  Class: {currentAssignment.classLevel}
                </h4>
              </div>

              {/* Exam Instructions Meta Row (Standard Table - 100% immune to float overlaps) */}
              <table className="w-full mb-6 font-sans text-xs lg:text-sm font-bold text-zinc-800 pb-2" style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <td className="py-2 text-left border-none whitespace-nowrap" style={{ width: '50%' }}>Time Allowed: {currentAssignment.timeAllowed || 45} minutes</td>
                    <td className="py-2 text-right border-none whitespace-nowrap" style={{ width: '50%' }}>Maximum Marks: {currentAssignment.totalMarks}</td>
                  </tr>
                </tbody>
              </table>

              <div className="text-xs lg:text-sm font-bold text-zinc-700 italic border-l-4 border-zinc-500 pl-3.5 mb-8 font-sans">
                All questions are compulsory unless stated otherwise.
              </div>

              {/* Name/Roll Student input fields (Standard Table with whitespace-nowrap to prevent label wrapping) */}
              <table className="w-full max-w-md mb-8 font-sans text-xs lg:text-sm font-semibold text-zinc-700 border-collapse border-none">
                <tbody>
                  <tr>
                    <td className="py-2.5 pr-4 font-bold border-none text-left align-middle whitespace-nowrap" style={{ width: '1%' }}>Name:</td>
                    <td className="py-2.5 border-b border-zinc-400 border-t-none border-l-none border-r-none w-full">&nbsp;</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-bold border-none text-left align-middle whitespace-nowrap" style={{ width: '1%' }}>Roll Number:</td>
                    <td className="py-2.5 border-b border-zinc-400 border-t-none border-l-none border-r-none w-full">&nbsp;</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 pr-4 font-bold border-none text-left align-middle whitespace-nowrap" style={{ width: '1%' }}>Class / Section:</td>
                    <td className="py-2.5 border-b border-zinc-400 border-t-none border-l-none border-r-none w-full">&nbsp;</td>
                  </tr>
                </tbody>
              </table>

              {/* QUESTIONS LIST SECTIONS */}
              
              {/* SECTION A: MCQS */}
              {mcqs.length > 0 && (
                <div className="mb-10">
                  <div className="text-center font-bold text-base text-zinc-900 uppercase tracking-widest mb-6 font-sans">
                    Section A
                  </div>
                  <h4 className="text-sm font-black text-zinc-900 tracking-wider mb-2 font-sans">
                    Multiple Choice Questions
                  </h4>
                  <p className="text-xs text-zinc-500 italic mb-5 font-sans">
                    Select the correct option. Each question carries {mcqs[0].marks} {mcqs[0].marks === 1 ? 'mark' : 'marks'}.
                  </p>

                  <div className="flex flex-col gap-6">
                    {mcqs.map((q, idx) => (
                      <div key={q._id || idx} className="avoid-break flex flex-col gap-2.5">
                        {/* Question Text with Figma Bracketed Difficulty Prefix */}
                        <div className="flex items-start justify-between gap-4 font-sans text-sm font-bold text-zinc-900">
                          <div className="flex gap-2">
                            <span>Q{idx + 1}.</span>
                            <span className="leading-relaxed">
                              <span className="font-sans font-bold text-zinc-500 mr-1.5 uppercase tracking-wide text-xs">
                                {q.difficulty === 'easy' ? '[Easy]' : q.difficulty === 'hard' ? '[Challenging]' : '[Moderate]'}
                              </span>
                              {q.questionText}
                            </span>
                          </div>
                          
                          {/* Difficulty badge (hidden in print) */}
                          {!isPrinting && (
                            <div className="no-print shrink-0 mt-0.5">
                              {getDifficultyBadge(q.difficulty)}
                            </div>
                          )}
                        </div>

                        {/* Options Grid */}
                        {q.options && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-7 font-sans text-sm text-zinc-700 font-medium">
                            {q.options.map((opt, oIdx) => {
                              const optionLetters = ['A', 'B', 'C', 'D'];
                              return (
                                <div
                                  key={oIdx}
                                  className="flex items-start gap-2.5 py-1 px-2 border border-transparent"
                                >
                                  <span className="font-bold text-zinc-400">{optionLetters[oIdx]}.</span>
                                  <span>{opt}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION B: SHORT / DYNAMIC ANSWER QUESTIONS (Diagram and Numerical included) */}
              {shorts.length > 0 && (
                <div className="mb-8">
                  <div className="text-center font-bold text-base text-zinc-900 uppercase tracking-widest mb-6 font-sans">
                    Section B
                  </div>
                  <h4 className="text-sm font-black text-zinc-900 tracking-wider mb-2 font-sans">
                    Written & Applied Questions
                  </h4>
                  <p className="text-xs text-zinc-500 italic mb-5 font-sans">
                    Attempt all questions. Marks are indicated next to each question.
                  </p>

                  <div className="flex flex-col gap-8">
                    {shorts.map((q, idx) => (
                      <div key={q._id || idx} className="avoid-break flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4 font-sans text-sm font-bold text-zinc-900">
                          <div className="flex gap-2">
                            <span>Q{mcqs.length + idx + 1}.</span>
                            <span className="leading-relaxed">
                              <span className="font-sans font-bold text-zinc-500 mr-1.5 uppercase tracking-wide text-xs">
                                {q.difficulty === 'easy' ? '[Easy]' : q.difficulty === 'hard' ? '[Challenging]' : '[Moderate]'}
                              </span>
                              <span className="no-print font-sans font-bold text-zinc-550 uppercase tracking-wider text-[10px] bg-zinc-50 border border-zinc-200 px-1.5 py-0.5 rounded-md mr-1.5">
                                {q.type === 'short' ? 'Short Q' : q.type === 'diagram' ? 'Diagram Q' : 'Numerical'}
                              </span>
                              {q.questionText}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-2.5 shrink-0 mt-0.5">
                            <span className="text-[11px] font-bold text-zinc-400">[{q.marks} {q.marks === 1 ? 'Mark' : 'Marks'}]</span>
                            {/* Difficulty badge */}
                            {!isPrinting && (
                              <div className="no-print">
                                {getDifficultyBadge(q.difficulty)}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Blank lines for answering (like standard board paper) */}
                        <div className="flex flex-col gap-3.5 pl-7 mt-2 font-sans opacity-45">
                          <div className="border-b border-zinc-300 h-4"></div>
                          <div className="border-b border-zinc-300 h-4"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* End of Question Paper Indicator */}
              <div className="text-center font-bold text-sm text-zinc-950 font-sans tracking-wider mt-12 mb-8 uppercase italic border-t border-b border-zinc-100 py-3">
                End of Question Paper
              </div>

              {/* Toggleable Answer Key Section */}
              {showAnswerKey && (
                <div className="mt-10 pt-10 border-t-2 border-dashed border-zinc-300 font-sans text-sm text-zinc-900 animate-fade-in break-before-page">
                  <h3 className="text-lg font-black text-zinc-950 tracking-tight mb-6 uppercase">
                    Answer Key & Explanations:
                  </h3>
                  
                  <div className="flex flex-col gap-6">
                    {/* MCQs Answers */}
                    {mcqs.length > 0 && (
                      <div className="flex flex-col gap-4">
                        <h4 className="text-xs font-black text-zinc-400 tracking-widest uppercase">
                          Section A Answers
                        </h4>
                        <div className="flex flex-col gap-3">
                          {mcqs.map((q, idx) => (
                            <div key={q._id || idx} className="flex flex-col gap-1 pl-4 border-l-2 border-orange-500/30">
                              <span className="font-bold">
                                Q{idx + 1}. Correct Option: {q.correctAnswer || 'A'}
                              </span>
                              {q.explanation && (
                                <p className="text-zinc-650 text-xs italic mt-0.5 font-sans leading-relaxed">
                                  Explanation: {q.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Short & Written Answers */}
                    {shorts.length > 0 && (
                      <div className="flex flex-col gap-4 mt-4">
                        <h4 className="text-xs font-black text-zinc-400 tracking-widest uppercase">
                          Section B Answers
                        </h4>
                        <div className="flex flex-col gap-3">
                          {shorts.map((q, idx) => (
                            <div key={q._id || idx} className="flex flex-col gap-1.5 pl-4 border-l-2 border-orange-500/30">
                              <span className="font-bold">
                                Q{mcqs.length + idx + 1}. Proposed Model Answer:
                              </span>
                              <p className="text-zinc-800 text-sm leading-relaxed">
                                {q.correctAnswer || q.explanation || 'Refer to classroom materials for details.'}
                              </p>
                              {q.correctAnswer && q.explanation && (
                                <p className="text-zinc-650 text-xs italic mt-0.5 font-sans leading-relaxed">
                                  Explanation: {q.explanation}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Premium sheet footer indicator */}
            <div className="border-t border-gray-150 pt-4 mt-8 flex items-center justify-between text-[10px] font-bold text-zinc-400 tracking-widest uppercase font-sans no-print">
              <span>VedaAI Worksheet Generator</span>
              <span>Page 1 of 1</span>
            </div>
          </div>
        </main>
      </div>

      {/* ================= RE-GENERATING WEB-SOCKETS OVERLAY ================= */}
      {generatingStatus && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/85 backdrop-blur-md p-6 text-white animate-fade-in">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            {/* Spinning load container */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-orange-500/25 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
              <Sparkles className="w-10 h-10 text-orange-400 animate-pulse" />
            </div>

            <h3 className="text-xl lg:text-2xl font-black tracking-tight mb-2">
              {generatingProgress === 100 ? 'Worksheet Completed!' : 'Regenerating with AI...'}
            </h3>
            <p className="text-sm text-orange-400 font-semibold tracking-wide uppercase mb-6 animate-pulse">
              {generatingMessage}
            </p>

            <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner relative mb-3">
              <div
                className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-500"
                style={{ width: `${generatingProgress}%` }}
              ></div>
            </div>
            
            <span className="text-xs font-black text-gray-500 tracking-wider">
              {generatingProgress}% COMPLETE
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
