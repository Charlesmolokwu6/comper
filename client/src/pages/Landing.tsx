import { useLocation } from "wouter";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Landing Page - Hero Section
 * 
 * Design: Bold hero-driven layout with impactful typography
 * - Large headline with white + neon lime accent
 * - Subheading explaining value proposition
 * - Main CTA button to navigate to comparison interface
 * - Dark background with minimal UI
 */
export default function Landing() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Hero Section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center">
        {/* Main Headline */}
        <h1 className="font-mono font-bold text-6xl md:text-7xl lg:text-8xl leading-tight mb-8 max-w-5xl animate-fade-in">
          FIND THE
          <br />
          <span className="text-lime-400 inline-block">BEST WAY</span>
          <br />
          TO GET THERE.
        </h1>

        {/* Subheading */}
        <p className="text-gray-400 text-lg md:text-xl max-w-2xl mb-12 font-sans leading-relaxed animate-fade-in-delay">
          Compare real-time prices for buses, flights, and cabs. High-speed caching powered by Firebase.
        </p>

        {/* Main CTA Button */}
        <Button
          onClick={() => setLocation("/compare")}
          className="bg-lime-400 text-black hover:bg-lime-300 font-mono font-bold text-lg px-8 py-4 transition-all duration-150 active:scale-95 flex items-center gap-2 animate-fade-in-delay-2 shadow-lg hover:shadow-xl hover:shadow-lime-400/50"
        >
          START COMPARING
          <ArrowRight className="w-5 h-5" />
        </Button>

        {/* Decorative accent line */}
        <div className="mt-16 w-full max-w-md h-px bg-gradient-to-r from-transparent via-lime-400 to-transparent"></div>
      </div>

      {/* Footer */}
      <footer className="border-t border-lime-900 bg-black">
        <div className="container py-6">
          <p className="text-xs text-gray-600 font-mono text-center">
            © 2026 Electric Dark. Premium Transit Comparison for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
