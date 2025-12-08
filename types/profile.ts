export type ProfileAccessLevel = 'full' | 'limited' | 'none';
export type ProfileVisibility = 'public' | 'private';

export interface ActiveFrame {
  id: string;
  media_url: string;
  caption: string | null;
  media_kind: 'image' | 'video';
  created_at: string;
  expires_at: string;
}

export interface Photo {
  id?: number;
  photo_url: string;
  is_main: boolean;
  created_at?: string;
}

export interface Language {
  id: number;
  code: string;
  label: string;
}

export interface Lifestyle {
  drinking?: string | null;
  smoking?: string | null;
  zodiac?: string | null;
  religion?: string | null;
  politics?: string | null;
  workout?: string | null;
  communication?: string | null;
  love_language?: string | null;
  pets?: string | null;
  kids?: string | null;
  communities?: string | null;
}

export interface PromptAnswer {
  slot?: number;
  question?: string;
  title?: string;
  answer: string;
}

export interface ProfileForViewer {
  access_level: ProfileAccessLevel;
  user_id: string;
  
  // Always available (LIMITED + FULL)
  full_name: string | null;
  age: number | null;
  bio: string | null;
  looking_for: string[] | null;
  main_photo_url: string | null;
  
  // FULL access only
  frame_id?: string | null;
  active_frames?: ActiveFrame[];
  gender?: string | null;
  gender_subtype?: string | null;
  sexual_orientation?: string | null;
  show_gender_on_profile?: boolean;
  show_orientation_on_profile?: boolean;
  orientation_custom?: string | null;
  height_cm?: number | null;
  education?: string | null;
  institution?: string | null;
  prompt_answers?: PromptAnswer[] | null;
  marital_status?: string | null;
  vehicles?: string[] | null;
  hometown?: string | null;
  values?: string[] | null;
  photos?: Photo[];
  lifestyle?: Lifestyle | null;
  hobbies?: string[];
  languages?: Language[];
}

// Map card with access level
export interface MapCardUser {
  user_id: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  frame_id: string | null; // null for limited access
  approx_lat: number;
  approx_lng: number;
  main_photo_url: string | null;
  looking_for: string[] | null;
  access_level: ProfileAccessLevel;
}