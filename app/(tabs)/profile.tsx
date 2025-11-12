// app/(tabs)/profile.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { BlurView } from "expo-blur";
import { useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { ReactNode, useEffect, useMemo, useRef, useState } from "react";
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
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";
import ActiveFramesModal from "../(frames)/active_frames";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// =========== THEME ===========
const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1B44CD";
const LIGHT_BLUE = "#A8C4FF";

const GRADIENTS = {
  frames: [BLUE, "#678CFF"],
  save: [BLUE, LIGHT_BLUE],
  cancel: ["#EEF4FF", "#DCE8FF"],
  glassOverlay: [
    "rgba(255,255,255,0.55)",
    "rgba(246,248,252,0.18)",
    "rgba(168,196,255,0.22)",
  ],
} as const;

const AVATAR_SIZE = scale(125);

// =========== UTILS ===========
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
  return scale(22);
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

// =========== ACTION BOTTOM SHEET ===========
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
                  <LinearGradient
                    colors={[BLUE, "#678CFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sheetButton}
                  >
                    <Text style={styles.sheetButtonText}>📷 Take Photo or Video</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onChooseLibrary}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#E4F4FF", "#C8E0FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sheetButton}
                  >
                    <Text style={styles.sheetButtonTextDark}>🖼 Choose from Library</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.sheetOption}
                  onPress={onClose}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={["#EEF4FF", "#DCE8FF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sheetButton}
                  >
                    <Text style={styles.sheetButtonTextDark}>Cancel</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </BlurView>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};

// =========== SMALL REUSABLES ===========
const PinBadge: React.FC<{ size?: number }> = ({ size = 35 }) => (
  <View style={{ width: scale(size), height: scale(size * 1.4) }}>
    <Svg width="100%" height="100%" viewBox="0 0 50 70" preserveAspectRatio="xMidYMid meet">
      <Path d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z" fill={BLUE} />
      <SvgCircle cx="25" cy="25" r="8" fill={INK} />
    </Svg>
  </View>
);

const Chip: React.FC<{ text: string; textColor?: string; bgColor?: string }> = ({ text, textColor, bgColor }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  const onPress = () => {
    RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(scaleAnim, { toValue: 0.94, duration: 50, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        RNAnimated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 300, useNativeDriver: true }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, { toValue: 1, duration: 100, easing: Easing.out(Easing.ease), useNativeDriver: false }),
        RNAnimated.timing(glowAnim, { toValue: 0, duration: 250, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      ]),
    ]).start();
  };
  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.35] });
  const glowColor = glowAnim.interpolate({ inputRange: [0, 1], outputRange: ["rgba(27,68,205,0)", "rgba(27,68,205,0.18)"] });

  return (
    <Pressable onPress={onPress} style={{ overflow: "visible" }}>
      <View style={styles.chipBlur}>
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
        <RNAnimated.View style={{ transform: [{ scale: scaleAnim }], overflow: "hidden", borderRadius: scale(24), borderWidth: 1, borderColor: "rgba(27,68,205,0.25)" }}>
          <RNAnimated.View style={[styles.chipInner,{ shadowColor: BLUE, shadowOpacity, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }]}>
            {bgColor ? (
              <View style={[StyleSheet.absoluteFillObject,{ borderRadius: scale(24), backgroundColor: bgColor }]} />
            ) : (
              <LinearGradient colors={["#1B44CD","#7EA9FF"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[StyleSheet.absoluteFillObject,{ borderRadius: scale(24) }]} />
            )}
            <RNAnimated.View pointerEvents="none" style={[StyleSheet.absoluteFillObject,{ backgroundColor: glowColor }]} />
            <Text style={[styles.chipText, { color: textColor ?? BLUE }]}>{text}</Text>
          </RNAnimated.View>
        </RNAnimated.View>
      </View>
    </Pressable>
  );
};

const PhotoGlassFrame: React.FC<{ uri: string; onPress?: () => void; widthPct?: number; aspect?: number; }> = ({ uri, onPress, widthPct = 0.95, aspect = 0.8 }) => {
  const r = scale(22);
  return (
    <Pressable onPress={onPress} style={{ alignItems: "center" }}>
      <View style={{ width: SCREEN_WIDTH * widthPct, aspectRatio: aspect, borderRadius: r, overflow: "hidden", backgroundColor: "rgba(255,255,255,0.22)", borderWidth: 3, borderColor: "rgba(27,68,205,0.35)", shadowColor: BLUE, shadowOpacity: 0.8, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8 }}>
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFillObject} />
        <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.9)" }} />
        <LinearGradient colors={["rgba(255,255,255,0.45)","rgba(255,255,255,0.0)"]} start={{ x: 0, y: 0 }} end={{ x: 0.7, y: 0.5 }} style={{ position: "absolute", top: -verticalScale(8), left: -scale(8), width: "50%", height: verticalScale(60), borderRadius: scale(40) }} />
        <View style={{ flex: 1, margin: scale(8), borderRadius: r - scale(8), overflow: "hidden", backgroundColor: "#fff" }}>
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </View>
      </View>
    </Pressable>
  );
};

// Glass wrapper to remove repeated boilerplate
const GlassCard: React.FC<{ children: ReactNode; overlayStart?: { x: number; y: number }; overlayEnd?: { x: number; y: number } }> = ({ children, overlayStart = { x: 0, y: 0 }, overlayEnd = { x: 1, y: 1 } }) => (
  <BlurView intensity={95} tint="light" style={styles.glassBlur}>
    <LinearGradient colors={GRADIENTS.glassOverlay} start={overlayStart} end={overlayEnd} style={styles.glassGradient}>
      <View style={styles.edgeLight} />
      {children}
    </LinearGradient>
  </BlurView>
);

