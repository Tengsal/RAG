import mongoose, { Schema, Document } from 'mongoose';

export interface IAdtuLead extends Document {
  callId: string;
  leadId?: string;
  leadName?: string;
  phone: string;
  email?: string;
  qualification?: string;
  interestedDegreeLevel?: 'UG' | 'PG' | 'Any';
  interestedCourse?: string;
  feeStructureInquired: boolean;
  eligibilityChecked: boolean;
  callbackTime?: string;
  transferRequested: boolean;
  transferredTo?: string;
  transferStatus?: 'completed' | 'failed' | 'not_requested';
  status: 'interested' | 'callback_requested' | 'transferred' | 'not_interested' | 'no_answer' | 'failed' | 'completed';
  durationSeconds: number;
  fullTranscript: string;
  conversation: Array<{ role: 'user' | 'assistant' | 'system'; content: string }>;
  geminiSummary?: {
    summaryText: string;
    keyQualification?: string;
    coursesInquired?: string[];
    feesDiscussed?: string;
    callbackPreference?: string;
    sentiment?: 'enthusiastic' | 'interested' | 'neutral' | 'hesitant' | 'uninterested';
    actionItems?: string[];
  };
  pushedToSheets: boolean;
  sheetsRowIndex?: number;
  createdAt: Date;
  updatedAt: Date;
}

const AdtuLeadSchema = new Schema({
  callId: { type: String, required: true, unique: true, index: true },
  leadId: { type: String, default: null },
  leadName: { type: String, default: 'Prospect Student' },
  phone: { type: String, required: true, index: true },
  email: { type: String, default: '' },
  qualification: { type: String, default: '' },
  interestedDegreeLevel: { type: String, enum: ['UG', 'PG', 'Any'], default: 'Any' },
  interestedCourse: { type: String, default: '' },
  feeStructureInquired: { type: Boolean, default: false },
  eligibilityChecked: { type: Boolean, default: false },
  callbackTime: { type: String, default: '' },
  transferRequested: { type: Boolean, default: false },
  transferredTo: { type: String, default: '' },
  transferStatus: { type: String, enum: ['completed', 'failed', 'not_requested'], default: 'not_requested' },
  status: { 
    type: String, 
    enum: ['interested', 'callback_requested', 'transferred', 'not_interested', 'no_answer', 'failed', 'completed'],
    default: 'completed' 
  },
  durationSeconds: { type: Number, default: 0 },
  fullTranscript: { type: String, default: '' },
  conversation: [{ role: String, content: String }],
  geminiSummary: {
    summaryText: { type: String, default: '' },
    keyQualification: { type: String, default: '' },
    coursesInquired: [{ type: String }],
    feesDiscussed: { type: String, default: '' },
    callbackPreference: { type: String, default: '' },
    sentiment: { type: String, default: 'interested' },
    actionItems: [{ type: String }],
  },
  pushedToSheets: { type: Boolean, default: false },
  sheetsRowIndex: { type: Number, default: null },
}, { timestamps: true });

AdtuLeadSchema.index({ phone: 1 });
AdtuLeadSchema.index({ status: 1 });
AdtuLeadSchema.index({ createdAt: -1 });

export const AdtuLead = mongoose.model<IAdtuLead>('AdtuLead', AdtuLeadSchema);
