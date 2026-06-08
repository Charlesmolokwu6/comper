import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MapPin, Bus, Plane } from "lucide-react";
import IntraCityCabs from "@/components/tabs/IntraCityCabs";
import InterStateBuses from "@/components/tabs/InterStateBuses";
import DomesticFlights from "@/components/tabs/DomesticFlights";
import { LeaderboardAdSpace } from "@/components/AdSenseLayout";

/**
 * Electric Dark - Premium Nigerian Transit Comparison App
 * 
 * Design Philosophy: Cyberpunk Minimalism
 * - Pure black background (#000000) with neon lime (#C0F11C) accents
 * - Geometric precision, information density, no rounded corners
 * - Monospace typography for premium tech feel
 * - Snappy animations (150-200ms) on user interaction
 * - AdSense integration ready with naturally integrated ad spaces
 */
export default function Home() {
  const [activeTab, setActiveTab] = useState("cabs");

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-lime-900 bg-black sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-lime-400 flex items-center justify-center">
                <span className="font-mono font-bold text-black text-sm">ED</span>
              </div>
              <h1 className="font-mono font-bold text-xl text-white">
                ELECTRIC<span className="text-lime-400">DARK</span>
              </h1>
            </div>
            <p className="text-xs text-gray-500 font-mono">Nigeria Transit Comparison</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-6">
        {/* Top Banner Ad */}
        <LeaderboardAdSpace className="mb-8" />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Tab Navigation */}
          <TabsList className="grid w-full grid-cols-3 bg-black border border-lime-900 p-1 mb-8">
            <TabsTrigger
              value="cabs"
              className="font-mono text-sm data-[state=active]:bg-lime-400 data-[state=active]:text-black data-[state=inactive]:text-gray-400 transition-all duration-150"
            >
              <MapPin className="w-4 h-4 mr-2" />
              INTRA-CITY
            </TabsTrigger>
            <TabsTrigger
              value="buses"
              className="font-mono text-sm data-[state=active]:bg-lime-400 data-[state=active]:text-black data-[state=inactive]:text-gray-400 transition-all duration-150"
            >
              <Bus className="w-4 h-4 mr-2" />
              INTER-STATE
            </TabsTrigger>
            <TabsTrigger
              value="flights"
              className="font-mono text-sm data-[state=active]:bg-lime-400 data-[state=active]:text-black data-[state=inactive]:text-gray-400 transition-all duration-150"
            >
              <Plane className="w-4 h-4 mr-2" />
              FLIGHTS
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="cabs" className="mt-0">
            <IntraCityCabs />
          </TabsContent>

          <TabsContent value="buses" className="mt-0">
            <InterStateBuses />
          </TabsContent>

          <TabsContent value="flights" className="mt-0">
            <DomesticFlights />
          </TabsContent>
        </Tabs>

        {/* Bottom Banner Ad */}
        <LeaderboardAdSpace className="mt-8" />
      </main>

      {/* Footer */}
      <footer className="border-t border-lime-900 bg-black mt-12">
        <div className="container py-6">
          <p className="text-xs text-gray-600 font-mono text-center">
            © 2026 Electric Dark. Premium Transit Comparison for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
