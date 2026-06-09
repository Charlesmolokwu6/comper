import { useState } from "react";
import { MapPin, Bus, Plane, Calendar, Search, Bell, User } from "lucide-react";
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
 * ComparisonApp - Main unified transit comparison interface
 * 
 * Features:
 * - Mode selector (Bus, Cab, Flight)
 * - Search form (FROM, TO, DATE)
 * - Maps only appear after destination is entered
 * - Results display below search form
 * - Clean UI matching reference design
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

  const handleModeChange = (newMode: TransitMode) => {
    setMode(newMode);
    setSearchParams({ ...searchParams, mode: newMode });
    setHasSearched(false);
    setResults([]);
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

  const getModeLabel = () => {
    switch (mode) {
      case "bus":
        return "Inter-State Bus";
      case "cab":
        return "Intra-City Cab";
      case "flight":
        return "Domestic Flight";
    }
  };

  const getModeIcon = () => {
    switch (mode) {
      case "bus":
        return <Bus className="w-5 h-5" />;
      case "cab":
        return <MapPin className="w-5 h-5" />;
      case "flight":
        return <Plane className="w-5 h-5" />;
    }
  };

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
          {/* Mode Selector */}
          <div className="mb-8 flex flex-wrap gap-3 justify-center">
            <button
              onClick={() => handleModeChange("bus")}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-mono font-bold transition-all duration-150 active:scale-95 ${
                mode === "bus"
                  ? "bg-lime-400 text-black shadow-lg shadow-lime-400/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Bus className="w-5 h-5" />
              Inter-State Bus
            </button>
            <button
              onClick={() => handleModeChange("cab")}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-mono font-bold transition-all duration-150 active:scale-95 ${
                mode === "cab"
                  ? "bg-lime-400 text-black shadow-lg shadow-lime-400/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <MapPin className="w-5 h-5" />
              Intra-City Cab
            </button>
            <button
              onClick={() => handleModeChange("flight")}
              className={`flex items-center gap-2 px-6 py-3 rounded-full font-mono font-bold transition-all duration-150 active:scale-95 ${
                mode === "flight"
                  ? "bg-lime-400 text-black shadow-lg shadow-lime-400/50"
                  : "bg-gray-800 text-gray-400 hover:bg-gray-700"
              }`}
            >
              <Plane className="w-5 h-5" />
              Domestic Flight
            </button>
          </div>

          {/* Search Form */}
          <div className="bg-black border border-lime-900 p-8 rounded-lg">
            {/* FROM */}
            <div className="mb-6">
              <label className="block text-gray-400 font-mono text-sm mb-3">
                FROM
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Departure City"
                  value={searchParams.from}
                  onChange={(e) => handleInputChange("from", e.target.value)}
                  className="pl-12 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 h-12 rounded-lg"
                />
              </div>
            </div>

            {/* TO */}
            <div className="mb-6">
              <label className="block text-gray-400 font-mono text-sm mb-3">
                TO
              </label>
              <div className="relative">
                <MapPin className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                <Input
                  type="text"
                  placeholder="Destination City"
                  value={searchParams.to}
                  onChange={(e) => handleInputChange("to", e.target.value)}
                  className="pl-12 bg-gray-900 border border-gray-700 text-white placeholder-gray-600 h-12 rounded-lg"
                />
              </div>
            </div>

            {/* DATE */}
            <div className="mb-8">
              <label className="block text-gray-400 font-mono text-sm mb-3">
                DATE
              </label>
              <div className="relative">
                <Calendar className="absolute left-4 top-4 w-5 h-5 text-gray-500" />
                <Input
                  type="date"
                  value={searchParams.date}
                  onChange={(e) => handleInputChange("date", e.target.value)}
                  className="pl-12 bg-gray-900 border border-gray-700 text-white h-12 rounded-lg"
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

          {/* Map - Only show after search with destination */}
          {hasSearched && searchParams.to && (
            <div className="mt-8">
              <h3 className="font-mono font-bold text-lime-400 mb-4">ROUTE MAP</h3>
              <MapWithRoutes
                initialCenter={{ lat: 6.5244, lng: 3.3792 }}
                initialZoom={13}
                showRoute={true}
                routeOrigin={{ lat: 6.5244, lng: 3.3792 }}
                routeDestination={{ lat: 6.4969, lng: 3.3519 }}
              />
            </div>
          )}

          {/* Results */}
          {hasSearched && results.length > 0 && (
            <div className="mt-8">
              <h3 className="font-mono font-bold text-lime-400 mb-4">
                AVAILABLE {mode === "bus" ? "BUSES" : mode === "cab" ? "CABS" : "FLIGHTS"}
              </h3>
              <div className="grid gap-4">
                {results.map((result) => (
                  <div
                    key={result.id}
                    className="border border-lime-900 bg-gray-900 p-4 rounded-lg hover:border-lime-400 transition-all duration-150 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <BrandLogo
                          provider={result.provider}
                          size="md"
                          className="text-lime-400"
                        />
                        <div>
                          <p className="font-mono font-bold text-white">
                            {result.provider}
                          </p>
                          <p className="text-xs text-gray-500">★ {result.rating}</p>
                        </div>
                      </div>
                      <p className="font-mono font-bold text-lime-400 text-xl">
                        ₦{result.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">
                        ⏱ {result.duration}
                      </span>
                      {result.seats && (
                        <span className="text-gray-400">
                          🪑 {result.seats} seats left
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {hasSearched && results.length === 0 && (
            <div className="mt-8 text-center text-gray-500 font-mono">
              No results found. Try different search parameters.
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-lime-900 bg-black mt-12">
        <div className="container py-6">
          <p className="text-xs text-gray-600 font-mono text-center">
            © 2026 Compare. Premium Transit Comparison for Nigeria.
          </p>
        </div>
      </footer>
    </div>
  );
}
