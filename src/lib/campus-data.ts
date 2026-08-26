export interface CampusEvent {
  id: string;
  title: string;
  category: 'Important' | 'Notice' | 'Event';
  audience: string;
  date: string;
  time: string;
  venue?: string;
  description: string;
  isPriority?: boolean;
  fullDetails: {
    overview: string;
    highlights: string[];
    contactPerson?: string;
    actionNote?: string;
  };
}

export interface StepItem {
  step: number;
  icon: string;
  title: string;
  description: string;
  colorHex: string;
  hoverBorderClass: string;
  bgClass: string;
}

export const EVENT_CATEGORIES = ['All', 'Important', 'Event', 'Notice'];

export const CAMPUS_EVENTS: CampusEvent[] = [
  {
    id: 'event-1',
    title: 'Orientation Programme 2026',
    category: 'Event',
    audience: 'New Students',
    date: 'Sept 1, 2026',
    time: '10:00 AM - 01:30 PM',
    venue: 'University Main Auditorium',
    description: 'Welcome ceremony for all incoming freshmen. Academic orientation, campus tour, and Dean address.',
    isPriority: true,
    fullDetails: {
      overview: 'The official University Orientation Programme for the 2026-27 academic session. All new undergraduate and postgraduate students are required to attend.',
      highlights: [
        'Welcome address by the Vice-Chancellor & Deans',
        'Academic credit system & university portal walkthrough',
        'Campus facility tour & library membership registration',
        'Interactive Q&A with Senior Student Mentors',
      ],
      contactPerson: 'Dean of Student Affairs (studentaffairs@adtu.ac.in)',
      actionNote: 'Please carry your provisional admission letter and student ID slip.',
    },
  },
  {
    id: 'event-2',
    title: 'Document Verification Deadline',
    category: 'Important',
    audience: 'Freshmen & Transfer Students',
    date: 'Sept 5, 2026',
    time: 'Before 05:00 PM',
    venue: 'Admissions Office, Block A',
    description: 'Mandatory physical verification of original marksheets, migration certificates, and identity documents.',
    isPriority: true,
    fullDetails: {
      overview: 'All conditionally admitted students must present their original certificates for physical verification at the Admissions Office to confirm enrollment.',
      highlights: [
        'Class X & XII original marksheets & pass certificates',
        'Migration / Transfer Certificate (Original)',
        'Category / Caste certificate (if applicable)',
        '4 Passport size photographs & Government ID proof',
      ],
      contactPerson: 'Admissions Helpdesk (admissions@adtu.ac.in | Ext: 104)',
      actionNote: 'Failure to verify documents before Sept 5 may result in seat cancellation.',
    },
  },
  {
    id: 'event-3',
    title: 'Freshers Welcome Programme & Talent Night',
    category: 'Event',
    audience: 'All New Batches',
    date: 'Sept 8, 2026',
    time: '04:00 PM - 08:30 PM',
    venue: 'Central Amphitheatre & Sports Complex',
    description: 'An evening of music, cultural performances, talent showcases, and welcoming new members to the AdtU family.',
    isPriority: false,
    fullDetails: {
      overview: 'Hosted by the Student Cultural Committee, the Freshers Welcome Night is the biggest inaugural cultural celebration of the year.',
      highlights: [
        'Live musical performances by the University Band',
        'Freshers Mr. & Ms. AdtU Talent Contest',
        'Food stalls & interactive club registration kiosks',
        'DJ Night & Light Show',
      ],
      contactPerson: 'Cultural Committee Head (cultural@adtu.ac.in)',
      actionNote: 'Entry is free for all registered first-year students with valid ID cards.',
    },
  },
  {
    id: 'event-4',
    title: 'Hostel Room Allocation & Mess Pass Notice',
    category: 'Notice',
    audience: 'Hostel Residents',
    date: 'Aug 30, 2026',
    time: '09:00 AM Onwards',
    venue: 'Chief Warden Office, Hostel Block 2',
    description: 'Room keys distribution, mess card registration, and hostel rules orientation for newly admitted boarders.',
    isPriority: false,
    fullDetails: {
      overview: 'Hostel room allotments for Phase-1 students are published. Students can collect their room keys and biometric mess access cards.',
      highlights: [
        'Biometric registration for mess hall access',
        'Inventory check & key handover',
        'Hostel curfew & visitor policy briefing',
      ],
      contactPerson: 'Chief Hostel Warden (warden@adtu.ac.in)',
      actionNote: 'Ensure hostel fee receipt copy is ready at time of check-in.',
    },
  },
  {
    id: 'event-5',
    title: 'Campus IT & Wi-Fi Setup Workshop',
    category: 'Notice',
    audience: 'UG & PG Freshers',
    date: 'Sept 2, 2026',
    time: '11:30 AM - 01:00 PM',
    venue: 'IT Computer Lab 3, Tech Block',
    description: 'Setup your official student email, campus Wi-Fi credentials, LMS portal access, and AI Assistant account.',
    isPriority: false,
    fullDetails: {
      overview: 'Hands-on workshop led by the University IT Helpdesk to get all new students connected to the campus digital network.',
      highlights: [
        'Activation of official @adtu.ac.in email account',
        'Wi-Fi 6 device configuration and security setup',
        'Access to ADTU KB AI Assistant and digital courseware',
      ],
      contactPerson: 'IT Service Desk (itsupport@adtu.ac.in)',
      actionNote: 'Bring your personal laptop or smartphone for live configuration.',
    },
  },
  {
    id: 'event-6',
    title: 'Central Library Orientation & Digital Pass',
    category: 'Event',
    audience: 'All Students',
    date: 'Sept 3, 2026',
    time: '02:00 PM - 03:30 PM',
    venue: 'Central Library Knowledge Hall',
    description: 'Learn how to access 50,000+ e-journals, research databases, book lending rules, and quiet study zones.',
    isPriority: false,
    fullDetails: {
      overview: 'Discover the library resources, digital repository access, IEEE/Elsevier journal access, and automated self-checkout kiosks.',
      highlights: [
        'E-resource portal password distribution',
        'Tour of quiet study zones and discussion pods',
        'How to request inter-library research loans',
      ],
      contactPerson: 'Chief Librarian (library@adtu.ac.in)',
      actionNote: 'Library digital passes will be issued directly on student mobile apps.',
    },
  },
];

