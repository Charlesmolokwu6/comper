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
 * ComparisonApp - Horizontal Sliding Tab Bar with Swipe Gesture Support
 * 
 * Features:
 * - Clean horizontal tab bar (Bus, Cab, Flight)
 * - Swipe gesture support for seamless mode switching
 * - Neon lime underline indicator for active tab
 * - GPS auto-fill for current location
 * - Map hidden on launch, reveals after destination entry
 * - Smooth animations and transitions
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
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const tabContainerRef = useRef<HTMLDivElement>(null);

  const modes: TransitMode[] = ["bus", "cab", "flight"];
  const modeLabels: Record<TransitMode, { label: string; icon: React.ReactNode }> = {
    bus: { label: "Bus", icon: <Bus className="w-4 h-4" /> },
    cab: { label: "Cab", icon: <MapPin className="w-4 h-4" /> },
    flight: { label: "Flight", icon: <Plane className="w-4 h-4" /> },
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

  // Handle swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    setTouchEnd(e.changedTouches[0].clientX);
    handleSwipe();
  };

  const handleSwipe = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe) {
      // Swipe left - move to next mode
      const currentIndex = modes.indexOf(mode);
      if (currentIndex < modes.length - 1) {
        setMode(modes[currentIndex + 1]);
      }
    }

    if (isRightSwipe) {
      // Swipe right - move to previous mode
      const currentIndex = modes.indexOf(mode);
      if (currentIndex > 0) {
        setMode(modes[currentIndex - 1]);
      }
    }
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

  const currentModeIndex = modes.indexOf(mode);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-lime-900 bg-black sticky top-0 z-50">
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
              <button className="w-10 h-10 rounded-full bg-gray-700 hover:bg-gray-600 transition-colors flex items-center justify-center">
                <User className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <div className="max-w-2xl mx-auto">
          {/* Horizontal Tab Bar with Swipe Support */}
          <div
            ref={tabContainerRef}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
            className="mb-8 border-b border-gray-800 flex gap-8 cursor-pointer select-none"
          >
            {modes.map((modeKey) => (
              <button
                key={modeKey}
                onClick={() => handleModeChange(modeKey)}
                className={`pb-3 font-mono font-bold text-sm transition-all duration-200 flex items-center gap-2 whitespace-nowrap relative ${
                  mode === modeKey ? "text-white" : "text-gray-500 hover:text-gray-400"
                }`}
              >
                {modeLabels[modeKey].icon}
                {modeKey === "bus"
                  ? "Inter-State Bus"
                  : modeKey === "cab"
                  ? "Intra-City Cab"
                  : "Domestic Flight"}

                {/* Neon Lime Underline Indicator */}
                {mode === modeKey && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-lime-400 animate-slide-in" />
                )}
              </button>
            ))}
          </div>

          {/* Search Form */}
          <div className="bg-black border border-gray-800 p-6 rounded-lg mb-6 space-y-5">
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
                  className="pl-14 pr-12 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 h-14 rounded-lg focus:border-lime-400 focus:outline-none transition-all duration-200 focus:shadow-lg focus:shadow-lime-400/20"
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
                        d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0-2c3.314 0 6 2.686 6 6s-2.686 6-6 6-6-2.686-6-6 2.686-6 6-6zm0 10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z"
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
                  className="pl-14 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 h-14 rounded-lg focus:border-lime-400 focus:outline-none transition-all duration-200 focus:shadow-lg focus:shadow-lime-400/20"
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
                  className="pl-14 bg-gray-900 border border-gray-700 text-white h-14 rounded-lg focus:border-lime-400 focus:outline-none transition-all duration-200 focus:shadow-lg focus:shadow-lime-400/20"
                />
              </div>
            </div>

            {/* Compare Button */}
            <Button
              onClick={handleCompare}
              disabled={!searchParams.from || !searchParams.to || !searchParams.date}
              className="w-full bg-lime-400 text-black hover:bg-lime-300 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed font-mono font-bold text-lg py-6 rounded-lg transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:shadow-lime-400/50"
            >
              <Search className="w-5 h-5" />
              Compare Prices
            </Button>
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
            <div className="animate-fade-in">
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
                    className="border border-gray-800 bg-gray-900 p-4 rounded-lg hover:border-lime-400 transition-all duration-150 cursor-pointer group"
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

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-black mt-12">
        <div className="container py-6">
          <p className="text-xs text-gray-600 font-mono text-center">
            © 2026 Compare. Premium Transit Comparison for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
