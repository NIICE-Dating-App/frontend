import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActiveFramesModal from "../(frames)/active_frames";

// Import components from edit_main
import {
  type PromptAnswer,
} from "@/components";
import { Colors } from "@/components/theme";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

const AVATAR_SIZE = scale(150);

// Utils
const toTitleCase = (str: string | null | undefined): string =>
  str?.toLowerCase().split(" ").map(w => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(" ") || "";

const humanize = (s: string | null | undefined): string =>
  toTitleCase((s ?? "").replace(/_/g, " "));

const formatLifestyleValue = (key: string, value: string | null | undefined): string => {
  if (!value) return "";
  const v = humanize(value);
  const pure = (key || "").split(".").pop() || key;
  const trimKeys = ["drinking","smoking","zodiac","religion","workout","communication","love_language","pets","kids","politics"];
  if (trimKeys.includes(pure)) {
    const i = v.indexOf(" ");
    return i !== -1 ? v.substring(i + 1) : v;
  }
  return v;
};

const getNameFontSize = (len: number): number => {
  if (len <= 7) return scale(26);
  if (len <= 12) return scale(24);
  if (len <= 17) return scale(22);
  if (len <= 20) return scale(20);
  return scale(18);
};

const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/","/object/public/user_photos/","/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

// ========== ADD THIS FUNCTION HERE ==========
// Combination display logic for "What I'm Looking For"
const getCombinedLookingFor = (options: string[]): string => {
  if (!options || options.length === 0) return "";
  if (options.length === 1) return options[0];
  
  const combinations: Record<string, string> = {
    // Marriage combinations (alphabetically first)
    "Figuring it out|||Marriage": "Marriage, figuring it out",
    "Fun, casual dates|||Marriage": "Marriage, open to casual",
    "Intimacy|||Marriage": "Marriage, open to intimacy",
    "Life partner|||Marriage": "Marriage or life partner",
    "Long-term relationship|||Marriage": "Marriage or long-term",
    "Marriage|||Short-term relationship": "Marriage, open to short-term",
    
    // Life partner combinations
    "Figuring it out|||Life partner": "Life partner, figuring it out",
    "Fun, casual dates|||Life partner": "Life partner, open to casual",
    "Intimacy|||Life partner": "Life partner, open to intimacy",
    "Life partner|||Long-term relationship": "Life partner or long-term",
    "Life partner|||Short-term relationship": "Life partner, open to short-term",
    
    // Long-term relationship combinations
    "Figuring it out|||Long-term relationship": "Long-term, figuring it out",
    "Fun, casual dates|||Long-term relationship": "Long-term, open to casual",
    "Intimacy|||Long-term relationship": "Long-term, open to intimacy",
    "Long-term relationship|||Short-term relationship": "Long-term, open to short-term",
    
    // Short-term relationship combinations
    "Figuring it out|||Short-term relationship": "Short-term, figuring it out",
    "Fun, casual dates|||Short-term relationship": "Short-term or casual dates",
    "Intimacy|||Short-term relationship": "Short-term, open to intimacy",
    
    // Fun, casual dates combinations
    "Figuring it out|||Fun, casual dates": "Casual dates, figuring it out",
    "Fun, casual dates|||Intimacy": "Casual dates, open to intimacy",
    
    // Intimacy combinations
    "Figuring it out|||Intimacy": "Intimacy, figuring it out",
  };
  
  // Sort alphabetically and join
  const sorted = [...options].sort();
  const key = sorted.join("|||");
  
  return combinations[key] || sorted.join(" · ");
};
// ========== END OF NEW FUNCTION ==========

// Lifestyle icon mapping
const getLifestyleIcon = (key: string) => {
  const iconMap: Record<string, { name: string; library: 'ionicons' | 'material' }> = {
    gender_subtype: { name: "male-female", library: "ionicons" },
    height: { name: "resize", library: "ionicons" },
    education: { name: "school-outline", library: "material" },
    drinking: { name: "glass-wine", library: "material" },
    smoking: { name: "smoking", library: "material" },
    zodiac: { name: "star-outline", library: "ionicons" },
    religion: { name: "hands-pray", library: "material" },
    politics: { name: "bank", library: "material" },
    sexual_orientation: { name: "heart-outline", library: "ionicons" },
    institution: { name: "school-outline", library: "ionicons" },
    workout: { name: "dumbbell", library: "material" },
    communication: { name: "chatbubbles-outline", library: "ionicons" },
    love_language: { name: "heart-outline", library: "ionicons" },
    pets: { name: "paw-outline", library: "ionicons" },
    kids: { name: "baby-face-outline", library: "material" },
  };
  return iconMap[key] || { name: "help-circle-outline", library: "ionicons" };
};

// Action Bottom Sheet
const ActionBottomSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onTakeMedia: () => void;
  onChooseLibrary: () => void;
}> = ({ visible, onClose, onTakeMedia, onChooseLibrary }) => {
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    RNAnimated.spring(slideAnim, {
      toValue: visible ? 0 : SCREEN_HEIGHT,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  }, [visible]);

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none">
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <RNAnimated.View 
          style={[
            styles.sheetContainer,
            { transform: [{ translateY: slideAnim }] }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={95} tint="light" style={styles.sheetBlur}>
              <LinearGradient
                colors={["rgba(255,255,255,0.95)", "rgba(246,248,252,0.98)"]}
                style={styles.sheetGradient}
              >
                <View style={styles.sheetHandle} />
                
                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onTakeMedia}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: BLUE }]}>
                    <Ionicons name="camera" size={20} color="#FFFFFF" style={{ marginRight: scale(8) }} />
                    <Text style={styles.sheetButtonText}>Take Photo or Video</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onChooseLibrary}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "#E8F0FF" }]}>
                    <Ionicons name="images" size={20} color={INK} style={{ marginRight: scale(8) }} />
                    <Text style={styles.sheetButtonTextDark}>Choose from Library</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <View style={[styles.sheetButton, { backgroundColor: "#EEF4FF" }]}>
                    <Text style={styles.sheetButtonTextDark}>Cancel</Text>
                  </View>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};

// Photo Frame Component
const PhotoFrame: React.FC<{ uri: string; onPress?: () => void }> = ({ uri, onPress }) => {
  return (
    <Pressable onPress={onPress} style={styles.photoFrame}>
      <LinearGradient
        colors={["#FFFFFF", "#F8FAFF"]}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.photoInner}>
        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
      </View>
    </Pressable>
  );
};

