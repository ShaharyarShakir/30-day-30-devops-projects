import { useEffect, useState, useRef } from "react";
import { DB, GeofenceRegionRecord } from "../lib/db";

export function useGeofence(latitude: number | null, longitude: number | null) {
  const [triggeredRegion, setTriggeredRegion] = useState<GeofenceRegionRecord | null>(null);
  const [regions, setRegions] = useState<GeofenceRegionRecord[]>([]);
  const hasAlerted = useRef<Record<string, boolean>>({});

  useEffect(() => {
    loadRegions();
  }, []);

  const loadRegions = async () => {
    try {
      const activeRegions = await DB.getGeofenceRegions();
      
      // If table is completely empty on first launch, seed default geofences
      if (activeRegions.length === 0) {
        const seedData: GeofenceRegionRecord[] = [
          {
            id: "geo-hotel",
            name: "Nomad Boutique Hotel",
            latitude: 35.6586, // Close to Tokyo coordinates for testing
            longitude: 139.7454,
            radius: 150,
            triggerType: "hotel",
            reminderMessage: "Welcome to The Nomad Boutique Hotel! Opening your check-in confirmation copy... 🏨",
            active: 1,
          },
          {
            id: "geo-museum",
            name: "Landmark Art Museum",
            latitude: 35.6601,
            longitude: 139.7401,
            radius: 100,
            triggerType: "museum",
            reminderMessage: "Arrived at Landmark Art Museum. Here is your entry ticket QR scan card! 🎟️",
            active: 1,
          },
          {
            id: "geo-airport",
            name: "Haneda Airport Terminal 1",
            latitude: 35.5494,
            longitude: 139.7798,
            radius: 300,
            triggerType: "airport",
            reminderMessage: "Entering Haneda Airport. Opening your passport copy and boarding gate pass... ✈️",
            active: 1,
          },
        ];

        for (const item of seedData) {
          await DB.saveGeofenceRegion(item);
        }
        setRegions(seedData);
      } else {
        setRegions(activeRegions);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (latitude === null || longitude === null || regions.length === 0) return;

    // Check distance to all active geofences
    let activeMatch: GeofenceRegionRecord | null = null;

    for (const r of regions) {
      const dLat = r.latitude - latitude;
      const dLng = r.longitude - longitude;
      const distance = Math.round(Math.sqrt(dLat * dLat + dLng * dLng) * 111000); // meters

      if (distance <= r.radius) {
        activeMatch = r;
        
        // Trigger alerts/notifications only once per region boundary crossing
        if (!hasAlerted.current[r.id]) {
          console.log(`[Geofence] Triggered: ${r.name} (${distance}m)`);
          hasAlerted.current[r.id] = true;
        }
        break;
      }
    }

    // Reset alert tracking once you exit all regions
    if (!activeMatch) {
      setTriggeredRegion(null);
    } else if (triggeredRegion?.id !== activeMatch.id) {
      setTriggeredRegion(activeMatch);
    }
  }, [latitude, longitude, regions]);

  const clearAlert = (id: string) => {
    if (triggeredRegion?.id === id) {
      setTriggeredRegion(null);
    }
  };

  return {
    triggeredRegion,
    regions,
    clearAlert,
    reloadGeofences: loadRegions,
  };
}