// =========== SCREEN ===========
type PromptAnswer = {
  slot: number;
  title?: string | null;
  answer?: string | null;
  category?: string | null;
  question?: string | null;
  updated_at?: string | null;
};

export default function ProfileTop() {
  // compact state buckets
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

  // animations
  const framesPulse = useRef(new RNAnimated.Value(1)).current;
  const framesHeight = useRef(new RNAnimated.Value(0)).current;
  const bioTap = useRef(new RNAnimated.Value(1)).current;
  const saveScale = useRef(new RNAnimated.Value(1)).current;
  const cancelScale = useRef(new RNAnimated.Value(1)).current;
  const animatePress = (v: RNAnimated.Value, toValue: number) =>
    RNAnimated.spring(v, { toValue, useNativeDriver: true, friction: 6, tension: 150 }).start();

  // Camera permission
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
        mediaTypes: ['images', 'videos'],  // Added videos support
        allowsEditing: false,
        aspect: [16, 9],
        quality: 0.8,
        videoMaxDuration: 30,  // 30 seconds max for videos
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
  }, 300); // Reduced delay to 300ms
};

const handleChooseLibrary = async () => {
  console.log("Choose library clicked");
  setShowFrameActionSheet(false);
  
  // Add delay to let modal close first
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
  }, 300); // 500ms delay
};

  const toggleFrames = () => {
    const toValue = framesExpanded ? 0 : 1;
    setFramesExpanded(!framesExpanded);
    RNAnimated.parallel([
      RNAnimated.spring(framesHeight, {
        toValue,
        friction: 7,
        tension: 100,
        useNativeDriver: false,
      }),
      RNAnimated.timing(framesPulse, {
        toValue: framesExpanded ? 1 : 1.03,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
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
      console.log("Raw frames data:", data);
      
      // Process each frame to get signed URLs (bucket is private!)
      const processedFrames = await Promise.all(
        data.map(async (frame) => {
          if (!frame.media_url) {
            return frame;
          }
          
          // If already a full URL, use as-is
          if (frame.media_url.startsWith('http')) {
            return frame;
          }
          
          // Since the bucket is PRIVATE, we need a SIGNED URL, not public URL
          const { data: signedUrlData, error: signError } = await supabase.storage
            .from("frames")  // Correct bucket name
            .createSignedUrl(frame.media_url, 3600); // Valid for 1 hour
          
          if (signError) {
            console.error("Error creating signed URL for frame", frame.id, ":", signError);
            return frame; // Return frame as-is if signing fails
          }
          
          console.log("Created signed URL for frame:", frame.id);
          
          return {
            ...frame,
            media_url: signedUrlData?.signedUrl || frame.media_url,
          };
        })
      );
      
      console.log("Processed frames with signed URLs:", processedFrames);
      setActiveFrames(processedFrames);
    } else {
      console.log("No active frames found");
      setActiveFrames([]);
    }
  } catch (error) {
    console.error("Error fetching active frames:", error);
    setActiveFrames([]);
  }
};

  useEffect(() => {
    if (!framesExpanded) {
      const loop = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(framesPulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
          RNAnimated.timing(framesPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
        ])
      );
      loop.start();
      return () => loop.stop();
    }
  }, [framesExpanded]);

  // Data load
  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        // Fetch active frame first
        await fetchActiveFrames(userId);

        // Run core fetches in parallel
        const [profRes, lifeRes, mainRes, othersRes, modesRes, hobbiesRes] = await Promise.all([
          supabase.from("profiles").select("full_name, age, bio, gender_subtype, height_cm, education, sexual_orientation, institution, prompt_answers").eq("id", userId).single(),
          supabase.from("lifestyle").select("drinking, smoking, zodiac, religion, politics, workout, communication, love_language, pets, kids, communities").eq("user_id", userId).maybeSingle(),
          supabase.from("user_photos").select("photo_url").eq("user_id", userId).eq("is_main", true).maybeSingle(),
          supabase.from("user_photos").select("photo_url, created_at, is_main").eq("user_id", userId).neq("is_main", true).order("created_at",{ ascending: true }),
          supabase.from("user_modes").select("looking_for_date, value_date").eq("user_id", userId).maybeSingle(),
          supabase.from("user_hobbies").select("hobbies_master(label)").eq("user_id", userId),
        ]);

        // profile + prompts
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

        // lifestyle
        const l = (lifeRes as any).data || {};
        setLifestyle({
          drinking: l.drinking ?? null, smoking: l.smoking ?? null, zodiac: l.zodiac ?? null, religion: l.religion ?? null,
          politics: l.politics ?? null, workout: l.workout ?? null, communication: l.communication ?? null,
          love_language: l.love_language ?? null, pets: l.pets ?? null, kids: l.kids ?? null
        });

        // communities
        const comms = Array.isArray(l.communities) ? l.communities.filter(Boolean) : [];
        setCommunities(comms);

        // photos
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

        // modes
        const m = (modesRes as any)?.data || {};
        const parseList = (raw: any): string[] =>
          Array.isArray(raw)
            ? raw.map(humanize)
            : typeof raw === "string"
              ? raw.split(/[,/&]| and /i).map((s: string) => humanize(s.trim())).filter(Boolean)
              : [];
        setModes({ looking: parseList(m.looking_for_date), values: parseList(m.value_date) });

        // hobbies
        const hs = (hobbiesRes as any)?.data || [];
        setHobbies(hs.map((x: any) => x?.hobbies_master?.label).filter(Boolean).map(humanize));
      } catch (e) {
        console.log("Error loading profile:", e);
      }
    })();
  }, []);

  // actions
  const saveBio = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id; if (!userId) return;
      await supabase.from("profiles").update({ bio: tempBio }).eq("id", userId);
      setProfile(p => ({ ...p, bio: tempBio }));
      setIsEditingBio(false);
      Keyboard.dismiss();
    } catch (e) { console.log("Error saving bio:", e); }
  };

  const saveHeight = async (height: number) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id; if (!userId) return;
      await supabase.from("profiles").update({ height_cm: height }).eq("id", userId);
      setProfile(p => ({ ...p, heightCm: height }));
      setHeightModalVisible(false);
    } catch (e) { console.log("Error saving height:", e); }
  };

  // deriveds
  const displayName = useMemo(() => toTitleCase(profile.fullName) || "—", [profile.fullName]);
  const nameSize = useMemo(() => getNameFontSize(displayName.length), [displayName]);

  // lifestyle rows
  const horizontalItems = useMemo(() => ([
    { key: "gender_subtype", value: profile.genderSubtype, icon: require("../../assets/images/lifestyle/gender_subtype_icon.png"), mandatory: true },
    { key: "height", value: profile.heightCm ? `${profile.heightCm} cm` : null, icon: require("../../assets/images/lifestyle/height_icon.png"), mandatory: false, editable: true },
    { key: "education", value: profile.education, icon: require("../../assets/images/lifestyle/education_icon.png"), mandatory: false },
    { key: "drinking", value: lifestyle.drinking, icon: require("../../assets/images/lifestyle/drinking_icon.png"), mandatory: false },
    { key: "smoking", value: lifestyle.smoking, icon: require("../../assets/images/lifestyle/smoking_icon.png"), mandatory: false },
    { key: "zodiac", value: lifestyle.zodiac, icon: require("../../assets/images/lifestyle/zodiac_icon.png"), mandatory: false },
    { key: "religion", value: lifestyle.religion, icon: require("../../assets/images/lifestyle/religion_icon.png"), mandatory: false },
    { key: "politics", value: lifestyle.politics, icon: require("../../assets/images/lifestyle/politics_icon.png"), mandatory: false },
  ].filter(i => i.mandatory || i.value)), [profile, lifestyle]);

  const verticalItems = useMemo(() => ([
    { key: "sexual_orientation", value: profile.sexualOrientation, icon: require("../../assets/images/lifestyle/orientation_icon.png"), mandatory: true },
    { key: "institution", value: profile.institution, icon: require("../../assets/images/lifestyle/institution_icon.png"), mandatory: false },
    { key: "workout", value: lifestyle.workout, icon: require("../../assets/images/lifestyle/workout_icon.png"), mandatory: false },
    { key: "communication", value: lifestyle.communication, icon: require("../../assets/images/lifestyle/communication_icon.png"), mandatory: false },
    { key: "love_language", value: lifestyle.love_language, icon: require("../../assets/images/lifestyle/love_icon.png"), mandatory: false },
    { key: "pets", value: lifestyle.pets, icon: require("../../assets/images/lifestyle/pet_icon.png"), mandatory: false },
    { key: "kids", value: lifestyle.kids, icon: require("../../assets/images/lifestyle/baby_icon.png"), mandatory: false },
  ].filter(i => i.mandatory || i.value)), [profile, lifestyle]);

  const shouldScrollHorizontal = horizontalItems.length > 4;

  // ===== Prompts carousel state =====
  const prompts: PromptAnswer[] = useMemo(() => {
    const arr = profile.promptAnswers || [];
    return [...arr].filter(p => p && p.answer).slice(0, 3);
  }, [profile.promptAnswers]);

  const [promptWidth, setPromptWidth] = useState(SCREEN_WIDTH);
  const [promptIndex, setPromptIndex] = useState(0);
  const onPromptScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const w = e.nativeEvent.layoutMeasurement.width || SCREEN_WIDTH;
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / w);
    setPromptIndex(Math.max(0, Math.min(i, Math.max(0, prompts.length - 1))));
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Top bar */}
      <View style={styles.topBarContainer}>
        <BlurView intensity={95} tint="light" style={styles.blurView} />
        <View style={styles.topBar}>
          <Image source={require("../../assets/images/niice_logo_icon.png")} resizeMode="contain" style={styles.logo} />
          <View style={styles.topRight}>
            <TouchableOpacity 
  style={styles.editButton} 
  activeOpacity={0.75} 
  onPress={() => router.push("/(edit_profile)/edit_main")}