// Main Component
export default function ProfileTop() {
  const [profile, setProfile] = useState<{
    fullName: string; age: number | null; bio: string | null; genderSubtype: string | null; heightCm: number | null;
    education: string | null; sexualOrientation: string | null; institution: string | null;
    promptAnswers?: PromptAnswer[] | null;
  }>({ fullName: "", age: null, bio: null, genderSubtype: null, heightCm: null, education: null, sexualOrientation: null, institution: null, promptAnswers: null });

  const [lifestyle, setLifestyle] = useState<{
    drinking: string | null; smoking: string | null; zodiac: string | null; religion: string | null; politics: string | null;
    workout: string | null; communication: string | null; love_language: string | null; pets: string | null; kids: string | null;
  }>({ drinking: null, smoking: null, zodiac: null, religion: null, politics: null, workout: null, communication: null, love_language: null, pets: null, kids: null });

  const [communities, setCommunities] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ avatar: string | null; first: string | null; second: string | null; third: string | null; }>({ avatar: null, first: null, second: null, third: null });
  const [modes, setModes] = useState<{ looking: string[]; values: string[] }>({ looking: [], values: [] });
  const [hobbies, setHobbies] = useState<string[]>([]);

  // UI controls
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedModalUri, setSelectedModalUri] = useState<string | null>(null);
  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [framesExpanded, setFramesExpanded] = useState(false);
  const [showFrameActionSheet, setShowFrameActionSheet] = useState(false);
  const [activeFrames, setActiveFrames] = useState<any[]>([]);
  const [showFrameViewer, setShowFrameViewer] = useState(false);

  // Animations
  const framesHeight = useRef(new RNAnimated.Value(0)).current;

  // Prompts carousel
  const [promptWidth, setPromptWidth] = useState(SCREEN_WIDTH);
  const [promptIndex, setPromptIndex] = useState(0);

  const [permission, requestPermission] = useCameraPermissions();

  const handleTakeMedia = async () => {
    console.log("Take photo/video clicked");
    setShowFrameActionSheet(false);
    
    setTimeout(async () => {
      try {
        const { status } = await requestPermission();
        if (status !== "granted") {
          Alert.alert("Permission Required", "Camera access is required to take photos/videos.");
          return;
        }
        
        const result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          aspect: [16, 9],
          quality: 0.8,
          videoMaxDuration: 30,
        });
        
        if (!result.canceled && result.assets[0]) {
          const asset = result.assets[0];
          const mediaType = asset.type === 'video' ? 'video' : 'image';
          router.push({
            pathname: "/(frames)/frame_editor",
            params: {
              uri: asset.uri,
              type: mediaType
            }
          });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        Alert.alert("Error", "Camera failed: " + errorMessage);
      }
    }, 300);
  };

  const handleChooseLibrary = async () => {
    console.log("Choose library clicked");
    setShowFrameActionSheet(false);
    
    setTimeout(async () => {
      try {
        console.log("Opening library picker...");
        const result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images', 'videos'],
          allowsEditing: false,
          aspect: [16, 9],
          quality: 0.8,
        });
        
        console.log("Library result:", result);
        if (!result.canceled && result.assets[0]) {
          const mediaType = result.assets[0].type === 'video' ? 'video' : 'image';
          console.log("Got media, type:", mediaType, "navigating to editor");
          router.push({
            pathname: "/(frames)/frame_editor",
            params: {
              uri: result.assets[0].uri,
              type: mediaType
            }
          });
        } else {
          console.log("Library selection cancelled");
        }
      } catch (error) {
        console.error("Library error:", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        Alert.alert("Error", "Library failed: " + errorMessage);
      }
    }, 300);
  };

  const fetchActiveFrames = async (userId: string) => {
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("frames")
        .select("*")
        .eq("user_id", userId)
        .is("archived_at", null)
        .gte("expires_at", now)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching frames:", error);
        setActiveFrames([]);
        return;
      }

      if (data && data.length > 0) {
        const processedFrames = await Promise.all(
          data.map(async (frame) => {
            if (!frame.media_url) return frame;
            if (frame.media_url.startsWith('http')) return frame;
            
            const { data: signedUrlData, error: signError } = await supabase.storage
              .from("frames")
              .createSignedUrl(frame.media_url, 3600);
            
            if (signError) {
              console.error("Error creating signed URL for frame", frame.id, ":", signError);
              return frame;
            }
            
            return {
              ...frame,
              media_url: signedUrlData?.signedUrl || frame.media_url,
            };
          })
        );
        
        setActiveFrames(processedFrames);
      } else {
        setActiveFrames([]);
      }
    } catch (error) {
      console.error("Error fetching active frames:", error);
      setActiveFrames([]);
    }
  };

  // Wrap data loading in useCallback
