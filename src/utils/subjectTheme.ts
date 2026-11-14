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
    ribbonGradient: 'bg-[#163A5F]',
    activeTabGradient: 'bg-[#163A5F] text-[#FFFDF8] shadow-xs',
    primaryBtn: 'bg-[#163A5F] hover:bg-[#1E4D7B] text-[#FFFDF8] shadow-xs',
    softBg: 'bg-[#EDF3F7]',
    softBorder: 'border-[#C5D6E3]',
    selectedCardSurface:
      'bg-[#F2F6F9] ring-2 ring-[#163A5F] border-[#163A5F] shadow-xs',
    accentText: 'text-[#163A5F]',
    darkAccentText: 'text-[#93C5FD]',
    darkBorderGlow: 'border-[#DED4BE]/30',
    progressGradient: 'bg-[#163A5F]',
    sliderAccent: 'accent-[#163A5F]',
    chunkActiveClass: 'bg-[#163A5F] text-[#FFFDF8] border-[#102B47]',
    stepNumberClass: 'bg-[#163A5F] text-[#FFFDF8]',
    hexPrimary: '#163A5F',
    hexSecondary: '#2C6B9E',
  },
  biologi: {
    id: 'biologi',
    subjectName: 'Biologi Pesisir',
    domainSubtitle: 'Hutan Tropis & Konservasi Pesisir',
    ribbonGradient: 'bg-[#1F6E58]',
    activeTabGradient: 'bg-[#1F6E58] text-[#FFFDF8] shadow-xs',
    primaryBtn: 'bg-[#1F6E58] hover:bg-[#27856B] text-[#FFFDF8] shadow-xs',
    softBg: 'bg-[#ECF5F1]',
    softBorder: 'border-[#BCDAD0]',
    selectedCardSurface:
      'bg-[#EFF7F4] ring-2 ring-[#1F6E58] border-[#1F6E58] shadow-xs',
    accentText: 'text-[#1F6E58]',
    darkAccentText: 'text-[#86EFAC]',
    darkBorderGlow: 'border-[#DED4BE]/30',
    progressGradient: 'bg-[#1F6E58]',
    sliderAccent: 'accent-[#1F6E58]',
    chunkActiveClass: 'bg-[#1F6E58] text-[#FFFDF8] border-[#154E3E]',
    stepNumberClass: 'bg-[#1F6E58] text-[#FFFDF8]',
    hexPrimary: '#1F6E58',
    hexSecondary: '#4EA88F',
  },
  matematika: {
    id: 'matematika',
    subjectName: 'Matematika Maritim',
    domainSubtitle: 'Astronomi & Navigasi Kepulauan',
    ribbonGradient: 'bg-[#C85A32]',
    activeTabGradient: 'bg-[#C85A32] text-[#FFFDF8] shadow-xs',
    primaryBtn: 'bg-[#C85A32] hover:bg-[#B24D28] text-[#FFFDF8] shadow-xs',
    softBg: 'bg-[#FAF0EC]',
    softBorder: 'border-[#E9C9BC]',
    selectedCardSurface:
      'bg-[#FBF3EF] ring-2 ring-[#C85A32] border-[#C85A32] shadow-xs',
    accentText: 'text-[#9E3E22]',
    darkAccentText: 'text-[#FDBA74]',
    darkBorderGlow: 'border-[#DED4BE]/30',
    progressGradient: 'bg-[#C85A32]',
    sliderAccent: 'accent-[#C85A32]',
    chunkActiveClass: 'bg-[#C85A32] text-[#FFFDF8] border-[#9E3E22]',
    stepNumberClass: 'bg-[#C85A32] text-[#FFFDF8]',
    hexPrimary: '#C85A32',
    hexSecondary: '#9E3E22',
  },
  energi: {
    id: 'energi',
    subjectName: 'Teknik Energi',
    domainSubtitle: 'Surya Kepulauan & Penyimpanan LiFePO4',
    ribbonGradient: 'bg-[#B97217]',
    activeTabGradient: 'bg-[#B97217] text-[#FFFDF8] shadow-xs',
    primaryBtn: 'bg-[#B97217] hover:bg-[#9E5F11] text-[#FFFDF8] shadow-xs',
    softBg: 'bg-[#FBF4E7]',
    softBorder: 'border-[#EAD6B0]',
    selectedCardSurface:
      'bg-[#FCF7EC] ring-2 ring-[#B97217] border-[#B97217] shadow-xs',
    accentText: 'text-[#8C540B]',
    darkAccentText: 'text-[#FCD34D]',
    darkBorderGlow: 'border-[#DED4BE]/30',
    progressGradient: 'bg-[#B97217]',
    sliderAccent: 'accent-[#B97217]',
    chunkActiveClass: 'bg-[#B97217] text-[#FFFDF8] border-[#8C540B]',
    stepNumberClass: 'bg-[#B97217] text-[#FFFDF8]',
    hexPrimary: '#B97217',
    hexSecondary: '#D99B38',
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
    badgeGradient: 'bg-[#C85A32]',
  };
}