export const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    step: 1,
    icon: 'help_outline',
    title: 'Your Question',
    description: 'Ask about regulations, admissions, policies or syllabus',
    colorHex: '#4441cc',
    hoverBorderClass: 'hover:border-[#4441cc]/40',
    bgClass: 'bg-[#4441cc]/10',
  },
  {
    step: 2,
    icon: 'psychology',
    title: 'Understand Intent',
    description: 'Deconstruct query & identify subject domain',
    colorHex: '#9026c3',
    hoverBorderClass: 'hover:border-[#9026c3]/40',
    bgClass: 'bg-[#9026c3]/10',
  },
  {
    step: 3,
    icon: 'travel_explore',
    title: 'Adaptive Retrieval',
    description: 'Fetch grounded excerpts from university KB',
    colorHex: '#0055a9',
    hoverBorderClass: 'hover:border-[#0055a9]/40',
    bgClass: 'bg-[#0055a9]/10',
  },
  {
    step: 4,
    icon: 'fact_check',
    title: 'Evidence Validation',
    description: 'Cross-check citations & evaluate uncertainty',
    colorHex: '#d97706',
    hoverBorderClass: 'hover:border-[#d97706]/40',
    bgClass: 'bg-[#d97706]/10',
  },
  {
    step: 5,
    icon: 'task_alt',
    title: 'Answer / Clarify / Refuse',
    description: 'Provide cited answer or admit when uncertain',
    colorHex: '#10b981',
    hoverBorderClass: 'hover:border-[#10b981]/40',
    bgClass: 'bg-[#10b981]/10',
  },
];