const loadProfileData = useCallback(async () => {
  try {
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return;

    await fetchActiveFrames(userId);

    const [profRes, lifeRes, mainRes, othersRes, modesRes, hobbiesRes] = await Promise.all([
      supabase.from("profiles").select("full_name, age, bio, gender_subtype, height_cm, education, sexual_orientation, institution, prompt_answers").eq("id", userId).single(),
      supabase.from("lifestyle").select("drinking, smoking, zodiac, religion, politics, workout, communication, love_language, pets, kids, communities").eq("user_id", userId).maybeSingle(),
      supabase.from("user_photos").select("photo_url").eq("user_id", userId).eq("is_main", true).maybeSingle(),
      supabase.from("user_photos").select("photo_url, created_at, is_main").eq("user_id", userId).neq("is_main", true).order("created_at",{ ascending: true }),
      supabase.from("user_modes").select("looking_for_date, value_date").eq("user_id", userId).maybeSingle(),
      supabase.from("user_hobbies").select("hobbies_master(label)").eq("user_id", userId),
    ]);

    const p = (profRes as any).data || {};
    const promptsRaw = Array.isArray(p?.prompt_answers) ? p.prompt_answers : null;
    const prompts: PromptAnswer[] | null = promptsRaw
      ? [...promptsRaw]
          .filter((x: any) => x && typeof x === "object")
          .sort((a, b) => (a.slot ?? 0) - (b.slot ?? 0))
          .slice(0, 3)
      : null;

    setProfile(prev => ({
      ...prev,
      fullName: p.full_name ?? "",
      age: p.age ?? null,
      bio: p.bio ?? null,
      genderSubtype: p.gender_subtype ?? null,
      heightCm: p.height_cm ?? null,
      education: p.education ?? null,
      sexualOrientation: p.sexual_orientation ?? null,
      institution: p.institution ?? null,
      promptAnswers: prompts,
    }));

    const l = (lifeRes as any).data || {};
    setLifestyle({
      drinking: l.drinking ?? null, smoking: l.smoking ?? null, zodiac: l.zodiac ?? null, religion: l.religion ?? null,
      politics: l.politics ?? null, workout: l.workout ?? null, communication: l.communication ?? null,
      love_language: l.love_language ?? null, pets: l.pets ?? null, kids: l.kids ?? null
    });

    // ========== COMMUNITY OPTIONS ==========
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

    const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, '').trim();
    const normalizeLabel = (s: string) => stripEmoji(s).toLowerCase().trim();

    // Load communities from lifestyle and match with emoji versions
    const communityList = Array.isArray(l.communities) ? l.communities : [];
    const matchedCommunities: string[] = [];

    communityList.forEach((comm: string) => {
      const normalized = normalizeLabel(comm);
      COMMUNITY_OPTIONS.forEach(commWithEmoji => {
        if (normalizeLabel(commWithEmoji) === normalized) {
          matchedCommunities.push(commWithEmoji);
        }
      });
    });

    setCommunities(matchedCommunities);

    // ========== PHOTOS ==========
    const avatarUrl = (mainRes as any)?.data?.photo_url || null;
    const others = (othersRes as any)?.data || [];
    const [first, second, third] = others;
    const [avatarSigned, firstSigned, secondSigned, thirdSigned] = await Promise.all([
      signPath(toStoragePath(avatarUrl)),
      signPath(toStoragePath(first?.photo_url ?? null)),
      signPath(toStoragePath(second?.photo_url ?? null)),
      signPath(toStoragePath(third?.photo_url ?? null)),
    ]);
    setPhotos({
      avatar: avatarSigned ?? avatarUrl,
      first: firstSigned ?? first?.photo_url ?? null,
      second: secondSigned ?? second?.photo_url ?? null,
      third: thirdSigned ?? third?.photo_url ?? null,
    });

    // ========== MODES (LOOKING FOR + VALUES) ==========
    const m = (modesRes as any)?.data || {};

    // Map for enum to display format
    const LOOKING_FOR_DISPLAY: Record<string, string> = {
      "marriage": "Marriage",
      "life_partner": "Life partner",
      "long_term_relationship": "Long-term relationship",
      "short_term_relationship": "Short-term relationship",
      "casual_dates": "Fun, casual dates",
      "intimacy": "Intimacy",
      "new_friends": "New friends",
      "figuring_it_out": "Figuring it out",
    };

    // Load looking_for_date with exact display format
    const lookingForEnums: string[] = Array.isArray(m.looking_for_date) 
      ? m.looking_for_date 
      : [];
    const lookingForDisplay = lookingForEnums
      .map(e => LOOKING_FOR_DISPLAY[e])
      .filter(Boolean);

    // Combine using display format
    const combinedLooking = lookingForDisplay.length === 2 
      ? getCombinedLookingFor(lookingForDisplay)
      : lookingForDisplay.length === 1 
        ? lookingForDisplay[0] 
        : "";

    // Helper function to parse lists for values
    const parseListHelper = (raw: any): string[] => {
      const list =
        Array.isArray(raw)
          ? raw.map((s) => humanize(String(s)))
          : typeof raw === "string"
          ? raw.split(/[,/&]| and /i).map((s: string) => humanize(s.trim()))
          : [];
      return Array.from(new Set(list.filter(Boolean)));
    };

    setModes({ 
      looking: combinedLooking ? [combinedLooking] : [], 
      values: parseListHelper(m.value_date) 
    });

    // ========== HOBBIES ==========
    const hs = (hobbiesRes as any)?.data || [];
    setHobbies(hs.map((x: any) => x?.hobbies_master?.label).filter(Boolean).map(humanize));
  } catch (e) {
    console.log("Error loading profile:", e);
  }
}, []);

// Load on mount
useEffect(() => {
  loadProfileData();
}, [loadProfileData]);

// Reload whenever screen comes into focus (when navigating back from edit screen)
useFocusEffect(
  useCallback(() => {
    loadProfileData();
  }, [loadProfileData])
);

  const saveBio = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;
      await supabase.from("profiles").update({ bio: tempBio }).eq("id", userId);
      setProfile(p => ({ ...p, bio: tempBio }));
      setIsEditingBio(false);
      Keyboard.dismiss();
    } catch (e) {
      console.log("Error saving bio:", e);
    }
  };

  const saveHeight = async (height: number) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;
      await supabase.from("profiles").update({ height_cm: height }).eq("id", userId);
      setProfile(p => ({ ...p, heightCm: height }));
      setHeightModalVisible(false);
    } catch (e) {
      console.log("Error saving height:", e);
    }
  };

  const displayName = useMemo(() => toTitleCase(profile.fullName) || "—", [profile.fullName]);
  const nameSize = useMemo(() => getNameFontSize(displayName.length), [displayName]);

  // Lifestyle table logic
  const horizontalItems = useMemo(() => ([
    { key: "gender_subtype", value: profile.genderSubtype, mandatory: true },
    { key: "height", value: profile.heightCm ? `${profile.heightCm} cm` : null, mandatory: false, editable: true },
    { key: "education", value: profile.education, mandatory: false },
    { key: "drinking", value: lifestyle.drinking, mandatory: false },
    { key: "smoking", value: lifestyle.smoking, mandatory: false },
    { key: "zodiac", value: lifestyle.zodiac, mandatory: false },
    { key: "religion", value: lifestyle.religion, mandatory: false },
    { key: "politics", value: lifestyle.politics, mandatory: false },
  ].filter(i => i.mandatory || i.value)), [profile, lifestyle]);

  const verticalItems = useMemo(() => ([
    { key: "sexual_orientation", value: profile.sexualOrientation, mandatory: true },
    { key: "institution", value: profile.institution, mandatory: false },
    { key: "workout", value: lifestyle.workout, mandatory: false },
    { key: "communication", value: lifestyle.communication, mandatory: false },
    { key: "love_language", value: lifestyle.love_language, mandatory: false },
    { key: "pets", value: lifestyle.pets, mandatory: false },
    { key: "kids", value: lifestyle.kids, mandatory: false },
  ].filter(i => i.mandatory || i.value)), [profile, lifestyle]);

  const prompts: PromptAnswer[] = useMemo(() => {
    const arr = profile.promptAnswers || [];
    return [...arr].filter(p => p && p.answer).slice(0, 3);
  }, [profile.promptAnswers]);

  const onPromptScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / w);
    setPromptIndex(Math.max(0, Math.min(i, Math.max(0, prompts.length - 1))));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top Bar */}
