export interface SubjectVisualTheme {
  id: 'fisika' | 'biologi' | 'matematika' | 'energi';
  subjectName: string;
  domainSubtitle: string;
  ribbonGradient: string;
  activeTabGradient: string;
  primaryBtn: string;
  softBg: string;
  softBorder: string;
  selectedCardSurface: string;
  accentText: string;
  darkAccentText: string;
  darkBorderGlow: string;
  progressGradient: string;
  sliderAccent: string;
  chunkActiveClass: string;
  stepNumberClass: string;
  hexPrimary: string;
  hexSecondary: string;
}

const SUBJECT_THEMES: Record<SubjectVisualTheme['id'], SubjectVisualTheme> = {
  fisika: {
    id: 'fisika',
    subjectName: 'Fisika Terapan',
    domainSubtitle: 'Samudra & Hidro-Termal',
    ribbonGradient: 'bg-[#1D4ED8]',
    activeTabGradient: 'bg-[#1D4ED8] text-white shadow-xs',
    primaryBtn: 'bg-[#1D4ED8] hover:bg-[#1E40AF] text-white shadow-xs',
    softBg: 'bg-blue-50',
    softBorder: 'border-blue-200',
    selectedCardSurface:
      'bg-blue-50/50 ring-2 ring-[#1D4ED8] border-[#1D4ED8] shadow-xs',
    accentText: 'text-[#1D4ED8]',
    darkAccentText: 'text-sky-300',
    darkBorderGlow: 'border-slate-700',
    progressGradient: 'bg-[#1D4ED8]',
    sliderAccent: 'accent-[#1D4ED8]',
    chunkActiveClass: 'bg-[#1D4ED8] text-white border-[#1E40AF]',
    stepNumberClass: 'bg-[#1D4ED8] text-white',
    hexPrimary: '#1D4ED8',
    hexSecondary: '#2563EB',
  },
  biologi: {
    id: 'biologi',
    subjectName: 'Biologi Pesisir',
    domainSubtitle: 'Hutan Tropis & Konservasi Pesisir',
    ribbonGradient: 'bg-emerald-600',
    activeTabGradient: 'bg-emerald-600 text-white shadow-xs',
    primaryBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs',
    softBg: 'bg-emerald-50',
    softBorder: 'border-emerald-200',
    selectedCardSurface:
      'bg-emerald-50/50 ring-2 ring-emerald-600 border-emerald-600 shadow-xs',
    accentText: 'text-emerald-700',
    darkAccentText: 'text-emerald-300',
    darkBorderGlow: 'border-slate-700',
    progressGradient: 'bg-emerald-600',
    sliderAccent: 'accent-emerald-600',
    chunkActiveClass: 'bg-emerald-600 text-white border-emerald-700',
    stepNumberClass: 'bg-emerald-600 text-white',
    hexPrimary: '#059669',
    hexSecondary: '#10B981',
  },
  matematika: {
    id: 'matematika',
    subjectName: 'Matematika Maritim',
    domainSubtitle: 'Astronomi & Navigasi Kepulauan',
    ribbonGradient: 'bg-indigo-600',
    activeTabGradient: 'bg-indigo-600 text-white shadow-xs',
    primaryBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs',
    softBg: 'bg-indigo-50',
    softBorder: 'border-indigo-200',
    selectedCardSurface:
      'bg-indigo-50/50 ring-2 ring-indigo-600 border-indigo-600 shadow-xs',
    accentText: 'text-indigo-700',
    darkAccentText: 'text-indigo-300',
    darkBorderGlow: 'border-slate-700',
    progressGradient: 'bg-indigo-600',
    sliderAccent: 'accent-indigo-600',
    chunkActiveClass: 'bg-indigo-600 text-white border-indigo-700',
    stepNumberClass: 'bg-indigo-600 text-white',
    hexPrimary: '#4F46E5',
    hexSecondary: '#6366F1',
  },
  energi: {
    id: 'energi',
    subjectName: 'Teknik Energi',
    domainSubtitle: 'Surya Kepulauan & Penyimpanan LiFePO4',
    ribbonGradient: 'bg-amber-600',
    activeTabGradient: 'bg-amber-600 text-white shadow-xs',
    primaryBtn: 'bg-amber-600 hover:bg-amber-700 text-white shadow-xs',
    softBg: 'bg-amber-50',
    softBorder: 'border-amber-200',
    selectedCardSurface:
      'bg-amber-50/50 ring-2 ring-amber-600 border-amber-600 shadow-xs',
    accentText: 'text-amber-700',
    darkAccentText: 'text-amber-300',
    darkBorderGlow: 'border-slate-700',
    progressGradient: 'bg-amber-600',
    sliderAccent: 'accent-amber-600',
    chunkActiveClass: 'bg-amber-600 text-white border-amber-700',
    stepNumberClass: 'bg-amber-600 text-white',
    hexPrimary: '#D97706',
    hexSecondary: '#F59E0B',
  },
};

export function getSubjectTheme(subject?: string): SubjectVisualTheme {
  const s = (subject || '').toLowerCase();
  if (s.includes('biologi') || s.includes('ekologi') || s.includes('agro')) {
    return SUBJECT_THEMES.biologi;
  }
  if (s.includes('matematika') || s.includes('maritim') || s.includes('navigasi')) {
    return SUBJECT_THEMES.matematika;
  }
  if (s.includes('teknik') || s.includes('energi') || s.includes('surya')) {
    return SUBJECT_THEMES.energi;
  }
  return SUBJECT_THEMES.fisika;
}

export interface StudentLevelInfo {
  level: number;
  title: string;
  nextTitle: string;
  currentXp: number;
  levelFloorXp: number;
  nextLevelXp: number;
  xpNeededForNext: number;
  progressPct: number;
  badgeGradient: string;
}

const LEVEL_TIERS = [
  { level: 1, floor: 0, ceiling: 300, title: 'Penjelajah Pesisir 3T' },
  { level: 2, floor: 300, ceiling: 550, title: 'Perintis Sains Kepulauan' },
  { level: 3, floor: 550, ceiling: 850, title: 'Teknisi Muda Nusantara' },
  { level: 4, floor: 850, ceiling: 1200, title: 'Arsitek Ekologi & Energi' },
  { level: 5, floor: 1200, ceiling: 2000, title: 'Inovator Utama Nusantara' },
];

export function getStudentLevelInfo(totalXp: number): StudentLevelInfo {
  const xp = Math.max(0, totalXp);
  const tierIndex = LEVEL_TIERS.findIndex((t, idx) => {
    const isLast = idx === LEVEL_TIERS.length - 1;
    return isLast ? true : xp < t.ceiling;
  });

  const currentTier = LEVEL_TIERS[Math.max(0, tierIndex)];
  const nextTier = LEVEL_TIERS[Math.min(LEVEL_TIERS.length - 1, tierIndex + 1)];

  const span = Math.max(1, currentTier.ceiling - currentTier.floor);
  const gainedInTier = Math.max(0, xp - currentTier.floor);
  const progressPct = Math.min(100, Math.round((gainedInTier / span) * 100));
  const xpNeededForNext = Math.max(0, currentTier.ceiling - xp);

  return {
    level: currentTier.level,
    title: currentTier.title,
    nextTitle: nextTier.title,
    currentXp: xp,
    levelFloorXp: currentTier.floor,
    nextLevelXp: currentTier.ceiling,
    xpNeededForNext,
    progressPct,
    badgeGradient: 'bg-[#1D4ED8]',
  };
}
