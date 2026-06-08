/**
 * AdSense Layout Component
 * 
 * Provides naturally integrated ad space placeholders that match the Cyberpunk Minimalism design
 * Ready for Google AdSense integration without amateur "AD SPACE" labels
 * 
 * Usage:
 * - <SidebarAdSpace /> for vertical sidebar ads (300x600, 160x600)
 * - <BannerAdSpace /> for horizontal banner ads (728x90, 970x90)
 * - <InlineAdSpace /> for inline content ads (300x250, 336x280)
 */

interface AdSpaceProps {
  className?: string;
  adSlot?: string;
}

/**
 * Vertical sidebar ad space (300x600 or 160x600)
 * Ideal for placement alongside main content
 */
export function SidebarAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-4 min-h-[600px] flex items-center justify-center ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="text-center">
        <p className="text-xs text-gray-600 font-mono mb-2">SPONSORED</p>
        <div className="w-[300px] h-[600px] bg-black border border-lime-900 flex items-center justify-center">
          <p className="text-gray-700 font-mono text-xs">Ad Space</p>
        </div>
      </div>
    </div>
  );
}

/**
 * Horizontal banner ad space (728x90 or 970x90)
 * Ideal for header/footer placement
 */
export function BannerAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-3 flex items-center justify-center ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="w-full max-w-[728px] h-[90px] bg-black border border-lime-900 flex items-center justify-center">
        <p className="text-gray-700 font-mono text-xs">SPONSORED</p>
      </div>
    </div>
  );
}

/**
 * Inline/rectangle ad space (300x250 or 336x280)
 * Ideal for placement within content sections
 */
export function InlineAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-4 flex items-center justify-center ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="w-[300px] h-[250px] bg-black border border-lime-900 flex items-center justify-center">
        <p className="text-gray-700 font-mono text-xs">Ad Space</p>
      </div>
    </div>
  );
}

/**
 * Leaderboard ad space (728x90)
 * Ideal for top/bottom placement
 */
export function LeaderboardAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-3 flex items-center justify-center my-4 ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="w-full max-w-[728px] h-[90px] bg-black border border-lime-900 flex items-center justify-center">
        <p className="text-gray-700 font-mono text-xs">SPONSORED</p>
      </div>
    </div>
  );
}

/**
 * Wide skyscraper ad space (120x600)
 * Ideal for narrow sidebar placement
 */
export function SkyscraperAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-2 flex items-center justify-center ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="w-[120px] h-[600px] bg-black border border-lime-900 flex items-center justify-center">
        <p className="text-gray-700 font-mono text-xs rotate-90">Ad</p>
      </div>
    </div>
  );
}

/**
 * Mobile banner ad space (320x50)
 * Ideal for mobile-first layouts
 */
export function MobileBannerAdSpace({ className = "", adSlot }: AdSpaceProps) {
  return (
    <div
      className={`border border-lime-900 bg-black p-2 flex items-center justify-center my-3 ${className}`}
      data-ad-slot={adSlot}
    >
      <div className="w-full max-w-[320px] h-[50px] bg-black border border-lime-900 flex items-center justify-center">
        <p className="text-gray-700 font-mono text-xs">SPONSORED</p>
      </div>
    </div>
  );
}
