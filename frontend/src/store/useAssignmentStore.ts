import { create } from 'zustand';

export interface IQuestion {
  _id?: string;
  type: 'mcq' | 'short' | 'diagram' | 'numerical';
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface IAssignment {
  _id: string;
  title: string;
  subject: string;
  classLevel: string;
  schoolName: string;
  dueDate: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  imageUrl?: string;
  questions: IQuestion[];
  totalMarks: number;
  timeAllowed: number;
  createdAt: string;
  updatedAt: string;
}

interface AssignmentStore {
  assignments: IAssignment[];
  loading: boolean;
  error: string | null;
  currentAssignment: IAssignment | null;
  
  // Real-time generation states
  generatingStatus: 'pending' | 'processing' | 'completed' | 'failed' | null;
  generatingProgress: number;
  generatingMessage: string;

  fetchAssignments: (search?: string, status?: string) => Promise<void>;
  fetchAssignmentById: (id: string) => Promise<IAssignment | null>;
  createAssignment: (formData: FormData) => Promise<IAssignment | null>;
  deleteAssignment: (id: string) => Promise<boolean>;
  regenerateAssignment: (id: string, questionConfigs?: any) => Promise<IAssignment | null>;
  
  // Actions to mutate generation states locally from sockets
  setGeneratingProgress: (status: 'pending' | 'processing' | 'completed' | 'failed', progress: number, message: string) => void;
  setCurrentAssignment: (assignment: IAssignment | null) => void;
  resetGenerating: () => void;
}

const API_BASE_URL = 'http://localhost:5001/api/assignments';

export const useAssignmentStore = create<AssignmentStore>((set, get) => ({
  assignments: [],
  loading: false,
  error: null,
  currentAssignment: null,

  generatingStatus: null,
  generatingProgress: 0,
  generatingMessage: '',

  fetchAssignments: async (search, status) => {
    set({ loading: true, error: null });
    try {
      let url = API_BASE_URL;
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (status) params.append('status', status);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch assignments.');
      const data = await res.json();
      set({ assignments: data, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch assignments', loading: false });
    }
  },

  fetchAssignmentById: async (id) => {
    set({ loading: true, error: null });
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`);
      if (!res.ok) throw new Error('Failed to fetch assignment details.');
      const data = await res.json();
      set({ currentAssignment: data, loading: false });
      return data;
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch assignment', loading: false });
      return null;
    }
  },

  createAssignment: async (formData) => {
    set({
      loading: true,
      error: null,
      generatingStatus: 'pending',
      generatingProgress: 5,
      generatingMessage: 'Uploading files and submitting assignment details...'
    });
    try {
      const res = await fetch(API_BASE_URL, {
        method: 'POST',
        body: formData
      });
      if (!res.ok) throw new Error('Failed to create assignment.');
      const data = await res.json();
      
      // Update local lists and set current
      set((state) => ({
        assignments: [data, ...state.assignments],
        currentAssignment: data,
        loading: false
      }));
      return data;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to create assignment',
        loading: false,
        generatingStatus: 'failed',
        generatingMessage: err.message || 'Upload failed'
      });
      return null;
    }
  },

  deleteAssignment: async (id) => {
    try {
      const res = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete assignment.');
      
      set((state) => ({
        assignments: state.assignments.filter((a) => a._id !== id),
        currentAssignment: state.currentAssignment?._id === id ? null : state.currentAssignment
      }));
      return true;
    } catch (err: any) {
      console.error('Delete assignment error:', err);
      return false;
    }
  },

  regenerateAssignment: async (id, questionConfigs) => {
    set({
      generatingStatus: 'pending',
      generatingProgress: 10,
      generatingMessage: 'Initializing AI regeneration job...'
    });
    try {
      const res = await fetch(`${API_BASE_URL}/${id}/regenerate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ questionConfigs })
      });
      if (!res.ok) throw new Error('Failed to trigger AI regeneration.');
      const data = await res.json();
      
      set({ currentAssignment: data });
      return data;
    } catch (err: any) {
      set({
        error: err.message || 'Failed to regenerate assignment',
        generatingStatus: 'failed',
        generatingMessage: err.message || 'Regeneration failed'
      });
      return null;
    }
  },

  setGeneratingProgress: (status, progress, message) => {
    set({
      generatingStatus: status,
      generatingProgress: progress,
      generatingMessage: message
    });
  },

  setCurrentAssignment: (assignment) => {
    set({ currentAssignment: assignment });
  },

  resetGenerating: () => {
    set({
      generatingStatus: null,
      generatingProgress: 0,
      generatingMessage: ''
    });
  }
}));
