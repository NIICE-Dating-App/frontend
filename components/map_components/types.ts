// components/map_components/types.ts

export interface UserMapCard {
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  frame_id: string | null;
  approx_lat: number;
  approx_lng: number;
  main_photo_url: string | null;
  last_seen?: string;
  gender?: string;
  looking_for?: string[] | null;
  access_level?: string;
}

export interface FilterState {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  genders: ('man' | 'woman' | 'nonbinary')[];
  intentions?: string[]; // looking_for filter
  activeToday?: boolean; // filter by last_seen within 24h
}

export interface UserPreferences {
  ageMin: number;
  ageMax: number;
  distanceKm: number;
  interestedIn: string[];
}

export interface MatchStatus {
  status: "pending" | "accepted" | "denied" | "rejected" | null;
  is_requester: boolean;
  match_id: string | null;
  sender_message?: string | null;
}

export type EventCategory = 
  | "food_drinks"
  | "nightlife_party"
  | "outdoors_nature"
  | "sports_fitness"
  | "games_hobbies"
  | "arts_culture_entertainment"
  | "learning_career"
  | "community_volunteering"
  | "romantic_dating"
  | "travel_adventure"
  | "online_virtual"
  | "other";

export type EventType = 'public' | 'public_application' | 'private' | 'invite_only' | 'group_event' | 'community_event';

export interface EventData {
  id: string;
  event_name: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  event_description?: string;
  host_id: string;
  age_min: number;
  age_max: number;
  gender_allowed: string;
  status: string;
  event_type?: EventType;
  accepted_count?: number;
  fuzzy_radius_meters?: number;
  user_application_status?: 'none' | 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface EventTypeDisplayInfo {
  label: string;
  icon: string;
  color: string;
}

export interface CategoryDisplayInfo {
  label: string;
  icon: string;
}