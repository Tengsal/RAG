import mongoose, { Document, Schema } from 'mongoose';

/**
 * Stores one top-level section from university_info.json.  Sections have
 * different shapes, so the payload is deliberately modelled as Mixed.
 */
export interface IAdtuUniversityInfo extends Document {
  section: string;
  data: unknown;
  sourceFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdtuUniversityInfoSchema = new Schema<IAdtuUniversityInfo>(
  {
    section: { type: String, required: true, unique: true, index: true },
    data: { type: Schema.Types.Mixed, required: true },
    sourceFile: { type: String, default: 'university_info.json' },
  },
  { timestamps: true }
);

export const AdtuUniversityInfo = mongoose.model<IAdtuUniversityInfo>(
  'AdtuUniversityInfo',
  AdtuUniversityInfoSchema
);
