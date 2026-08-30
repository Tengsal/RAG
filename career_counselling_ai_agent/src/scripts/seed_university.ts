import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { AdtuUniversityInfo } from '../models/AdtuUniversityInfo';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://school-management:school-management@cluster0.tk0qz.mongodb.net/multi_agent_system?retryWrites=true&w=majority&appName=Cluster0';

// All top-level sections from university_info.json that should be stored
// (semesters_index is handled separately by seed_semesters.ts for indexed lookup)
const SECTIONS = [
  'university_metadata',
  'academic_calendar',
  'administration',
  'people',
  'committees',
  'rules_and_policies',
  'admissions',
  'fees_and_scholarships',
  'student_services',
  'facilities',
  'programmes',
];

async function main() {
  const jsonPath = path.join(__dirname, '../data/university_info.json');
  
  if (!fs.existsSync(jsonPath)) {
    console.error(`❌ File not found: ${jsonPath}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(jsonPath, 'utf8');
  const doc = JSON.parse(raw);

  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected to MongoDB Atlas');

  let seeded = 0;
  for (const section of SECTIONS) {
    if (!(section in doc)) {
      console.log(`⚠️  Section "${section}" not found in JSON, skipping`);
      continue;
    }

    await AdtuUniversityInfo.findOneAndUpdate(
      { section },
      { section, data: doc[section], sourceFile: 'university_info.json' },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`✅ Seeded: ${section}`);
    seeded++;
  }

  console.log(`\n🎓 University info seeding complete: ${seeded}/${SECTIONS.length} sections synced.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seeding failed:', err);
  process.exit(1);
});