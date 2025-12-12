// components/map_components/utils.ts
import { useEffect, useState } from "react";
import * as Font from "expo-font";
import { supabase } from "@/lib/supabase";
import { toRad } from "./constants";

// Helper function to convert URL to storage path
export const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

// Sign storage path to get URL
export const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

// Capitalize first letter of each word
export const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Update user location in database
export const updateUserLocationInDB = async (userId: string, lat: number, lng: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        lat: lat,
        lng: lng,
        distance_meters: 4000,
        discoverable: true,
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      console.error("[ERROR] Error updating user location in DB:", error);
      return false;
    } else {
      console.log("User location & last_seen updated in DB:", lat.toFixed(6), lng.toFixed(6));
      return true;
    }
  } catch (error) {
    console.error("[ERROR] Exception updating location:", error);
    return false;
  }
};

// Haversine distance calculation
export const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }): number => {
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
};

// Smooth location point
export const smoothPoint = (
  prev: { lat: number; lng: number }, 
  next: { lat: number; lng: number }, 
  accuracy?: number
): { lat: number; lng: number } => {
  const dist = haversineMeters(prev, next);
  let alpha = dist > 25 ? 0.7 : dist > 10 ? 0.5 : 0.25;
  if ((accuracy ?? 0) > 50 && dist < 15) alpha = Math.min(alpha, 0.15);
  return { 
    lat: prev.lat + alpha * (next.lat - prev.lat), 
    lng: prev.lng + alpha * (next.lng - prev.lng) 
  };
};

// Hook to load Kadwa Bold font
export const useKadwaBold = (): boolean => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let mounted = true;
    Font.loadAsync({ KadwaBold: require("@/assets/fonts/Kadwa-Bold.ttf") })
      .then(() => mounted && setReady(true))
      .catch(() => {});
    return () => { mounted = false; };
  }, []);
  return ready;
};

// Format looking for friend display
export const formatLookingForFriend = (values: string[] | null): string | null => {
  if (!values || values.length === 0) return null;
  
  const displayMap: Record<string, string> = {
    'new_friends_nearby': 'New friends nearby',
    'workout_fitness_buddy': 'Workout/fitness buddy',
    'travel_companions': 'Travel companions',
    'activity_hobby_partners': 'Activity/hobby partners',
    'casual_hangouts': 'Casual hangouts',
    'professional_networking': 'Professional networking',
    'close_friendships': 'Close friendships',
  };
  
  const displayLabels = values.map(v => displayMap[v] || v.replace(/_/g, ' ')).filter(Boolean);
  
  if (displayLabels.length === 0) return null;
  if (displayLabels.length === 1) return displayLabels[0];
  
  const combinations: Record<string, string> = {
    "Activity/hobby partners|||Casual hangouts": "Hobby partners & casual hangouts",
    "Activity/hobby partners|||Close friendships": "Close friends for hobbies",
    "Activity/hobby partners|||New friends nearby": "New local hobby friends",
    "Activity/hobby partners|||Professional networking": "Networking through shared hobbies",
    "Activity/hobby partners|||Travel companions": "Travel & hobby buddies",
    "Activity/hobby partners|||Workout/fitness buddy": "Active hobby & workout buddies",
    "Casual hangouts|||Close friendships": "Close friends & casual hangouts",
    "Casual hangouts|||New friends nearby": "New friends for casual hangouts",
    "Casual hangouts|||Professional networking": "Networking & hangouts",
    "Casual hangouts|||Travel companions": "Travel & casual hangouts",
    "Casual hangouts|||Workout/fitness buddy": "Workout & casual hangouts",
    "Close friendships|||New friends nearby": "Close local friends",
    "Close friendships|||Professional networking": "Close friends & networking",
    "Close friendships|||Travel companions": "Close friends to travel with",
    "Close friendships|||Workout/fitness buddy": "Close friends & workout buddies",
    "New friends nearby|||Professional networking": "Local friends & networking",
    "New friends nearby|||Travel companions": "Local travel buddies",
    "New friends nearby|||Workout/fitness buddy": "Local workout friends",
    "Professional networking|||Travel companions": "Network & travel buddies",
    "Professional networking|||Workout/fitness buddy": "Workout & networking",
    "Travel companions|||Workout/fitness buddy": "Active travel & workout buddies",
  };
  
  if (displayLabels.length === 2) {
    const sorted = [...displayLabels].sort();
    const key = sorted.join("|||");
    return combinations[key] || displayLabels.join(" - ");
  }
  
  const firstTwo = displayLabels.slice(0, 2).sort();
  const key = firstTwo.join("|||");
  return combinations[key] || displayLabels.slice(0, 2).join(" - ");
};

// Get all looking_for items as display labels
export const getAllLookingForLabels = (values: string[] | null): string[] => {
  if (!values || values.length === 0) return [];
  
  const displayMap: Record<string, string> = {
    'new_friends_nearby': 'New friends nearby',
    'workout_fitness_buddy': 'Workout/fitness buddy',
    'travel_companions': 'Travel companions',
    'activity_hobby_partners': 'Activity/hobby partners',
    'casual_hangouts': 'Casual hangouts',
    'professional_networking': 'Professional networking',
    'close_friendships': 'Close friendships',
  };
  
  return values.map(v => displayMap[v] || v.replace(/_/g, ' ')).filter(Boolean);
};