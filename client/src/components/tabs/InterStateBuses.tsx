import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Users, ChevronDown } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogos";

/**
 * Tab 2: Inter-State Buses
 * 
 * Features:
 * - "Nearest Car Park" Radar: 5km proximity search for loading terminals
 * - Advanced Timetable: Multiple daily departures with real-time seat tracking
 * - Terminal Identification: Specifies which park the bus leaves from
 */
export default function InterStateBuses() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [expandedBus, setExpandedBus] = useState<number | null>(null);

  const handleSearch = () => {
    if (origin && destination) {
      setShowResults(true);
    }
  };

  // Mock bus data with multiple departures
  const buses = [
    {
      id: 1,
      company: "Libra Motors",
      terminal: "Jibowu Terminal",
      departures: [
        { time: "06:00 AM", seats: 12, price: "₦3,500" },
        { time: "09:30 AM", seats: 5, price: "₦3,500" },
        { time: "02:00 PM", seats: 18, price: "₦3,500" },
        { time: "06:00 PM", seats: 8, price: "₦4,000" },
      ],
    },
    {
      id: 2,
      company: "Okeyson Transports",
      terminal: "Berger Terminal",
      departures: [
        { time: "07:00 AM", seats: 3, price: "₦3,200" },
        { time: "11:00 AM", seats: 15, price: "₦3,200" },
        { time: "03:30 PM", seats: 22, price: "₦3,200" },
        { time: "07:30 PM", seats: 10, price: "₦3,800" },
      ],
    },
    {
      id: 3,
      company: "GIGM",
      terminal: "Ojota Terminal",
      departures: [
        { time: "05:30 AM", seats: 6, price: "₦4,200" },
        { time: "10:00 AM", seats: 19, price: "₦4,200" },
        { time: "01:00 PM", seats: 25, price: "₦4,200" },
        { time: "05:00 PM", seats: 14, price: "₦4,800" },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="border border-lime-400 bg-black p-6 space-y-4">
        <h2 className="font-mono font-bold text-lg text-lime-400">SEARCH BUSES</h2>

        {/* Origin */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-400">ORIGIN</label>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-lime-400" />
            <Input
              type="text"
              placeholder="Enter origin city"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="pl-10 bg-black border border-lime-900 text-white placeholder:text-gray-600 font-mono text-sm"
            />
          </div>
        </div>

        {/* Destination */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-400">DESTINATION</label>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-lime-400" />
            <Input
              type="text"
              placeholder="Enter destination city"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="pl-10 bg-black border border-lime-900 text-white placeholder:text-gray-600 font-mono text-sm"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            className="bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs transition-all duration-150"
          >
            📍 NEAREST PARK
          </Button>
          <Button
            onClick={handleSearch}
            className="bg-lime-400 text-black hover:bg-lime-300 font-mono font-bold transition-all duration-150 active:scale-95"
          >
            SEARCH
          </Button>
        </div>
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <h3 className="font-mono font-bold text-lime-400">AVAILABLE BUSES</h3>
          <div className="grid gap-3">
            {buses.map((bus) => (
              <div key={bus.id} className="border border-lime-900 bg-black overflow-hidden">
                {/* Bus Header */}
                <button
                  onClick={() => setExpandedBus(expandedBus === bus.id ? null : bus.id)}
                  className="w-full p-4 hover:bg-black/50 transition-all duration-150 flex items-center justify-between"
                >
                  <div className="text-left flex items-center gap-3">
                    <BrandLogo provider={bus.company} size="md" className="text-lime-400" />
                    <div>
                      <p className="font-mono font-bold text-white">{bus.company}</p>
                      <p className="text-xs text-gray-500 font-mono mt-1">
                        Terminal: {bus.terminal}
                      </p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-lime-400 transition-transform duration-200 ${
                      expandedBus === bus.id ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Expanded Timetable */}
                {expandedBus === bus.id && (
                  <div className="border-t border-lime-900 p-4 space-y-3">
                    <p className="text-xs font-mono text-gray-400 mb-3">
                      VIEW SEATS & TIMES
                    </p>
                    {bus.departures.map((dep, idx) => (
                      <div
                        key={idx}
                        className="grid grid-cols-4 gap-2 items-center p-3 bg-black border border-lime-900 hover:border-lime-400 transition-all duration-150"
                      >
                        <div>
                          <p className="text-xs text-gray-500 font-mono">TIME</p>
                          <p className="font-mono font-bold text-white text-sm">{dep.time}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono">SEATS</p>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-lime-400" />
                            <p className="font-mono font-bold text-lime-400">{dep.seats}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 font-mono">PRICE</p>
                          <p className="font-mono font-bold text-lime-400">{dep.price}</p>
                        </div>
                        <Button
                          className="bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs py-1 transition-all duration-150"
                        >
                          BOOK
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showResults && (
        <div className="border border-lime-900 bg-black p-12 text-center">
          <MapPin className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 font-mono text-sm">
            Enter your origin and destination to view available buses
          </p>
        </div>
      )}
    </div>
  );
}
