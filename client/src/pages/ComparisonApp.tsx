import { useState, useEffect, useRef } from "react";
import { MapPin, Bus, Plane, Calendar, Search, Bell, User, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapWithRoutes } from "@/components/MapWithRoutes";
import { BrandLogo } from "@/components/BrandLogos";

type TransitMode = "bus" | "cab" | "flight";

interface SearchParams {
  from: string;
  to: string;
  date: string;
  mode: TransitMode;
}

interface FareResult {
  id: string;
  provider: string;
  price: number;
  duration: string;
  rating: number;
  seats?: number;
}

/**
 * ComparisonApp - Premium Transit Comparison Interface
 * 
 * Design Philosophy: Cyberpunk Minimalism
 * - Pure black background (#000000)
 * - Neon lime accents (#C0F11C)
 * - Active pill-shaped capsule for selected mode
 * - Minimalist inactive icons
 * - Frameless dark inputs (#1A1A1A)
 * - Full-width neon lime Compare button
 */
export default function ComparisonApp() {
  const [mode, setMode] = useState<TransitMode>("bus");
  const [searchParams, setSearchParams] = useState<SearchParams>({
    from: "",
    to: "",
    date: "",
    mode: "bus",
  });
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<FareResult[]>([]);
  const [loadingGPS, setLoadingGPS] = useState(false);
  const [mapVisible, setMapVisible] = useState(false);
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  const modes: TransitMode[] = ["bus", "cab", "flight"];
  const modeLabels: Record<TransitMode, { label: string; shortLabel: string; icon: React.ReactNode }> = {
    bus: { label: "Inter-State Bus", shortLabel: "Bus", icon: <Bus className="w-5 h-5" /> },
    cab: { label: "Intra-City Cab", shortLabel: "Cab", icon: <MapPin className="w-5 h-5" /> },
    flight: { label: "Domestic Flight", shortLabel: "Flight", icon: <Plane className="w-5 h-5" /> },
  };

  // Mock data for different modes
  const mockResults: Record<TransitMode, FareResult[]> = {
    bus: [
      {
        id: "1",
        provider: "Libra Motors",
        price: 8500,
        duration: "4h 30m",
        rating: 4.8,
        seats: 12,
      },
      {
        id: "2",
        provider: "Okeyson",
        price: 7500,
        duration: "5h 15m",
        rating: 4.6,
        seats: 8,
      },
      {
        id: "3",
        provider: "GIGM",
        price: 9000,
        duration: "4h",
        rating: 4.9,
        seats: 5,
      },
    ],
    cab: [
      {
        id: "1",
        provider: "Uber",
        price: 12500,
        duration: "45m",
        rating: 4.9,
      },
      {
        id: "2",
        provider: "Bolt",
        price: 11800,
        duration: "48m",
        rating: 4.8,
      },
      {
        id: "3",
        provider: "Yango",
        price: 11200,
        duration: "50m",
        rating: 4.7,
      },
    ],
    flight: [
      {
        id: "1",
        provider: "Air Peace",
        price: 45000,
        duration: "1h 30m",
        rating: 4.7,
      },
      {
        id: "2",
        provider: "Ibom Air",
        price: 42000,
        duration: "1h 35m",
        rating: 4.6,
      },
      {
        id: "3",
        provider: "Green Africa",
        price: 38000,
        duration: "1h 40m",
        rating: 4.5,
      },
    ],
  };

  // Handle GPS auto-fill
  const handleGPSClick = () => {
    setLoadingGPS(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          setOriginCoords({ lat: latitude, lng: longitude });

          // Mock geocoding - in production, use Google Geocoding API
          const cityNames = ["Lagos", "Abuja", "Kano", "Port Harcourt", "Ibadan"];
          const randomCity = cityNames[Math.floor(Math.random() * cityNames.length)];
          
          setSearchParams((prev) => ({
            ...prev,
            from: randomCity,
          }));
          setLoadingGPS(false);
        },
        () => {
          setLoadingGPS(false);
          alert("Unable to access your location. Please enable location services.");
        }
      );
    } else {
      setLoadingGPS(false);
      alert("Geolocation is not supported by your browser.");
    }
  };

  // Trigger map reveal when destination is entered
  useEffect(() => {
    if (searchParams.to.trim().length > 0) {
      // Mock destination coordinates
      setDestCoords({ lat: 6.4969, lng: 3.3519 });
      setMapVisible(true);
    } else {
      setMapVisible(false);
    }
  }, [searchParams.to]);

  const handleModeChange = (newMode: TransitMode) => {
    setMode(newMode);
    setSearchParams({ ...searchParams, mode: newMode });
  };

  const handleInputChange = (field: keyof SearchParams, value: string) => {
    setSearchParams({ ...searchParams, [field]: value });
  };

  const handleCompare = () => {
    if (searchParams.from && searchParams.to && searchParams.date) {
      setResults(mockResults[mode]);
      setHasSearched(true);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-900 bg-black sticky top-0 z-50">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-lime-400 flex items-center justify-center rounded font-mono font-bold text-black text-sm">
                C
              </div>
              <h1 className="font-mono font-bold text-lg text-white">Compare</h1>
            </div>
            <div className="flex items-center gap-4">
              <button className="text-gray-400 hover:text-lime-400 transition-colors">
                <Bell className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 transition-colors flex items-center justify-center">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Segmented Control - Active Pill Capsule + Minimalist Inactive Icons */}
          <div className="mb-8 flex items-center gap-3">
            {/* Active Pill Capsule */}
            <div className="bg-lime-400 text-black px-4 py-2 rounded-full font-mono font-bold text-sm flex items-center gap-2 flex-shrink-0 transition-all duration-200">
              {modeLabels[mode].icon}
              <span>{modeLabels[mode].label}</span>
            </div>

            {/* Inactive Mode Icons */}
            <div className="flex items-center gap-4 ml-4">
              {modes.map((modeKey) => {
                if (modeKey === mode) return null; // Skip active mode
                return (
                  <button
                    key={modeKey}
                    onClick={() => handleModeChange(modeKey)}
                    className="text-gray-500 hover:text-white transition-all duration-200 p-2 rounded-lg hover:bg-gray-900"
                    title={modeLabels[modeKey].label}
                  >
                    {modeLabels[modeKey].icon}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Search Form - Frameless Dark Inputs */}
          <div className="space-y-5 mb-6">
            {/* FROM */}
            <div>
              <label className="block text-gray-400 font-mono text-xs mb-3 uppercase tracking-wider">
                From
              </label>
              <div className="relative flex items-center">
                <MapPin className="absolute left-4 w-5 h-5 text-gray-600" />
                <Input
                  type="text"
                  placeholder="Departure City"
                  value={searchParams.from}
                  onChange={(e) => handleInputChange("from", e.target.value)}
                  className="pl-14 pr-12 bg-gray-900 text-white placeholder-gray-600 h-14 rounded-xl focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-lime-400/50"
                />
                <button
                  onClick={handleGPSClick}
                  disabled={loadingGPS}
                  className="absolute right-4 text-gray-600 hover:text-lime-400 transition-all duration-200 disabled:opacity-50 active:scale-90"
                  title="Use current location"
                >
                  {loadingGPS ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-2c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6z"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* TO */}
            <div>
              <label className="block text-gray-400 font-mono text-xs mb-3 uppercase tracking-wider">
                To
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
                <Input
                  type="text"
                  placeholder="Destination City"
                  value={searchParams.to}
                  onChange={(e) => handleInputChange("to", e.target.value)}
                  className="pl-14 bg-gray-900 text-white placeholder-gray-600 h-14 rounded-xl focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-lime-400/50"
                />
              </div>
            </div>

            {/* DATE */}
            <div>
              <label className="block text-gray-400 font-mono text-xs mb-3 uppercase tracking-wider">
                Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-600" />
                <Input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className="pl-14 bg-gray-900 text-white h-14 rounded-xl focus:outline-none transition-all duration-200 focus:ring-2 focus:ring-lime-400/50"
                />
              </div>
            </div>
          </div>

          {/* Map - Conditional Reveal with Slide-Down Animation */}
          {mapVisible && (
            <div className="mb-6 animate-slide-down">
              <h3 className="font-mono font-bold text-lime-400 mb-4 text-sm uppercase tracking-wider">
                Route Map
              </h3>
              <MapWithRoutes
                initialCenter={originCoords || { lat: 6.5244, lng: 3.3792 }}
                initialZoom={13}
                showRoute={true}
                routeOrigin={originCoords || { lat: 6.5244, lng: 3.3792 }}
                routeDestination={destCoords || { lat: 6.4969, lng: 3.3519 }}
              />
            </div>
          )}

          {/* Results */}
          {hasSearched && results.length > 0 && (
            <div className="animate-fade-in mb-6">
              <h3 className="font-mono font-bold text-lime-400 mb-4 text-sm uppercase tracking-wider">
                Available{" "}
                {mode === "bus"
                  ? "Buses"
                  : mode === "cab"
                  ? "Cabs"
                  : "Flights"}
              </h3>
              <div className="grid gap-3">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="bg-gray-900 p-4 rounded-xl hover:bg-gray-800 transition-all duration-150 cursor-pointer group"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <BrandLogo
                          provider={result.provider}
                          size="md"
                          className="text-lime-400"
                        />
                        <div>
                          <p className="font-mono font-bold text-white text-sm">
                            {result.provider}
                          </p>
                          <p className="text-xs text-gray-500">★ {result.rating}</p>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-lime-400 text-lg">
                        ₦{result.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>⏱ {result.duration}</span>
                      {result.seats && <span>🪑 {result.seats} seats left</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {hasSearched && results.length === 0 && (
            <div className="text-center text-gray-500 font-mono text-sm py-8">
              No results found. Try different search parameters.
            </div>
          )}
        </div>
      </main>

      {/* Full-Width Compare Button - Anchored at Bottom */}
      <div className="bg-black border-t border-gray-900 sticky bottom-0 w-full">
        <div className="container py-4">
          <Button
            onClick={handleCompare}
            disabled={!searchParams.from || !searchParams.to || !searchParams.date}
            className="w-full bg-lime-400 text-black hover:bg-lime-300 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed font-mono font-bold text-lg py-6 rounded-xl transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 shadow-2xl hover:shadow-lime-400/50"
          >
            <Search className="w-6 h-6" />
            Compare Prices
          </Button>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-900 bg-black">
        <div className="container py-4">
          <p className="text-xs text-gray-600 font-mono text-center">
            © 2026 Compare. Premium Transit Comparison for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