>
  <Image source={require("../../assets/images/edit_pencil_icon.png")} style={styles.editIcon} resizeMode="contain" />
</TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/in_progress")} activeOpacity={0.7} style={styles.settingsBtn}>
              <Image source={require("../../assets/images/settings_icon.png")} resizeMode="contain" style={styles.settingsIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: verticalScale(20) }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.profileBlock}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => activeFrames.length > 0 && setShowFrameViewer(true)}
            disabled={activeFrames.length === 0}
          >
            <View style={[
              styles.avatarOuterRing,
              activeFrames.length === 0 && styles.avatarRingInactive
            ]}>
              {activeFrames.length > 0 && (
                <LinearGradient
                  colors={[BLUE, "#678CFF", "#A8C4FF", BLUE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.avatarRingGradient}
                />
              )}
              <View style={styles.avatarInnerRing}>
                {photos.avatar ? (
                  <Image source={{ uri: photos.avatar }} style={styles.avatar} resizeMode="cover" />
                ) : (
                  <View style={[styles.avatar, styles.avatarPlaceholder]}>
                    <Text style={styles.placeholderText}>No photo</Text>
                  </View>
                )}
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.nameBlock}>
            {displayName.length > 20 ? (
              <>
                <Text style={[styles.nameText, { fontSize: nameSize }]} numberOfLines={1}>{displayName}</Text>
                {profile.age != null && <Text style={[styles.ageTextStacked, { fontSize: nameSize }]}>{profile.age}</Text>}
              </>
            ) : (
              <View style={styles.nameLine}>
                <Text style={[styles.nameTextInline, { fontSize: nameSize }]} numberOfLines={1}>{displayName}</Text>
                {profile.age != null && <Text style={[styles.ageText, { fontSize: nameSize }]}>{`, ${profile.age}`}</Text>}
              </View>
            )}
            
            {/* FRAMES BUTTON - FIXED */}
            {/* FRAMES BUTTON - FIXED */}
            <View style={{ marginTop: verticalScale(2) }}>
              <TouchableOpacity 
                activeOpacity={0.9} 
                onPress={() => {
                  const newExpanded = !framesExpanded;
                  setFramesExpanded(newExpanded);
                  
                  // Animate the height
                  RNAnimated.timing(framesHeight, {
                    toValue: newExpanded ? 1 : 0,
                    duration: 300,
                    easing: Easing.out(Easing.ease),
                    useNativeDriver: false,
                  }).start();
                }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <LinearGradient 
                  colors={GRADIENTS.frames} 
                  start={{ x: 0, y: 0 }} 
                  end={{ x: 1, y: 1 }} 
                  style={styles.framesButton}
                >
                  <Text style={styles.framesButtonText}>
                    Frames {framesExpanded ? ' ↓' : ' →'}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>

              {/* Animated expandable sub-buttons */}
              <RNAnimated.View 
                style={{
                  maxHeight: framesHeight.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 200], // Fixed pixel value that definitely fits
                  }),
                  opacity: framesHeight,
                  overflow: 'hidden',
                }}
              >
                <View style={{ 
                  marginTop: 8, 
                  gap: 8,
                }}>

