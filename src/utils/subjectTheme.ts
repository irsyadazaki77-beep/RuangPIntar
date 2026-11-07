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
    ribbonGradient: 'bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400',
    activeTabGradient:
      'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm',
    primaryBtn:
      'bg-gradient-to-r from-sky-600 to-cyan-600 hover:from-sky-500 hover:to-cyan-500 text-white shadow-xs',
    softBg: 'bg-sky-50/75',
    softBorder: 'border-sky-200/80',
    selectedCardSurface:
      'bg-gradient-to-br from-sky-50/90 via-cyan-50/50 to-white ring-2 ring-sky-500/80 shadow-sm',
    accentText: 'text-sky-700',
    darkAccentText: 'text-cyan-300',
    darkBorderGlow: 'border-cyan-500/40',
    progressGradient: 'bg-gradient-to-r from-sky-500 via-cyan-500 to-teal-400',
    sliderAccent: 'accent-sky-600',
    chunkActiveClass: 'bg-gradient-to-br from-sky-600 to-cyan-600 text-white border-sky-700',
    stepNumberClass: 'bg-gradient-to-br from-sky-600 to-cyan-500 text-white',
    hexPrimary: '#0284c7',
    hexSecondary: '#06b6d4',
  },
  biologi: {
    id: 'biologi',
    subjectName: 'Biologi Pesisir',
    domainSubtitle: 'Hutan Tropis & Konservasi Pesisir',
    ribbonGradient: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500',
    activeTabGradient:
      'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm',
    primaryBtn:
      'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-xs',
    softBg: 'bg-emerald-50/75',
    softBorder: 'border-emerald-200/80',
    selectedCardSurface:
      'bg-gradient-to-br from-emerald-50/90 via-teal-50/50 to-white ring-2 ring-emerald-500/80 shadow-sm',
    accentText: 'text-emerald-700',
    darkAccentText: 'text-emerald-300',
    darkBorderGlow: 'border-emerald-500/40',
    progressGradient: 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-400',
    sliderAccent: 'accent-emerald-600',
    chunkActiveClass:
      'bg-gradient-to-br from-emerald-600 to-teal-600 text-white border-emerald-700',
    stepNumberClass: 'bg-gradient-to-br from-emerald-600 to-teal-500 text-white',
    hexPrimary: '#059669',
    hexSecondary: '#14b8a6',
  },
  matematika: {
    id: 'matematika',
    subjectName: 'Matematika Maritim',
    domainSubtitle: 'Astronomi & Navigasi Kepulauan',
    ribbonGradient: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-purple-500',
    activeTabGradient:
      'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-sm',
    primaryBtn:
      'bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xs',
    softBg: 'bg-indigo-50/75',
    softBorder: 'border-indigo-200/80',
    selectedCardSurface:
      'bg-gradient-to-br from-indigo-50/90 via-violet-50/50 to-white ring-2 ring-indigo-500/80 shadow-sm',
    accentText: 'text-indigo-700',
    darkAccentText: 'text-indigo-300',
    darkBorderGlow: 'border-indigo-500/40',
    progressGradient: 'bg-gradient-to-r from-indigo-500 via-violet-500 to-sky-400',
    sliderAccent: 'accent-indigo-600',
    chunkActiveClass:
      'bg-gradient-to-br from-indigo-600 to-violet-600 text-white border-indigo-700',
    stepNumberClass: 'bg-gradient-to-br from-indigo-600 to-violet-500 text-white',
    hexPrimary: '#4f46e5',
    hexSecondary: '#8b5cf6',
  },
  energi: {
    id: 'energi',
    subjectName: 'Teknik Energi',
    domainSubtitle: 'Surya Kepulauan & Penyimpanan LiFePO4',
    ribbonGradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-rose-500',
    activeTabGradient:
      'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-sm',
    primaryBtn:
      'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-xs',
    softBg: 'bg-amber-50/80',
    softBorder: 'border-amber-200/85',
    selectedCardSurface:
      'bg-gradient-to-br from-amber-50/90 via-orange-50/50 to-white ring-2 ring-amber-500/80 shadow-sm',
    accentText: 'text-amber-800',
    darkAccentText: 'text-amber-300',
    darkBorderGlow: 'border-amber-500/40',
    progressGradient: 'bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500',
    sliderAccent: 'accent-amber-600',
    chunkActiveClass:
      'bg-gradient-to-br from-amber-500 to-orange-600 text-white border-amber-700',
    stepNumberClass: 'bg-gradient-to-br from-amber-500 to-orange-600 text-white',
    hexPrimary: '#d97706',
    hexSecondary: '#ea580c',
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
    badgeGradient: 'bg-gradient-to-r from-amber-500 via-orange-500 to-sky-600',
  };
}
