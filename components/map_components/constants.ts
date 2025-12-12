// components/map_components/constants.ts
// REDESIGNED: Clean theme matching profile.tsx and niices.tsx - NO GRADIENTS
import { Dimensions } from "react-native";
import { scale, verticalScale } from "@/utils/responsive";
import { EventType, EventCategory, EventTypeDisplayInfo, CategoryDisplayInfo } from "./types";

// Theme Colors - Clean design, matching profile.tsx
export const BG = "#F6F8FC";
export const INK = "#0A0E1A";
export const BLUE = "#1B44CD";
export const CARD_BG = "#FFFFFF";
export const BORDER = "rgba(27, 68, 205, 0.08)";

// Legacy BLUES for compatibility
export const BLUES = {
  b00: "#0B1C60",
  b10: "#0D236F",
  b20: "#0F2C8A",
  b30: "#1437A4",
  b40: "#1840B8",
  b50: "#1B44CD",
  b60: "#2D58D6",
  b70: "#3E6BE0",
  b80: "#4E7DE9",
  b90: "#6B95F0",
  b100: "#86A9F5",
  b110: "#A5BFF9",
  b120: "#C4D5FC",
  b130: "#E6EFFF",
} as const;

export const PLACEHOLDER_COLOR = "rgba(10, 14, 26, 0.4)";
export const TAB_HEIGHT = 90;
export const MARKER_BOX = scale(124);
export const PHOTO_SIZE = scale(56);
export const RING_SIZE = scale(60);
export const RING_MAX_SCALE = 2;
export const RING_OFFSET = (MARKER_BOX - RING_SIZE) / 2;
export const DEFAULT_PROFILE_PHOTO: string | null = null;

export const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
export const FALLBACK = { lat: 41.9028, lng: 12.4964 };

export const toRad = (d: number) => (d * Math.PI) / 180;

// Event type display info - using MaterialCommunityIcons names
export const eventTypeDisplayNames: Record<EventType, EventTypeDisplayInfo> = {
  public: { label: "Public", icon: "earth", color: "#22C55E" },
  public_application: { label: "Apply to Join", icon: "clipboard-check-outline", color: "#3B82F6" },
  private: { label: "Private", icon: "lock-outline", color: "#8B5CF6" },
  invite_only: { label: "Invite Only", icon: "email-outline", color: "#F59E0B" },
  group_event: { label: "Group Event", icon: "hand-heart", color: "#EC4899" },
  community_event: { label: "Community", icon: "home-group", color: "#06B6D4" },
};

// Category display info - using MaterialCommunityIcons names
export const categoryDisplayNames: Record<EventCategory, CategoryDisplayInfo> = {
  food_drinks: { label: "Food & Drinks", icon: "food" },
  nightlife_party: { label: "Nightlife & Party", icon: "party-popper" },
  outdoors_nature: { label: "Outdoors & Nature", icon: "tree" },
  sports_fitness: { label: "Sports & Fitness", icon: "basketball" },
  games_hobbies: { label: "Games & Hobbies", icon: "dice-multiple" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "drama-masks" },
  learning_career: { label: "Learning & Career", icon: "book-open-variant" },
  community_volunteering: { label: "Community", icon: "hand-heart" },
  romantic_dating: { label: "Romantic & Dating", icon: "cards-heart" },
  travel_adventure: { label: "Travel & Adventure", icon: "compass" },
  online_virtual: { label: "Online / Virtual", icon: "video" },
  other: { label: "Other", icon: "star" },
};

// Map style - clean blue theme
export const googleBlueStyle: any[] = [
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.park", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: BLUES.b20 }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { width: 3 }] },
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { elementType: "geometry", stylers: [{ color: BLUES.b130 }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: BLUES.b110 }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: BLUES.b90 }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: BLUES.b80 }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#B8E6D5" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#C4E8DB" }] },
  { featureType: "landscape.natural.landcover", elementType: "geometry", stylers: [{ color: "#B8E6D5" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#C4E8DB" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: BLUES.b100 }] },
];