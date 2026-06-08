import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MapPin, Navigation, Clock, Users } from "lucide-react";
import { MapWithRoutes } from "@/components/MapWithRoutes";
import { BrandLogo } from "@/components/BrandLogos";

/**
 * Tab 1: Intra-City Cabs
 * 
 * Features:
 * - GPS Smart-Pickup: "Use Current Location" crosshair shortcut
 * - Live Fare Comparison: Real-time pricing from Uber, Bolt, Yango, inDrive, Rida
 * - Google Maps integration with dark-mode styling and neon lime route visualization
 * - Geometric precision with lime borders and minimal shadows
 */
export default function IntraCityCabs() {
  const [pickupLocation, setPickupLocation] = useState("");
  const [dropoffLocation, setDropoffLocation] = useState("");
  const [showResults, setShowResults] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<google.maps.LatLngLiteral | undefined>();
  const [routeDestination, setRouteDestination] = useState<google.maps.LatLngLiteral | undefined>();

  const handleUseCurrentLocation = () => {
    setPickupLocation("📍 Current Location (GPS)");
  };

  const handleSearch = () => {
    if (pickupLocation && dropoffLocation) {
      setShowResults(true);
      // Simulate route origin/destination for demo
      setRouteOrigin({ lat: 6.5244, lng: 3.3792 }); // Lagos starting point
      setRouteDestination({ lat: 6.5500, lng: 3.4000 }); // Destination
    }
  };

  // Mock fare data
  const fares = [
    { provider: "Uber", price: "₦2,450", eta: "5 min", rating: 4.8 },
    { provider: "Bolt", price: "₦2,200", eta: "6 min", rating: 4.7 },
    { provider: "Yango", price: "₦2,100", eta: "8 min", rating: 4.6 },
    { provider: "inDrive", price: "₦1,950", eta: "7 min", rating: 4.5 },
    { provider: "Rida", price: "₦2,300", eta: "9 min", rating: 4.4 },
  ];

  return (
    <div className="space-y-6">
      {/* Map View */}
      <MapWithRoutes
        initialCenter={{ lat: 6.5244, lng: 3.3792 }}
        initialZoom={13}
        onMapReady={(map) => {
          mapRef.current = map;
        }}
        routeOrigin={routeOrigin}
        routeDestination={routeDestination}
        showRoute={showResults}
      />

      {/* Search Form */}
      <div className="border border-lime-400 bg-black p-6 space-y-4">
        <h2 className="font-mono font-bold text-lg text-lime-400">SEARCH RIDE</h2>

        {/* Pickup Location */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-400">PICKUP LOCATION</label>
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-3 w-4 h-4 text-lime-400" />
              <Input
                type="text"
                placeholder="Enter pickup location"
                value={pickupLocation}
                onChange={(e) => setPickupLocation(e.target.value)}
                className="pl-10 bg-black border border-lime-900 text-white placeholder:text-gray-600 font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleUseCurrentLocation}
              className="bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs px-3 transition-all duration-150"
            >
              <Navigation className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Dropoff Location */}
        <div className="space-y-2">
          <label className="text-xs font-mono text-gray-400">DROPOFF LOCATION</label>
          <div className="flex-1 relative">
            <MapPin className="absolute left-3 top-3 w-4 h-4 text-lime-400" />
            <Input
              type="text"
              placeholder="Enter dropoff location"
              value={dropoffLocation}
              onChange={(e) => setDropoffLocation(e.target.value)}
              className="pl-10 bg-black border border-lime-900 text-white placeholder:text-gray-600 font-mono text-sm"
            />
          </div>
        </div>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full bg-lime-400 text-black hover:bg-lime-300 font-mono font-bold transition-all duration-150 active:scale-95"
        >
          COMPARE FARES
        </Button>
      </div>

      {/* Results */}
      {showResults && (
        <div className="space-y-3">
          <h3 className="font-mono font-bold text-lime-400">LIVE FARE COMPARISON</h3>
          <div className="grid gap-3">
            {fares.map((fare, idx) => (
              <div
                key={idx}
                className="border border-lime-900 bg-black p-4 hover:border-lime-400 transition-all duration-150 cursor-pointer group"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BrandLogo provider={fare.provider} size="sm" className="text-lime-400" />
                    <span className="font-mono font-bold text-white">{fare.provider}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400">★ {fare.rating}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-1">PRICE</p>
                    <p className="font-mono font-bold text-lime-400 text-lg">{fare.price}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-1">ETA</p>
                    <div className="flex items-center justify-center gap-1">
                      <Clock className="w-4 h-4 text-lime-400" />
                      <p className="font-mono font-bold text-white">{fare.eta}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-mono mb-1">ACTION</p>
                    <Button
                      className="w-full bg-lime-400 text-black hover:bg-lime-300 font-mono text-xs py-1 transition-all duration-150"
                    >
                      BOOK
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!showResults && (
        <div className="border border-lime-900 bg-black p-12 text-center">
          <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-500 font-mono text-sm">
            Enter your pickup and dropoff locations to compare fares
          </p>
        </div>
      )}
    </div>
  );
}
