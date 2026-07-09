import { useEffect, useState } from "react";

export interface NearbyPlace {
  id: string;
  name: string;
  category: "food" | "coffee" | "atm" | "pharmacy" | "attraction" | "hotel";
  rating: number;
  latitude: number;
  longitude: number;
  distanceMeter: number;
  address: string;
  openNow: boolean;
}

const MASTER_PLACES = [
  { name: "Nomad Cafe & Coffee", category: "coffee", rating: 4.8, latOffset: 0.002, lngOffset: -0.001, address: "202 Travelers Way" },
  { name: "Central Metro Bistro", category: "food", rating: 4.5, latOffset: -0.003, lngOffset: 0.004, address: "14 Station Plaza" },
  { name: "Shibuya Sushi Hub", category: "food", rating: 4.9, latOffset: 0.005, lngOffset: 0.002, address: "Tokio Crossing 4B" },
  { name: "City Center ATM (Visa/MC)", category: "atm", rating: 4.0, latOffset: 0.001, lngOffset: 0.001, address: "HSBC Branch Lobby" },
  { name: "GreenCross Pharmacy 24h", category: "pharmacy", rating: 4.6, latOffset: -0.001, lngOffset: -0.003, address: "78 Medical Lane" },
  { name: "Grand Historic Landmark Museum", category: "attraction", rating: 4.7, latOffset: 0.006, lngOffset: -0.006, address: "1 Cultural Ave" },
  { name: "Sunset Viewpoint Park", category: "attraction", rating: 4.9, latOffset: -0.008, lngOffset: 0.009, address: "Mountain Peak Overlook" },
  { name: "The Nomad Boutique Hotel", category: "hotel", rating: 4.4, latOffset: -0.002, lngOffset: 0.001, address: "12 Suite Boulevard" },
];

export function useNearby(latitude: number | null, longitude: number | null) {
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (latitude === null || longitude === null) {
      setPlaces([]);
      return;
    }

    setLoading(true);
    
    // Simulate query processing delay
    const timer = setTimeout(() => {
      const results = MASTER_PLACES.map((p, idx) => {
        const itemLat = latitude + p.latOffset;
        const itemLng = longitude + p.lngOffset;
        
        // Calculate basic distance in meters (approximation: 111,000 meters per degree lat)
        const dLat = itemLat - latitude;
        const dLng = itemLng - longitude;
        const distanceMeter = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000);

        return {
          id: `place-${idx}`,
          name: p.name,
          category: p.category as any,
          rating: p.rating,
          latitude: itemLat,
          longitude: itemLng,
          distanceMeter,
          address: p.address,
          openNow: Math.random() > 0.2, // 80% open rate mock
        };
      }).sort((a, b) => a.distanceMeter - b.distanceMeter);

      setPlaces(results);
      setLoading(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [latitude, longitude]);

  return {
    places,
    loading,
  };
}
