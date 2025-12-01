//EDIT_MAIN.TSX
import {
  FloatingHeader,
  HeightPickerModal,
  ImageSourceSheet,
  InfoRow,
  LifestyleItem,
  MainPhotoSlot,
  PhotoActionsSheet,
  PhotoSlot,
  PromptCard,
  SectionCard,
  TagChip,
  type PromptAnswer,
  type Slot,
  type SlotsState,
} from "@/components";
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  humanize,
  parseList,
  summarizeList,
  textOnly,
  toStoragePath,
  toTitleCase,
  uniq,
} from "@/components/profileeditutils";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const EXTRA_GAP = scale(12);
const H_PAD = scale(20);
const EXTRA_SLOT_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - EXTRA_GAP * 2) / 3;

// Friend-mode "What I'm looking for" combination display names
const getLookingForDisplayText = (items: string[]): string => {
  if (items.length !== 2) return items[0] || "";

  // Create normalized key (alphabetically sorted, trimmed)
  const sorted = [...items].map((s) => s.trim()).sort();
  const key = sorted.join("|||"); // Use unique separator

  // Define combinations with the same key format (friendship mode)
    // Define combinations with the same key format
  const combinations: Record<string, string> = {
  // Activity / hobby partners combos
  "Activity/hobby partners|||Casual hangouts": "Hobby partners & casual hangouts",
  "Activity/hobby partners|||Close friendships": "Close friends for hobbies",
  "Activity/hobby partners|||New friends nearby": "New local hobby friends",
  "Activity/hobby partners|||Professional networking": "Networking through shared hobbies",
  "Activity/hobby partners|||Travel companions": "Travel & hobby buddies",
  "Activity/hobby partners|||Workout/fitness buddy": "Active hobby & workout buddies",

  // Casual hangouts combos
  "Casual hangouts|||Close friendships": "Close friends & casual hangouts",
  "Casual hangouts|||New friends nearby": "New friends for casual hangouts",
  "Casual hangouts|||Professional networking": "Networking & hangouts",
  "Casual hangouts|||Travel companions": "Travel & casual hangouts",
  "Casual hangouts|||Workout/fitness buddy": "Workout & casual hangouts",

  // Close friendships combos
  "Close friendships|||New friends nearby": "Close local friends",
  "Close friendships|||Professional networking": "Close friends & networking",
  "Close friendships|||Travel companions": "Close friends to travel with",
  "Close friendships|||Workout/fitness buddy": "Close friends & workout buddies",

  // New friends nearby combos
  "New friends nearby|||Professional networking": "Local friends & networking",
  "New friends nearby|||Travel companions": "Local travel buddies",
  "New friends nearby|||Workout/fitness buddy": "Local workout friends",

  // Travel / networking / workout combos
  "Professional networking|||Travel companions": "Network & travel buddies",
  "Professional networking|||Workout/fitness buddy": "Workout & networking",
  "Travel companions|||Workout/fitness buddy": "Active travel & workout buddies",
};


  return combinations[key] || items.join(" · ");


};

type PhotoRow = {
  id: string;
  photo_url: string | null;
  is_main: boolean | null;
  created_at?: string | null;
};

type ProfileRow = {
  full_name?: string | null;
  height_cm?: number | null;
  sexual_orientation?: string | null;
  education?: string | null;
  institution?: string | null;
  interested_in?: string[] | string | null;
  prompt_answers?: { title?: string; answer?: string }[] | null;
};

type LifestyleRow = {
  drinking?: string | null;
  smoking?: string | null;
  workout?: string | null;
  religion?: string | null;
  politics?: string | null;
  kids?: string | null;
  communities?: string[] | null;
  zodiac?: string | null;
  communication?: string | null;
  love_language?: string | null;
  pets?: string | null;
};

type ModesRow = { 
  looking_for_date?: string[] | string | null; 
  value_date?: string[] | string | null;
  looking_for_friend?: string[] | string | null;
  value_friend?: string[] | string | null;
};


type HobbyRow = {
  hobbies_master?: { label?: string | null } | null;
};

const signPath = async (path: string | null) => {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
};

