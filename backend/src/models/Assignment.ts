import mongoose, { Schema, Document } from 'mongoose';

export interface IQuestion {
  type: 'mcq' | 'short' | 'diagram' | 'numerical';
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  marks: number;
  difficulty: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface IAssignment extends Document {
  title: string;
  subject: string;
  classLevel: string;
  schoolName: string;
  dueDate: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  imageUrl?: string;
  questions: IQuestion[];
  totalMarks: number;
  timeAllowed: number;
  createdAt: Date;
  updatedAt: Date;
}

const QuestionSchema = new Schema<IQuestion>({
  type: { type: String, enum: ['mcq', 'short', 'diagram', 'numerical'], required: true },
  questionText: { type: String, required: true },
  options: { type: [String], default: undefined },
  correctAnswer: { type: String },
  marks: { type: Number, required: true, default: 1 },
  difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true, default: 'medium' },
  explanation: { type: String }
});

const AssignmentSchema = new Schema<IAssignment>(
  {
    title: { type: String, required: true },
    subject: { type: String, required: true },
    classLevel: { type: String, required: true },
    schoolName: { type: String, required: true, default: 'Delhi Public School' },
    dueDate: { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending'
    },
    error: { type: String },
    imageUrl: { type: String },
    questions: { type: [QuestionSchema], default: [] },
    totalMarks: { type: Number, default: 0 },
    timeAllowed: { type: Number, default: 45 }
  },
  { timestamps: true }
);

export const Assignment = mongoose.model<IAssignment>('Assignment', AssignmentSchema);
