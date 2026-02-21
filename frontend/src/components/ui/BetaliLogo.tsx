interface BetaliLogoProps {
  variant?: 'icon' | 'full';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizes = {
  sm: { icon: 24, full: { w: 100, h: 28 } },
  md: { icon: 32, full: { w: 120, h: 34 } },
  lg: { icon: 48, full: { w: 160, h: 46 } },
  xl: { icon: 64, full: { w: 200, h: 58 } },
};

export function BetaliLogo({ variant = 'full', size = 'md', className = '' }: BetaliLogoProps) {
  const s = sizes[size];

  if (variant === 'icon') {
    const d = s.icon;
    return (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 32 32"
        width={d}
        height={d}
        className={className}
        aria-label="Betali"
      >
        <rect width="32" height="32" rx="7" fill="#0F172A" />
        <g transform="translate(4, 5)">
          <polygon points="12,2 22,7 12,12 2,7" fill="#0D9488" />
          <polygon points="2,7 12,12 12,22 2,17" fill="#0F766E" />
          <polygon points="22,7 12,12 12,22 22,17" fill="#2DD4BF" />
        </g>
      </svg>
    );
  }

  const { w, h } = s.full;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 140 40"
      width={w}
      height={h}
      className={className}
      aria-label="Betali"
    >
      <g transform="translate(4, 4)">
        <polygon points="16,2 30,9 16,16 2,9" fill="#0D9488" />
        <polygon points="2,9 16,16 16,30 2,23" fill="#0F766E" />
        <polygon points="30,9 16,16 16,30 30,23" fill="#2DD4BF" />
      </g>
      <text
        x="44"
        y="26"
        fontFamily="'Inter', 'Segoe UI', sans-serif"
        fontSize="18"
        fontWeight="700"
        fill="#0F172A"
        letterSpacing="-0.5"
      >
        betali
      </text>
    </svg>
  );
}