export default function EditProfileScreen() {
  const [isDragging, setIsDragging] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const mainPhotoRef = useRef<View>(null);
  const [mainPhotoLayout, setMainPhotoLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [fullName, setFullName] = useState("");
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [sexualOrientation, setSexualOrientation] = useState<string | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [institution, setInstitution] = useState<string | null>(null);
  const [interestedIn, setInterestedIn] = useState<string[]>([]);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [partnerValues, setPartnerValues] = useState<string[]>([]);
  const [hobbies, setHobbies] = useState<string[]>([]);
  const [communities, setCommunities] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<PromptAnswer[]>([]);
  const [lifestyle, setLifestyle] = useState<{
    drinking: string | null;
    smoking: string | null;
    workout: string | null;
    religion: string | null;
    politics: string | null;
    kids: string | null;
    zodiac: string | null;
    communication: string | null;
    love_language: string | null;
    pets: string | null;
  }>({
    drinking: null,
    smoking: null,
    workout: null,
    religion: null,
    politics: null,
    kids: null,
    zodiac: null,
    communication: null,
    love_language: null,
    pets: null,
  });

  const [slots, setSlots] = useState<SlotsState>({
    main: {},
    extra: [{}, {}, {}] as [Slot, Slot, Slot],
  });
  const [uploadingSlot, setUploadingSlot] = useState<{ kind: "main" | "extra"; index?: number } | null>(
    null
  );

  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetKind, setSheetKind] = useState<"main" | "extra">("main");
  const [sheetIndex, setSheetIndex] = useState(0);
  const [sourceVisible, setSourceVisible] = useState(false);
  const [sourceKind, setSourceKind] = useState<"main" | "extra">("main");
  const [sourceIndex, setSourceIndex] = useState(0);

  const extrasRowIdsRef = useRef<string[]>([]);

  const reloadPhotos = async (userId: string) => {
    try {
      const [mainRes, othersRes] = await Promise.all([
        supabase
          .from("user_photos")
          .select("id, photo_url, is_main")
          .eq("user_id", userId)
          .eq("is_main", true)
          .maybeSingle(),
        supabase
          .from("user_photos")
          .select("id, photo_url, is_main, created_at")
          .eq("user_id", userId)
          .neq("is_main", true)
          .order("created_at", { ascending: true })
          .limit(3),
      ]);

      const mainRow = (mainRes?.data as PhotoRow | null) ?? null;
      let mainSlot: Slot = {};
      if (mainRow?.photo_url) {
        const storage = toStoragePath(mainRow.photo_url);
        mainSlot = {
          id: mainRow.id,
          rawUrl: mainRow.photo_url,
          storagePath: storage ?? undefined,
          signedUrl: (await signPath(storage)) ?? undefined,
        };
      }

      const others: PhotoRow[] = (othersRes?.data as PhotoRow[] | null) ?? [];
      extrasRowIdsRef.current = others.map((r) => r.id);

      const extras: [Slot, Slot, Slot] = [{}, {}, {}];
      for (let i = 0; i < Math.min(3, others.length); i++) {
        const r = others[i];
        if (r.photo_url) {
          const storage = toStoragePath(r.photo_url);
          extras[i] = {
            id: r.id,
            rawUrl: r.photo_url,
            storagePath: storage ?? undefined,
            signedUrl: (await signPath(storage)) ?? undefined,
          };
        } else {
          extras[i] = { id: r.id };
        }
      }

      setSlots({ main: mainSlot, extra: extras });
    } catch (e) {
      console.log("reloadPhotos error:", e);
    }
  };

  const loadProfileData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const [profRes, lifeRes, modesRes, hobbiesRes] = await Promise.all([
  supabase
    .from("profiles")
    .select("full_name, height_cm, sexual_orientation, education, institution, interested_in, prompt_answers")
    .eq("id", userId)
    .single(),
  supabase
    .from("lifestyle")
    .select("drinking, smoking, workout, religion, politics, kids, communities, zodiac, communication, love_language, pets")
    .eq("user_id", userId)
    .maybeSingle(),
  supabase
    .from("user_modes")
    .select("looking_for_friend, value_friend")
    .eq("user_id", userId)
    .eq("mode", "friend")
    .maybeSingle(),
  supabase
    .from("user_hobbies")
    .select("hobbies_master(label)")
    .eq("user_id", userId),
]);

      const p = (profRes?.data ?? {}) as ProfileRow;
      setFullName(toTitleCase((p.full_name ?? "").trim()));

      // Check temp storage for background
      const tempBackgroundKey = `temp_background_${userId}`;
      const tempBackgroundData = await AsyncStorage.getItem(tempBackgroundKey);

      if (tempBackgroundData) {
        const parsed = JSON.parse(tempBackgroundData);
        setEducation(parsed.education || null);
        setInstitution(parsed.institution || null);
      } else {
        setEducation(p.education ?? null);
        setInstitution(p.institution ?? null);
      }

      // Height temp storage check
      const tempHeightKey = `temp_height_${userId}`;
      const tempHeightData = await AsyncStorage.getItem(tempHeightKey);
      if (tempHeightData) {
        const parsed = JSON.parse(tempHeightData);
        setHeightCm(parsed.height);
      } else {
        setHeightCm(p.height_cm ?? null);
      }

      // Orientation temp storage check
      const tempOrientationKey = `temp_orientation_${userId}`;
      const tempOrientationData = await AsyncStorage.getItem(tempOrientationKey);
      if (tempOrientationData) {
        const parsed = JSON.parse(tempOrientationData);
        setSexualOrientation(parsed.normalizedOrientation || null);
      } else {
        setSexualOrientation(p.sexual_orientation ?? null);
      }

      // Who to meet temp storage check
      const tempWhoToMeetKey = `temp_who_to_meet_${userId}`;
      const tempWhoToMeetData = await AsyncStorage.getItem(tempWhoToMeetKey);
      if (tempWhoToMeetData) {
        const parsed = JSON.parse(tempWhoToMeetData);
        const normalized = parsed.normalized || [];
        const labels = normalized.map((e: string) => {
          const titleCase = e.charAt(0).toUpperCase() + e.slice(1);
          return titleCase;
        });
        setInterestedIn(labels);
      } else {
        setInterestedIn(parseList(p.interested_in));
      }

      // Prompts temp storage check
      const tempPromptsKey = `temp_prompts_${userId}`;
      const tempPromptsData = await AsyncStorage.getItem(tempPromptsKey);
      if (tempPromptsData) {
        const parsed = JSON.parse(tempPromptsData);
        const promptAnswers: PromptAnswer[] = parsed.selected || [];
        setPrompts(promptAnswers);
      } else {
        const promptAnswers: PromptAnswer[] = Array.isArray(p.prompt_answers)
          ? p.prompt_answers
              .filter((x: any) => x?.answer && x?.title)
              .map((x: any) => ({ title: String(x.title), answer: String(x.answer) }))
              .slice(0, 3)
          : [];
        setPrompts(promptAnswers);
      }

      // Lifestyle temp storage checks
      const tempCommunicationKey = `temp_communication_${userId}`;
      const tempCommunicationData = await AsyncStorage.getItem(tempCommunicationKey);

      const tempLoveLanguageKey = `temp_love_language_${userId}`;
      const tempLoveLanguageData = await AsyncStorage.getItem(tempLoveLanguageKey);

      const tempZodiacKey = `temp_zodiac_${userId}`;
      const tempZodiacData = await AsyncStorage.getItem(tempZodiacKey);

      const tempPetsKey = `temp_pets_${userId}`;
      const tempPetsData = await AsyncStorage.getItem(tempPetsKey);

      const tempLifestyleKey = `temp_lifestyle_${userId}`;
      const tempLifestyleData = await AsyncStorage.getItem(tempLifestyleKey);

      const l = (lifeRes?.data ?? {}) as LifestyleRow;

      if (tempLifestyleData) {
        const parsed = JSON.parse(tempLifestyleData);
        const lifestyleSelected = parsed.selected || {};

        setLifestyle({
          drinking: lifestyleSelected.drinking ?? (l.drinking ?? null),
          smoking: lifestyleSelected.smoking ?? (l.smoking ?? null),
          workout: lifestyleSelected.workout ?? (l.workout ?? null),
          religion: lifestyleSelected.religion ?? (l.religion ?? null),
          politics: lifestyleSelected.politics ?? (l.politics ?? null),
          kids: lifestyleSelected.kids ?? (l.kids ?? null),
          zodiac: tempZodiacData ? JSON.parse(tempZodiacData).selected : l.zodiac ?? null,
          communication: tempCommunicationData
            ? JSON.parse(tempCommunicationData).selected
            : l.communication ?? null,
          love_language: tempLoveLanguageData
            ? JSON.parse(tempLoveLanguageData).selected
            : l.love_language ?? null,
          pets: tempPetsData ? JSON.parse(tempPetsData).selected : l.pets ?? null,
        });
      } else {
        setLifestyle({
          drinking: l.drinking ?? null,
          smoking: l.smoking ?? null,
          workout: l.workout ?? null,
          religion: l.religion ?? null,
          politics: l.politics ?? null,
          kids: l.kids ?? null,
          zodiac: tempZodiacData ? JSON.parse(tempZodiacData).selected : l.zodiac ?? null,
          communication: tempCommunicationData
            ? JSON.parse(tempCommunicationData).selected
            : l.communication ?? null,
          love_language: tempLoveLanguageData
            ? JSON.parse(tempLoveLanguageData).selected
            : l.love_language ?? null,
          pets: tempPetsData ? JSON.parse(tempPetsData).selected : l.pets ?? null,
        });
      }

      // What I'm Looking For (friend mode) temp storage check
      // What I'm Looking For (friend mode) temp storage check
// What I'm Looking For (friend mode) temp storage check
const tempLookingForKey = `temp_looking_for_${userId}`;
const tempLookingForData = await AsyncStorage.getItem(tempLookingForKey);

const m = (modesRes?.data ?? {}) as ModesRow;

if (tempLookingForData) {
  const parsed = JSON.parse(tempLookingForData);
  setLookingFor(parsed.lookingFor || []);
  setPartnerValues(parsed.partnerValues || []);
} else {
  // Friend-mode enum → display labels
  const LOOKING_FOR_FRIEND_DISPLAY: Record<string, string> = {
    new_friends_nearby: "New friends nearby",
    workout_fitness_buddy: "Workout/fitness buddy",
    travel_companions: "Travel companions",
    activity_hobby_partners: "Activity/hobby partners",
    casual_hangouts: "Casual hangouts",
    professional_networking: "Professional networking",
    close_friendships: "Close friendships",
  };

  // Load looking_for_friend with exact display format
  const lookingForEnums: string[] = Array.isArray(m.looking_for_friend)
    ? m.looking_for_friend
    : [];
  const lookingForDisplay = lookingForEnums
    .map((e) => LOOKING_FOR_FRIEND_DISPLAY[e])
    .filter(Boolean);
  setLookingFor(lookingForDisplay);

  // Load value_friend with generic list parsing (e.g. "loyalty" → "Loyalty")
  setPartnerValues(parseList(m.value_friend));
}



      // Check temp storage for interests & hobbies
      const tempInterestsKey = `temp_interests_hobbies_${userId}`;
      const tempInterestsData = await AsyncStorage.getItem(tempInterestsKey);

      const COMMUNITY_OPTIONS = [
        "🌿 Environmentalism",
        "✊ Social justice",
        "🏳️‍🌈 LGBTQIA+",
        "♀️ Feminism",
        "🧠 Mental health awareness",
        "✊🏾 Black community",
        "🧧 Asian community",
        "🪅 Latino/Hispanic community",
        "✡️ Jewish community",
        "☪️ Muslim community",
        "♿ Disability awareness",
        "💖 Body positivity",
        "🐾 Animal rights",
        "🌍 Climate action",
      ];

      const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, "").trim();
      const normalizeLabel = (s: string) => stripEmoji(s).toLowerCase().trim();

      if (tempInterestsData) {
        const parsed = JSON.parse(tempInterestsData);

        // Keep emojis for display (already in correct format from interests_and_hobbies_edit)
        const hobbyLabels = parsed.hobbies || [];
        setHobbies(hobbyLabels);

        const communityLabels = parsed.communities || [];
        setCommunities(communityLabels);
      } else {
        // Load hobbies from database
        const hs = uniq(
          ((hobbiesRes?.data as HobbyRow[] | null) ?? [])
            .map((x) => x?.hobbies_master?.label)
            .filter(Boolean) as string[]
        );
        setHobbies(hs.map(humanize));

        // Load communities from lifestyle and match with emoji versions
        const communityList = Array.isArray(l.communities) ? l.communities : [];
        const matchedCommunities: string[] = [];

        communityList.forEach((comm: string) => {
          const normalized = normalizeLabel(comm);
          COMMUNITY_OPTIONS.forEach((commWithEmoji) => {
            if (normalizeLabel(commWithEmoji) === normalized) {
              matchedCommunities.push(commWithEmoji);
            }
          });
        });

        setCommunities(matchedCommunities);
      }

      await reloadPhotos(userId);
    } catch (e) {
      console.log("Edit screen load error:", e);
    }
  }, []);

  useEffect(() => {
    loadProfileData();
  }, [loadProfileData]);

  useFocusEffect(
    useCallback(() => {
      loadProfileData();
    }, [loadProfileData])
  );

  const handleSave = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        Alert.alert("Error", "Session not found. Please log in again.");
        return;
      }

      const updates: any = {};

      // Prompts
      const tempPromptsKey = `temp_prompts_${userId}`;
      const tempPromptsData = await AsyncStorage.getItem(tempPromptsKey);
      if (tempPromptsData) {
        const parsed = JSON.parse(tempPromptsData);
        const selected = parsed.selected || [];

        const now = new Date().toISOString();
        const payloadArray = selected.map((s: any) => ({
          slot: s.slot,
          title: s.title,
          category: s.category,
          question: s.question,
          answer: s.answer.trim(),
          updated_at: now,
        }));

        const slot1 = selected.find((s: any) => s.slot === 1);
        const promptValue = slot1 ? slot1.answer.trim() : "";

        updates.prompt_answers = payloadArray;
        updates.prompt = promptValue;

        await AsyncStorage.removeItem(tempPromptsKey);
      }

      // Who to meet
      const tempWhoToMeetKey = `temp_who_to_meet_${userId}`;
      const tempWhoToMeetData = await AsyncStorage.getItem(tempWhoToMeetKey);
      if (tempWhoToMeetData) {
        const parsed = JSON.parse(tempWhoToMeetData);
        updates.interested_in = parsed.normalized;
        await AsyncStorage.removeItem(tempWhoToMeetKey);
      }

      // Orientation
      const tempOrientationKey = `temp_orientation_${userId}`;
      const tempOrientationData = await AsyncStorage.getItem(tempOrientationKey);
      if (tempOrientationData) {
        const parsed = JSON.parse(tempOrientationData);
        updates.sexual_orientation = parsed.normalizedOrientation;
        updates.orientation_custom = parsed.customOrientation.trim() || null;
        updates.show_orientation_on_profile = parsed.showOnProfile;
        await AsyncStorage.removeItem(tempOrientationKey);
      }

      // Height
      const tempHeightKey = `temp_height_${userId}`;
      const tempHeightData = await AsyncStorage.getItem(tempHeightKey);
      if (tempHeightData) {
        const parsed = JSON.parse(tempHeightData);
        updates.height_cm = parsed.height;
        await AsyncStorage.removeItem(tempHeightKey);
      }

      // Lifestyle updates
      const tempCommunicationKey = `temp_communication_${userId}`;
      const tempCommunicationData = await AsyncStorage.getItem(tempCommunicationKey);

      const tempLoveLanguageKey = `temp_love_language_${userId}`;
      const tempLoveLanguageData = await AsyncStorage.getItem(tempLoveLanguageKey);

      const tempZodiacKey = `temp_zodiac_${userId}`;
      const tempZodiacData = await AsyncStorage.getItem(tempZodiacKey);

      const tempPetsKey = `temp_pets_${userId}`;
      const tempPetsData = await AsyncStorage.getItem(tempPetsKey);

      const tempLifestyleKey = `temp_lifestyle_${userId}`;
      const tempLifestyleData = await AsyncStorage.getItem(tempLifestyleKey);

      if (
        tempCommunicationData ||
        tempLoveLanguageData ||
        tempZodiacData ||
        tempPetsData ||
        tempLifestyleData
      ) {
        const lifestyleUpdates: any = { user_id: userId };

        if (tempCommunicationData) {
          const parsed = JSON.parse(tempCommunicationData);
          lifestyleUpdates.communication = parsed.selected;
        }

        if (tempLoveLanguageData) {
          const parsed = JSON.parse(tempLoveLanguageData);
          lifestyleUpdates.love_language = parsed.selected;
        }

        if (tempZodiacData) {
          const parsed = JSON.parse(tempZodiacData);
          lifestyleUpdates.zodiac = parsed.selected;
        }

        if (tempPetsData) {
          const parsed = JSON.parse(tempPetsData);
          lifestyleUpdates.pets = parsed.selected;
        }

        if (tempLifestyleData) {
          const parsed = JSON.parse(tempLifestyleData);
          const lifestyleSelected = parsed.selected || {};
          if (lifestyleSelected.drinking) lifestyleUpdates.drinking = lifestyleSelected.drinking;
          if (lifestyleSelected.smoking) lifestyleUpdates.smoking = lifestyleSelected.smoking;
          if (lifestyleSelected.workout) lifestyleUpdates.workout = lifestyleSelected.workout;
          if (lifestyleSelected.religion) lifestyleUpdates.religion = lifestyleSelected.religion;
          if (lifestyleSelected.politics) lifestyleUpdates.politics = lifestyleSelected.politics;
          if (lifestyleSelected.kids) lifestyleUpdates.kids = lifestyleSelected.kids;
        }

        const { error: lifestyleError } = await supabase
          .from("lifestyle")
          .upsert(lifestyleUpdates, {
            onConflict: "user_id",
          });

        if (lifestyleError) throw lifestyleError;

        if (tempCommunicationData) await AsyncStorage.removeItem(tempCommunicationKey);
        if (tempLoveLanguageData) await AsyncStorage.removeItem(tempLoveLanguageKey);
        if (tempZodiacData) await AsyncStorage.removeItem(tempZodiacKey);
        if (tempPetsData) await AsyncStorage.removeItem(tempPetsKey);
        if (tempLifestyleData) await AsyncStorage.removeItem(tempLifestyleKey);
      }

      // What I'm Looking For (friend mode)
      // What I'm Looking For (friend mode)
