import mongoose, { Schema, Document } from 'mongoose';

// ─────────────────────────────────────────────────────────────────────────────
// AdtU University Knowledge — sectioned store for non-course facts.
//
// One document per top-level section of src/data/university_info.json:
//   university_metadata, academic_calendar, administration, people,
//   committees, rules_and_policies, admissions, fees_and_scholarships,
//   student_services, facilities, programmes
//
// (Semester subjects get their own AdtuSemester collection for fast
//  indexed lookup — see next step.)
// ─────────────────────────────────────────────────────────────────────────────

export interface IAdtuUniversityInfo extends Document {
  /** Top-level section name from university_info.json (unique key). */
  section: string;
  /** The full JSON subtree for that section (arbitrary shape). */
  data: any;
  /** Which source file this section was seeded from. */
  sourceFile?: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdtuUniversityInfoSchema = new Schema<IAdtuUniversityInfo>(
  {
    section: { type: String, required: true, unique: true, index: true },
    // Mixed because every section has a different shape
    // (objects, arrays of people, nested schedules, etc.)
    data: { type: Schema.Types.Mixed, required: true },
    sourceFile: { type: String, default: 'university_info.json' },
  },
  { timestamps: true }
);

export const AdtuUniversityInfo = mongoose.model<IAdtuUniversityInfo>(
  'AdtuUniversityInfo',
  AdtuUniversityInfoSchema
);