// app/(tabs)/profile.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { BlurView } from 'expo-blur';
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
    Dimensions,
    Easing,
    Image,
    Keyboard,
    Modal,
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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1B44CD";
const LIGHT_BLUE = "#A8C4FF";
const PAPER = "#F6F8FC";
const PAPER_STROKE = "#C9D6F2";

const GRADIENTS = {
  frames: [BLUE, "#678CFF"],
  save: [BLUE, LIGHT_BLUE],
  cancel: ["#EEF4FF", "#DCE8FF"],
  chipBorder: ["#DCE8FF", LIGHT_BLUE],
  bioActive: ["#EFF3FF", "#E6EEFF"],
  bioInactive: ["#F9FAFF", "#EEF3FF"],
  glassOverlay: [
    "rgba(255,255,255,0.55)",
    "rgba(246,248,252,0.18)",
    "rgba(168,196,255,0.22)"
  ],
  chipFill: [
    "rgba(186,205,255,0.85)",
    "rgba(199,213,255,0.80)"
  ],
} as const;

const AVATAR_SIZE = scale(125);

// Drop exactly the first TWO ASCII letters in the string,
// ignoring any non-letters before them. Keeps everything else as-is.
const dropFirstTwoLetters = (s: string | null | undefined): string | null => {
  if (!s) return s ?? null;
  const arr = Array.from(s);           // emoji-safe
  let idx = 0;

  // keep prefix (emojis/spaces/punct) untouched
  while (idx < arr.length && !/[A-Za-z]/.test(arr[idx])) idx++;

  // now remove exactly two letters from here forward, keep others
  let removed = 0;
  const out: string[] = [];
  // copy prefix
  for (let i = 0; i < idx; i++) out.push(arr[i]);
  // walk the rest, skipping first two letters encountered
  for (let i = idx; i < arr.length; i++) {
    const ch = arr[i];
    if (removed < 2 && /[A-Za-z]/.test(ch)) {
      removed++;
      continue; // skip this letter
    }
    out.push(ch);
  }
  return out.join('');
};


const toTitleCase = (str: string | null | undefined): string =>
  str?.toLowerCase().split(" ").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ") || "";

const humanize = (s: string | null | undefined): string => toTitleCase((s ?? "").replace(/_/g, " "));

// Helper function to remove first two letters for specific fields
const formatLifestyleValue = (key: string, value: string | null | undefined): string => {
  if (!value) return "";
  const humanizedValue = humanize(value);

  // normalize: support keys like "lifestyle.kids"
  const pureKey = (key || "").split(".").pop() || key;

  const keysToTrim = [
    'drinking', 'smoking', 'zodiac', 'religion',
    'workout', 'communication', 'love_language',
    'pets', 'kids', 'politics'
  ];

  if (keysToTrim.includes(pureKey)) {
    // remove first two chars (e.g., "No") and drop any leading space
    return humanizedValue.length > 2
      ? humanizedValue.substring(2).trimStart()
      : humanizedValue;
  }

  return humanizedValue;
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
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
  for (const marker of markers) {
    const idx = urlOrPath.indexOf(marker);
    if (idx !== -1) {
      return decodeURIComponent(urlOrPath.substring(idx + marker.length).split("?")[0]);
    }
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

const PinBadge: React.FC<{ size?: number }> = ({ size = 35 }) => (
  <View style={{ width: scale(size), height: scale(size * 1.4) }}>
    <Svg width="100%" height="100%" viewBox="0 0 50 70" preserveAspectRatio="xMidYMid meet">
      <Path d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z" fill={BLUE} />
      <SvgCircle cx="25" cy="25" r="8" fill={INK} />
    </Svg>
  </View>
);

const Chip: React.FC<{ text: string }> = ({ text }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const glowAnim = useRef(new RNAnimated.Value(0)).current;
  const [pressed, setPressed] = useState(false);

  const onPress = () => {
    setPressed(true);
    scaleAnim.setValue(1);
    glowAnim.setValue(0);

    RNAnimated.parallel([
      RNAnimated.sequence([
        RNAnimated.timing(scaleAnim, {
          toValue: 0.94,
          duration: 50,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        RNAnimated.spring(scaleAnim, {
          toValue: 1,
          friction: 5,
          tension: 300,
          useNativeDriver: true,
        }),
      ]),
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, {
          toValue: 1,
          duration: 100,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        RNAnimated.timing(glowAnim, {
          toValue: 0,
          duration: 250,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
      ]),
    ]).start(() => setPressed(false));
  };

  const shadowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.06, 0.35],
  });

  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["rgba(27,68,205,0)", "rgba(27,68,205,0.18)"],
  });

  return (
    <Pressable onPress={onPress} style={{ overflow: "visible" }}>
      <View style={styles.chipBlur}>
        <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />

        <RNAnimated.View
          style={{
            transform: [{ scale: scaleAnim }],
            overflow: 'hidden',
            borderRadius: scale(24),
            borderWidth: 1,
            borderColor: "rgba(27,68,205,0.25)",
          }}
        >
          <RNAnimated.View
            style={[
              styles.chipInner,
              {
                shadowColor: BLUE,
                shadowOpacity: shadowOpacity,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
              },
            ]}
          >
            <LinearGradient
              colors={GRADIENTS.chipFill}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                StyleSheet.absoluteFillObject,
                { borderRadius: scale(24) }
              ]}
            />

            <RNAnimated.View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFillObject,
                {
                  backgroundColor: glowColor,
                },
              ]}
            />

            <Text
              style={[
                styles.chipText,
                pressed && {
                  color: BLUE,
                  opacity: 0.95,
                },
              ]}
            >
              {text}
            </Text>
          </RNAnimated.View>
        </RNAnimated.View>
      </View>
    </Pressable>
  );
};

