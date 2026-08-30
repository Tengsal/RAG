import mongoose, { Schema, Document } from 'mongoose';

export interface IAdtuCourse extends Document {
  courseCode: string;
  courseName: string;
  degreeLevel: 'UG' | 'PG' | 'Diploma' | 'Doctoral';
  department: string;
  durationYears: number;
  durationSemesters?: number;
  annualTuitionFee: number;
  totalTuitionFee: number;
  eligibilityCriteria: string;
  minPercentageRequired?: number;
  acceptedStreams?: string[];
  entranceExamsRequired?: string[];
  specializations?: string[];
  careerOpportunities?: string[];
  placementPartners?: string[];
  isPopular?: boolean;
  isActive?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const AdtuCourseSchema = new Schema({
  courseCode: { type: String, required: true, unique: true, index: true },
  courseName: { type: String, required: true, index: true },
  degreeLevel: { type: String, enum: ['UG', 'PG', 'Diploma', 'Doctoral'], required: true, index: true },
  department: { type: String, required: true },
  durationYears: { type: Number, required: true },
  durationSemesters: { type: Number, default: 0 },
  annualTuitionFee: { type: Number, required: true },
  totalTuitionFee: { type: Number, required: true },
  eligibilityCriteria: { type: String, required: true },
  minPercentageRequired: { type: Number, default: 50 },
  acceptedStreams: [{ type: String }],
  entranceExamsRequired: [{ type: String }],
  specializations: [{ type: String }],
  careerOpportunities: [{ type: String }],
  placementPartners: [{ type: String }],
  isPopular: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

AdtuCourseSchema.index({ courseName: 'text', department: 'text', eligibilityCriteria: 'text' });

export const AdtuCourse = mongoose.model<IAdtuCourse>('AdtuCourse', AdtuCourseSchema);
