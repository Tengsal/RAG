export interface FeatureItem {
  id: string;
  icon: string;
  title: string;
  description: string;
  gradient: string;
}

export interface NavItem {
  label: string;
  href: string;
  isExternal?: boolean;
}

export interface DemoScenario {
  id: string;
  label: string;
  icon: string;
  badge: string;
  badgeType: 'verified' | 'uncertain' | 'notice';
  question: string;
  answerText: string;
  confidenceScore: string;
  verificationStatus: string;
  citations: Array<{ name: string; icon: string; link?: string }>;
  explanationNote?: string;
  fallbackAction?: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Overview', href: '#hero' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'Campus Knowledge', href: '#campus-notices' },
  { label: 'Trust & Reliability', href: '#reliability' },
];

export const HERO_DATA = {
  badgeText: 'ADTU OFFICIAL AI ASSISTANT',
  badgeIcon: 'verified',
  headingMain: 'Instant, Grounded Answers ',
  headingAccent: 'for ADTU',
  subheading: 'Get official answers about admissions, fees, regulations, notices, and course syllabi—backed by university documents.',
  ctaPrimary: 'Ask Campus AI',
};

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: 'verified-regulation',
    label: 'Source-Backed Answer',
    icon: 'menu_book',
    badge: 'Grounded in Official ADTU Document',
    badgeType: 'verified',
    question: 'What is the minimum attendance requirement to sit for end-term examinations?',
    answerText: 'According to ADTU Academic Regulations (Clause 4.2), undergraduate and postgraduate students must maintain a minimum of 75% aggregate attendance across all registered courses in a semester to be eligible for end-term examinations. Students falling between 60%-74% may apply for condonation with valid medical documentation.',
    confidenceScore: '98.4%',
    verificationStatus: 'VERIFIED SOURCE',
    citations: [
      { name: 'ADTU_Academic_Regulations_2024.pdf (Clause 4.2)', icon: 'description' },
      { name: 'Examination_Ordinance_v2.pdf', icon: 'description' },
    ],
  },
  {
    id: 'uncertainty-handling',
    label: 'Says "I Don’t Know"',
    icon: 'help_outline',
    badge: 'Honest Abstention • Zero Guesswork',
    badgeType: 'uncertain',
    question: 'What is the Wi-Fi password for Hostel Block B second floor?',
    answerText: 'I couldn\'t verify this from the available ADTU sources.',
    confidenceScore: '0.0%',
    verificationStatus: 'NOT IN KNOWLEDGE BASE',
    citations: [],
    explanationNote: 'The system refrains from inventing information when official documents lack sufficient evidence.',
    fallbackAction: 'You may want to contact the Academic Office or IT Helpdesk at it-support@adtu.ac.in (Block A, Room 102).',
  },
  {
    id: 'campus-notice',
    label: 'Official Notice Extract',
    icon: 'campaign',
    badge: 'Extracted from Verified Circular',
    badgeType: 'notice',
    question: 'When is the deadline for original document verification for 2026 admissions?',
    answerText: 'Per ADTU Registrar Circular Reg/2026/089, physical verification of original marksheets, migration certificates, and identity documents must be completed by September 5, 2026 before 5:00 PM at the Admissions Office (Block A).',
    confidenceScore: '99.1%',
    verificationStatus: 'OFFICIAL CIRCULAR',
    citations: [
      { name: 'Notice_Reg_2026_089_Verification.pdf', icon: 'campaign' },
    ],
  },
];

export const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'citation-backed',
    icon: 'menu_book',
    title: 'Source-Backed Citing',
    description: 'Every statement links directly to official ADTU PDFs, academic ordinances, and verified campus circulars.',
    gradient: 'from-[#4441cc] to-blue-400',
  },
  {
    id: 'hallucination-free',
    icon: 'shield_lock',
    title: 'Zero-Hallucination Guard',
    description: 'If a policy or detail is not present in official university documents, the AI explicitly states it cannot answer.',
    gradient: 'from-[#9026c3] to-pink-400',
  },
  {
    id: 'confidence-metrics',
    icon: 'bar_chart_4_bars',
    title: 'Confidence Transparency',
    description: 'Displays real-time reliability scoring so students and faculty know exactly how trustworthy each answer is.',
    gradient: 'from-[#0055a9] to-teal-400',
  },
];