const PhotoGlassFrame: React.FC<{
  uri: string;
  onPress?: () => void;
  widthPct?: number;
  aspect?: number;
}> = ({ uri, onPress, widthPct = 0.84, aspect = 0.9 }) => {
  const w = SCREEN_WIDTH * widthPct;
  const r = scale(22);

  return (
    <Pressable onPress={onPress} style={{ alignItems: "center" }}>
      <View
        style={{
          width: w,
          aspectRatio: aspect,
          borderRadius: r,
          overflow: "hidden",
          backgroundColor: "rgba(255,255,255,0.22)",
          borderWidth: 3,
          borderColor: "rgba(27,68,205,0.35)",
          shadowColor: BLUE,
          shadowOpacity: 0.80,
          shadowRadius: 20,
          shadowOffset: { width: 0, height: 8 },
          elevation: 8,
        }}
      >
        <BlurView intensity={70} tint="light" style={StyleSheet.absoluteFillObject} />
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            backgroundColor: "rgba(255,255,255,0.9)",
          }}
        />
        <LinearGradient
          colors={["rgba(255,255,255,0.45)", "rgba(255,255,255,0.0)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0.7, y: 0.5 }}
          style={{
            position: "absolute",
            top: -verticalScale(8),
            left: -scale(8),
            width: "50%",
            height: verticalScale(60),
            borderRadius: scale(40),
          }}
        />
        <View
          style={{
            flex: 1,
            margin: scale(8),
            borderRadius: r - scale(8),
            overflow: "hidden",
            backgroundColor: "#fff",
          }}
        >
          <Image source={{ uri }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        </View>
      </View>
    </Pressable>
  );
};

// Height Picker Modal Component
const HeightPickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (height: number) => void;
}> = ({ visible, onClose, onSave }) => {
  const [selectedHeight, setSelectedHeight] = useState(170);
  const scrollRef = useRef<ScrollView>(null);

  const heights = Array.from({ length: 101 }, (_, i) => 140 + i); // 140cm to 240cm

  useEffect(() => {
    if (visible) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: (selectedHeight - 140) * verticalScale(44), animated: false });
      }, 100);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.heightModalBackdrop} onPress={onClose}>
        <Pressable style={styles.heightModalContent} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={["rgba(255,255,255,0.9)", "rgba(246,248,252,0.95)"]}
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
                const index = Math.round(y / verticalScale(44));
                setSelectedHeight(heights[index] || 170);
              }}
              scrollEventThrottle={16}
              contentContainerStyle={{ paddingVertical: verticalScale(88) }}
            >
              {heights.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => {
                    setSelectedHeight(h);
                    scrollRef.current?.scrollTo({ y: (h - 140) * verticalScale(44), animated: true });
                  }}
                  style={styles.heightItem}
                >
                  <Text style={[styles.heightText, selectedHeight === h && styles.heightTextSelected]}>
                    {h} cm
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <View style={styles.heightModalActions}>
            <TouchableOpacity onPress={onClose} style={styles.heightCancelBtn}>
              <Text style={styles.heightCancelText}>Cancel</Text>
            </TouchableOpacity>
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