<TouchableOpacity 
  activeOpacity={0.8} 
  onPress={() => setShowFrameActionSheet(true)}
>
  <LinearGradient 
    colors={['#4668FF', '#7EA9FF']} 
    start={{ x: 0, y: 0 }} 
    end={{ x: 1, y: 1 }} 
    style={[styles.framesButton, { backgroundColor: 'transparent' }]}
  >
    <Text style={[styles.framesButtonText, { fontSize: moderateScale(16) }]}>
      + Add New Frame
    </Text>
  </LinearGradient>
</TouchableOpacity>
                  
                  <TouchableOpacity 
                    activeOpacity={0.8} 
                    onPress={() => router.push("/(frames)/frame_archive")}
                  >
                    <LinearGradient 
                      colors={['#DCE8FF', '#EEF4FF']} 
                      start={{ x: 0, y: 0 }} 
                      end={{ x: 1, y: 1 }} 
                      style={[styles.framesButton, { backgroundColor: 'transparent' }]}
                    >
                      <Text style={[styles.framesButtonText, { color: BLUE, fontSize: moderateScale(16) }]}>
                        📁 Frame Archive
                      </Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </RNAnimated.View>
            </View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioBlock}>
          <LinearGradient
            colors={isEditingBio ? ["#EFF3FF","#E6EEFF"] : ["#F9FAFF","#EEF3FF"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.bioCard, isEditingBio && { borderColor: BLUE, shadowColor: BLUE, shadowOpacity: 0.22 }]}
          >
            <View style={styles.bioAccent} />
            <View style={styles.bioHeaderRow}>
              <View style={styles.bioTag}><Text style={styles.bioTagText}>Bio</Text></View>
            </View>

            {isEditingBio ? (
              <View>
                <TextInput
                  style={styles.bioInput}
                  placeholder="Share a bit about yourself..."
                  placeholderTextColor="#9CA8B7"
                  value={tempBio}
                  onChangeText={setTempBio}
                  multiline
                  maxLength={160}
                  autoFocus
                />
                <Text style={styles.charCount}>{tempBio.length}/160</Text>
                <View style={styles.bioActions}>
                  <RNAnimated.View style={{ flex: 1, transform: [{ scale: cancelScale }] }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPressIn={() => animatePress(cancelScale, 0.97)}
                      onPressOut={() => animatePress(cancelScale, 1)}
                      onPress={() => { setIsEditingBio(false); Keyboard.dismiss(); }}
                    >
                      <LinearGradient colors={GRADIENTS.cancel} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.smallPill}>
                        <Text style={[styles.pillText, { color: BLUE }]}>Cancel</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </RNAnimated.View>
                  <RNAnimated.View style={{ flex: 1, transform: [{ scale: saveScale }] }}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onPressIn={() => animatePress(saveScale, 0.97)}
                      onPressOut={() => animatePress(saveScale, 1)}
                      onPress={saveBio}
                    >
                      <LinearGradient colors={GRADIENTS.save} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.smallPill}>
                        <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Save</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </RNAnimated.View>
                </View>
              </View>
            ) : (
              <RNAnimated.View style={{ transform: [{ scale: bioTap }] }}>
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPressIn={() => animatePress(bioTap, 0.97)}
                  onPressOut={() => animatePress(bioTap, 1)}
                  onPress={() => { setTempBio(profile.bio || ""); setIsEditingBio(true); }}
                >
                  <Text style={profile.bio ? styles.bioText : styles.bioPlaceholder}>{profile.bio || "+ Add bio"}</Text>
                </TouchableOpacity>
              </RNAnimated.View>
            )}
          </LinearGradient>
        </View>

        {/* Looking For */}
        <View style={styles.infoBlock}>
          <GlassCard overlayStart={{ x: 0, y: 0 }} overlayEnd={{ x: 1, y: 1 }}>
            <View style={styles.infoCard}>
              <View style={styles.infoTitleRow}>
                <Text style={styles.infoTitle}>What am I looking for</Text>
                <PinBadge size={30} />
              </View>
              {modes.looking.length ? (
                <View style={styles.chipsRow}>{modes.looking.map((t, i) => <Chip key={i} text={t} textColor="#FFFFFF" />)}</View>
              ) : (
                <Text style={styles.placeholderSmall}>+ Set this in Settings</Text>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Main Photo */}
        {photos.first && (
          <View style={{ marginTop: verticalScale(14), alignItems: "center" }}>
            <PhotoGlassFrame
              uri={photos.first}
              onPress={() => { setSelectedModalUri(photos.first); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Values */}
        <View style={styles.infoBlock}>
          <GlassCard overlayStart={{ x: 1, y: 0 }} overlayEnd={{ x: 0, y: 1 }}>
            <View style={styles.infoCard}>
              <View style={styles.infoTitleRow}>
                <Text style={styles.infoTitle}>What do I value</Text>
                <PinBadge size={30} />
              </View>
              {modes.values.length ? (
                <View style={styles.chipsRow}>{modes.values.map((t, i) => <Chip key={i} text={t} textColor="#FFFFFF" />)}</View>
              ) : (
                <Text style={styles.placeholderSmall}>+ Set this in Settings</Text>
              )}
            </View>
          </GlassCard>
        </View>

        {/* Lifestyle */}
        <View style={styles.lifestyleBlock}>
          <GlassCard>
            {/* Horizontal */}
            {!!horizontalItems.length && (
              <View style={styles.horizontalSection}>
                {shouldScrollHorizontal ? (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
                    {horizontalItems.map(item => (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.horizontalItem}
                        onPress={item.editable && !item.value ? () => setHeightModalVisible(true) : undefined}
                        activeOpacity={item.editable && !item.value ? 0.7 : 1}
                      >
                        <Image source={item.icon} style={styles.horizontalIcon} resizeMode="contain" />
                        <Text style={styles.horizontalText}>{formatLifestyleValue(item.key, item.value) || "+ Add"}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : (
                  <View style={styles.horizontalCentered}>
                    {horizontalItems.map(item => (
                      <TouchableOpacity
                        key={item.key}
                        style={styles.horizontalItem}
                        onPress={item.editable && !item.value ? () => setHeightModalVisible(true) : undefined}
                        activeOpacity={item.editable && !item.value ? 0.7 : 1}
                      >
                        <Image source={item.icon} style={styles.horizontalIcon} resizeMode="contain" />
                        <Text style={styles.horizontalText}>{formatLifestyleValue(item.key, item.value) || "+ Add"}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Vertical */}
            {!!verticalItems.length && (
              <View style={styles.verticalSection}>
                {verticalItems.map((item, idx) => (
                  <View key={item.key}>
                    <View style={styles.verticalRow}>
                      <Image source={item.icon} style={styles.verticalIcon} resizeMode="contain" />
                      <Text style={styles.verticalText}>{formatLifestyleValue(item.key, item.value)}</Text>
                    </View>
                    {idx < verticalItems.length - 1 && <View style={styles.verticalDivider} />}
                  </View>
                ))}
              </View>
            )}
          </GlassCard>
        </View>

        {/* Second Photo */}
        {photos.second && (
          <View style={{ marginTop: verticalScale(14), alignItems: "center" }}>
            <PhotoGlassFrame
              uri={photos.second}
              onPress={() => { setSelectedModalUri(photos.second); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Hobbies */}
        {!!hobbies.length && (
          <View style={styles.hobbiesBlock}>
            <GlassCard overlayStart={{ x: 0.5, y: 0 }} overlayEnd={{ x: 0.5, y: 1 }}>
              <View style={styles.hobbiesCard}>
                <View style={styles.hobbiesTitleRow}>
                  <View style={styles.hobbiesTitleGroup}>
                    <Text style={styles.hobbiesTitle}>Your Hobbies</Text>
                    <Image source={require("../../assets/images/puzzle_icon.png")} resizeMode="contain" style={styles.puzzleIcon} />
                  </View>
                </View>

                <View style={[styles.hobbiesGrid, hobbies.length <= 6 ? styles.hobbiesGridPacked : styles.hobbiesGridPacked]}>
                  {hobbies.map((h, i) => (
                    <View key={i} style={[styles.hobbyChipWrapper, hobbies.length > 6 && { transform: [{ scale: 0.95 }] }]}>
                      <Chip text={h} textColor="#FFFFFF" />
                    </View>
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* ===== Prompts Carousel ===== */}
        {!!prompts.length && (
          <View style={styles.promptsBlock}>
            <GlassCard>
              <View style={styles.promptsCard}>
                {/* Pill banner with the current question */}
                <View style={styles.promptPill}>
                  <Text style={styles.promptPillText}>
                    {prompts[promptIndex]?.question || prompts[promptIndex]?.title || "Prompt"}
                  </Text>
                </View>

                {/* Horizontal pager */}
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
                      {/* Decorative quotes anchored to page edges */}
                      <Text style={[styles.promptQuote, styles.promptQuoteLeft]}>"</Text>
                      <Text style={[styles.promptQuote, styles.promptQuoteRight]}>"</Text>

                      <View style={styles.promptInner}>
                        <View style={styles.promptQuoteWrap}>
                          <Text style={styles.promptAnswerText} numberOfLines={4}>
                            {p.answer || ""}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </ScrollView>

                {/* Dots */}
                <View style={styles.promptDotsRow}>
                  {prompts.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.promptDot, i === promptIndex ? styles.promptDotActive : undefined]}
                    />
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        )}

        {/* Third Photo */}
        {photos.third && (
          <View style={{ marginTop: verticalScale(14), alignItems: "center" }}>
            <PhotoGlassFrame
              uri={photos.third}
              onPress={() => { setSelectedModalUri(photos.third); setModalVisible(true); }}
            />
          </View>
        )}

        {/* Communities */}
        {!!communities.length && (
          <View style={styles.hobbiesBlock}>
            <GlassCard overlayStart={{ x: 0.5, y: 0 }} overlayEnd={{ x: 0.5, y: 1 }}>
              <View style={styles.hobbiesCard}>
                <View style={styles.hobbiesTitleRow}>
                  <View style={styles.hobbiesTitleGroup}>
                    <Text style={styles.hobbiesTitle}>Communities</Text>
                  </View>
                </View>

                <View style={[styles.hobbiesGrid, communities.length <= 6 ? styles.hobbiesGridPacked : styles.hobbiesGridPacked]}>
                  {communities.map((c, i) => (
                    <View key={i} style={[styles.hobbyChipWrapper, communities.length > 6 && { transform: [{ scale: 0.95 }] }]}>
                      <Chip text={c} textColor="#FFFFFF" />
                    </View>
                  ))}
                </View>
              </View>
            </GlassCard>
          </View>
        )}
      </ScrollView>

      {/* Photo Modal */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)}>
          <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)} activeOpacity={0.8}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
          {!!selectedModalUri && <Image source={{ uri: selectedModalUri }} style={styles.modalImage} resizeMode="contain" />}
        </Pressable>
      </Modal>

      {/* Height Picker */}
      {/* Height Picker */}
      <HeightPickerModal visible={heightModalVisible} onClose={() => setHeightModalVisible(false)} onSave={saveHeight} />
      
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



// =========== Height Picker ===========
const HeightPickerModal: React.FC<{ visible: boolean; onClose: () => void; onSave: (height: number) => void; }> = ({ visible, onClose, onSave }) => {
  const [selectedHeight, setSelectedHeight] = useState(170);
  const scrollRef = useRef<ScrollView>(null);
  const heights = useMemo(() => Array.from({ length: 101 }, (_, i) => 140 + i), []);
  useEffect(() => {
    if (visible) setTimeout(() => scrollRef.current?.scrollTo({ y: (selectedHeight - 140) * verticalScale(44), animated: false }), 100);
  }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.heightModalBackdrop} onPress={onClose}>
        <Pressable style={styles.heightModalContent} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={["rgba(255,255,255,0.9)","rgba(246,248,252,0.95)"]} style={StyleSheet.absoluteFillObject} />
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
                <Pressable key={h} onPress={() => { setSelectedHeight(h); scrollRef.current?.scrollTo({ y: (h - 140) * verticalScale(44), animated: true }); }} style={styles.heightItem}>
                  <Text style={[styles.heightText, selectedHeight === h && styles.heightTextSelected]}>{h} cm</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.heightModalActions}>
            <TouchableOpacity onPress={onClose} style={styles.heightCancelBtn}><Text style={styles.heightCancelText}>Cancel</Text></TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(selectedHeight)} style={styles.heightSaveBtn}>
              <LinearGradient colors={GRADIENTS.save} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heightSaveGradient}>
                <Text style={styles.heightSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// =========== STYLES ===========
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  topBarContainer: { position: "relative", zIndex: 10 },
  blurView: { position: "absolute", top: 0, left: 0, right: 0, bottom: -verticalScale(20), zIndex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(22), paddingTop: verticalScale(6), paddingBottom: verticalScale(12), zIndex: 2, backgroundColor: "transparent" },
  logo: { width: scale(120), height: verticalScale(42) },
  topRight: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  editButton: { width: scale(38), height: scale(38), borderRadius: scale(19), backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  editIcon: { width: scale(18), height: scale(18), tintColor: "#FFFFFF" },
  settingsBtn: { padding: scale(8) },
  settingsIcon: { width: scale(22), height: scale(22) },

  profileBlock: { flexDirection: "row", alignItems: "center", paddingTop: verticalScale(24), paddingHorizontal: scale(22) },
  avatarOuterRing: { width: AVATAR_SIZE, height: AVATAR_SIZE, borderRadius: AVATAR_SIZE / 2, borderWidth: scale(2), borderColor: BLUE, alignItems: "center", justifyContent: "center", marginRight: scale(14) },
  avatarInnerRing: { width: AVATAR_SIZE - scale(10), height: AVATAR_SIZE - scale(10), borderRadius: (AVATAR_SIZE - scale(10)) / 2, borderWidth: scale(1.5), borderColor: INK, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  avatar: { width: AVATAR_SIZE - scale(18), height: AVATAR_SIZE - scale(18), borderRadius: (AVATAR_SIZE - scale(18)) / 2 },
  avatarPlaceholder: { backgroundColor: "#D7E2F2", alignItems: "center", justifyContent: "center" },
  placeholderText: { color: INK, fontSize: scale(13), fontFamily: Fonts.primary, fontWeight: "600" },

  nameBlock: { flex: 1, justifyContent: "center" },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap" },
  nameText: { color: INK, fontFamily: Fonts.bold, letterSpacing: 0.3 },
  nameTextInline: { color: INK, fontFamily: Fonts.bold, letterSpacing: 0.3, flexShrink: 1 },
  ageText: { color: BLUE, fontFamily: Fonts.bold, letterSpacing: 0.3, flexShrink: 0 },
  ageTextStacked: { color: BLUE, fontFamily: Fonts.bold, letterSpacing: 0.3, marginTop: verticalScale(-2) },

  framesButton: { alignSelf: "flex-start", borderRadius: scale(24), paddingVertical: verticalScale(4), paddingHorizontal: scale(14), shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 5 }, elevation: 6 },
  framesButtonText: { fontFamily: Fonts.bold, fontSize: moderateScale(18), color: "#FFFFFF", textAlign: "center", letterSpacing: 0.5 },

  bioBlock: { marginTop: verticalScale(20), paddingHorizontal: scale(22) },
  bioCard: { position: "relative", borderRadius: scale(18), paddingVertical: verticalScale(12), paddingHorizontal: scale(18), borderWidth: 1, borderColor: "#D2DDF3", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 5, elevation: 2 },
  bioAccent: { position: "absolute", left: 0, top: 0, bottom: 0, width: scale(3), borderTopLeftRadius: scale(18), borderBottomLeftRadius: scale(18), backgroundColor: LIGHT_BLUE, opacity: 0.9 },
  bioHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(6) },
  bioTag: { backgroundColor: "#EAF0FF", borderRadius: scale(10), paddingHorizontal: scale(10), paddingVertical: verticalScale(3), alignSelf: "flex-start" },
  bioTagText: { fontFamily: Fonts.bold, fontSize: scale(12.5), color: BLUE, letterSpacing: 0.3 },
  bioText: { fontFamily: Fonts.primary, fontSize: scale(15), color: "#3A4856", lineHeight: verticalScale(28), fontWeight: "600", textAlign: "center", paddingHorizontal: scale(8) },
  bioPlaceholder: { fontFamily: Fonts.primary, fontSize: scale(15.5), color: "#678CFF", fontWeight: "500", letterSpacing: 0.2 },
  bioInput: { fontFamily: Fonts.primary, fontSize: scale(15.5), color: INK, minHeight: verticalScale(88), textAlignVertical: "top", lineHeight: verticalScale(22), borderRadius: scale(12), paddingVertical: verticalScale(4) },
  charCount: { alignSelf: "flex-end", fontSize: scale(12), color: "#9BA9B9", marginTop: verticalScale(4), fontFamily: Fonts.primary },
  bioActions: { flexDirection: "row", gap: scale(10), marginTop: verticalScale(12), justifyContent: "flex-end" },
  smallPill: { borderRadius: scale(28), paddingVertical: verticalScale(5), paddingHorizontal: scale(16), shadowColor: BLUE, shadowOpacity: 0.18, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4, alignItems: "center" },
  pillText: { fontFamily: Fonts.bold, fontSize: moderateScale(16), letterSpacing: 0.4 },

  infoBlock: { marginTop: verticalScale(14), paddingHorizontal: scale(22) },

  // Generic glass
  glassBlur: { borderRadius: scale(28), overflow: "hidden", borderWidth: 1.2, borderColor: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.22)", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  glassGradient: { borderRadius: scale(28) },
  edgeLight: { position: "absolute", top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.85)" },

  infoCard: { paddingVertical: verticalScale(18), paddingHorizontal: scale(18) },
  infoTitleRow: { flexDirection: "row", alignItems: "center", gap: scale(8), marginBottom: verticalScale(10) },
  infoTitle: { fontFamily: Fonts.bold, fontSize: scale(23), color: INK, letterSpacing: 0.2 },
  chipsRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: scale(10), marginTop: verticalScale(4) },
  placeholderSmall: { fontFamily: Fonts.primary, fontSize: scale(14), color: "#6B7280", marginTop: verticalScale(2), textAlign: "center" },

  chipBlur: { borderRadius: scale(24), overflow: "hidden" },
  chipInner: { borderRadius: scale(24), paddingVertical: verticalScale(6), paddingHorizontal: scale(14), alignItems: "center", justifyContent: "center", elevation: 3, maxWidth: SCREEN_WIDTH * 0.9 },
  chipText: { fontFamily: Fonts.bold, fontSize: scale(14), letterSpacing: 0.3 },

  lifestyleBlock: { marginTop: verticalScale(14), paddingHorizontal: scale(22), marginBottom: verticalScale(10) },
  horizontalSection: { paddingVertical: verticalScale(12) },
  horizontalScroll: { paddingHorizontal: scale(18), gap: scale(14), alignItems: "center" },
  horizontalCentered: { flexDirection: "row", justifyContent: "center", alignItems: "center", gap: scale(14), paddingHorizontal: scale(18) },
  horizontalItem: { alignItems: "center", gap: verticalScale(4) },
  horizontalIcon: { width: scale(32), height: scale(32) },
  horizontalText: { fontFamily: Fonts.bold, fontSize: scale(13), color: INK, letterSpacing: 0.2 },

  verticalSection: { paddingHorizontal: scale(18), paddingBottom: verticalScale(12) },
  verticalRow: { flexDirection: "row", alignItems: "center", gap: scale(10), paddingVertical: verticalScale(10) },
  verticalIcon: { width: scale(28), height: scale(28) },
  verticalText: { flex: 1, fontFamily: Fonts.bold, fontSize: scale(15), color: INK, letterSpacing: 0.2 },
  verticalDivider: { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(27,68,205,0.15)", marginLeft: scale(38) },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  closeButton: { position: "absolute", top: verticalScale(50), right: scale(20), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  closeButtonText: { fontSize: scale(28), color: "#FFFFFF", fontWeight: "300" },

  // Hobbies
  hobbiesBlock: { marginTop: verticalScale(14), paddingHorizontal: scale(22), marginBottom: verticalScale(10) },
  hobbiesCard: { paddingVertical: verticalScale(18), paddingHorizontal: scale(18) },
  hobbiesTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: verticalScale(12) },
  hobbiesTitle: { fontFamily: Fonts.bold, fontSize: scale(23), color: INK, letterSpacing: 0.2 },
  hobbiesTitleGroup: { flexDirection: "row", alignItems: "center", gap: scale(4) },
  puzzleIcon: { width: scale(32), height: scale(32), marginLeft: scale(2) },
  puzzleIconMirror: { width: scale(32), height: scale(32), transform: [{ scaleX: -1 }], opacity: 0.95, marginLeft: scale(-4) },

  hobbiesGrid: { marginTop: verticalScale(4) },
  hobbiesGridPacked: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", alignContent: "flex-start", rowGap: verticalScale(8), columnGap: scale(10) },
  hobbyChipWrapper: { marginBottom: verticalScale(4), maxWidth: "100%" },

  // Prompts block styles
  promptsBlock: { marginTop: verticalScale(14), paddingHorizontal: scale(22), marginBottom: verticalScale(10) },
  promptsCard: { paddingVertical: verticalScale(18), paddingHorizontal: scale(18), alignItems: "stretch" },

  promptPill: {
    backgroundColor: "rgba(255,255,255,0.85)",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(26),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.20)",
  },
  promptPillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: BLUE,
    letterSpacing: 0.3,
  },

  promptQuoteWrap: {
    width: "100%",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingTop: verticalScale(70),
    backgroundColor: "transparent",
  },

  promptPage: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(12),
    minHeight: verticalScale(140),
    position: "relative",
  },

  promptInner: {
    width: "100%",
    alignItems: "center",
  },

  promptQuote: {
    position: "absolute",
    fontSize: scale(96),
    color: BLUE,
    fontFamily: Fonts.bold,
    opacity: 0.9,
    zIndex: -1,
  },
  promptQuoteLeft: {
    left: scale(-5),
    top: verticalScale(-20),
  },
  promptQuoteRight: {
    right: scale(-5),
    bottom: verticalScale(-20),
  },

  promptAnswerText: {
    textAlign: "center",
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    lineHeight: verticalScale(32),
    color: INK,
    width: "100%",
    paddingHorizontal: scale(10),
  },

  promptDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: verticalScale(12),
    paddingBottom: verticalScale(4),
    gap: scale(8),
  },
  promptDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  promptDotActive: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: INK,
  },

  // Height modal
  heightModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  heightModalContent: { width: "80%", maxHeight: "70%", borderRadius: scale(24), overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" },
  heightModalTitle: { fontFamily: Fonts.bold, fontSize: scale(20), color: INK, textAlign: "center", paddingTop: verticalScale(20), paddingBottom: verticalScale(12) },
  heightPickerContainer: { height: verticalScale(220), position: "relative" },
  heightSelector: { position: "absolute", top: "50%", left: scale(20), right: scale(20), height: verticalScale(44), marginTop: -verticalScale(22), backgroundColor: "rgba(27,68,205,0.1)", borderRadius: scale(12), borderWidth: 2, borderColor: BLUE, zIndex: 1 },
  heightItem: { height: verticalScale(44), justifyContent: "center", alignItems: "center" },
  heightText: { fontFamily: Fonts.primary, fontSize: scale(16), color: "#6B7280", fontWeight: "600" },
  heightTextSelected: { fontFamily: Fonts.bold, fontSize: scale(18), color: BLUE },
  heightModalActions: { flexDirection: "row", gap: scale(12), paddingHorizontal: scale(20), paddingVertical: verticalScale(16) },
  heightCancelBtn: { flex: 1, paddingVertical: verticalScale(12), backgroundColor: "rgba(238,244,255,0.8)", borderRadius: scale(16), alignItems: "center" },
  heightCancelText: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },
  heightSaveBtn: { flex: 1, borderRadius: scale(16), overflow: "hidden" },
  heightSaveGradient: { paddingVertical: verticalScale(12), alignItems: "center" },
  heightSaveText: { fontFamily: Fonts.bold, fontSize: scale(16), color: "#FFFFFF" },

  // Bottom Sheet Styles
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
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
  sheetButtonTextDark: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.4,
  },
  avatarRingInactive: { 
    borderWidth: scale(2), 
    borderColor: "#E0E0E0" 
  },
  avatarRingGradient: {
    position: "absolute",
    width: "100%",
    height: "100%",
    borderRadius: AVATAR_SIZE / 2,
  },
});