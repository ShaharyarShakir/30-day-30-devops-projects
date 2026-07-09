import { useEffect, useState, useRef } from "react";
import * as Location from "expo-location";
import { DB, GPSLogRecord } from "../lib/db";
import { Alert } from "react-native";

export function useLocation(tripId?: string) {
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [speed, setSpeed] = useState<number>(0);
  const [altitude, setAltitude] = useState<number | null>(null);
  const [trackingActive, setTrackingActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const watchSubscription = useRef<Location.LocationSubscription | null>(null);
  const currentInterval = useRef<number>(10000); // Default 10s

  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  const startTracking = async () => {
    setErrorMsg(null);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setErrorMsg("Location permissions denied.");
        Alert.alert("Permission Denied", "Nomad AI needs location permissions to track your journey and trigger geofences.");
        return;
      }

      setTrackingActive(true);
      
      // Get initial position
      const initialPos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation(initialPos);
      setSpeed(initialPos.coords.speed || 0);
      setAltitude(initialPos.coords.altitude);

      // Begin tracking with adaptive intervals
      await restartWatcher(initialPos.coords.speed || 0);
    } catch (e: any) {
      setErrorMsg(e.message || "Failed to start tracking.");
      setTrackingActive(false);
    }
  };

  const stopTracking = () => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
      watchSubscription.current = null;
    }
    setTrackingActive(false);
  };

  const restartWatcher = async (currentSpeed: number) => {
    if (watchSubscription.current) {
      watchSubscription.current.remove();
    }

    // Battery Optimization: Throttle GPS frequency based on velocity
    let timeInterval = 120000; // Stationary: update every 2 minutes (120,000ms)
    let distanceInterval = 50; // Update every 50 meters
    let accuracy = Location.Accuracy.Balanced;

    if (currentSpeed > 15) {
      // Speeding/Driving (> 54 km/h): fast updates
      timeInterval = 10000; // 10 seconds
      distanceInterval = 200; // 200 meters
      accuracy = Location.Accuracy.High;
    } else if (currentSpeed > 1.5) {
      // Walking/Hiking (> 5.4 km/h): medium updates
      timeInterval = 30000; // 30 seconds
      distanceInterval = 20; // 20 meters
      accuracy = Location.Accuracy.High;
    }

    currentInterval.current = timeInterval;

    watchSubscription.current = await Location.watchPositionAsync(
      {
        accuracy,
        timeInterval,
        distanceInterval,
      },
      async (newLocation) => {
        setLocation(newLocation);
        const newSpeed = newLocation.coords.speed || 0;
        setSpeed(newSpeed);
        setAltitude(newLocation.coords.altitude);

        // Save GPS log locally in SQLite if tripId is active
        if (tripId) {
          const logRecord: GPSLogRecord = {
            id: Math.random().toString(36).substring(7),
            tripId,
            latitude: newLocation.coords.latitude,
            longitude: newLocation.coords.longitude,
            speed: newSpeed,
            altitude: newLocation.coords.altitude || undefined,
            timestamp: new Date(newLocation.timestamp).toISOString(),
            syncStatus: "pending",
          };
          await DB.saveGPSLog(logRecord);
        }

        // Dynamically shift logging profile if velocity moves past thresholds
        if (Math.abs(newSpeed - currentSpeed) > 3) {
          restartWatcher(newSpeed);
        }
      }
    );
  };

  return {
    location,
    speed,
    altitude,
    trackingActive,
    errorMsg,
    startTracking,
    stopTracking,
    currentInterval: currentInterval.current,
  };
}
