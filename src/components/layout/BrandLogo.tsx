import React from 'react';

interface BrandLogoProps {
  compact?: boolean;
  showSubtitle?: boolean;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  compact = false,
  showSubtitle = true,
}) => {
  return (
    <div className="flex items-center gap-2.5 select-none">
      {/* Custom SVG Emblem: Lentera Pustaka Nusantara */}
      <svg
        viewBox="0 0 44 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className={`${compact ? 'w-8 h-8' : 'w-9 h-9 sm:w-10 sm:h-10'} shrink-0 transition-transform duration-200 group-hover:scale-[1.03]`}
      >
        <rect width="44" height="44" rx="11" fill="#163A5F" />
        <rect
          x="2.5"
          y="2.5"
          width="39"
          height="39"
          rx="9"
          stroke="#EFE9DC"
          strokeOpacity="0.18"
          strokeWidth="1"
        />
        {/* Signal arcs */}
        <path
          d="M15 11.5C19 8.4 25 8.4 29 11.5"
          stroke="#5BB59B"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lantern beacon spark */}
        <path
          d="M22 12.2L24.4 17.1L29.3 19.5L24.4 21.9L22 26.8L19.6 21.9L14.7 19.5L19.6 17.1L22 12.2Z"
          fill="#C85A32"
        />
        <circle cx="22" cy="19.5" r="2.2" fill="#F2B857" />
        {/* Open book / hull base */}
        <path
          d="M9.5 27.6C14.7 25.9 19.3 27.2 22 29.8C24.7 27.2 29.3 25.9 34.5 27.6L33.1 34.3C28.4 32.6 24.4 33.6 22 35.8C19.6 33.6 15.6 32.6 10.9 34.3L9.5 27.6Z"
          fill="#FFFDF8"
        />
        <path d="M22 29.8V35.8" stroke="#163A5F" strokeWidth="1.3" strokeLinecap="round" />
      </svg>

      <div className="flex flex-col">
        <div className="font-display text-base sm:text-[18px] font-bold tracking-tight leading-none text-[#17232F]">
          Ruang<span className="text-[#C85A32]">Pintar</span>
        </div>
        {showSubtitle && (
          <span className="text-[10px] sm:text-[11px] font-medium tracking-wide text-[#1F6E58] mt-0.5 leading-none">
            Pustaka Luring Nusantara
          </span>
        )}
      </div>
    </div>
  );
};
