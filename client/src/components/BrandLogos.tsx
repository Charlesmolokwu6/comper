/**
 * Brand Logos Component
 * 
 * SVG-based logos for Nigerian transit providers
 * Designed to match Cyberpunk Minimalism aesthetic:
 * - Neon lime (#C0F11C) accents on black backgrounds
 * - Geometric precision with minimal strokes
 * - No rounded corners
 */

interface BrandLogoProps {
  provider: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeMap = {
  sm: "w-6 h-6",
  md: "w-8 h-8",
  lg: "w-12 h-12",
};

export function BrandLogo({ provider, size = "md", className = "" }: BrandLogoProps) {
  const sizeClass = sizeMap[size];

  switch (provider.toLowerCase()) {
    case "uber":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <text x="12" y="16" fontSize="10" fontWeight="bold" fill="#C0F11C" textAnchor="middle" fontFamily="monospace">
            U
          </text>
        </svg>
      );

    case "bolt":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <polygon points="12,6 14,12 20,12 15,16 17,22 12,18 7,22 9,16 4,12 10,12" fill="#C0F11C" />
        </svg>
      );

    case "yango":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <circle cx="12" cy="12" r="6" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="3" fill="#C0F11C" />
        </svg>
      );

    case "indrive":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <path d="M 6 12 L 12 8 L 18 12 L 12 16 Z" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
        </svg>
      );

    case "rida":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <rect x="6" y="8" width="12" height="8" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
          <line x1="12" y1="8" x2="12" y2="16" stroke="#C0F11C" strokeWidth="1" />
        </svg>
      );

    case "libra motors":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <path d="M 12 6 L 18 14 L 6 14 Z" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
          <line x1="12" y1="14" x2="12" y2="18" stroke="#C0F11C" strokeWidth="1" />
        </svg>
      );

    case "okeyson":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <rect x="6" y="6" width="4" height="12" fill="#C0F11C" />
          <rect x="14" y="6" width="4" height="12" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
        </svg>
      );

    case "gigm":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <line x1="6" y1="8" x2="18" y2="8" stroke="#C0F11C" strokeWidth="1.5" />
          <line x1="6" y1="12" x2="18" y2="12" stroke="#C0F11C" strokeWidth="1.5" />
          <line x1="6" y1="16" x2="18" y2="16" stroke="#C0F11C" strokeWidth="1.5" />
        </svg>
      );

    case "air peace":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <polygon points="12,6 18,12 12,18 6,12" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
          <circle cx="12" cy="12" r="2" fill="#C0F11C" />
        </svg>
      );

    case "ibom air":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <path d="M 12 8 L 16 14 L 12 16 L 8 14 Z" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
          <circle cx="12" cy="14" r="1.5" fill="#C0F11C" />
        </svg>
      );

    case "green africa":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <path d="M 12 6 Q 16 10 12 14 Q 8 10 12 6" fill="#C0F11C" />
          <line x1="12" y1="14" x2="12" y2="18" stroke="#C0F11C" strokeWidth="1" />
        </svg>
      );

    case "valuejet":
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <path d="M 6 10 L 12 6 L 18 10 L 18 16 L 6 16 Z" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
        </svg>
      );

    default:
      return (
        <svg
          viewBox="0 0 24 24"
          className={`${sizeClass} ${className}`}
          fill="currentColor"
        >
          <rect x="2" y="2" width="20" height="20" fill="#000" stroke="#C0F11C" strokeWidth="1" />
          <circle cx="12" cy="12" r="4" fill="none" stroke="#C0F11C" strokeWidth="1.5" />
        </svg>
      );
  }
}

export function BrandLogoRow({ providers }: { providers: string[] }) {
  return (
    <div className="flex items-center gap-2">
      {providers.map((provider) => (
        <div
          key={provider}
          className="flex items-center justify-center w-10 h-10 border border-lime-900 bg-black hover:border-lime-400 transition-all duration-150"
          title={provider}
        >
          <BrandLogo provider={provider} size="sm" className="text-lime-400" />
        </div>
      ))}
    </div>
  );
}
