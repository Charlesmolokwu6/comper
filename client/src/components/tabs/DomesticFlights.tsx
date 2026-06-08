import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Clock, Users, Zap } from "lucide-react";
import { BrandLogo } from "@/components/BrandLogos";

/**
 * Tab 3: Domestic Flights
 * 
 * Features:
 * - Air Matrix Tracker: Aggregates flights from Air Peace, Ibom Air, Green Africa, ValueJet, United Nigeria
 * - Itinerary Expansion: Detailed matrix with departure intervals, seating, baggage, cabin tiers
 * - "Fly vs. Drive" Banner: Smart alert when bus price is close to flight price
 */
export default function DomesticFlights() {
  const [origin, setOrigin] = useState("");
  const [destination, setDestination] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [expandedFlight, setExpandedFlight] = useState<number | null>(null);

  const handleSearch = () => {
    if (origin && destination) {
      setShowResults(true);
    }
  };

  // Mock flight data
  const flights = [
    {
      id: 1,
      airline: "Air Peace",
      departure: "08:00 AM",
      arrival: "09:30 AM",
      duration: "1h 30m",
      economyPrice: "₦28,500",
      businessPrice: "₦45,000",
      economySeats: 45,
      businessSeats: 8,
      baggage: "20kg",
    },
    {
      id: 2,
      airline: "Ibom Air",
      departure: "10:30 AM",
      arrival: "12:00 PM",
      duration: "1h 30m",
      economyPrice: "₦26,000",
      businessPrice: "₦42,000",
      economySeats: 52,
      businessSeats: 12,
      baggage: "20kg",
    },
    {
      id: 3,
      airline: "Green Africa",
      departure: "02:00 PM",
      arrival: "03:30 PM",
      duration: "1h 30m",
      economyPrice: "₦24,500",
      businessPrice: "₦38,000",
      economySeats: 38,
      businessSeats: 6,
      baggage: "15kg",
    },
    {
      id: 4,
      airline: "ValueJet",
      departure: "04:30 PM",
      arrival: "06:00 PM",
      duration: "1h 30m",
      economyPrice: "₦22,000",
      businessPrice: "₦35,000",
      economySeats: 60,
      businessSeats: 10,
      baggage: "15kg",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Search Form */}
      <div className="border border-lime-400 bg-black p-6 space-y-4">
        <h2 className="font-mono font-bold text-lg text-lime-400">SEARCH FLIGHTS</h2>

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

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full bg-lime-400 text-black hover:bg-lime-300 font-mono font-bold transition-all duration-150 active:scale-95"
        >
          SEARCH FLIGHTS
        </Button>
      </div>

      {/* Fly vs Drive Banner */}
      {showResults && (
        <div className="border border-lime-400 bg-black p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-lime-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-mono font-bold text-lime-400 text-sm">FLY VS DRIVE</p>
            <p className="text-xs text-gray-400 font-mono mt-1">
              💡 A luxury bus ticket is available at ₦4,000 — fly for just ₦22,000 with ValueJet and save travel time!
            </p>
          </div>
        </div>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <h3 className="font-mono font-bold text-lime-400">AIR MATRIX TRACKER</h3>
          <div className="grid gap-3">
            {flights.map((flight) => (
              <div key={flight.id} className="border border-lime-900 bg-black overflow-hidden">
                {/* Flight Header */}
                <button
                  onClick={() => setExpandedFlight(expandedFlight === flight.id ? null : flight.id)}
                  className="w-full p-4 hover:bg-black/50 transition-all duration-150"
                >
                  <div className="grid grid-cols-4 gap-4 items-center">
                    <div className="flex items-center gap-2">
                      <BrandLogo provider={flight.airline} size="md" className="text-lime-400" />
                      <p className="font-mono font-bold text-white text-sm">{flight.airline}</p>
                    </div>
                    <div className="flex items-center justify-between text-center">
                      <div>
                        <p className="font-mono font-bold text-white">{flight.departure}</p>
                        <p className="text-xs text-gray-500 font-mono">Depart</p>
                      </div>
                      <div className="text-xs text-gray-500 font-mono">
                        <Clock className="w-3 h-3 inline" /> {flight.duration}
                      </div>
                      <div>
                        <p className="font-mono font-bold text-white">{flight.arrival}</p>
                        <p className="text-xs text-gray-500 font-mono">Arrive</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-mono font-bold text-lime-400">{flight.economyPrice}</p>
                      <p className="text-xs text-gray-500 font-mono">Economy</p>
                    </div>
                  </div>
                </button>

                {/* Expanded Details */}
                {expandedFlight === flight.id && (
                  <div className="border-t border-lime-900 p-4 space-y-4">
                    <p className="text-xs font-mono text-gray-400 mb-3">VIEW DETAILS</p>

                    {/* Economy Section */}
                    <div className="border border-lime-900 p-3 space-y-2">
                      <p className="font-mono font-bold text-lime-400 text-sm">ECONOMY</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 font-mono">PRICE</p>
                          <p className="font-mono font-bold text-white">{flight.economyPrice}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono">SEATS</p>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-lime-400" />
                            <p className="font-mono font-bold text-lime-400">{flight.economySeats}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono">BAGGAGE</p>
                          <p className="font-mono font-bold text-white">{flight.baggage}</p>
                        </div>
                      </div>
                      <Button className="w-full bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs py-1 transition-all duration-150 mt-2">
                        BOOK ECONOMY
                      </Button>
                    </div>

                    {/* Business Section */}
                    <div className="border border-lime-400 p-3 space-y-2 bg-black/50">
                      <p className="font-mono font-bold text-lime-400 text-sm">BUSINESS</p>
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div>
                          <p className="text-gray-500 font-mono">PRICE</p>
                          <p className="font-mono font-bold text-white">{flight.businessPrice}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono">SEATS</p>
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 text-lime-400" />
                            <p className="font-mono font-bold text-lime-400">{flight.businessSeats}</p>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 font-mono">BAGGAGE</p>
                          <p className="font-mono font-bold text-white">{flight.baggage}</p>
                        </div>
                      </div>
                      <Button className="w-full bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs py-1 transition-all duration-150 mt-2">
                        BOOK BUSINESS
                      </Button>
                    </div>
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
            Enter your origin and destination to view available flights
          </p>
        </div>
      )}
    </div>
  );
}