<View style={styles.topBar}>
  <Image 
    source={require("../../assets/images/niice_logo_icon.png")} 
    resizeMode="contain" 
    style={styles.logo} 
  />
  <View style={styles.topRight}>
    <TouchableOpacity 
      style={styles.editButton} 
      activeOpacity={0.75} 
      onPress={() => router.push("/(edit_profile)/edit_main")}
    >
      <Ionicons 
        name="create-outline" 
        size={20} 
        color="#FFFFFF" 
      />
    </TouchableOpacity>
    <TouchableOpacity 
      onPress={() => router.push("/in_progress")} 
      activeOpacity={0.7} 
      style={styles.settingsBtn}
    >
      <Ionicons 
        name="settings-outline" 
        size={24} 
        color={INK} 
      />
    </TouchableOpacity>
  </View>
</View>

      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => activeFrames.length > 0 && setShowFrameViewer(true)}
            disabled={activeFrames.length === 0}
          >
            <View style={[
              styles.avatarRing,
              activeFrames.length > 0 && styles.avatarRingActive
            ]}>
              {activeFrames.length > 0 && (
                <LinearGradient
                  colors={[BLUE, "#678CFF", "#A8C4FF", BLUE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarGradient}
                />
              )}
              <View style={styles.avatarInner}>
                {photos.avatar ? (
                  <Image source={{ uri: photos.avatar }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.avatarPlaceholderText}>No photo</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={[styles.nameText, { fontSize: nameSize }]} numberOfLines={1}>
                {displayName}
              </Text>
              {profile.age != null && (
                <Text style={[styles.ageText, { fontSize: nameSize }]}>, {profile.age}</Text>
              )}
            </View>

            {/* Frames Button */}
            <TouchableOpacity 
              activeOpacity={0.9} 
              onPress={() => {
                const newExpanded = !framesExpanded;
                setFramesExpanded(newExpanded);
                
                RNAnimated.timing(framesHeight, {
                  toValue: newExpanded ? 1 : 0,
                  duration: 300,
                  easing: Easing.out(Easing.ease),
                  useNativeDriver: false,
                }).start();
              }}
              style={styles.framesButtonWrapper}
            >
              <View style={styles.framesButton}>
                <Text style={styles.framesButtonText}>
                  Frames {framesExpanded ? '↓' : '→'}
                </Text>
              </View>
            </TouchableOpacity>

            {/* Expandable Frame Actions */}
            <RNAnimated.View 
              style={{
                maxHeight: framesHeight.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, 200],
                }),
                opacity: framesHeight,
                overflow: 'hidden',
              }}
            >
              <View style={styles.frameActions}>
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => setShowFrameActionSheet(true)}
                >
                  <View style={[styles.frameActionButton, { backgroundColor: BLUE }]}>
                    <Text style={styles.frameActionText}>
                      + Add New Frame
                    </Text>
                  </View>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  activeOpacity={0.8} 
                  onPress={() => router.push("/(frames)/frame_archive")}
                >
                  <LinearGradient 
                    colors={["#DCE8FF", "#EEF4FF"]} 
                    start={{ x: 0, y: 0 }} 
                    end={{ x: 1, y: 1 }} 
                    style={styles.frameActionButton}
                  >
                    <Ionicons name="folder-outline" size={18} color={BLUE} style={{ marginRight: scale(6) }} />
                    <Text style={[styles.frameActionText, { color: BLUE }]}>
                      Frame Archive
                    </Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </RNAnimated.View>
          </View>
        </View>

        {/* Bio Section */}
        <View style={styles.bioSection}>
          <LinearGradient
            colors={isEditingBio ? ["#EFF3FF", "#E6EEFF"] : ["#F5F9FF", "#EEF4FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bioCard, isEditingBio && styles.bioCardEditing]}
          >
            <View style={styles.bioHeader}>
              <Text style={styles.bioLabel}>Bio</Text>
            </View>

            {isEditingBio ? (
              <>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Share a bit about yourself..."
                  placeholderTextColor="rgba(10,14,26,0.4)"
                  value={tempBio}
                  onChangeText={setTempBio}
                  multiline
                  maxLength={160}
                  autoFocus
                />
                <Text style={styles.charCount}>{tempBio.length}/160</Text>
                <View style={styles.bioActions}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => { setIsEditingBio(false); Keyboard.dismiss(); }}
                    style={styles.bioActionButton}
                  >
                    <View style={styles.bioCancelButton}>
                      <Text style={styles.bioCancelText}>Cancel</Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={saveBio}
                    style={styles.bioActionButton}
                  >
                    <View style={styles.bioSaveButton}>
                      <Text style={styles.bioSaveText}>Save</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => { setTempBio(profile.bio || ""); setIsEditingBio(true); }}
              >
                <Text style={profile.bio ? styles.bioText : styles.bioPlaceholder}>
                  {profile.bio || "+ Add bio"}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </View>

        {/* What I'm Looking For */}
        {/* What I'm Looking For - Featured */}
<View style={styles.section}>
  <View style={styles.featuredCard}>
    <LinearGradient
      colors={["#FFFFFF", "#F8FAFF"]}
      style={StyleSheet.absoluteFillObject}
    />
    
    {/* Accent border */}
    <View style={styles.featuredAccent} />
    
    <View style={styles.featuredContent}>
      {/* Small label with icon */}
      <View style={styles.featuredLabel}>
        <MaterialCommunityIcons 
          name="heart-outline" 
          size={16} 
          color={BLUE} 
          style={{ marginRight: scale(6) }}
        />
        <Text style={styles.featuredLabelText}>What I'm Looking For</Text>
      </View>
      
      {/* Large prominent chip */}
      {modes.looking.length ? (
        <View style={styles.featuredChipWrapper}>
          <View style={styles.featuredChip}>
  <MaterialCommunityIcons 
    name="heart" 
    size={24} 
    color="rgba(255,255,255,0.9)" 
    style={{ marginRight: scale(10) }}
  />
  <Text style={styles.featuredChipText}>
    {modes.looking[0]}
  </Text>
</View>
        </View>
      ) : (
        <View style={styles.featuredChipWrapper}>
          <View style={[styles.featuredChip, styles.featuredChipEmpty]}>
            <Text style={styles.featuredChipEmptyText}>
              + Set what you're looking for
            </Text>
          </View>
        </View>
      )}
    </View>
  </View>
</View>

        {/* First Photo */}
        {photos.first && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.first}
              onPress={() => { setSelectedModalUri(photos.first); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Values in a Partner */}
        <View style={styles.section}>
          <View style={styles.glassCard}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFF"]}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.cardHeader}>
              <Ionicons name="sparkles-outline" size={22} color={BLUE} style={styles.cardIcon} />
              <Text style={styles.cardTitle}>Values in a Partner</Text>
            </View>
            <View style={styles.cardContent}>
              {modes.values.length ? (
                <View style={styles.chipsGrid}>
                  {modes.values.map((tag, i) => (
                    <View key={`value-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptyText}>Not set</Text>
              )}
            </View>
          </View>
        </View>

        {/* Lifestyle Table - Redesigned */}
        <View style={styles.section}>
          <View style={styles.lifestyleCard}>
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFF"]}
              style={StyleSheet.absoluteFillObject}
            />
            
            {/* Horizontal Items */}
            {!!horizontalItems.length && (
              <View style={styles.horizontalSection}>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false} 
                  contentContainerStyle={styles.horizontalScroll}
                >
                  {horizontalItems.map(item => {
                    const iconInfo = getLifestyleIcon(item.key);
                    return (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.lifestyleChip}
                        onPress={item.editable && !item.value ? () => setHeightModalVisible(true) : undefined}
                        activeOpacity={item.editable && !item.value ? 0.7 : 1}
                      >
                        <View style={styles.lifestyleIconWrapper}>
                          {iconInfo.library === 'ionicons' ? (
                            <Ionicons name={iconInfo.name as any} size={20} color={BLUE} />
                          ) : (
                            <MaterialCommunityIcons name={iconInfo.name as any} size={20} color={BLUE} />
                          )}
                        </View>
                        <Text style={styles.lifestyleChipText}>
                          {formatLifestyleValue(item.key, item.value) || "+ Add"}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            )}

            {/* Vertical Items */}
            {!!verticalItems.length && (
              <View style={styles.verticalSection}>
                {verticalItems.map((item, idx) => {
                  const iconInfo = getLifestyleIcon(item.key);
                  return (
                    <View key={item.key}>
                      <View style={styles.lifestyleVerticalRow}>
                        <View style={styles.lifestyleVerticalIconWrapper}>
                          {iconInfo.library === 'ionicons' ? (
                            <Ionicons name={iconInfo.name as any} size={22} color={BLUE} />
                          ) : (
                            <MaterialCommunityIcons name={iconInfo.name as any} size={22} color={BLUE} />
                          )}
                        </View>
                        <Text style={styles.lifestyleVerticalText}>
                          {formatLifestyleValue(item.key, item.value)}
                        </Text>
                      </View>
                      {idx < verticalItems.length - 1 && <View style={styles.verticalDivider} />}
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        </View>

        {/* Second Photo */}
        {photos.second && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.second}
              onPress={() => { setSelectedModalUri(photos.second); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Hobbies */}
        {!!hobbies.length && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="palette-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Hobbies & Interests</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.chipsGrid}>
                  {hobbies.map((hobby, i) => (
                    <View key={`hobby-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{hobby}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Prompts - Old Style with New UI */}
        {!!prompts.length && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <Ionicons name="chatbubbles-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>My Prompts</Text>
              </View>
              <View style={styles.cardContent}>
                {/* Question Pill */}
                <View style={styles.promptPill}>
                  <Text style={styles.promptPillText}>
                    {(prompts[promptIndex] as any)?.question || prompts[promptIndex]?.title || "Prompt"}
                  </Text>
                </View>

                {/* Scrollable Carousel with Decorative Quotes */}
                <ScrollView
                  horizontal
                  pagingEnabled
                  snapToInterval={promptWidth}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  disableIntervalMomentum
                  showsHorizontalScrollIndicator={false}
                  onLayout={(e) => setPromptWidth(e.nativeEvent.layout.width)}
                  onMomentumScrollEnd={onPromptScrollEnd}
                >
                  {prompts.map((p, i) => (
                    <View key={i} style={[styles.promptPage, { width: promptWidth }]}>
                      {/* Decorative quotes */}
                      <Text style={[styles.promptQuote, styles.promptQuoteLeft]}>"</Text>
                      <Text style={[styles.promptQuote, styles.promptQuoteRight]}>"</Text>

                      <View style={styles.promptInner}>
                        <Text style={styles.promptAnswerText} numberOfLines={5}>
                          {p.answer || ""}
                        </Text>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Dots */}
                {prompts.length > 1 && (
                  <View style={styles.promptDotsRow}>
                    {prompts.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.promptDot,
                          i === promptIndex && styles.promptDotActive
                        ]}
                      />
                    ))}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Third Photo */}
        {photos.third && (
          <View style={styles.photoContainer}>
            <PhotoFrame
              uri={photos.third}
              onPress={() => { setSelectedModalUri(photos.third); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Communities */}
        {!!communities.length && (
          <View style={styles.section}>
            <View style={styles.glassCard}>
              <LinearGradient
                colors={["#FFFFFF", "#F8FAFF"]}
                style={StyleSheet.absoluteFillObject}
              />
              <View style={styles.cardHeader}>
                <MaterialCommunityIcons name="account-group-outline" size={22} color={BLUE} style={styles.cardIcon} />
                <Text style={styles.cardTitle}>Communities I Support</Text>
              </View>
              <View style={styles.cardContent}>
                <View style={styles.chipsGrid}>
                  {communities.map((community, i) => (
                    <View key={`community-${i}`} style={styles.customChip}>
                      <Text style={styles.chipLabel}>{community}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal 
        visible={modalVisible} 
        transparent 
        animationType="fade" 
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <TouchableOpacity 
            style={styles.closeButton} 
            onPress={() => setModalVisible(false)} 
            activeOpacity={0.8}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          {!!selectedModalUri && (
            <Image 
              source={{ uri: selectedModalUri }} 
              style={styles.modalImage} 
              resizeMode="contain" 
            />
          )}
        </Pressable>
      </Modal>

      {/* Height Picker */}
      <HeightPickerModal 
        visible={heightModalVisible} 
        onClose={() => setHeightModalVisible(false)} 
        onSave={saveHeight} 
      />
      
      {/* Frame Action Sheet */}
      <ActionBottomSheet
        visible={showFrameActionSheet}
        onClose={() => setShowFrameActionSheet(false)}
        onTakeMedia={handleTakeMedia}
        onChooseLibrary={handleChooseLibrary}
      />

      {/* Active Frames Viewer */}
      <ActiveFramesModal
        visible={showFrameViewer}
        onClose={() => setShowFrameViewer(false)}
        frames={activeFrames}
      />
    </SafeAreaView>
  );
}

// Height Picker Modal
const HeightPickerModal: React.FC<{ 
  visible: boolean; 
  onClose: () => void; 
  onSave: (height: number) => void; 
}> = ({ visible, onClose, onSave }) => {
  const [selectedHeight, setSelectedHeight] = useState(170);
  const scrollRef = useRef<ScrollView>(null);
  const heights = useMemo(() => Array.from({ length: 101 }, (_, i) => 140 + i), []);
  
  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ 
          y: (selectedHeight - 140) * verticalScale(44), 
          animated: false 
        });
      }, 100);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.heightModalBackdrop} onPress={onClose}>
        <Pressable style={styles.heightModalContent} onPress={(e) => e.stopPropagation()}>
          <LinearGradient 
            colors={["#FFFFFF", "#F8FAFF"]} 
            style={StyleSheet.absoluteFillObject} 
          />
          <Text style={styles.heightModalTitle}>Select Your Height</Text>
          <View style={styles.heightPickerContainer}>
            <View style={styles.heightSelector} />
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={verticalScale(44)}
              decelerationRate="fast"
              onScroll={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const i = Math.round(y / verticalScale(44));
                setSelectedHeight(heights[i] || 170);
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: verticalScale(88) }}
            >
              {heights.map(h => (
                <Pressable 
                  key={h} 
                  onPress={() => { 
                    setSelectedHeight(h); 
                    scrollRef.current?.scrollTo({ 
                      y: (h - 140) * verticalScale(44), 
                      animated: true 
                    }); 
                  }} 
                  style={styles.heightItem}
                >
                  <Text style={[
                    styles.heightText, 
                    selectedHeight === h && styles.heightTextSelected
                  ]}>
                    {h} cm
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.heightModalActions}>
            <TouchableOpacity 
              onPress={onClose} 
              style={styles.heightCancelBtn}
            >
              <Text style={styles.heightCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => onSave(selectedHeight)} 
              style={styles.heightSaveBtn}
            >
              <LinearGradient 
                colors={[BLUE, "#678CFF"]} 
                start={{ x: 0, y: 0 }} 
                end={{ x: 1, y: 1 }} 
                style={styles.heightSaveGradient}
              >
                <Text style={styles.heightSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// Styles
const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: BG 
  },
  topBar: { 
    flexDirection: "row", 
    alignItems: "center", 
    justifyContent: "space-between", 
    paddingHorizontal: scale(20), 
    paddingTop: verticalScale(10), 
    paddingBottom: verticalScale(12),
    backgroundColor: BG,
  },
  logo: { 
    width: scale(110), 
    height: verticalScale(38) 
  },
  topRight: { 
    flexDirection: "row", 
    alignItems: "center", 
    gap: scale(12) 
  },
  editButton: { 
  width: scale(40), 
  height: scale(40), 
  borderRadius: scale(20), 
  backgroundColor: BLUE, 
  alignItems: "center", 
  justifyContent: "center",
  shadowColor: BLUE,
  shadowOpacity: 0.25,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 3 },
  elevation: 4,
},
settingsBtn: { 
  padding: scale(8) 
},
  scrollContent: { 
    paddingBottom: verticalScale(40) 
  },
  profileHeader: { 
    flexDirection: "row", 
    alignItems: "center", 
    paddingHorizontal: scale(20), 
    paddingTop: verticalScale(20),
    paddingBottom: verticalScale(10),
  },
  avatarRing: { 
    width: AVATAR_SIZE, 
    height: AVATAR_SIZE, 
    borderRadius: AVATAR_SIZE / 2, 
    borderWidth: scale(2), 
    borderColor: "#E0E0E0", 
    alignItems: "center", 
    justifyContent: "center", 
    marginRight: scale(16),
  },
  avatarRingActive: { 
    borderWidth: 0,
  },
  avatarGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarInner: { 
    width: AVATAR_SIZE - scale(10), 
    height: AVATAR_SIZE - scale(10), 
    borderRadius: (AVATAR_SIZE - scale(10)) / 2, 
    borderWidth: scale(2), 
    borderColor: "#FFFFFF", 
    alignItems: "center", 
    justifyContent: "center", 
    backgroundColor: "#FFFFFF",
  },
  avatar: { 
    width: AVATAR_SIZE - scale(18), 
    height: AVATAR_SIZE - scale(18), 
    borderRadius: (AVATAR_SIZE - scale(18)) / 2 
  },
  avatarPlaceholder: { 
    backgroundColor: "#E8EFF7", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  avatarPlaceholderText: { 
    color: INK, 
    fontSize: scale(12), 
    fontFamily: Fonts.primary 
  },
  nameContainer: { 
    flex: 1, 
    justifyContent: "center" 
  },
  nameRow: { 
    flexDirection: "row", 
    alignItems: "center", 
    flexWrap: "wrap" 
  },
  nameText: { 
    color: INK, 
    fontFamily: Fonts.bold, 
    letterSpacing: 0.3 
  },
  ageText: { 
    color: BLUE, 
    fontFamily: Fonts.bold, 
    letterSpacing: 0.3 
  },
  framesButtonWrapper: {
    marginTop: verticalScale(6),
  },
  framesButton: { 
    alignSelf: "flex-start", 
    backgroundColor: BLUE,
    borderRadius: scale(20), 
    paddingVertical: verticalScale(6), 
    paddingHorizontal: scale(14),
    shadowColor: BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  framesButtonText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: "#FFFFFF", 
    letterSpacing: 0.3 
  },
  frameActions: {
    marginTop: verticalScale(8),
    gap: verticalScale(8),
  },
  frameActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(20),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(14),
    shadowColor: BLUE,
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  frameActionText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  bioSection: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(20) 
  },
  bioCard: { 
    borderRadius: scale(16), 
    padding: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
  },
  bioCardEditing: {
    borderColor: BLUE,
    shadowColor: BLUE,
    shadowOpacity: 0.15,
  },
  bioHeader: { 
    marginBottom: verticalScale(8) 
  },
  bioLabel: { 
    fontSize: scale(13), 
    fontFamily: Fonts.bold, 
    color: BLUE, 
    letterSpacing: 0.3 
  },
  bioText: { 
    fontSize: scale(15), 
    fontFamily: Fonts.primary, 
    color: INK, 
    lineHeight: verticalScale(22),
    fontWeight: "500",
  },
  bioPlaceholder: { 
    fontSize: scale(15), 
    fontFamily: Fonts.primary, 
    color: "rgba(10,14,26,0.4)",
    fontWeight: "500",
  },
  bioInput: { 
    fontSize: scale(15), 
    fontFamily: Fonts.primary, 
    color: INK, 
    minHeight: verticalScale(80), 
    textAlignVertical: "top", 
    lineHeight: verticalScale(22),
    fontWeight: "500",
  },
  charCount: { 
    alignSelf: "flex-end", 
    fontSize: scale(11), 
    color: "rgba(10,14,26,0.5)", 
    marginTop: verticalScale(4), 
    fontFamily: Fonts.primary 
  },
  bioActions: { 
    flexDirection: "row", 
    gap: scale(8), 
    marginTop: verticalScale(12) 
  },
  bioActionButton: { 
    flex: 1, 
    borderRadius: scale(20), 
    overflow: "hidden" 
  },
  bioCancelButton: {
    backgroundColor: "#EEF4FF",
    paddingVertical: verticalScale(10),
    alignItems: "center",
    borderRadius: scale(20),
  },
  bioCancelText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: BLUE,
    letterSpacing: 0.3,
  },
  bioSaveButton: {
    backgroundColor: BLUE,
    paddingVertical: verticalScale(10),
    alignItems: "center",
    borderRadius: scale(20),
  },
  bioSaveText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  section: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(16) 
  },
  emptyText: { 
    fontSize: scale(14), 
    fontFamily: Fonts.primary, 
    color: "rgba(10,14,26,0.4)", 
    fontStyle: "italic" 
  },
  photoContainer: { 
    paddingHorizontal: scale(20), 
    marginTop: verticalScale(16) 
  },
  photoFrame: { 
    borderRadius: scale(16), 
    overflow: "hidden",
    aspectRatio: 0.8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  photoInner: { 
    flex: 1, 
    margin: scale(8), 
    borderRadius: scale(12), 
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },
  photoImage: { 
    width: "100%", 
    height: "100%" 
  },
  
  // Glass card styles
  glassCard: {
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(12),
  },
  cardIcon: {
    marginRight: scale(8),
  },
  cardTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },
  cardContent: {
    paddingHorizontal: scale(18),
    paddingBottom: verticalScale(18),
  },
  chipsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  customChip: {
    borderRadius: scale(20),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  chipLabel: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },

  // Lifestyle table - Redesigned
  lifestyleCard: {
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  horizontalSection: { 
    paddingVertical: verticalScale(14),
  },
  horizontalScroll: { 
    paddingHorizontal: scale(18), 
    gap: scale(10),
  },
  lifestyleChip: {
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(18),
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  lifestyleIconWrapper: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleChipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: INK,
    letterSpacing: 0.2,
  },
  verticalSection: { 
    paddingHorizontal: scale(18), 
    paddingBottom: verticalScale(14),
  },
  lifestyleVerticalRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    gap: scale(12),
  },
  lifestyleVerticalIconWrapper: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleVerticalText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: 0.2,
  },
  verticalDivider: { 
    height: StyleSheet.hairlineWidth, 
    backgroundColor: "rgba(27,68,205,0.15)", 
    marginLeft: scale(48),
  },

  // Prompts carousel - Old style with new UI
  promptPill: {
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    marginBottom: verticalScale(16),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },
  promptPillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: BLUE,
    letterSpacing: 0.3,
    textAlign: "center",
  },
  promptPage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
    minHeight: verticalScale(160),
    position: "relative",
  },
  promptQuote: {
    position: "absolute",
    fontSize: scale(80),
    color: BLUE,
    fontFamily: Fonts.bold,
    opacity: 0.15,
    zIndex: 0,
  },
  promptQuoteLeft: {
    left: scale(0),
    top: verticalScale(10),
  },
  promptQuoteRight: {
    right: scale(0),
    bottom: verticalScale(10),
  },
  promptInner: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: scale(10),
    zIndex: 1,
  },
  promptAnswerText: {
    textAlign: "center",
    fontFamily: Fonts.primary,
    fontSize: scale(17),
    lineHeight: verticalScale(26),
    color: INK,
    fontWeight: "600",
  },
  promptDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(12),
    gap: scale(8),
  },
  promptDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "rgba(27,68,205,0.25)",
  },
  promptDotActive: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: BLUE,
  },

  // Modal styles
  modalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.9)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  modalImage: { 
    width: SCREEN_WIDTH, 
    height: SCREEN_HEIGHT 
  },
  closeButton: { 
    position: "absolute", 
    top: verticalScale(50), 
    right: scale(20), 
    width: scale(44), 
    height: scale(44), 
    borderRadius: scale(22), 
    backgroundColor: "rgba(255,255,255,0.2)", 
    alignItems: "center", 
    justifyContent: "center", 
    zIndex: 10 
  },
  closeButtonText: { 
    fontSize: scale(28), 
    color: "#FFFFFF", 
    fontWeight: "300" 
  },

  // Height modal
  heightModalBackdrop: { 
    flex: 1, 
    backgroundColor: "rgba(0,0,0,0.5)", 
    alignItems: "center", 
    justifyContent: "center" 
  },
  heightModalContent: { 
    width: "80%", 
    maxHeight: "70%", 
    borderRadius: scale(24), 
    overflow: "hidden", 
    borderWidth: 1, 
    borderColor: "rgba(27,68,205,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  heightModalTitle: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(20), 
    color: INK, 
    textAlign: "center", 
    paddingTop: verticalScale(20), 
    paddingBottom: verticalScale(12) 
  },
  heightPickerContainer: { 
    height: verticalScale(220), 
    position: "relative" 
  },
  heightSelector: { 
    position: "absolute", 
    top: "50%", 
    left: scale(20), 
    right: scale(20), 
    height: verticalScale(44), 
    marginTop: -verticalScale(22), 
    backgroundColor: "rgba(27,68,205,0.1)", 
    borderRadius: scale(12), 
    borderWidth: 2, 
    borderColor: BLUE, 
    zIndex: 1 
  },
  heightItem: { 
    height: verticalScale(44), 
    justifyContent: "center", 
    alignItems: "center" 
  },
  heightText: { 
    fontFamily: Fonts.primary, 
    fontSize: scale(16), 
    color: "rgba(10,14,26,0.5)", 
    fontWeight: "600" 
  },
  heightTextSelected: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(18), 
    color: BLUE 
  },
  heightModalActions: { 
    flexDirection: "row", 
    gap: scale(12), 
    paddingHorizontal: scale(20), 
    paddingVertical: verticalScale(16) 
  },
  heightCancelBtn: { 
    flex: 1, 
    paddingVertical: verticalScale(12), 
    backgroundColor: "rgba(238,244,255,0.8)", 
    borderRadius: scale(16), 
    alignItems: "center" 
  },
  heightCancelText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: BLUE 
  },
  heightSaveBtn: { 
    flex: 1, 
    borderRadius: scale(16), 
    overflow: "hidden" 
  },
  heightSaveGradient: { 
    paddingVertical: verticalScale(12), 
    alignItems: "center" 
  },
  heightSaveText: { 
    fontFamily: Fonts.bold, 
    fontSize: scale(16), 
    color: "#FFFFFF" 
  },

  // Bottom Sheet
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: "hidden",
  },
  sheetBlur: {
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    overflow: "hidden",
  },
  sheetGradient: {
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(30),
    paddingHorizontal: scale(24),
  },
  sheetHandle: {
    width: scale(48),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(0,0,0,0.2)",
    alignSelf: "center",
    marginBottom: verticalScale(24),
  },
  sheetOption: {
    marginBottom: verticalScale(12),
  },
  sheetButton: {
    flexDirection: "row",
    height: verticalScale(56),
    borderRadius: scale(28),
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  sheetButtonText: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  sheetButtonTextDark: {
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.4,
  },
  // Hero Banner for "What I'm Looking For"
heroBanner: {
  borderRadius: scale(24),
  overflow: "hidden",
  minHeight: verticalScale(160),
  shadowColor: BLUE,
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.35,
  shadowRadius: 16,
  elevation: 12,
  marginBottom: verticalScale(8),
},
heroBannerDecor: {
  position: "absolute",
  width: "100%",
  height: "100%",
},
decorHeart1: {
  position: "absolute",
  right: scale(-20),
  top: verticalScale(-30),
  transform: [{ rotate: "15deg" }],
},
decorHeart2: {
  position: "absolute",
  left: scale(-15),
  bottom: verticalScale(-20),
  transform: [{ rotate: "-25deg" }],
},
heroBannerContent: {
  padding: scale(24),
  paddingVertical: verticalScale(28),
  position: "relative",
},
heroBannerHeader: {
  flexDirection: "row",
  alignItems: "center",
  marginBottom: verticalScale(12),
},
heroBannerIcon: {
  marginRight: scale(8),
},
heroBannerLabel: {
  fontSize: scale(15),
  fontFamily: Fonts.bold,
  color: "rgba(255,255,255,0.9)",
  letterSpacing: 0.8,
  textTransform: "uppercase",
},
heroBannerText: {
  fontSize: scale(28),
  fontFamily: Fonts.bold,
  color: "#FFFFFF",
  lineHeight: verticalScale(38),
  letterSpacing: 0.3,
  textShadowColor: "rgba(0,0,0,0.15)",
  textShadowOffset: { width: 0, height: 2 },
  textShadowRadius: 4,
},
heroBannerPlaceholder: {
  fontSize: scale(24),
  fontFamily: Fonts.primary,
  color: "rgba(255,255,255,0.7)",
  lineHeight: verticalScale(34),
  letterSpacing: 0.3,
  fontStyle: "italic",
},
heroBannerShine: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: "100%",
  transform: [{ skewX: "-20deg" }],
},
// Featured "What I'm Looking For" Card
featuredCard: {
  borderRadius: scale(20),
  overflow: "hidden",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.08,
  shadowRadius: 12,
  elevation: 6,
  borderWidth: 1,
  borderColor: "rgba(27,68,205,0.15)",
  marginBottom: verticalScale(8),
},
featuredAccent: {
  position: "absolute",
  left: 0,
  top: 0,
  bottom: 0,
  width: scale(4),
  backgroundColor: BLUE,
},
featuredContent: {
  paddingHorizontal: scale(20),
  paddingVertical: verticalScale(20),
},
featuredLabel: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  marginBottom: verticalScale(14),
},
featuredLabelText: {
  fontSize: scale(13),
  fontFamily: Fonts.bold,
  color: BLUE,
  letterSpacing: 0.5,
  textTransform: "uppercase",
},
featuredChipWrapper: {
  alignItems: "center",
},
featuredChip: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: BLUE,
  borderRadius: scale(28),
  paddingVertical: verticalScale(14),
  paddingHorizontal: scale(24),
  minWidth: "85%",
  shadowColor: BLUE,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.25,
  shadowRadius: 8,
  elevation: 6,
},
featuredChipText: {
  fontSize: scale(20),
  fontFamily: Fonts.bold,
  color: "#FFFFFF",
  letterSpacing: 0.3,
  textAlign: "center",
},
featuredChipEmpty: {
  backgroundColor: "#EEF4FF",
  borderWidth: 1.5,
  borderColor: "rgba(27,68,205,0.2)",
  borderStyle: "dashed",
},
featuredChipEmptyText: {
  fontSize: scale(16),
  fontFamily: Fonts.bold,
  color: "rgba(27,68,205,0.6)",
  letterSpacing: 0.3,
},
});