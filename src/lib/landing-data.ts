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

export const NAV_ITEMS: NavItem[] = [
  { label: 'Home', href: '#hero' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'What’s Happening', href: '#campus-updates' },
  { label: 'Performance', href: '#performance' },
  { label: 'Docs', href: '/documents', isExternal: true },
];

export const HERO_DATA = {
  badgeText: 'UNCERTAINTY-AWARE UNIVERSITY RAG',
  badgeIcon: 'verified',
  headingMain: 'A University AI That Knows When to Answer — ',
  headingItalic: 'and When to Say “I Don’t Know.”',
  subheading: 'Ask questions about university regulations, admissions, policies and academic documents. Get grounded answers with sources and confidence-aware responses.',
  ctaPrimary: 'Try the AI Assistant',
  ctaSecondary: 'See How It Works',
};

export const TERMINAL_DEMO_DATA = {
  terminalTitle: 'ADTU KB Assistant Terminal',
  terminalSubtitle: 'Real-time adaptive retrieval active',
  sampleQuestion: 'What are the eligibility criteria and attendance requirements for end-term examinations?',
  confidenceScore: '98.4%',
  verificationStatus: 'VERIFIED SOURCE',
  answerText: 'According to ADTU Academic Regulations (Clause 4.2), students must maintain a minimum of 75% aggregate attendance across all subjects to be eligible for end-term examinations...',
  citations: [
    { name: 'Academic_Regulations_2024.pdf', icon: 'description' },
    { name: 'Exam_Rules_v3.doc', icon: 'description' },
  ],
  inputPlaceholder: 'Ask anything about ADTU regulations, fees, syllabus...',
};

export const FEATURE_ITEMS: FeatureItem[] = [
  {
    id: 'citation-backed',
    icon: 'menu_book',
    title: 'Citation-Backed',
    description: 'Every claim is linked to a source. Access peer-reviewed journals, university repositories, and verified databases in real-time.',
    gradient: 'from-[#4441cc] to-blue-400',
  },
  {
    id: 'hallucination-free',
    icon: 'format_image_left',
    title: 'Hallucination Free',
    description: "Our uncertainty layers prevent the model from 'guessing.' If the agent doesn't know, it will find the source or admit uncertainty.",
    gradient: 'from-[#9026c3] to-pink-400',
  },
  {
    id: 'confidence-metrics',
    icon: 'bar_chart_4_bars',
    title: 'Confidence Metrics',
    description: 'Transparent probability scoring on every response. Understand exactly how reliable the information is before making decisions.',
    gradient: 'from-[#0055a9] to-teal-400',
  },
];