export default function ProfileTop() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [mainPhotoUrl, setMainPhotoUrl] = useState<string | null>(null);
  const [secondPhotoUrl, setSecondPhotoUrl] = useState<string | null>(null);
  const [selectedModalUri, setSelectedModalUri] = useState<string | null>(null);

  const [fullName, setFullName] = useState<string>("");
  const [age, setAge] = useState<number | null>(null);
  const [bio, setBio] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string[]>([]);
  const [values, setValues] = useState<string[]>([]);
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [heightModalVisible, setHeightModalVisible] = useState(false);

  // Lifestyle data
  const [genderSubtype, setGenderSubtype] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState<number | null>(null);
  const [education, setEducation] = useState<string | null>(null);
  const [drinking, setDrinking] = useState<string | null>(null);
  const [smoking, setSmoking] = useState<string | null>(null);
  const [zodiac, setZodiac] = useState<string | null>(null);
  const [religion, setReligion] = useState<string | null>(null);
  const [politics, setPolitics] = useState<string | null>(null);
  const [sexualOrientation, setSexualOrientation] = useState<string | null>(null);
  const [institution, setInstitution] = useState<string | null>(null);
  const [workout, setWorkout] = useState<string | null>(null);
  const [communication, setCommunication] = useState<string | null>(null);
  const [loveLanguage, setLoveLanguage] = useState<string | null>(null);
  const [pets, setPets] = useState<string | null>(null);
  const [kids, setKids] = useState<string | null>(null);

  const framesPulse = useRef(new RNAnimated.Value(1)).current;
  const bioTap = useRef(new RNAnimated.Value(1)).current;
  const saveScale = useRef(new RNAnimated.Value(1)).current;
  const cancelScale = useRef(new RNAnimated.Value(1)).current;

  const animatePress = (v: RNAnimated.Value, toValue: number) =>
    RNAnimated.spring(v, { toValue, useNativeDriver: true, friction: 6, tension: 150 }).start();

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(framesPulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        RNAnimated.timing(framesPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        // Profile core
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, age, bio, gender_subtype, height_cm, education, sexual_orientation, institution")
          .eq("id", userId)
          .single();

        if (profile) {
          setFullName(profile.full_name ?? "");
          setAge(profile.age ?? null);
          setBio(profile.bio ?? null);
          setGenderSubtype(profile.gender_subtype ?? null);
          setHeightCm(profile.height_cm ?? null);
          setEducation(profile.education ?? null);
          setSexualOrientation(profile.sexual_orientation ?? null);
          setInstitution(profile.institution ?? null);
        }

        // Lifestyle
        const { data: lifestyle } = await supabase
          .from("lifestyle")
          .select("drinking, smoking, zodiac, religion, politics, workout, communication, love_language, pets, kids")
          .eq("user_id", userId)
          .maybeSingle();

        if (lifestyle) {
          setDrinking(lifestyle.drinking ?? null);
          setSmoking(lifestyle.smoking ?? null);
          setZodiac(lifestyle.zodiac ?? null);
          setReligion(lifestyle.religion ?? null);
          setPolitics(lifestyle.politics ?? null);
          setWorkout(lifestyle.workout ?? null);
          setCommunication(lifestyle.communication ?? null);
          setLoveLanguage(lifestyle.love_language ?? null);
          setPets(lifestyle.pets ?? null);
          setKids(lifestyle.kids ?? null);
        }

        // 1️⃣ Get profile avatar (is_main = true)
const { data: avatar } = await supabase
  .from("user_photos")
  .select("photo_url")
  .eq("user_id", userId)
  .eq("is_main", true)
  .maybeSingle();

if (avatar?.photo_url) {
  const signed = await signPath(toStoragePath(avatar.photo_url));
  setPhotoUrl(signed ?? avatar.photo_url); // avatar in profile circle
}

// 2️⃣ Get all non-main photos sorted by created_at
const { data: others } = await supabase
  .from("user_photos")
  .select("photo_url, created_at, is_main")
  .eq("user_id", userId)
  .neq("is_main", true)
  .order("created_at", { ascending: true });

// 3️⃣ Assign first and second non-main photos to glass frames
if (others && others.length > 0) {
  const signed1 = await signPath(toStoragePath(others[0].photo_url));
  setMainPhotoUrl(signed1 ?? others[0].photo_url); // first non-main
}
if (others && others.length > 1) {
  const signed2 = await signPath(toStoragePath(others[1].photo_url));
  setSecondPhotoUrl(signed2 ?? others[1].photo_url); // second non-main
}


        // Modes
        const { data: modes } = await supabase
          .from("user_modes")
          .select("looking_for_date, value_date")
          .eq("user_id", userId)
          .maybeSingle();

        const rawLooking = (modes as any)?.looking_for_date;
        let parsedLooking: string[] = [];
        if (Array.isArray(rawLooking)) parsedLooking = rawLooking.map(humanize);
        else if (typeof rawLooking === "string")
          parsedLooking = rawLooking.split(/[,/&]| and /i).map(s => humanize(s.trim())).filter(Boolean);
        setLookingFor(parsedLooking);

        const rawValues = (modes as any)?.value_date;
        let parsedValues: string[] = [];
        if (Array.isArray(rawValues)) parsedValues = rawValues.map(humanize);
        else if (typeof rawValues === "string")
          parsedValues = rawValues.split(/[,/&]| and /i).map(s => humanize(s.trim())).filter(Boolean);
        setValues(parsedValues);

      } catch (e) {
        console.log("Error loading profile:", e);
      }
    })();
  }, []);

  const saveBio = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;
      await supabase.from("profiles").update({ bio: tempBio }).eq("id", userId);
      setBio(tempBio);
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
      setHeightCm(height);
      setHeightModalVisible(false);
    } catch (e) {
      console.log("Error saving height:", e);
    }
  };

  const displayName = toTitleCase(fullName) || "—";
  const isLongName = displayName.length > 20;
  const dynamicFontSize = getNameFontSize(displayName.length);

  const horizontalItems = [
    { key: 'gender_subtype', value: genderSubtype, icon: require("../../assets/images/lifestyle/gender_subtype_icon.png"), mandatory: true },
    { key: 'height', value: heightCm ? `${heightCm} cm` : null, icon: require("../../assets/images/lifestyle/height_icon.png"), mandatory: false, editable: true },
    { key: 'education', value: education, icon: require("../../assets/images/lifestyle/education_icon.png"), mandatory: false },
    { key: 'drinking', value: drinking, icon: require("../../assets/images/lifestyle/drinking_icon.png"), mandatory: false },
    { key: 'smoking', value: smoking, icon: require("../../assets/images/lifestyle/smoking_icon.png"), mandatory: false },
    { key: 'zodiac', value: zodiac, icon: require("../../assets/images/lifestyle/zodiac_icon.png"), mandatory: false },
    { key: 'religion', value: religion, icon: require("../../assets/images/lifestyle/religion_icon.png"), mandatory: false },
    { key: 'politics', value: politics, icon: require("../../assets/images/lifestyle/politics_icon.png"), mandatory: false },
  ].filter(item => item.mandatory || item.value);

  const verticalItems = [
    { key: 'sexual_orientation', value: sexualOrientation, icon: require("../../assets/images/lifestyle/orientation_icon.png"), mandatory: true },
    { key: 'institution', value: institution, icon: require("../../assets/images/lifestyle/institution_icon.png"), mandatory: false },
    { key: 'workout', value: workout, icon: require("../../assets/images/lifestyle/workout_icon.png"), mandatory: false },
    { key: 'communication', value: communication, icon: require("../../assets/images/lifestyle/communication_icon.png"), mandatory: false },
    { key: 'love_language', value: loveLanguage, icon: require("../../assets/images/lifestyle/love_icon.png"), mandatory: false },
    { key: 'pets', value: pets, icon: require("../../assets/images/lifestyle/pet_icon.png"), mandatory: false },
    { key: 'kids', value: kids, icon: require("../../assets/images/lifestyle/baby_icon.png"), mandatory: false },
  ].filter(item => item.mandatory || item.value);

  const shouldScrollHorizontal = horizontalItems.length > 4;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.topBarContainer}>
        <BlurView intensity={95} tint="light" style={styles.blurView} />
        <View style={styles.topBar}>
          <Image source={require("../../assets/images/niice_logo_icon.png")} resizeMode="contain" style={styles.logo} />
          <View style={styles.topRight}>
            <TouchableOpacity style={styles.editButton} activeOpacity={0.75} onPress={() => router.push("/in_progress")}>
              <Image source={require("../../assets/images/edit_pencil_icon.png")} style={styles.editIcon} resizeMode="contain" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/in_progress")} activeOpacity={0.7} style={styles.settingsBtn}>
              <Image source={require("../../assets/images/settings_icon.png")} resizeMode="contain" style={styles.settingsIcon} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: verticalScale(20) }} showsVerticalScrollIndicator={false}>
        {/* Top profile row with avatar & name */}
        <View style={styles.profileBlock}>
          <View style={styles.avatarOuterRing}>
            <View style={styles.avatarInnerRing}>
              {photoUrl ? (
                <Image source={{ uri: photoUrl }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, styles.avatarPlaceholder]}>
                  <Text style={styles.placeholderText}>No photo</Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.nameBlock}>
            {isLongName ? (
              <>
                <Text style={[styles.nameText, { fontSize: dynamicFontSize }]} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </Text>
                {age != null && <Text style={[styles.ageTextStacked, { fontSize: dynamicFontSize }]}>{age}</Text>}
              </>
            ) : (
              <View style={styles.nameLine}>
                <Text style={[styles.nameTextInline, { fontSize: dynamicFontSize }]} numberOfLines={1} ellipsizeMode="tail">
                  {displayName}
                </Text>
                {age != null && <Text style={[styles.ageText, { fontSize: dynamicFontSize }]}>{`, ${age}`}</Text>}
              </View>
            )}
            <RNAnimated.View style={{ transform: [{ scale: framesPulse }], marginTop: verticalScale(2) }}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => router.push("/in_progress")}>
                <LinearGradient colors={GRADIENTS.frames} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.framesButton}>
                  <Text style={styles.framesButtonText}>Frames</Text>
                </LinearGradient>
              </TouchableOpacity>
            </RNAnimated.View>
          </View>
        </View>

        {/* Bio */}
        <View style={styles.bioBlock}>
          <LinearGradient
            colors={isEditingBio ? GRADIENTS.bioActive : GRADIENTS.bioInactive}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.bioCard, isEditingBio && { borderColor: BLUE, shadowColor: BLUE, shadowOpacity: 0.22 }]}
          >
            <View style={styles.bioAccent} />
            <View style={styles.bioHeaderRow}>
              <View style={styles.bioTag}>
                <Text style={styles.bioTagText}>Bio</Text>
              </View>
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
                      onPress={() => {
                        setIsEditingBio(false);
                        Keyboard.dismiss();
                      }}
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
                  onPress={() => {
                    setTempBio(bio || "");
                    setIsEditingBio(true);
                  }}
                >
                  <Text style={bio ? styles.bioText : styles.bioPlaceholder}>{bio || "+ Add bio"}</Text>
                </TouchableOpacity>
              </RNAnimated.View>
            )}
          </LinearGradient>
        </View>

        {/* Looking For Block */}
        <View style={styles.infoBlock}>
          <BlurView intensity={95} tint="light" style={styles.glassBlur}>
            <LinearGradient
              colors={GRADIENTS.glassOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            >
              <View style={styles.edgeLight} />
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                start={{ x: 0.05, y: 0.0 }}
                end={{ x: 0.6, y: 0.4 }}
                style={styles.glassSheen}
              />
              <View style={styles.infoCard}>
                <View style={styles.infoTitleRow}>
                  <Text style={styles.infoTitle}>What am I looking for</Text>
                  <PinBadge size={30} />
                </View>
                {lookingFor.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {lookingFor.map((opt, idx) => (
                      <Chip key={idx} text={opt} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderSmall}>+ Set this in Settings</Text>
                )}
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* MAIN PHOTO — placed between the two blocks */}
        {mainPhotoUrl && (
  <View style={{ marginTop: verticalScale(14), alignItems: "center" }}>
    <PhotoGlassFrame
      uri={mainPhotoUrl}
      widthPct={0.95}
      aspect={0.8}
      onPress={() => {
        setSelectedModalUri(mainPhotoUrl);
        setModalVisible(true);
      }}
    />
  </View>
)}


        {/* Values Block */}
        <View style={styles.infoBlock}>
          <BlurView intensity={95} tint="light" style={styles.glassBlur}>
            <LinearGradient
              colors={GRADIENTS.glassOverlay}
              start={{ x: 1, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={styles.glassGradient}
            >
              <View style={styles.edgeLight} />
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                start={{ x: 0.95, y: 0.0 }}
                end={{ x: 0.4, y: 0.4 }}
                style={styles.glassSheen}
              />
              <View style={styles.infoCard}>
                <View style={styles.infoTitleRow}>
                  <Text style={styles.infoTitle}>What do I value</Text>
                  <PinBadge size={30} />
                </View>
                {values.length > 0 ? (
                  <View style={styles.chipsRow}>
                    {values.map((opt, idx) => (
                      <Chip key={idx} text={opt} />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.placeholderSmall}>+ Set this in Settings</Text>
                )}
              </View>
            </LinearGradient>
          </BlurView>
        </View>

        {/* Lifestyle Info Block */}
        <View style={styles.lifestyleBlock}>
          <BlurView intensity={95} tint="light" style={styles.glassBlur}>
            <LinearGradient
              colors={GRADIENTS.glassOverlay}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.glassGradient}
            >
              <View style={styles.edgeLight} />
              <LinearGradient
                colors={["rgba(255,255,255,0.35)", "rgba(255,255,255,0)"]}
                start={{ x: 0.05, y: 0.0 }}
                end={{ x: 0.6, y: 0.4 }}
                style={styles.glassSheen}
              />

              {/* Horizontal Scrolling/Centered Section */}
              {horizontalItems.length > 0 && (
                <View style={styles.horizontalSection}>
                  {shouldScrollHorizontal ? (
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.horizontalScroll}
                    >
                      {horizontalItems.map((item) => (
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
                      {horizontalItems.map((item) => (
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

              {/* Vertical Table Section */}
              {verticalItems.length > 0 && (
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
            </LinearGradient>
          </BlurView>
        </View>

        {/* Second Photo Block - Below Lifestyle */}
        {secondPhotoUrl && (
          <View style={{ marginTop: verticalScale(14), alignItems: "center" }}>
            <PhotoGlassFrame
              uri={secondPhotoUrl}
              widthPct={0.95}
              aspect={0.8}
              onPress={() => {
                setSelectedModalUri(secondPhotoUrl);
                setModalVisible(true);
              }}
            />
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

      {/* Height Picker Modal */}
      <HeightPickerModal
        visible={heightModalVisible}
        onClose={() => setHeightModalVisible(false)}
        onSave={saveHeight}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  topBarContainer: { position: 'relative', zIndex: 10 },
  blurView: { position: 'absolute', top: 0, left: 0, right: 0, bottom: -verticalScale(20), zIndex: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: scale(22), paddingTop: verticalScale(6), paddingBottom: verticalScale(12), zIndex: 2, backgroundColor: 'transparent' },
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
  glassBlur: { borderRadius: scale(28), overflow: 'hidden', borderWidth: 1.2, borderColor: "rgba(255,255,255,0.65)", backgroundColor: "rgba(255,255,255,0.22)", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 10 },
  glassGradient: { borderRadius: scale(28) },
  edgeLight: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: "rgba(255,255,255,0.85)" },
  glassSheen: { position: "absolute", top: -verticalScale(10), left: -scale(8), width: "65%", height: verticalScale(80), borderRadius: scale(40) },
  infoCard: { paddingVertical: verticalScale(18), paddingHorizontal: scale(18) },
  infoTitleRow: { flexDirection: "row", alignItems: "center", gap: scale(8), marginBottom: verticalScale(10) },
  infoTitle: { fontFamily: Fonts.bold, fontSize: scale(23), color: INK, letterSpacing: 0.2 },
  chipsRow: { width: "100%", flexDirection: "row", flexWrap: "wrap", justifyContent: "center", gap: scale(10), marginTop: verticalScale(4) },

  chipBlur: { borderRadius: scale(24), overflow: 'hidden' },
  chipInner: { borderRadius: scale(24), paddingVertical: verticalScale(6), paddingHorizontal: scale(14), alignItems: "center", justifyContent: "center", elevation: 3 },
  chipText: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE, letterSpacing: 0.3 },
  placeholderSmall: { fontFamily: Fonts.primary, fontSize: scale(14), color: "#6B7280", marginTop: verticalScale(2), textAlign: "center" },

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

  // Height Picker Modal Styles
  heightModalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  heightModalContent: { width: "80%", maxHeight: "70%", borderRadius: scale(24), overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)" },
  heightModalTitle: { fontFamily: Fonts.bold, fontSize: scale(20), color: INK, textAlign: "center", paddingTop: verticalScale(20), paddingBottom: verticalScale(12) },
  heightPickerContainer: { height: verticalScale(220), position: "relative" },
  heightSelector: { position: "absolute", top: "50%", left: scale(20), right: scale(20), height: verticalScale(44), marginTop: -verticalScale(22), backgroundColor: "rgba(27,68,205,0.1)", borderRadius: scale(12), borderWidth: 2, borderColor: BLUE, zIndex: 1, pointerEvents: "none" },
  heightItem: { height: verticalScale(44), justifyContent: "center", alignItems: "center" },
  heightText: { fontFamily: Fonts.primary, fontSize: scale(16), color: "#6B7280", fontWeight: "600" },
  heightTextSelected: { fontFamily: Fonts.bold, fontSize: scale(18), color: BLUE },
  heightModalActions: { flexDirection: "row", gap: scale(12), paddingHorizontal: scale(20), paddingVertical: verticalScale(16) },
  heightCancelBtn: { flex: 1, paddingVertical: verticalScale(12), backgroundColor: "rgba(238,244,255,0.8)", borderRadius: scale(16), alignItems: "center" },
  heightCancelText: { fontFamily: Fonts.bold, fontSize: scale(16), color: BLUE },
  heightSaveBtn: { flex: 1, borderRadius: scale(16), overflow: "hidden" },
  heightSaveGradient: { paddingVertical: verticalScale(12), alignItems: "center" },
  heightSaveText: { fontFamily: Fonts.bold, fontSize: scale(16), color: "#FFFFFF" },

  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", alignItems: "center", justifyContent: "center" },
  modalImage: { width: SCREEN_WIDTH, height: SCREEN_HEIGHT },
  closeButton: { position: "absolute", top: verticalScale(50), right: scale(20), width: scale(44), height: scale(44), borderRadius: scale(22), backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", zIndex: 10 },
  closeButtonText: { fontSize: scale(28), color: "#FFFFFF", fontWeight: "300" },
});