const tempLookingForKey = `temp_looking_for_${userId}`;
const tempLookingForData = await AsyncStorage.getItem(tempLookingForKey);
if (tempLookingForData) {
  const parsed = JSON.parse(tempLookingForData);

  const { error: modesError } = await supabase
    .from("user_modes")
    .upsert(
      {
        user_id: userId,
        mode: "friend",
        looking_for_friend: parsed.normalizedLookingFor,
        value_friend: parsed.normalizedValues,
        updated_at: new Date(),
      },
      {
        onConflict: "user_id,mode",
      }
    );

  if (modesError) throw modesError;
  await AsyncStorage.removeItem(tempLookingForKey);
}


      // Interests & Hobbies
      const tempInterestsKey = `temp_interests_hobbies_${userId}`;
      const tempInterestsData = await AsyncStorage.getItem(tempInterestsKey);
      if (tempInterestsData) {
        const parsed = JSON.parse(tempInterestsData);

        // Save hobbies
        if (parsed.hobbies && parsed.hobbies.length > 0) {
          const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, "").trim();
          const normalizeHobby = (s: string) => stripEmoji(s).toLowerCase().trim();

          const cleaned: string[] = Array.from(new Set(parsed.hobbies.map(normalizeHobby)));

          // Fetch the master IDs
          const { data: masters, error: selectError } = await supabase
            .from("hobbies_master")
            .select("id,label");
          if (selectError) throw selectError;

          // Build a label->id map
          const map: Record<string, number> = {};
          (masters ?? []).forEach((m: any) => {
            const key = normalizeHobby(m.label);
            if (!(key in map)) map[key] = m.id;
          });

          const found = cleaned
            .map((c) => ({ c, id: map[c] }))
            .filter((x) => !!x.id) as { c: string; id: number }[];

          // Clear old entries
          const { error: delErr } = await supabase
            .from("user_hobbies")
            .delete()
            .eq("user_id", userId);
          if (delErr) throw delErr;

          // Insert new ones
          if (found.length > 0) {
            const rows = found.map((f) => ({ user_id: userId, hobby_id: f.id }));
            const { error: insErr } = await supabase.from("user_hobbies").insert(rows);
            if (insErr) throw insErr;
          }
        }

        // Save communities to lifestyle table
        if (parsed.communities) {
          const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, "").trim();
          const communityLabels = parsed.communities.map(stripEmoji);

          const { error: commError } = await supabase
            .from("lifestyle")
            .upsert(
              {
                user_id: userId,
                communities: communityLabels.length > 0 ? communityLabels : null,
              },
              {
                onConflict: "user_id",
              }
            );

          if (commError) throw commError;
        }

        await AsyncStorage.removeItem(tempInterestsKey);
      }

      // Background (Education & Institution)
      const tempBackgroundKey = `temp_background_${userId}`;
      const tempBackgroundData = await AsyncStorage.getItem(tempBackgroundKey);
      if (tempBackgroundData) {
        const parsed = JSON.parse(tempBackgroundData);
        if (parsed.education !== undefined) updates.education = parsed.education;
        if (parsed.institution !== undefined) updates.institution = parsed.institution;
        await AsyncStorage.removeItem(tempBackgroundKey);
      }

      if (Object.keys(updates).length > 0) {
        const { error } = await supabase.from("profiles").update(updates).eq("id", userId);

        if (error) throw error;
      }

      Alert.alert("Success", "Your profile has been updated!");
      router.back();
    } catch (error: any) {
      console.error("Save error:", error);
      Alert.alert("Error", error?.message ?? "Failed to save changes.");
    }
  };

  const chooseFromLibrary = async (): Promise<string | null> => {
    try {
      console.log("Opening library picker...");
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      console.log("Library result:", result);
      if (!result.canceled && result.assets?.[0]) {
        console.log("Image selected:", result.assets[0].uri);
        return result.assets[0].uri;
      } else {
        console.log("Library selection cancelled");
        return null;
      }
    } catch (error) {
      console.error("Library error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", "Library failed: " + errorMessage);
      return null;
    }
  };

  const takePhotoWithCamera = async (): Promise<string | null> => {
    try {
      console.log("Take photo clicked");

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Required", "Camera access is required to take photos.");
        return null;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"] as any,
        allowsEditing: true,
        aspect: [4, 5],
        quality: 0.8,
      });

      console.log("Camera result:", result);
      if (!result.canceled && result.assets?.[0]) {
        console.log("Photo taken:", result.assets[0].uri);
        return result.assets[0].uri;
      } else {
        console.log("Camera cancelled");
        return null;
      }
    } catch (error) {
      console.error("Camera error:", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      Alert.alert("Error", "Camera failed: " + errorMessage);
      return null;
    }
  };

  const uploadToSupabase = async (userId: string, localUri: string) => {
    try {
      const res = await fetch(localUri);
      const arrayBuffer = await res.arrayBuffer();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage
        .from("user_photos")
        .upload(fileName, arrayBuffer, {
          contentType: "image/jpeg",
          cacheControl: "3600",
          upsert: false,
        });
      if (error) {
        Alert.alert("Upload Failed", "Unable to upload photo. Please try again.");
        return null;
      }
      const signedUrl = await signPath(fileName);
      if (!signedUrl) {
        Alert.alert("Error", "Failed to process uploaded photo");
        return null;
      }
      return { storagePath: fileName, signedUrl };
    } catch (e) {
      console.log("Upload exception:", e);
      Alert.alert("Upload Failed", "An unexpected error occurred");
      return null;
    }
  };

  const uploadUriToSlot = async (kind: "main" | "extra", index: number | undefined, imageUri: string) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      setUploadingSlot({ kind, index });

      const uploaded = await uploadToSupabase(userId, imageUri);
      if (!uploaded) {
        setUploadingSlot(null);
        return;
      }

      if (kind === "main") {
        await supabase.from("user_photos").update({ is_main: false }).eq("user_id", userId);
        if (slots.main.id) {
          await supabase
            .from("user_photos")
            .update({ photo_url: uploaded.storagePath, is_main: true })
            .eq("id", slots.main.id);
        } else {
          await supabase
            .from("user_photos")
            .insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: true });
        }
      } else {
        const i = index ?? 0;
        const target = slots.extra[i];
        if (target.id) {
          await supabase
            .from("user_photos")
            .update({ photo_url: uploaded.storagePath, is_main: false })
            .eq("id", target.id);
        } else {
          await supabase
            .from("user_photos")
            .insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: false });
        }
      }

      await reloadPhotos(userId);
      setUploadingSlot(null);
    } catch (e) {
      console.log("uploadUriToSlot error:", e);
      setUploadingSlot(null);
      Alert.alert("Error", "Failed to update photo");
    }
  };

  const openSheet = (k: "main" | "extra", i = 0) => {
    setSheetKind(k);
    setSheetIndex(i);
    setSheetVisible(true);
  };

  const openSourceSheet = (k: "main" | "extra", i = 0) => {
    setSourceKind(k);
    setSourceIndex(i);
    setSourceVisible(true);
  };

  const onChangeFromSheet = () => openSourceSheet(sheetKind, sheetIndex);
  const onRemoveFromSheet = () => (sheetKind === "main" ? removeSlot("main") : removeSlot("extra", sheetIndex));
  const onSetMainFromSheet = () => sheetKind === "extra" && setAsMainFromExtra(sheetIndex);

  const onPickLibrary = async () => {
    console.log("Choose library tapped");
    try {
      const uri = await chooseFromLibrary();
      if (uri) {
        console.log("Got URI from library, uploading...");
        await uploadUriToSlot(sourceKind, sourceIndex, uri);
      } else {
        console.log("Library selection cancelled");
      }
    } catch (error) {
      console.error("Error in onPickLibrary:", error);
    } finally {
      setSourceVisible(false);
    }
  };

  const onPickCamera = async () => {
    console.log("Take photo tapped");
    try {
      const uri = await takePhotoWithCamera();
      if (uri) {
        console.log("Got URI from camera, uploading...");
        await uploadUriToSlot(sourceKind, sourceIndex, uri);
      } else {
        console.log("Camera cancelled");
      }
    } catch (error) {
      console.error("Error in onPickCamera:", error);
    } finally {
      setSourceVisible(false);
    }
  };

  const setAsMainFromExtra = async (index: number) => {
    const candidate = slots.extra[index];
    if (!candidate.id) return;
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;
      await supabase.from("user_photos").update({ is_main: false }).eq("user_id", userId);
      await supabase.from("user_photos").update({ is_main: true }).eq("id", candidate.id);
      await reloadPhotos(userId);
    } catch (e) {
      console.log("setAsMainFromExtra error:", e);
    }
  };

  const removeSlot = async (kind: "main" | "extra", index?: number) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      if (kind === "main") {
        if (!slots.main.id) return;
        await supabase.from("user_photos").delete().eq("id", slots.main.id);
        const firstExtra = slots.extra.find((x) => x.id);
        if (firstExtra?.id) await supabase.from("user_photos").update({ is_main: true }).eq("id", firstExtra.id);
      } else {
        const i = index ?? 0;
        const target = slots.extra[i];
        if (!target.id) return;
        await supabase.from("user_photos").delete().eq("id", target.id);
      }
      await reloadPhotos(userId);
    } catch (e) {
      console.log("removeSlot error:", e);
    }
  };

  const saveHeight = async (h: number) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const tempKey = `temp_height_${userId}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({ height: h }));

      setHeightCm(h);
      setHeightModalVisible(false);
    } catch (e) {
      console.log("Error saving height:", e);
    }
  };

  const persistExtrasOrder = async (newOrder: Slot[]) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const { data: rows } = await supabase
        .from("user_photos")
        .select("id, photo_url, is_main, created_at")
        .eq("user_id", userId)
        .neq("is_main", true)
        .order("created_at", { ascending: true })
        .limit(3);

      if (!rows) return;

      for (let i = 0; i < Math.min(3, rows.length); i++) {
        const desired = newOrder[i];
        const newPath = desired?.storagePath ?? null;
        await supabase.from("user_photos").update({ photo_url: newPath, is_main: false }).eq("id", rows[i].id);
      }
    } catch (e) {
      console.log("persistExtrasOrder error:", e);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FloatingHeader title="Edit Profile" fullName={fullName} onSave={handleSave} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces
      >
        <View style={styles.photosSection}>
          <View style={styles.mainTitleRow}>
            <Ionicons
              name="images-outline"
              size={22}
              color={Colors.BLUE}
              style={styles.mainTitleIcon}
            />
            <Text style={styles.mainSectionTitle}>Photos</Text>
          </View>
          <Text style={styles.sectionHint}>Tap to add/change, drag to reorder</Text>

          <View style={styles.mainPhotoWrapper}>
            <MainPhotoSlot
              slot={slots.main}
              onPress={() => {
                if (slots.main?.signedUrl) {
                  openSheet("main");
                } else {
                  openSourceSheet("main");
                }
              }}
              onLongPress={() => slots.main.id && openSheet("main")}
              isUploading={uploadingSlot?.kind === "main"}
            />
          </View>

          <View style={{ marginTop: verticalScale(8), marginHorizontal: -H_PAD }}>
            <DraggableFlatList
              horizontal
              data={slots.extra.map((s, i) => ({
                ...s,
                key: `extra-${i}-${s.id ?? "empty"}`,
              }))}
              keyExtractor={(item) => item.key as string}
              containerStyle={{ paddingHorizontal: H_PAD }}
              contentContainerStyle={{ paddingRight: 0 }}
              onDragEnd={async ({ data }) => {
                const arranged: [Slot, Slot, Slot] = [
                  data[0] ?? {},
                  data[1] ?? {},
                  data[2] ?? {},
                ] as [Slot, Slot, Slot];
                setSlots((prev) => ({ ...prev, extra: arranged }));
                await persistExtrasOrder(arranged as Slot[]);
              }}
              activationDistance={8}
              scrollEnabled={false}
              showsHorizontalScrollIndicator={false}
              renderItem={(params: RenderItemParams<Slot>) => {
                const { item, drag, getIndex } = params;
                const idx = (typeof getIndex === "function" ? getIndex() : 0) ?? 0;
                return (
                  <View
                    style={{
                      width: EXTRA_SLOT_WIDTH,
                      marginRight: idx < 2 ? EXTRA_GAP : 0,
                    }}
                  >
                    <PhotoSlot
                      slot={item}
                      label={`Photo ${idx + 2}`}
                      onPress={() => {
                        if (item?.signedUrl) {
                          openSheet("extra", idx);
                        } else {
                          openSourceSheet("extra", idx);
                        }
                      }}
                      onLongPress={() => (item?.signedUrl ? drag() : undefined)}
                      index={idx + 1}
                      isUploading={
                        uploadingSlot?.kind === "extra" && uploadingSlot.index === idx
                      }
                      width={EXTRA_SLOT_WIDTH}
                    />
                  </View>
                );
              }}
            />
          </View>
        </View>

        <SectionCard
          title="My Prompts"
          icon={<Ionicons name="chatbubbles-outline" size={20} color={Colors.BLUE} />}
          action={() => router.push("/(edit_profile)/prompts_edit")}
        >
          {prompts.length ? (
            <View style={styles.promptsList}>
              {prompts.map((p, i) => (
                <PromptCard key={`${p.title}-${i}`} prompt={p} index={i} />
              ))}
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPromptButton}
              onPress={() => router.push("/(edit_profile)/prompts_edit")}
            >
              <View style={styles.addPromptGradient} />
              <Text style={styles.addPromptText}>+ Add Prompts</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        <SectionCard
          title="Identity"
          icon={<MaterialCommunityIcons name="drama-masks" size={20} color={Colors.BLUE} />}
        >
          <InfoRow
            label="Sexual Orientation"
            value={sexualOrientation ? humanize(sexualOrientation) : "Add orientation"}
            onPress={() => router.push("/(edit_profile)/identity/orientation_edit")}
            showArrow
          />
          <InfoRow
            label="Who I'd Like to Meet"
            value={
              interestedIn.length === 3 &&
              interestedIn.includes("Woman") &&
              interestedIn.includes("Man") &&
              interestedIn.includes("Nonbinary")
                ? "All"
                : summarizeList(interestedIn)
            }
            onPress={() => router.push("/(edit_profile)/identity/who_to_meet_edit")}
            showArrow
          />
          <InfoRow
            label="Height"
            value={heightCm ? `${heightCm} cm` : "Add height"}
            onPress={() => setHeightModalVisible(true)}
            showArrow
          />
        </SectionCard>

        <SectionCard
          title="My Essentials"
          icon={<Ionicons name="sparkles-outline" size={20} color={Colors.BLUE} />}
        >
          <InfoRow
            label="Communication Style"
            value={
              lifestyle.communication ? textOnly(lifestyle.communication) : "Add style"
            }
            onPress={() => router.push("/(edit_profile)/my_essentials/communication_edit")}
            showArrow
          />
          <InfoRow
            label="Love Language"
            value={lifestyle.love_language ? textOnly(lifestyle.love_language) : "Add language"}
            onPress={() => router.push("/(edit_profile)/my_essentials/love_language_edit")}
            showArrow
          />
          <InfoRow
            label="Zodiac Sign"
            value={lifestyle.zodiac ? textOnly(lifestyle.zodiac) : "Add sign"}
            onPress={() => router.push("/(edit_profile)/my_essentials/zodiac_sign_edit")}
            showArrow
          />
          <InfoRow
            label="Pets"
            value={lifestyle.pets ? textOnly(lifestyle.pets) : "Add pets"}
            onPress={() => router.push("/(edit_profile)/my_essentials/pets_edit")}
            showArrow
          />
        </SectionCard>

        <SectionCard
          title="What I'm Looking For"
          icon={<MaterialCommunityIcons name="heart-outline" size={20} color={Colors.BLUE} />}
          action={() => router.push("/(edit_profile)/what_im_looking_for_edit")}
        >
          <View style={styles.tagsList}>
            {lookingFor.length ? (
              lookingFor.length === 2 ? (
                <TagChip
                  key="looking-for-combined"
                  label={getLookingForDisplayText(lookingFor)}
                />
              ) : lookingFor.length === 1 ? (
                <TagChip key={lookingFor[0]} label={lookingFor[0]} />
              ) : (
                lookingFor.map((v, i) => <TagChip key={`${v}-${i}`} label={v} />)
              )
            ) : (
              <Text style={styles.emptyText}>Not specified</Text>
            )}
          </View>
          <Text style={styles.subSectionTitle}>Values in a Partner</Text>
          <View style={styles.tagsList}>
            {partnerValues.length ? (
              partnerValues.map((v, i) => <TagChip key={`${v}-${i}`} label={v} />)
            ) : (
              <Text style={styles.emptyText}>Not specified</Text>
            )}
          </View>
        </SectionCard>

        <SectionCard
          title="Lifestyle"
          icon={<Ionicons name="star-outline" size={20} color={Colors.BLUE} />}
          action={() => router.push("/(edit_profile)/lifestyle_edit")}
        >
          <View style={styles.lifestyleGrid}>
            <View style={styles.lifestyleRow}>
              {lifestyle.drinking && (
                <LifestyleItem
                  icon={
                    <MaterialCommunityIcons
                      name="glass-wine"
                      size={30}
                      color={Colors.BLUE}
                    />
                  }
                  value={textOnly(lifestyle.drinking)}
                />
              )}
              {lifestyle.smoking && (
                <LifestyleItem
                  icon={
                    <MaterialCommunityIcons name="smoking" size={30} color={Colors.BLUE} />
                  }
                  value={textOnly(lifestyle.smoking)}
                />
              )}
              {lifestyle.workout && (
                <LifestyleItem
                  icon={
                    <MaterialCommunityIcons name="dumbbell" size={30} color={Colors.BLUE} />
                  }
                  value={textOnly(lifestyle.workout)}
                />
              )}
            </View>
            <View style={styles.lifestyleRow}>
              {lifestyle.religion && (
                <LifestyleItem
                  icon={
                    <FontAwesome5
                      name="praying-hands"
                      size={28}
                      color={Colors.BLUE}
                    />
                  }
                  value={textOnly(lifestyle.religion)}
                />
              )}
              {lifestyle.politics && (
                <LifestyleItem
                  icon={
                    <MaterialCommunityIcons name="bank" size={30} color={Colors.BLUE} />
                  }
                  value={textOnly(lifestyle.politics)}
                />
              )}
              {lifestyle.kids && (
                <LifestyleItem
                  icon={
                    <MaterialCommunityIcons
                      name="baby-face-outline"
                      size={30}
                      color={Colors.BLUE}
                    />
                  }
                  value={textOnly(lifestyle.kids)}
                />
              )}
            </View>
          </View>
        </SectionCard>

        <SectionCard
          title="Interests & Hobbies"
          icon={<MaterialCommunityIcons name="palette-outline" size={20} color={Colors.BLUE} />}
          action={() => router.push("/(edit_profile)/interests_and_hobbies_edit")}
        >
          <View style={styles.tagsList}>
            {hobbies.length ? (
              hobbies.map((h, i) => <TagChip key={`${h}-${i}`} label={h} />)
            ) : (
              <Text style={styles.emptyText}>Add your hobbies</Text>
            )}
          </View>
          {!!communities.length && (
            <>
              <Text style={styles.subSectionTitle}>Communities I Support</Text>
              <View style={styles.tagsList}>
                {communities.map((c, i) => (
                  <TagChip key={`${c}-${i}`} label={c} />
                ))}
              </View>
            </>
          )}
        </SectionCard>

        <SectionCard
          title="Background"
          icon={<MaterialCommunityIcons name="school-outline" size={20} color={Colors.BLUE} />}
          action={() => router.push("/(edit_profile)/background_edit")}
        >
          <InfoRow
            label="Education"
            value={education ? humanize(education) : "Add education"}
          />
          <InfoRow
            label="Institution"
            value={institution ? humanize(institution) : "Add institution"}
          />
        </SectionCard>
      </ScrollView>

      <HeightPickerModal
        visible={heightModalVisible}
        onClose={() => setHeightModalVisible(false)}
        onSave={saveHeight}
        initialHeight={heightCm}
      />

      <PhotoActionsSheet
        visible={sheetVisible}
        onClose={() => setSheetVisible(false)}
        canSetMain={sheetKind === "extra" && !!slots.extra[sheetIndex]?.id}
        onChange={onChangeFromSheet}
        onSetMain={onSetMainFromSheet}
        onRemove={onRemoveFromSheet}
      />

      <ImageSourceSheet
        visible={sourceVisible}
        onClose={() => setSourceVisible(false)}
        onPickLibrary={onPickLibrary}
        onPickCamera={onPickCamera}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(100),
    paddingBottom: verticalScale(30),
  },
  photosSection: {
    paddingHorizontal: H_PAD,
    paddingTop: verticalScale(-20),
    marginBottom: verticalScale(25),
  },
  mainTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  mainTitleIcon: {
    marginRight: scale(6),
  },
  mainSectionTitle: {
    fontSize: scale(22),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  sectionHint: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.45)",
    marginBottom: verticalScale(15),
    textAlign: "center",
  },
  mainPhotoWrapper: {
    alignItems: "center",
    marginTop: verticalScale(10),
    marginBottom: verticalScale(20),
  },
  extraPhotosGrid: {
    paddingHorizontal: 0,
  },
  promptsList: {
    gap: verticalScale(12),
  },
  addPromptButton: {
    height: verticalScale(50),
    borderRadius: scale(14),
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.15)",
    borderStyle: "dashed",
    backgroundColor: "#EEF4FF",
  },
  addPromptGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(220,232,255,0.3)",
  },
  addPromptText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },
  tagsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginTop: verticalScale(8),
  },
  subSectionTitle: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptyText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    fontStyle: "italic",
  },
  lifestyleGrid: {
    gap: verticalScale(12),
  },
  lifestyleRow: {
    flexDirection: "row",
    gap: scale(12),
  },
});