'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAssignmentStore } from '@/store/useAssignmentStore';
import { Sidebar } from '@/components/Sidebar';
import { MobileNavbar } from '@/components/MobileNavbar';
import { getSocket, joinAssignmentRoom } from '@/utils/socket';
import {
  Upload,
  Calendar,
  X,
  Plus,
  Minus,
  Sparkles,
  ArrowLeft,
  CheckCircle,
  FileText,
  AlertCircle
} from 'lucide-react';

interface IQuestionConfig {
  type: 'mcq' | 'short' | 'diagram' | 'numerical';
  count: number;
  marks: number;
}

export default function CreateAssignmentPage() {
  const router = useRouter();
  const {
    createAssignment,
    generatingStatus,
    generatingProgress,
    generatingMessage,
    currentAssignment,
    setGeneratingProgress,
    resetGenerating,
    setCurrentAssignment
  } = useAssignmentStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Science');
  const [classLevel, setClassLevel] = useState('Grade 8');
  const [schoolName, setSchoolName] = useState('Delhi Public School, Sector-4, Bokaro');
  const [dueDate, setDueDate] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [additionalInfo, setAdditionalInfo] = useState('');

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Question configurations - pre-populated with exactly the 4 types from your Figma mockup
  const [questionConfigs, setQuestionConfigs] = useState<IQuestionConfig[]>([
    { type: 'mcq', count: 4, marks: 1 },
    { type: 'short', count: 3, marks: 2 },
    { type: 'diagram', count: 5, marks: 5 },
    { type: 'numerical', count: 5, marks: 5 }
  ]);

  // Clean up generation state on mount
  useEffect(() => {
    resetGenerating();
  }, [resetGenerating]);

  // Connect to Socket.io room when currentAssignment is created
  useEffect(() => {
    const isGenerating = generatingStatus === 'pending' || generatingStatus === 'processing';
    if (currentAssignment && currentAssignment._id && isGenerating) {
      const assignmentId = currentAssignment._id;
      
      // Join WebSocket room
      joinAssignmentRoom(assignmentId);
      
      const socket = getSocket();
      
      // Listen to progress updates
      socket.on('assignment-progress', (payload: any) => {
        console.log('📡 Received Socket Progress Event:', payload);
        
        setGeneratingProgress(payload.status, payload.progress, payload.message || '');
        
        if (payload.status === 'completed' && payload.data) {
          setCurrentAssignment(payload.data);
          
          setTimeout(() => {
            router.push(`/assignments/${assignmentId}`);
            resetGenerating();
          }, 800);
        }
      });

      return () => {
        socket.off('assignment-progress');
      };
    }
  }, [currentAssignment, generatingStatus, setGeneratingProgress, setCurrentAssignment, resetGenerating, router]);

  // Polling fallback to reconcile state if socket events are missed or during race conditions
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    const isGenerating = generatingStatus === 'pending' || generatingStatus === 'processing';
    
    if (currentAssignment && currentAssignment._id && isGenerating) {
      const assignmentId = currentAssignment._id;
      
      intervalId = setInterval(async () => {
        try {
          const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001';
          const res = await fetch(`${apiBase}/api/assignments/${assignmentId}`);
          if (res.ok) {
            const data = await res.json();
            console.log('📡 Polling Reconciler checked status:', data.status);
            
            if (data.status === 'completed') {
              setGeneratingProgress('completed', 100, 'Worksheet completed!');
              setCurrentAssignment(data);
              
              if (intervalId) clearInterval(intervalId);
              
              setTimeout(() => {
                router.push(`/assignments/${assignmentId}`);
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
                setGeneratingProgress(data.status, mappedProgress, 'Generating question paper in progress...');
              }
            }
          }
        } catch (err) {
          console.warn('⚠️ Polling reconciliation failed:', err);
        }
      }, 1500); // Check every 1.5 seconds for instant response!
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [currentAssignment, generatingStatus, generatingProgress, setGeneratingProgress, setCurrentAssignment, resetGenerating, router]);

  // Drag and drop handers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.match('image.*')) {
        setFile(droppedFile);
      } else {
        alert('Only image files (JPEG, PNG) are supported.');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  // Adjust config counts
  const updateCount = (index: number, increment: boolean) => {
    setQuestionConfigs((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          const newCount = increment ? c.count + 1 : Math.max(1, c.count - 1);
          return { ...c, count: newCount };
        }
        return c;
      })
    );
  };

  const updateMarks = (index: number, increment: boolean) => {
    setQuestionConfigs((prev) =>
      prev.map((c, i) => {
        if (i === index) {
          const newMarks = increment ? c.marks + 1 : Math.max(1, c.marks - 1);
          return { ...c, marks: newMarks };
        }
        return c;
      })
    );
  };

  const deleteConfig = (index: number) => {
    if (questionConfigs.length === 1) {
      alert('Must have at least one question type!');
      return;
    }
    setQuestionConfigs(questionConfigs.filter((_, i) => i !== index));
  };

  const addConfigRow = () => {
    const activeTypes = questionConfigs.map((c) => c.type);
    if (!activeTypes.includes('mcq')) {
      setQuestionConfigs([...questionConfigs, { type: 'mcq', count: 5, marks: 1 }]);
    } else if (!activeTypes.includes('short')) {
      setQuestionConfigs([...questionConfigs, { type: 'short', count: 3, marks: 2 }]);
    } else if (!activeTypes.includes('diagram')) {
      setQuestionConfigs([...questionConfigs, { type: 'diagram', count: 5, marks: 5 }]);
    } else if (!activeTypes.includes('numerical')) {
      setQuestionConfigs([...questionConfigs, { type: 'numerical', count: 5, marks: 5 }]);
    } else {
      alert('All question types are already configured.');
    }
  };

  // Sum total calculations dynamically (Figma mock requirement)
  const totalQuestions = questionConfigs.reduce((sum, c) => sum + c.count, 0);
  const totalMarks = questionConfigs.reduce((sum, c) => sum + c.count * c.marks, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !dueDate) {
      alert('Please enter a Title and select a Due Date.');
      return;
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('subject', subject);
    formData.append('classLevel', classLevel);
    formData.append('schoolName', schoolName);
    formData.append('dueDate', dueDate);
    formData.append('questionConfigs', JSON.stringify(questionConfigs));
    if (additionalInfo) {
      formData.append('additionalInfo', additionalInfo);
    }
    if (file) {
      formData.append('document', file);
    }

    // Trigger API Creation
    await createAssignment(formData);
  };

  return (
    <div className="flex min-h-screen bg-[#f3f4f6] relative">
      {/* Desktop Sidebar */}
      <Sidebar mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-24 lg:pb-8">
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

        {/* Form Body */}
        <main className="flex-1 p-6 lg:p-10 max-w-4xl mx-auto w-full">
          {/* Title Header */}
          <div className="flex items-center gap-3.5 mb-6">
            <span className="w-3.5 h-3.5 bg-emerald-500 rounded-full shadow-md"></span>
            <div className="flex flex-col">
              <h1 className="text-2xl lg:text-3xl font-black text-gray-800 tracking-tight">Create Assignment</h1>
              <p className="text-sm text-gray-500 font-medium">Set up a new assignment for your students</p>
            </div>
          </div>
          <div className="flex w-full h-1.5 bg-gray-200 rounded-full overflow-hidden mb-8 shadow-inner">
            <div className={`w-1/3 h-full transition-all duration-300 ${currentStep >= 1 ? 'bg-zinc-900' : 'bg-gray-200'}`}></div>
            <div className={`w-1/3 h-full transition-all duration-300 ${currentStep >= 2 ? 'bg-zinc-900' : 'bg-gray-200'}`}></div>
            <div className={`w-1/3 h-full transition-all duration-300 ${currentStep >= 3 ? 'bg-zinc-900' : 'bg-gray-200'}`}></div>
          </div>

          {/* Form wrapper */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            {/* White Form Card Container */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-100/70 p-6 lg:p-10 flex flex-col gap-8 animate-fade-in">
              {/* STEP 1: BASIC DETAILS */}
              {currentStep === 1 && (
                <div className="animate-fade-in flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg lg:text-xl font-black text-gray-805 tracking-tight mb-1">Step 1: Basic Information</h2>
                    <p className="text-xs text-gray-400 font-semibold mb-6">Enter general details for the printed exam worksheet header</p>
                  </div>

                  {/* Text Fields Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">Assignment Title</label>
                      <input
                        type="text"
                        required
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Quiz on Electricity"
                        className="w-full bg-gray-50/55 border border-gray-200 py-3.5 px-4 rounded-xl font-semibold text-sm text-gray-850 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">Subject</label>
                      <input
                        type="text"
                        required
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        placeholder="e.g. Science"
                        className="w-full bg-gray-50/55 border border-gray-200 py-3.5 px-4 rounded-xl font-semibold text-sm text-gray-850 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">Class / Grade Level</label>
                      <input
                        type="text"
                        required
                        value={classLevel}
                        onChange={(e) => setClassLevel(e.target.value)}
                        placeholder="e.g. Grade 8"
                        className="w-full bg-gray-50/55 border border-gray-200 py-3.5 px-4 rounded-xl font-semibold text-sm text-gray-850 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">School Header</label>
                      <input
                        type="text"
                        value={schoolName}
                        onChange={(e) => setSchoolName(e.target.value)}
                        placeholder="e.g. Delhi Public School"
                        className="w-full bg-gray-50/55 border border-gray-200 py-3.5 px-4 rounded-xl font-semibold text-sm text-gray-850 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-inner"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 2: WORKSHEET OPTIONS */}
              {currentStep === 2 && (
                <div className="animate-fade-in flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg lg:text-xl font-black text-gray-855 tracking-tight mb-1">Step 2: Worksheet Specifications</h2>
                    <p className="text-xs text-gray-400 font-semibold mb-6">Provide reference textbook images, due date, counts & markings</p>
                  </div>

                  {/* Due Date picker */}
                  <div className="relative">
                    <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">Due Date</label>
                    <div className="relative">
                      <input
                        type="date"
                        required
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-gray-50/55 border border-gray-200 py-3.5 px-4 rounded-xl font-semibold text-sm text-gray-850 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all pr-12 shadow-inner"
                      />
                      <Calendar className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Drag and Drop File Uploader Container */}
                  <div>
                    <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">Upload Reference Material</label>
                    <div
                      onDragEnter={handleDrag}
                      onDragOver={handleDrag}
                      onDragLeave={handleDrag}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={`w-full min-h-[160px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 cursor-pointer transition-all duration-300 ${
                        dragActive
                          ? 'border-orange-500 bg-orange-50/30'
                          : file
                          ? 'border-emerald-500 bg-emerald-50/10'
                          : 'border-gray-200 hover:border-orange-500 hover:bg-gray-50/30'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                      />

                      {file ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 shadow-sm border border-emerald-200">
                            <span className="text-xl font-bold">✓</span>
                          </div>
                          <span className="text-sm font-bold text-gray-800 truncate max-w-xs">{file.name}</span>
                          <span className="text-xs text-gray-400">{(file.size / 1024 / 1024).toFixed(2)} MB • Selected</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFile(null);
                            }}
                            className="mt-2 text-xs font-bold text-red-500 hover:underline"
                          >
                            Remove file
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-gray-50 border border-gray-150 rounded-full flex items-center justify-center text-gray-400">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-gray-850">Choose a file or drag & drop it here</span>
                            <span className="text-xs text-gray-400 mt-1">JPEG, PNG, upto 10MB</span>
                          </div>
                          <button
                            type="button"
                            className="mt-2 py-2 px-4 bg-gray-50 border border-gray-200 hover:bg-gray-100 rounded-xl font-bold text-xs text-gray-700 transition-colors"
                          >
                            Browse Files
                          </button>
                        </div>
                      )}
                    </div>
                    <span className="block text-[11px] font-bold text-gray-400 text-center mt-2.5">
                      Upload images of textbook chapters, notes or handwritten syllabus
                    </span>
                  </div>

                  {/* Question Type specifications matrix */}
                  <div className="border-t border-gray-100 pt-6">
                    <h3 className="text-xs font-black text-gray-400 tracking-wider uppercase mb-4">Question Configurations</h3>
                    
                    <div className="border border-gray-150 rounded-2xl overflow-hidden shadow-xs">
                      {/* Header columns */}
                      <div className="grid grid-cols-12 bg-gray-50/80 px-4 py-3.5 border-b border-gray-150 text-[11px] font-black text-gray-400 tracking-wider uppercase">
                        <div className="col-span-5 md:col-span-6">Question Type</div>
                        <div className="col-span-4 md:col-span-3 text-center">No. of Questions</div>
                        <div className="col-span-3 text-center">Marks</div>
                      </div>

                      {/* Body Rows */}
                      <div className="flex flex-col divide-y divide-gray-150">
                        {questionConfigs.map((config, index) => (
                          <div key={config.type} className="grid grid-cols-12 px-4 py-4 items-center gap-2">
                            {/* Name Dropdown */}
                            <div className="col-span-5 md:col-span-6 flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => deleteConfig(index)}
                                className="p-1 rounded-md text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                              >
                                <X className="w-4.5 h-4.5" />
                              </button>
                              <select
                                value={config.type}
                                onChange={(e) => {
                                  const newType = e.target.value as any;
                                  if (questionConfigs.some((c, idx) => c.type === newType && idx !== index)) {
                                    alert('This question type is already configured!');
                                    return;
                                  }
                                  setQuestionConfigs(
                                    questionConfigs.map((c, i) => (i === index ? { ...c, type: newType } : c))
                                  );
                                }}
                                className="bg-transparent font-bold text-gray-800 text-sm focus:outline-none border-b border-transparent hover:border-gray-300 py-0.5"
                              >
                                <option value="mcq">Multiple Choice Questions</option>
                                <option value="short">Short Questions</option>
                                <option value="diagram">Diagram/Graph-Based Questions</option>
                                <option value="numerical">Numerical Problems</option>
                              </select>
                            </div>

                            {/* Quantity counter */}
                            <div className="col-span-4 md:col-span-3 flex items-center justify-center gap-3.5">
                              <button
                                type="button"
                                onClick={() => updateCount(index, false)}
                                className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-gray-800 text-sm w-4 text-center">{config.count}</span>
                              <button
                                type="button"
                                onClick={() => updateCount(index, true)}
                                className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Marks counter */}
                            <div className="col-span-3 flex items-center justify-center gap-3.5">
                              <button
                                type="button"
                                onClick={() => updateMarks(index, false)}
                                className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="font-black text-gray-800 text-sm w-4 text-center">{config.marks}</span>
                              <button
                                type="button"
                                onClick={() => updateMarks(index, true)}
                                className="w-8 h-8 rounded-full border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-gray-500 active:scale-90 transition-transform"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Add config button */}
                    <div className="mt-4 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={addConfigRow}
                        className="flex items-center gap-2 text-xs font-black text-gray-800 hover:text-gray-900 transition-colors"
                      >
                        <div className="w-6 h-6 bg-zinc-950 text-white rounded-full flex items-center justify-center font-bold">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span>Add Question Type</span>
                      </button>

                      {/* Dynamic Totals box */}
                      <div className="flex flex-col items-end text-xs font-bold text-gray-600 gap-1 mt-1 pr-4 font-sans tracking-wide">
                        <div>Total Questions : <span className="font-black text-gray-800">{totalQuestions}</span></div>
                        <div>Total Marks : <span className="font-black text-gray-800">{totalMarks}</span></div>
                      </div>
                    </div>
                  </div>

                  {/* Additional Information dictation */}
                  <div className="border-t border-gray-100 pt-6 mt-4">
                    <label className="block text-xs font-black text-gray-400 tracking-wider uppercase mb-2.5">
                      Additional Information (For better output)
                    </label>
                    <div className="relative">
                      <textarea
                        value={additionalInfo}
                        onChange={(e) => setAdditionalInfo(e.target.value)}
                        placeholder="e.g Generate a question paper for 3 hour exam duration..."
                        className="w-full bg-gray-50/55 border border-dashed border-gray-200 py-3.5 px-4 pr-12 rounded-2xl font-semibold text-sm text-gray-850 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 min-h-[110px] transition-all leading-relaxed shadow-inner"
                      />
                      <div className="absolute right-4 bottom-4 text-gray-400 hover:text-gray-600 cursor-pointer transition-colors p-1" title="Voice Search / Dictation">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                          <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                          <line x1="12" x2="12" y1="19" y2="22"/>
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 3: REVIEW SUMMARY */}
              {currentStep === 3 && (
                <div className="animate-fade-in flex flex-col gap-6">
                  <div>
                    <h2 className="text-lg lg:text-xl font-black text-gray-805 tracking-tight mb-1">Step 3: Review Configurations</h2>
                    <p className="text-xs text-gray-400 font-semibold mb-6">Review your settings before sending them to Gemini visual worksheet engine</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-gray-50/60 p-6 rounded-2xl border border-gray-150">
                    <div className="flex flex-col gap-3 font-sans text-sm">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">General Headers</span>
                      <div className="text-gray-600">School: <span className="font-bold text-gray-850">{schoolName}</span></div>
                      <div className="text-gray-600">Title: <span className="font-bold text-gray-850">{title}</span></div>
                      <div className="text-gray-600">Subject: <span className="font-bold text-gray-850">{subject}</span></div>
                      <div className="text-gray-600">Grade: <span className="font-bold text-gray-850">{classLevel}</span></div>
                    </div>
                    
                    <div className="flex flex-col gap-3 font-sans text-sm">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Parameters & Syllabus</span>
                      <div className="text-gray-600">Due Date: <span className="font-bold text-gray-850">{dueDate}</span></div>
                      <div className="text-gray-600">Reference: <span className="font-bold text-gray-850">{file ? file.name : 'Standard Board Curriculums (No file)'}</span></div>
                      <div className="text-gray-600">Total Questions: <span className="font-bold text-gray-850">{totalQuestions}</span></div>
                      <div className="text-gray-600">Max Marks: <span className="font-bold text-gray-850">{totalMarks} Marks</span></div>
                    </div>
                  </div>

                  {additionalInfo && (
                    <div className="flex flex-col gap-2.5 bg-gray-50/60 p-6 rounded-2xl border border-gray-150 font-sans text-sm">
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Custom AI Instructions</span>
                      <p className="text-gray-750 italic leading-relaxed">"{additionalInfo}"</p>
                    </div>
                  )}

                  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-4 rounded-2xl text-emerald-800 text-xs font-semibold leading-relaxed">
                    <span className="text-xl">✨</span>
                    <span>Ready! The AI will formulate exactly {totalQuestions} curriculum aligned questions worth {totalMarks} marks based on your reference inputs.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions buttons placed OUTSIDE the card container (Figma layout requirement) */}
            <div className="flex items-center justify-between px-2 mt-4">
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                  } else {
                    router.push('/assignments');
                  }
                }}
                className="py-3.5 px-7 bg-white hover:bg-gray-50 border border-gray-200 text-gray-700 rounded-full font-bold text-sm tracking-wide transition-all shadow-sm active:scale-98"
              >
                ← Previous
              </button>
              
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1 && !title) {
                      alert('Please enter an Assignment Title.');
                      return;
                    }
                    if (currentStep === 2 && !dueDate) {
                      alert('Please select a Due Date.');
                      return;
                    }
                    setCurrentStep(currentStep + 1);
                  }}
                  className="flex items-center gap-1.5 py-3.5 px-7 bg-zinc-950 hover:bg-zinc-900 text-white font-black text-sm tracking-wide rounded-full shadow-md active:scale-98 transition-all hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 group font-bold"
                >
                  <span>Next →</span>
                </button>
              ) : (
                <button
                  type="submit"
                  className="flex items-center gap-2 py-3.5 px-7 bg-zinc-950 hover:bg-zinc-900 text-white font-black text-sm tracking-wide rounded-full shadow-md active:scale-98 transition-all hover:bg-gradient-to-r hover:from-orange-500 hover:to-red-600 group"
                >
                  <Sparkles className="w-4.5 h-4.5 text-orange-400 group-hover:text-white" />
                  <span>Generate Worksheet ✨</span>
                </button>
              )}
            </div>
          </form>
        </main>
      </div>

      {/* ================= REAL-TIME PROGRESS WEB-SOCKET GENERATING OVERLAY ================= */}
      {generatingStatus && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md p-6 animate-fade-in text-white">
          <div className="max-w-md w-full text-center flex flex-col items-center">
            {/* Spinning animated icon */}
            <div className="relative w-28 h-28 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 border-4 border-orange-500/25 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-t-orange-500 rounded-full animate-spin"></div>
              <Sparkles className="w-10 h-10 text-orange-400 animate-pulse" />
            </div>

            {/* Status Heading */}
            {generatingStatus === 'failed' ? (
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500 border border-red-500/20 mb-2">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-black text-red-400 tracking-tight">AI Generation Failed</h3>
                <p className="text-sm text-gray-400 max-w-sm mt-1">{generatingMessage || 'Please verify database or API credentials.'}</p>
                <button
                  type="button"
                  onClick={resetGenerating}
                  className="mt-6 py-2.5 px-6 bg-white hover:bg-gray-100 text-zinc-950 font-bold rounded-full text-sm"
                >
                  Go Back & Retry
                </button>
              </div>
            ) : (
              <>
                <h3 className="text-xl lg:text-2xl font-black tracking-tight mb-2">
                  {generatingProgress === 100 ? 'Worksheet Completed!' : 'Generating Worksheet...'}
                </h3>
                <p className="text-sm text-orange-400 font-semibold tracking-wide uppercase mb-6 animate-pulse">
                  {generatingMessage}
                </p>

                {/* Progress bar container */}
                <div className="w-full h-2.5 bg-zinc-800 rounded-full overflow-hidden shadow-inner relative mb-3">
                  <div
                    className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full transition-all duration-500 shadow"
                    style={{ width: `${generatingProgress}%` }}
                  ></div>
                </div>
                
                {/* Percentage */}
                <span className="text-xs font-black text-gray-500 tracking-wider">
                  {generatingProgress}% COMPLETE
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
