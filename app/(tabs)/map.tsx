// app/(tabs)/map.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { BlurView } from "expo-blur";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useFocusEffect, useRouter } from "expo-router";
import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Linking,
  Modal,
  Platform,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet, Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Camera, Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Defs, Path, Stop, Circle as SvgCircle, LinearGradient as SvgLinearGradient } from "react-native-svg";
import ActiveFramesModal from "../(frames)/active_frames";

/* ===================== CONSTANTS ===================== */
const BG = "#EEF7FF";
const BLUES = {
  b00: "#0B1C60", b10: "#0D236F", b20: "#0F2C8A", b30: "#1437A4", b40: "#1840B8",
  b50: "#1B44CD", b60: "#2D58D6", b70: "#3E6BE0", b80: "#4E7DE9", b90: "#6B95F0",
  b100: "#86A9F5", b110: "#A5BFF9", b120: "#C4D5FC", b130: "#E6EFFF",
} as const;

const BLUE = BLUES.b50;
const PLACEHOLDER_COLOR = "rgba(11,16,32,0.38)";
const GRADIENTS = { chipActive: [BLUES.b60, BLUES.b80] } as const;
const TAB_HEIGHT = 90;
const SEARCH_HEIGHT = verticalScale(52);
const MARKER_BOX = 124;
const PHOTO_SIZE = 56;
const RING_SIZE = 60;
const RING_MAX_SCALE = 2;
const RING_OFFSET = (MARKER_BOX - RING_SIZE) / 2;
const DEFAULT_PROFILE_PHOTO: string | null = null;
const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const FALLBACK = { lat: 41.9028, lng: 12.4964 };
const toRad = (d: number) => (d * Math.PI) / 180;

// Helper functions from profile.tsx
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

/* ===================== USER & EVENT TYPES ===================== */
interface UserMapCard {
  user_id: string;
  full_name: string;
  age: number;
  bio: string;
  frame_id: string | null;
  mode: string;
  approx_lat: number;
  approx_lng: number;
  main_photo_url: string | null;
  last_seen?: string; // 🔥 Track when user was last active
}

interface MatchStatus {
  status: "pending" | "accepted" | "denied" | "rejected" | null;
  connection_visibility: "full_profile" | "blind" | null;
  chat_allowed: boolean;
  is_requester: boolean;
  match_id: string | null;
  place_role?: "none" | "requester" | "target" | null;
  blind_meet_time?: string | null;
  blind_location_name?: string | null;
  blind_lat?: number | null;
  blind_lng?: number | null;
}

type EventCategory = 
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

interface EventData {
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
}

const categoryDisplayNames: Record<EventCategory, { label: string; icon: string }> = {
  food_drinks: { label: "Food & Drinks", icon: "silverware-fork-knife" },
  nightlife_party: { label: "Nightlife & Party", icon: "weather-night" },
  outdoors_nature: { label: "Outdoors & Nature", icon: "pine-tree" },
  sports_fitness: { label: "Sports & Fitness", icon: "dumbbell" },
  games_hobbies: { label: "Games & Hobbies", icon: "gamepad-variant" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "palette" },
  learning_career: { label: "Learning & Career", icon: "school" },
  community_volunteering: { label: "Community", icon: "account-group" },
  romantic_dating: { label: "Romantic & Dating", icon: "heart" },
  travel_adventure: { label: "Travel & Adventure", icon: "airplane" },
  online_virtual: { label: "Online / Virtual", icon: "laptop" },
  other: { label: "Other", icon: "dots-horizontal" },
};

/* ===================== HOOKS ===================== */
const useKadwaBold = () => {
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

/* ===================== UTILITIES ===================== */
const updateUserLocationInDB = async (userId: string, lat: number, lng: number): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({
        lat: lat,
        lng: lng,
        distance_meters: 4000, // 4km default radius
        discoverable: true, // 🔥 Ensure user is discoverable
        last_seen: new Date().toISOString(),
      })
      .eq('id', userId);
    
    if (error) {
      console.error("❌ Error updating user location in DB:", error);
      return false;
    } else {
      console.log("✅ User location & last_seen updated in DB:", lat.toFixed(6), lng.toFixed(6));
      return true;
    }
  } catch (error) {
    console.error("❌ Exception updating location:", error);
    return false;
  }
};

const googleBlueStyle: any[] = [
  // Hide POI icons and labels (restaurants, stores, etc.)
  { featureType: "poi", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.medical", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.place_of_worship", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.school", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.sports_complex", elementType: "labels", stylers: [{ visibility: "off" }] },
  
  // Keep park labels but hide icons
  { featureType: "poi.park", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  
  // Hide transit stations
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  
  // Style the remaining labels (street names, area names)
  { elementType: "labels.text.fill", stylers: [{ color: BLUES.b20 }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#FFFFFF" }, { width: 3 }] },
  
  { featureType: "landscape.man_made", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { elementType: "geometry", stylers: [{ color: BLUES.b130 }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: BLUES.b110 }] },
  { featureType: "road.local", elementType: "geometry", stylers: [{ color: BLUES.b120 }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: BLUES.b90 }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: BLUES.b80 }] },
  
  // Parks and green spaces - blueish green
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#B8E6D5" }] },
  { featureType: "landscape.natural", elementType: "geometry", stylers: [{ color: "#C4E8DB" }] },
  { featureType: "landscape.natural.landcover", elementType: "geometry", stylers: [{ color: "#B8E6D5" }] },
  { featureType: "landscape.natural.terrain", elementType: "geometry", stylers: [{ color: "#C4E8DB" }] },
  
  { featureType: "water", elementType: "geometry", stylers: [{ color: BLUES.b100 }] },
];

/* ===================== COMPONENTS ===================== */
const GlassSurface: React.FC<{
  children?: React.ReactNode; style?: any; thickness?: "ultraThin" | "thin" | "regular" | "thick";
  blueTint?: boolean; radius?: number;
}> = memo(({ children, style, thickness = "regular", blueTint = false, radius = scale(24) }) => {
  const conf = useMemo(() => ({
    ultraThin: { blur: 20, bg: "rgba(255,255,255,0.18)", strokeIn: "rgba(255,255,255,0.65)" },
    thin: { blur: 30, bg: "rgba(255,255,255,0.22)", strokeIn: "rgba(255,255,255,0.66)" },
    regular: { blur: 40, bg: "rgba(255,255,255,0.32)", strokeIn: "rgba(255,255,255,0.72)" },
    thick: { blur: 55, bg: "rgba(255,255,255,0.42)", strokeIn: "rgba(255,255,255,0.78)" },
  }[thickness]), [thickness]);

  const blurIntensity = Platform.select({ ios: conf.blur, android: Math.round(conf.blur * 0.6), default: conf.blur });
  const bgColor = blueTint ? "rgba(27,68,205,0.20)" : conf.bg;

  return (
    <View style={[styles.glassBase, { borderRadius: radius }, style]}>
      <BlurView intensity={blurIntensity} tint="light" style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, backgroundColor: bgColor }]} />
      <LinearGradient
        colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0.10)", "transparent"]}
        start={{ x: 0.1, y: 0 }} end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { borderRadius: radius }]} pointerEvents="none"
      />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(255,255,255,0.7)" }]} />
      <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { borderRadius: radius, borderWidth: StyleSheet.hairlineWidth, borderColor: "rgba(0,0,0,0.08)" }]} />
      {children}
    </View>
  );
});

const SearchIcon: React.FC<{ size?: number }> = memo(({ size = 20 }) => {
  const s = scale(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="search-grad" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={BLUE} />
          <Stop offset="1" stopColor={BLUES.b90} />
        </SvgLinearGradient>
      </Defs>
      <SvgCircle cx="11" cy="11" r="7" stroke="url(#search-grad)" strokeWidth={2.3} fill="none" />
      <Path d="M21 21 L16.8 16.8" stroke="url(#search-grad)" strokeWidth={2.3} strokeLinecap="round" />
    </Svg>
  );
});

const LocationIcon: React.FC<{ size?: number }> = memo(({ size = 24 }) => {
  const s = scale(size);
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      <SvgCircle cx="12" cy="12" r="3" fill="white" />
      <Path d="M12 2v6m0 8v6m10-10h-6m-8 0H2" stroke="white" strokeWidth={2} strokeLinecap="round" />
      <SvgCircle cx="12" cy="12" r="8" stroke="white" strokeWidth={1.5} fill="none" opacity={0.5} />
    </Svg>
  );
});

const PulseRing: React.FC<{ size: number; delay: number; ringColor?: string; ringWidth?: number; left: number; top: number }> = memo(({
  size, delay, ringColor = "rgba(27,68,205,0.28)", ringWidth = 2, left, top,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0.75)).current;

  useEffect(() => {
    const loop = RNAnimated.loop(
      RNAnimated.parallel([
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(scaleAnim, { toValue: RING_MAX_SCALE, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          RNAnimated.timing(scaleAnim, { toValue: 1, duration: 0, useNativeDriver: true }),
        ]),
        RNAnimated.sequence([
          RNAnimated.delay(delay),
          RNAnimated.timing(opacityAnim, { toValue: 0, duration: 2200, easing: Easing.out(Easing.quad), useNativeDriver: true }),
          RNAnimated.timing(opacityAnim, { toValue: 0.75, duration: 0, useNativeDriver: true }),
        ]),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [delay, opacityAnim, scaleAnim]);

  return (
    <RNAnimated.View
      pointerEvents="none"
      style={{
        position: "absolute", left, top, width: size, height: size, borderRadius: size / 2,
        backgroundColor: "transparent", borderWidth: ringWidth, borderColor: ringColor,
        transform: [{ scale: scaleAnim }], opacity: opacityAnim,
        ...(Platform.OS === "android" ? { elevation: 0 } : {}),
      }}
    />
  );
});

const DirectionCone: React.FC<{ degrees: number }> = memo(({ degrees }) => (
  <View style={{ position: "absolute", width: MARKER_BOX, height: MARKER_BOX, alignItems: "center", justifyContent: "center" }} pointerEvents="none">
    <View style={{ transform: [{ rotate: `${degrees}deg` }], alignItems: "center", justifyContent: "center" }}>
      <Svg width={96} height={96} viewBox="0 0 96 96">
        <Defs>
          <SvgLinearGradient id="cone" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="rgba(27,68,205,0.26)" />
            <Stop offset="1" stopColor="rgba(27,68,205,0.02)" />
          </SvgLinearGradient>
        </Defs>
        <Path d="M48 5 L64 42 L32 42 Z" fill="url(#cone)" />
      </Svg>
    </View>
  </View>
));

const ProfileMarker: React.FC<{ photoUrl: string | null; headingDeg?: number }> = memo(({ photoUrl, headingDeg = 0 }) => (
  <View
    style={{
      width: MARKER_BOX, height: MARKER_BOX, alignItems: "center", justifyContent: "center",
    }}
    collapsable={false} pointerEvents="none"
  >
    <DirectionCone degrees={headingDeg} />
    <PulseRing size={RING_SIZE} delay={0} left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={800} ringColor="rgba(27,68,205,0.18)" left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={1600} ringColor="rgba(27,68,205,0.12)" left={RING_OFFSET} top={RING_OFFSET} />

    <View style={{ 
      width: PHOTO_SIZE, 
      height: PHOTO_SIZE, 
      borderRadius: PHOTO_SIZE / 2, 
      borderWidth: 2.5, 
      borderColor: BLUE,
      backgroundColor: "#fff",
      alignItems: "center",
      justifyContent: "center",
      overflow: "hidden"
    }}>
      {photoUrl ? (
        <Image
          source={{ uri: photoUrl }} 
          resizeMode="cover"
          style={{ 
            width: PHOTO_SIZE - 5, 
            height: PHOTO_SIZE - 5, 
            borderRadius: (PHOTO_SIZE - 5) / 2 
          }}
        />
      ) : (
        <View style={{ 
          width: PHOTO_SIZE - 5, 
          height: PHOTO_SIZE - 5, 
          borderRadius: (PHOTO_SIZE - 5) / 2, 
          backgroundColor: BLUES.b100,
          alignItems: "center",
          justifyContent: "center"
        }}>
          <Ionicons name="person" size={24} color="#FFFFFF" />
        </View>
      )}
    </View>
  </View>
));

const UserMarker: React.FC<{ user: UserMapCard; hasFrame: boolean }> = memo(({ user, hasFrame }) => {
  const USER_MARKER_SIZE = 48;
  const USER_RING_SIZE = 52;
  
  // 🔥 Check if user is currently online (active in last 2 minutes)
  const isOnline = user.last_seen && 
    (Date.now() - new Date(user.last_seen).getTime()) < 2 * 60 * 1000;
  
  return (
    <View style={{ alignItems: "center", justifyContent: "center", width: 64, height: 64 }}>
      {/* Frame indicator ring */}
      {hasFrame && (
        <View style={{
          position: "absolute",
          width: USER_RING_SIZE,
          height: USER_RING_SIZE,
          borderRadius: USER_RING_SIZE / 2,
          borderWidth: 2.5,
          borderColor: BLUES.b60,
          backgroundColor: "transparent",
        }} />
      )}
      
      {/* 🔥 Online indicator dot */}
      {isOnline && (
        <View style={{
          position: "absolute",
          top: 0,
          right: 8,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: "#4CAF50",
          borderWidth: 2,
          borderColor: "#FFFFFF",
          zIndex: 10,
        }} />
      )}
      
      {/* User photo */}
      {user.main_photo_url ? (
        <Image
          source={{ uri: user.main_photo_url }}
          resizeMode="cover"
          style={{
            width: USER_MARKER_SIZE,
            height: USER_MARKER_SIZE,
            borderRadius: USER_MARKER_SIZE / 2,
            backgroundColor: "#fff",
            borderWidth: 2,
            borderColor: user.mode === "dating" ? "#FF6B6B" : BLUES.b50,
            opacity: isOnline ? 1 : 0.7, // 🔥 Dim offline users
          }}
        />
      ) : (
        <View style={{
          width: USER_MARKER_SIZE,
          height: USER_MARKER_SIZE,
          borderRadius: USER_MARKER_SIZE / 2,
          backgroundColor: user.mode === "dating" ? "#FFE5E5" : BLUES.b120,
          borderWidth: 2,
          borderColor: user.mode === "dating" ? "#FF6B6B" : BLUES.b50,
          alignItems: "center",
          justifyContent: "center",
          opacity: isOnline ? 1 : 0.7, // 🔥 Dim offline users
        }}>
          <Text style={{
            fontSize: 16,
            fontFamily: Fonts.bold,
            color: user.mode === "dating" ? "#FF6B6B" : BLUES.b50,
          }}>
            {user.full_name?.charAt(0)?.toUpperCase() || "?"}
          </Text>
        </View>
      )}
      
      {/* Age badge */}
      <View style={{
        position: "absolute",
        bottom: -2,
        backgroundColor: "#FFFFFF",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: user.mode === "dating" ? "#FF6B6B" : BLUES.b50,
      }}>
        <Text style={{
          fontSize: 10,
          fontFamily: Fonts.bold,
          color: "#0A0E1A",
        }}>
          {user.age}
        </Text>
      </View>
    </View>
  );
});

const ChipGlowHalo: React.FC<{ opacity: RNAnimated.AnimatedInterpolation<number> | RNAnimated.Value }> = memo(({ opacity }) => (
  <RNAnimated.View
    pointerEvents="none"
    style={{
      position: "absolute", left: -6, right: -6, top: -6, bottom: -6, borderRadius: scale(26) + 6,
      shadowColor: BLUE, shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 0, opacity,
    }}
  />
));

const FilterChip: React.FC<{ label: string; active?: boolean; onPress?: () => void }> = memo(({ label, active, onPress }) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;
  const glowAnim = useRef(new RNAnimated.Value(0)).current;

  const pressIn = useCallback(() => 
    RNAnimated.timing(scaleAnim, { toValue: 0.94, duration: 70, useNativeDriver: true, easing: Easing.out(Easing.cubic) }).start(),
    [scaleAnim]
  );
  
  const pressOut = useCallback(() => {
    RNAnimated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }).start();
    if (active) {
      RNAnimated.sequence([
        RNAnimated.timing(glowAnim, { toValue: 1, duration: 140, useNativeDriver: false }),
        RNAnimated.timing(glowAnim, { toValue: 0, duration: 280, useNativeDriver: false }),
      ]).start();
    }
  }, [scaleAnim, glowAnim, active]);

  const haloOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });

  return (
    <Pressable onPress={onPress} onPressIn={pressIn} onPressOut={pressOut} style={{ overflow: "visible" }}>
      <RNAnimated.View style={{ transform: [{ scale: scaleAnim }], position: "relative" }}>
        {active && <ChipGlowHalo opacity={haloOpacity} />}
        <GlassSurface
          thickness="thick" blueTint={!!active} radius={scale(26)}
          style={[styles.chipGlass, { shadowColor: active ? BLUE : "#000", shadowOpacity: active ? 0.16 : 0.08, shadowRadius: active ? 14 : 8, shadowOffset: { width: 0, height: active ? 6 : 4 } }]}
        >
          <LinearGradient
            colors={active ? GRADIENTS.chipActive : ["rgba(255,255,255,0.35)", "rgba(255,255,255,0.15)"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[StyleSheet.absoluteFillObject, { borderRadius: scale(26), opacity: active ? 0.92 : 1 }]}
          />
          <Text style={[styles.chipText, { color: active ? "#FFFFFF" : BLUES.b20 }]}>{label}</Text>
        </GlassSurface>
      </RNAnimated.View>
    </Pressable>
  );
});

const PlusChipDiamondGlass = memo(forwardRef<View, { onPress: () => void }>(({ onPress }, ref) => {
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  const onIn = useCallback(() => RNAnimated.timing(pressScale, { toValue: 0.94, duration: 70, useNativeDriver: true }).start(), [pressScale]);
  const onOut = useCallback(() => RNAnimated.spring(pressScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }).start(), [pressScale]);

  const SIDE = scale(42);
  const R = scale(12);

  return (
    <View ref={ref} collapsable={false}>
      <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={{ overflow: "visible" }}>
        <RNAnimated.View style={{ transform: [{ scale: pressScale }] }}>
          <GlassSurface
            thickness="thick" blueTint radius={R}
            style={{
              width: SIDE, height: SIDE, transform: [{ rotate: "45deg" }], alignItems: "center", justifyContent: "center",
              borderWidth: 1, borderColor: "rgba(27,68,205,0.28)", shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 },
            }}
          >
            <LinearGradient colors={[BLUES.b60, BLUES.b80]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 5, right: 5, top: 5, bottom: 5, borderRadius: R - 4, opacity: 0.95 }} />
            <View style={{ transform: [{ rotate: "-45deg" }], alignItems: "center", justifyContent: "center" }}>
              <Svg width={20} height={20} viewBox="0 0 20 20">
                <Path d="M10 3 L10 17 M3 10 L17 10" stroke="#FFFFFF" strokeWidth={2.2} strokeLinecap="round" />
              </Svg>
            </View>
          </GlassSurface>
        </RNAnimated.View>
      </Pressable>
    </View>
  );
}));

const GlassFab: React.FC<{ onPress: () => void; spin: RNAnimated.AnimatedInterpolation<string>; bottom: number; right: number }> = memo(({ onPress, spin, bottom, right }) => {
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  const onIn = useCallback(() => RNAnimated.timing(pressScale, { toValue: 0.96, duration: 70, useNativeDriver: true }).start(), [pressScale]);
  const onOut = useCallback(() => RNAnimated.spring(pressScale, { toValue: 1, friction: 4, tension: 300, useNativeDriver: true }).start(), [pressScale]);
  const R = scale(28);

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} android_ripple={{ color: "rgba(255,255,255,0.15)" }} style={{ position: "absolute", bottom, right }}>
      <RNAnimated.View style={{ transform: [{ scale: pressScale }] }}>
        <GlassSurface thickness="thick" blueTint radius={R} style={{ width: R * 2, height: R * 2, alignItems: "center", justifyContent: "center", shadowColor: "#0F172A", shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, borderWidth: 1, borderColor: "rgba(27,68,205,0.28)" }}>
          <LinearGradient colors={[BLUES.b60, BLUES.b80]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ position: "absolute", left: 6, right: 6, top: 6, bottom: 6, borderRadius: R - 6, opacity: 0.95 }} />
          <RNAnimated.View style={{ transform: [{ rotate: spin }] }}>
            <LocationIcon size={24} />
          </RNAnimated.View>
        </GlassSurface>
      </RNAnimated.View>
    </Pressable>
  );
});

const IiLoader: React.FC = () => {
  const kadwaReady = useKadwaBold();
  const look = useRef(new RNAnimated.Value(0)).current;
  const runner = useRef(new RNAnimated.Value(0)).current;
  const [barW, setBarW] = useState(0);

  useEffect(() => {
    const lookLoop = RNAnimated.loop(
      RNAnimated.sequence([
        RNAnimated.timing(look, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        RNAnimated.timing(look, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ])
    );
    lookLoop.start();
    return () => lookLoop.stop();
  }, [look]);

  useEffect(() => {
    const runLoop = RNAnimated.loop(RNAnimated.timing(runner, { toValue: 1, duration: 1400, easing: Easing.linear, useNativeDriver: true }));
    runLoop.start();
    return () => runLoop.stop();
  }, [runner]);

  const lRot = look.interpolate({ inputRange: [0, 1], outputRange: ["-10deg", "-3deg"] });
  const rRot = look.interpolate({ inputRange: [0, 1], outputRange: ["10deg", "3deg"] });
  const lDotTx = look.interpolate({ inputRange: [0, 1], outputRange: [-4, 8] });
  const rDotTx = look.interpolate({ inputRange: [0, 1], outputRange: [4, -8] });
  const runnerTx = barW === 0 ? 0 : runner.interpolate({ inputRange: [0, 1], outputRange: [-barW * 0.3, barW] });
  const iStyle = [styles.iLetter, { color: BLUES.b80, fontFamily: kadwaReady ? "KadwaBold" : Fonts.bold }];

  return (
    <View style={styles.loading}>
      <View style={styles.iiRow}>
        <RNAnimated.View style={{ alignItems: "center", transform: [{ rotate: lRot }] }}>
          <RNAnimated.View style={[styles.iDot2, { transform: [{ translateX: lDotTx }] }]} />
          <Text style={iStyle}>I</Text>
        </RNAnimated.View>
        <RNAnimated.View style={{ alignItems: "center", transform: [{ rotate: rRot }] }}>
          <RNAnimated.View style={[styles.iDot2, { transform: [{ translateX: rDotTx }] }]} />
          <Text style={iStyle}>I</Text>
        </RNAnimated.View>
      </View>
      <Text style={styles.loadingText}>Locating you…</Text>
      <View style={styles.progressOuter} onLayout={(e) => setBarW(e.nativeEvent.layout.width)}>
        <View style={styles.progressTrack}>
          <LinearGradient colors={["rgba(255,255,255,0.55)", "rgba(255,255,255,0.25)"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </View>
        <RNAnimated.View style={[styles.progressRunner, { transform: [{ translateX: runnerTx }] }]}>
          <LinearGradient colors={[BLUES.b60, BLUES.b80]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={StyleSheet.absoluteFill} />
        </RNAnimated.View>
      </View>
    </View>
  );
};

/* ===================== EVENT MARKER COMPONENT ===================== */
const EventMarker: React.FC<{ event: EventData }> = ({ event }) => {
  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  
  return (
    <View style={styles.eventMarkerContainer}>
      <View style={styles.eventMarkerBubble}>
        <LinearGradient 
          colors={["#FFFFFF", "#F8FAFF"]} 
          style={StyleSheet.absoluteFillObject}
        />
        <MaterialCommunityIcons 
          name={categoryInfo.icon as any} 
          size={20} 
          color={BLUE}
        />
      </View>
      <View style={styles.eventMarkerPin} />
    </View>
  );
};

/* ===================== USER PROFILE MODAL ===================== */
const UserProfileModal: React.FC<{
  visible: boolean;
  user: UserMapCard | null;
  onClose: () => void;
  currentUserId: string | null;
  onOpenFrames: (frames: any[]) => void;
  userPosition: { lat: number; lng: number } | null;
}> = ({ visible, user, onClose, currentUserId, onOpenFrames, userPosition }) => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;
  const [matchStatus, setMatchStatus] = useState<MatchStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [userFrames, setUserFrames] = useState<any[]>([]);
  
  // Preview data from RPC
  const [previewData, setPreviewData] = useState<{
    sexual_orientation: string | null;
    looking_for: string[] | null;
  }>({ sexual_orientation: null, looking_for: null });
  
  // Blind date flow states
  const [blindDateStep, setBlindDateStep] = useState<'initial' | 'place_role' | 'details' | 'accept_location' | null>(null);
  const [blindDateForm, setBlindDateForm] = useState<{
    placeRole: 'requester' | 'target' | null;
    locationName: string;
    locationCoords: { lat: number; lng: number } | null;
    meetTime: Date | null;
  }>({ placeRole: null, locationName: '', locationCoords: null, meetTime: null });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showDatePickerMode, setShowDatePickerMode] = useState<'date' | 'time'>('date');
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [tempPickedLocation, setTempPickedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const locationPickerMapRef = useRef<MapView>(null);
  
  // Calculate distance
  const calculateDistance = useCallback((lat1: number, lng1: number, lat2: number, lng2: number): number => {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }, []);
  
  const distanceKm = useMemo(() => {
    if (!userPosition || !user) return null;
    return calculateDistance(userPosition.lat, userPosition.lng, user.approx_lat, user.approx_lng);
  }, [userPosition, user, calculateDistance]);
  
  useEffect(() => {
    if (visible && user) {
      fetchMatchStatus();
      fetchUserPreview();
      fetchUserFrames();
      setProfilePhoto(user.main_photo_url);
      setBlindDateStep(null);
      setBlindDateForm({ placeRole: null, locationName: '', locationCoords: null, meetTime: null });
      setShowLocationPicker(false);
      setTempPickedLocation(null);
      
      RNAnimated.spring(slideAnim, { 
        toValue: 0, 
        useNativeDriver: true, 
        tension: 65, 
        friction: 11 
      }).start();
    } else {
      RNAnimated.timing(slideAnim, { 
        toValue: SCREEN_H, 
        duration: 250, 
        useNativeDriver: true 
      }).start();
      setBlindDateStep(null);
    }
  }, [visible, user]);
  
  const fetchMatchStatus = async () => {
    if (!user || !currentUserId) return;
    
    try {
      // Use extended version to get blind date details
      const { data, error } = await supabase.rpc('get_match_status_extended', {
        target_user_id: user.user_id,
        p_mode: user.mode === 'friend' ? 'friend' : 'dating'
      });
      
      if (data && data.length > 0) {
        setMatchStatus(data[0]);
      } else {
        // Fallback to basic version if extended doesn't exist
        const { data: basicData } = await supabase.rpc('get_match_status', {
          target_user_id: user.user_id,
          p_mode: user.mode === 'friend' ? 'friend' : 'dating'
        });
        
        if (basicData && basicData.length > 0) {
          setMatchStatus(basicData[0]);
        } else {
          setMatchStatus({
            status: null,
            connection_visibility: null,
            chat_allowed: false,
            is_requester: false,
            match_id: null
          });
        }
      }
    } catch (error) {
      console.error("Error fetching match status:", error);
    }
  };
  
  // Fetch preview data using RPC (bypasses RLS)
  const fetchUserPreview = async () => {
    if (!user) return;
    
    try {
      // Try to get extended preview data
      const { data, error } = await supabase.rpc('get_user_preview_extended', {
        target_user_id: user.user_id
      });
      
      // RPC returns a table (array), get first row
      if (data && Array.isArray(data) && data.length > 0 && !error) {
        const row = data[0];
        console.log("Preview data received:", row);
        setPreviewData({
          sexual_orientation: row.sexual_orientation,
          looking_for: row.looking_for
        });
      } else if (data && !Array.isArray(data) && !error) {
        // In case it returns a single object
        console.log("Preview data (single):", data);
        setPreviewData({
          sexual_orientation: data.sexual_orientation,
          looking_for: data.looking_for
        });
      } else {
        // Fallback: RPC doesn't exist yet or returned empty
        console.log("get_user_preview_extended: no data or error", error);
        setPreviewData({ sexual_orientation: null, looking_for: null });
      }
    } catch (error) {
      // RPC doesn't exist, that's okay
      console.log("Preview RPC not available:", error);
      setPreviewData({ sexual_orientation: null, looking_for: null });
    }
  };
  
  const fetchUserFrames = async () => {
    if (!user || !user.frame_id) return;
    
    try {
      const { data, error } = await supabase.rpc('get_user_active_frames', {
        target_user_id: user.user_id
      });
      
      if (error) {
        console.error("Error fetching frames:", error);
        return;
      }
      
      if (data && data.length > 0) {
        const processedFrames = await Promise.all(
          data.map(async (frame: any) => {
            if (frame.media_url && !frame.media_url.startsWith('http')) {
              const { data: signedData } = await supabase.storage
                .from("frames")
                .createSignedUrl(frame.media_url, 3600);
              return { ...frame, media_url: signedData?.signedUrl || frame.media_url };
            }
            return frame;
          })
        );
        setUserFrames(processedFrames);
      }
    } catch (error) {
      console.error("Error fetching frames:", error);
    }
  };
  
  const handleLike = async (isBlindDate: boolean = false) => {
    if (!user || !currentUserId || loading) return;
    
    setLoading(true);
    try {
      let error: any = null;
      
      if (isBlindDate && blindDateForm.placeRole) {
        // Use RPC for blind date requests (handles geography point properly)
        const { error: rpcError } = await supabase.rpc('send_blind_date_request', {
          p_target_id: user.user_id,
          p_match_mode: user.mode === 'friend' ? 'friend' : 'dating',
          p_place_role: blindDateForm.placeRole,
          p_location_name: blindDateForm.locationName || null,
          p_latitude: blindDateForm.locationCoords?.lat || null,
          p_longitude: blindDateForm.locationCoords?.lng || null,
          p_meet_time: blindDateForm.meetTime?.toISOString() || null
        });
        
        if (rpcError) {
          // Fallback to direct insert (without location point)
          console.log("RPC not available, using direct insert:", rpcError);
          const insertData: any = {
            requester_id: currentUserId,
            target_id: user.user_id,
            match_mode: user.mode === 'friend' ? 'friend' : 'dating',
            connection_visibility: 'blind',
            status: 'pending',
            place_role: blindDateForm.placeRole
          };
          
          if (blindDateForm.placeRole === 'requester') {
            if (blindDateForm.locationName) {
              insertData.blind_location_name = blindDateForm.locationName;
            }
            if (blindDateForm.meetTime) {
              insertData.blind_meet_time = blindDateForm.meetTime.toISOString();
            }
          }
          
          const { error: insertError } = await supabase
            .from('match_requests')
            .insert(insertData);
          
          error = insertError;
        }
      } else {
        // Regular match request
        const insertData: any = {
          requester_id: currentUserId,
          target_id: user.user_id,
          match_mode: user.mode === 'friend' ? 'friend' : 'dating',
          connection_visibility: isBlindDate ? 'blind' : 'full_profile',
          status: 'pending'
        };
        
        const { error: insertError } = await supabase
          .from('match_requests')
          .insert(insertData);
        
        error = insertError;
      }
      
      if (!error) {
        Alert.alert(
          "Success", 
          isBlindDate 
            ? "Blind date request sent! They'll see your request without your full profile." 
            : user.mode === 'friend' 
              ? "Friend request sent!" 
              : "Like sent!"
        );
        await fetchMatchStatus();
        setBlindDateStep(null);
        setBlindDateForm({ placeRole: null, locationName: '', locationCoords: null, meetTime: null });
      } else if (error.code === '23505') {
        Alert.alert("Already sent", "You've already sent a request to this person");
      } else {
        console.error("Insert error:", error);
        Alert.alert("Error", "Failed to send request");
      }
    } catch (error) {
      console.error("Error sending like:", error);
      Alert.alert("Error", "Failed to send request");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePass = async () => {
    if (!user || !currentUserId || loading) return;
    
    setLoading(true);
    try {
      await supabase
        .from('match_requests')
        .insert({
          requester_id: currentUserId,
          target_id: user.user_id,
          match_mode: user.mode === 'friend' ? 'friend' : 'dating',
          connection_visibility: 'full_profile',
          status: 'denied'
        });
      
      onClose();
    } catch (error) {
      console.error("Error passing:", error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAcceptRequest = async () => {
    if (!matchStatus?.match_id || !currentUserId || loading) return;
    
    // Check if this is a blind date where target needs to provide location
    if (matchStatus.connection_visibility === 'blind' && matchStatus.place_role === 'target') {
      // Target needs to provide location and time - show the accept_location flow
      setBlindDateStep('accept_location');
      return;
    }
    
    // Regular accept
    setLoading(true);
    try {
      const { error } = await supabase
        .from('match_requests')
        .update({
          status: 'accepted',
          responded_at: new Date().toISOString(),
        })
        .eq('id', matchStatus.match_id)
        .eq('target_id', currentUserId);
      
      if (!error) {
        Alert.alert("Success", "Request accepted!");
        await fetchMatchStatus();
      }
    } catch (error) {
      console.error("Error accepting request:", error);
      Alert.alert("Error", "Failed to accept request");
    } finally {
      setLoading(false);
    }
  };
  
  // Accept blind date with location (target providing details)
  const handleAcceptBlindDateWithLocation = async () => {
    if (!matchStatus?.match_id || !currentUserId || loading) return;
    
    if (!blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime) {
      Alert.alert("Missing Info", "Please provide location and time for the blind date");
      return;
    }
    
    setLoading(true);
    try {
      // Try using the RPC first
      const { data, error: rpcError } = await supabase.rpc('accept_blind_date_with_location', {
        p_match_id: matchStatus.match_id,
        p_location_name: blindDateForm.locationName,
        p_latitude: blindDateForm.locationCoords.lat,
        p_longitude: blindDateForm.locationCoords.lng,
        p_meet_time: blindDateForm.meetTime.toISOString()
      });
      
      if (rpcError) {
        // Fallback to direct update if RPC doesn't exist
        console.log("RPC not available, using direct update");
        const { error } = await supabase
          .from('match_requests')
          .update({
            status: 'accepted',
            responded_at: new Date().toISOString(),
            blind_location_name: blindDateForm.locationName,
            blind_meet_time: blindDateForm.meetTime.toISOString(),
          })
          .eq('id', matchStatus.match_id)
          .eq('target_id', currentUserId);
        
        if (error) throw error;
      }
      
      Alert.alert("Success", "Blind date accepted! You've set the meeting spot.");
      setBlindDateStep(null);
      setBlindDateForm({ placeRole: null, locationName: '', locationCoords: null, meetTime: null });
      await fetchMatchStatus();
    } catch (error) {
      console.error("Error accepting blind date:", error);
      Alert.alert("Error", "Failed to accept blind date");
    } finally {
      setLoading(false);
    }
  };
  
  // Date picker handler
  const handleDateTimeChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    
    if (event.type === 'set' && selectedDate) {
      if (showDatePickerMode === 'date') {
        // After picking date, show time picker
        setBlindDateForm(prev => ({ ...prev, meetTime: selectedDate }));
        if (Platform.OS === 'android') {
          // On Android, we need to show time picker separately
          setTimeout(() => {
            setShowDatePickerMode('time');
            setShowDatePicker(true);
          }, 100);
        } else {
          setShowDatePickerMode('time');
        }
      } else {
        // Time picked - combine with date
        const currentDate = blindDateForm.meetTime || new Date();
        const combined = new Date(currentDate);
        combined.setHours(selectedDate.getHours());
        combined.setMinutes(selectedDate.getMinutes());
        setBlindDateForm(prev => ({ ...prev, meetTime: combined }));
        setShowDatePicker(false);
        setShowDatePickerMode('date');
      }
    } else if (event.type === 'dismissed') {
      setShowDatePicker(false);
      setShowDatePickerMode('date');
    }
  };
  
  // Show date picker
  const openDatePicker = () => {
    setShowDatePickerMode('date');
    setShowDatePicker(true);
  };
  
  // Location picker handlers
  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    setTempPickedLocation({ lat: latitude, lng: longitude });
  };
  
  const confirmLocationPick = () => {
    if (tempPickedLocation) {
      setBlindDateForm(prev => ({ ...prev, locationCoords: tempPickedLocation }));
      setShowLocationPicker(false);
    }
  };
  
  const handleViewProfile = () => {
    if (!user) return;
    onClose();
    router.push({
      pathname: "/profile",
      params: { userId: user.user_id }
    });
  };
  
  const handleStartChat = () => {
    if (!matchStatus?.match_id) return;
    onClose();
    router.push({
      pathname: "/chat",
      params: { matchId: matchStatus.match_id }
    });
  };
  
  const handleBlock = async () => {
    if (!user || !currentUserId) return;
    
    Alert.alert(
      "Block User",
      `Are you sure you want to block ${user.full_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            try {
              await supabase.from('blocks').insert({
                blocker_id: currentUserId,
                blocked_id: user.user_id
              });
              Alert.alert("Blocked", "User has been blocked");
              onClose();
            } catch (error) {
              console.error("Error blocking:", error);
              Alert.alert("Error", "Failed to block user");
            }
          }
        }
      ]
    );
  };
  
  // Start blind date flow
  const startBlindDateFlow = () => {
    setBlindDateStep('place_role');
  };
  
  // Handle place role selection
  const handlePlaceRoleSelect = (role: 'requester' | 'target') => {
    setBlindDateForm(prev => ({ ...prev, placeRole: role }));
    if (role === 'requester') {
      setBlindDateStep('details');
    } else {
      // They pick the place, send request directly
      handleLike(true);
    }
  };
  
  // Format date for display
  const formatDateTime = (date: Date | null) => {
    if (!date) return 'Select date & time';
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} at ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
  };
  
  if (!user) return null;
  
  const isMatched = matchStatus?.status === 'accepted';
  const isPending = matchStatus?.status === 'pending';
  const isDenied = matchStatus?.status === 'denied';
  const isRequester = matchStatus?.is_requester;
  const isBlindConnection = matchStatus?.connection_visibility === 'blind';
  const hasFrames = userFrames.length > 0;
  const targetNeedsToPick = isBlindConnection && matchStatus?.place_role === 'target' && !isRequester;
  
  // Format looking for display
  const formatLookingFor = (values: string[] | null) => {
    if (!values || values.length === 0) return null;
    const displayMap: Record<string, string> = {
      'marriage': 'Marriage',
      'life_partner': 'Life partner',
      'long_term_relationship': 'Long-term',
      'short_term_relationship': 'Short-term',
      'casual_dates': 'Casual dates',
      'intimacy': 'Intimacy',
      'new_friends': 'New friends',
      'figuring_it_out': 'Figuring it out',
    };
    return values.slice(0, 2).map(v => displayMap[v] || v.replace(/_/g, ' ')).join(', ');
  };
  
  // Format orientation display
  const formatOrientation = (value: string | null) => {
    if (!value) return null;
    const displayMap: Record<string, string> = {
      'straight': 'Straight',
      'gay': 'Gay',
      'lesbian': 'Lesbian',
      'bisexual': 'Bisexual',
      'pansexual': 'Pansexual',
      'queer': 'Queer',
      'asexual': 'Asexual',
      'demisexual': 'Demisexual',
      'questioning': 'Questioning',
      'other': 'Other',
      'not_listed': 'Prefer not to say',
    };
    return displayMap[value] || value.replace(/_/g, ' ');
  };
  
  // Format distance
  const formatDistance = () => {
    if (distanceKm === null) return null;
    if (distanceKm < 1) return `${Math.round(distanceKm * 1000)}m away`;
    return `${distanceKm.toFixed(1)}km away`;
  };
  
  const lookingForDisplay = formatLookingFor(previewData.looking_for);
  const orientationDisplay = formatOrientation(previewData.sexual_orientation);
  
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <RNAnimated.View 
          style={[
            styles.userModalSheet,
            { 
              transform: [{ translateY: slideAnim }],
              paddingBottom: Math.max(insets.bottom, 24) 
            }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Grab Handle */}
            <View style={styles.modalHandle} />
            
            {/* Header Row */}
            <View style={styles.userSheetHeader}>
              {/* Profile Photo with Frame Ring */}
              <TouchableOpacity
                activeOpacity={hasFrames ? 0.8 : 1}
                onPress={() => {
                  if (hasFrames) {
                    onClose();
                    setTimeout(() => onOpenFrames(userFrames), 300);
                  }
                }}
                disabled={!hasFrames}
                style={styles.userSheetAvatarWrap}
              >
                {hasFrames && (
                  <View style={styles.userSheetFrameRing}>
                    <LinearGradient
                      colors={[BLUE, "#678CFF", "#A8C4FF", BLUE]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </View>
                )}
                <View style={[styles.userSheetAvatar, hasFrames && styles.userSheetAvatarWithRing]}>
                  {profilePhoto ? (
                    <Image source={{ uri: profilePhoto }} style={styles.userSheetAvatarImg} resizeMode="cover" />
                  ) : (
                    <View style={[styles.userSheetAvatarImg, styles.userSheetAvatarPlaceholder]}>
                      <Ionicons name="person" size={28} color="#FFFFFF" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              
              {/* Name, Age, Distance */}
              <View style={styles.userSheetInfo}>
                <Text style={styles.userSheetName}>{user.full_name}, {user.age}</Text>
                {formatDistance() && (
                  <View style={styles.userSheetDistanceRow}>
                    <Ionicons name="location-outline" size={14} color="rgba(10, 14, 26, 0.5)" />
                    <Text style={styles.userSheetDistance}>{formatDistance()}</Text>
                  </View>
                )}
              </View>
            </View>
            
            {/* Identity Chips */}
            {(lookingForDisplay || orientationDisplay) && (
              <View style={styles.userSheetChips}>
                {lookingForDisplay && (
                  <View style={styles.userSheetChip}>
                    <Ionicons name="heart-outline" size={14} color={BLUE} />
                    <Text style={styles.userSheetChipText}>{lookingForDisplay}</Text>
                  </View>
                )}
                {orientationDisplay && (
                  <View style={styles.userSheetChip}>
                    <Ionicons name="sparkles-outline" size={14} color={BLUE} />
                    <Text style={styles.userSheetChipText}>{orientationDisplay}</Text>
                  </View>
                )}
              </View>
            )}
            
            {/* Bio Section */}
            {user.bio && (
              <View style={styles.userSheetBioSection}>
                <Text style={styles.userSheetBioLabel}>About</Text>
                <Text style={styles.userSheetBio} numberOfLines={3}>{user.bio}</Text>
              </View>
            )}
            
            {/* Status Badge (if applicable) */}
            {isMatched && (
              <View style={[styles.userSheetStatusBadge, { backgroundColor: "#E8F5E9" }]}>
                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                <Text style={[styles.userSheetStatusText, { color: "#4CAF50" }]}>
                  {isBlindConnection ? "Blind date connected!" : "You're connected!"}
                </Text>
              </View>
            )}
            {isPending && isRequester && (
              <View style={[styles.userSheetStatusBadge, { backgroundColor: "#FFF3E0" }]}>
                <Ionicons name="time-outline" size={16} color="#FF9800" />
                <Text style={[styles.userSheetStatusText, { color: "#FF9800" }]}>Request sent</Text>
              </View>
            )}
            {isPending && !isRequester && (
              <View style={[styles.userSheetStatusBadge, { backgroundColor: "rgba(27, 68, 205, 0.08)" }]}>
                <Ionicons name="mail-outline" size={16} color={BLUE} />
                <Text style={[styles.userSheetStatusText, { color: BLUE }]}>
                  {isBlindConnection ? "Sent you a blind date request" : "Sent you a request"}
                </Text>
              </View>
            )}
            
            {/* Action Buttons */}
            <View style={styles.userSheetActions}>
              {!isMatched && !isPending && !isDenied && !blindDateStep && (
                <>
                  {/* Primary: Blind Date (for dating mode) */}
                  {user.mode === 'dating' && (
                    <TouchableOpacity 
                      style={styles.userSheetPrimaryBtn}
                      onPress={startBlindDateFlow}
                      disabled={loading}
                      activeOpacity={0.8}
                    >
                      <LinearGradient 
                        colors={[BLUES.b50, BLUES.b70]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.userSheetPrimaryBtnGradient}
                      >
                        <Ionicons name="eye-off-outline" size={20} color="#FFF" />
                        <Text style={styles.userSheetPrimaryBtnText}>Blind Date</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  
                  {/* Secondary: Match Request */}
                  <TouchableOpacity 
                    style={styles.userSheetSecondaryBtn}
                    onPress={() => handleLike(false)}
                    disabled={loading}
                    activeOpacity={0.8}
                  >
                    <Ionicons name={user.mode === 'dating' ? "heart-outline" : "person-add-outline"} size={20} color={BLUE} />
                    <Text style={styles.userSheetSecondaryBtnText}>
                      {user.mode === 'dating' ? 'Send Match Request' : 'Send Friend Request'}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
              
              {/* Blind Date Step 1: Who picks the place? */}
              {blindDateStep === 'place_role' && (
                <View style={styles.blindDateFlow}>
                  <Text style={styles.blindDateFlowTitle}>Who picks the place?</Text>
                  <Text style={styles.blindDateFlowDesc}>
                    Your profiles stay hidden until after you meet
                  </Text>
                  
                  <View style={styles.blindDateFlowOptions}>
                    <TouchableOpacity 
                      style={styles.blindDateFlowOption}
                      onPress={() => handlePlaceRoleSelect('requester')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.blindDateFlowOptionIcon}>
                        <Ionicons name="location" size={24} color={BLUE} />
                      </View>
                      <Text style={styles.blindDateFlowOptionText}>I'll pick</Text>
                      <Text style={styles.blindDateFlowOptionHint}>Suggest a spot</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.blindDateFlowOption}
                      onPress={() => handlePlaceRoleSelect('target')}
                      activeOpacity={0.8}
                    >
                      <View style={styles.blindDateFlowOptionIcon}>
                        <Ionicons name="person" size={24} color={BLUE} />
                      </View>
                      <Text style={styles.blindDateFlowOptionText}>They pick</Text>
                      <Text style={styles.blindDateFlowOptionHint}>Let them decide</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.blindDateFlowCancel}
                    onPress={() => setBlindDateStep(null)}
                  >
                    <Text style={styles.blindDateFlowCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Blind Date Step 2: Location & Time Details */}
              {blindDateStep === 'details' && (
                <View style={styles.blindDateFlow}>
                  <Text style={styles.blindDateFlowTitle}>Suggest a spot</Text>
                  <Text style={styles.blindDateFlowDesc}>
                    Add details for your blind date
                  </Text>
                  
                  <View style={styles.blindDateFlowInputs}>
                    {/* Location Name Input */}
                    <View style={styles.blindDateFlowInputWrap}>
                      <Ionicons name="business-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.blindDateFlowInput}
                        placeholder="Place name (e.g., Caffè Nero)"
                        placeholderTextColor="rgba(10, 14, 26, 0.4)"
                        value={blindDateForm.locationName}
                        onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, locationName: text }))}
                      />
                    </View>
                    
                    {/* Location Picker Button */}
                    <TouchableOpacity 
                      style={styles.blindDateFlowInputWrap}
                      onPress={() => {
                        setTempPickedLocation(blindDateForm.locationCoords || (userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : null));
                        setShowLocationPicker(true);
                      }}
                    >
                      <Ionicons name="location-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <Text style={[
                        styles.blindDateFlowInputText,
                        !blindDateForm.locationCoords && { color: "rgba(10, 14, 26, 0.4)" }
                      ]}>
                        {blindDateForm.locationCoords 
                          ? `📍 Location set` 
                          : 'Pick location on map'}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(10, 14, 26, 0.3)" />
                    </TouchableOpacity>
                    
                    {/* Date Time Picker Button */}
                    <TouchableOpacity 
                      style={styles.blindDateFlowInputWrap}
                      onPress={openDatePicker}
                    >
                      <Ionicons name="calendar-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <Text style={[
                        styles.blindDateFlowInputText,
                        !blindDateForm.meetTime && { color: "rgba(10, 14, 26, 0.4)" }
                      ]}>
                        {formatDateTime(blindDateForm.meetTime)}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(10, 14, 26, 0.3)" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.blindDateFlowActions}>
                    <TouchableOpacity 
                      style={styles.blindDateFlowBackBtn}
                      onPress={() => setBlindDateStep('place_role')}
                    >
                      <Text style={styles.blindDateFlowBackText}>Back</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.blindDateFlowSendBtn,
                        (!blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime) && { opacity: 0.5 }
                      ]}
                      onPress={() => handleLike(true)}
                      disabled={loading || !blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime}
                    >
                      <LinearGradient 
                        colors={[BLUES.b50, BLUES.b70]}
                        style={styles.blindDateFlowSendGradient}
                      >
                        <Text style={styles.blindDateFlowSendText}>
                          {loading ? 'Sending...' : 'Send Request'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                  
                  <TouchableOpacity 
                    style={styles.blindDateFlowCancel}
                    onPress={() => setBlindDateStep(null)}
                  >
                    <Text style={styles.blindDateFlowCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Accept Blind Date - Target provides location */}
              {blindDateStep === 'accept_location' && (
                <View style={styles.blindDateFlow}>
                  <Text style={styles.blindDateFlowTitle}>Pick the spot</Text>
                  <Text style={styles.blindDateFlowDesc}>
                    They want you to choose where to meet
                  </Text>
                  
                  <View style={styles.blindDateFlowInputs}>
                    {/* Location Name Input */}
                    <View style={styles.blindDateFlowInputWrap}>
                      <Ionicons name="business-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.blindDateFlowInput}
                        placeholder="Place name (e.g., Central Park Café)"
                        placeholderTextColor="rgba(10, 14, 26, 0.4)"
                        value={blindDateForm.locationName}
                        onChangeText={(text) => setBlindDateForm(prev => ({ ...prev, locationName: text }))}
                      />
                    </View>
                    
                    {/* Location Picker Button */}
                    <TouchableOpacity 
                      style={styles.blindDateFlowInputWrap}
                      onPress={() => {
                        setTempPickedLocation(blindDateForm.locationCoords || (userPosition ? { lat: userPosition.lat, lng: userPosition.lng } : null));
                        setShowLocationPicker(true);
                      }}
                    >
                      <Ionicons name="location-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <Text style={[
                        styles.blindDateFlowInputText,
                        !blindDateForm.locationCoords && { color: "rgba(10, 14, 26, 0.4)" }
                      ]}>
                        {blindDateForm.locationCoords 
                          ? `📍 Location set` 
                          : 'Pick location on map'}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(10, 14, 26, 0.3)" />
                    </TouchableOpacity>
                    
                    {/* Date Time Picker Button */}
                    <TouchableOpacity 
                      style={styles.blindDateFlowInputWrap}
                      onPress={openDatePicker}
                    >
                      <Ionicons name="calendar-outline" size={20} color={BLUE} style={{ marginRight: 10 }} />
                      <Text style={[
                        styles.blindDateFlowInputText,
                        !blindDateForm.meetTime && { color: "rgba(10, 14, 26, 0.4)" }
                      ]}>
                        {formatDateTime(blindDateForm.meetTime)}
                      </Text>
                      <Ionicons name="chevron-forward" size={18} color="rgba(10, 14, 26, 0.3)" />
                    </TouchableOpacity>
                  </View>
                  
                  <View style={styles.blindDateFlowActions}>
                    <TouchableOpacity 
                      style={styles.blindDateFlowBackBtn}
                      onPress={() => setBlindDateStep(null)}
                    >
                      <Text style={styles.blindDateFlowBackText}>Cancel</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[
                        styles.blindDateFlowSendBtn,
                        (!blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime) && { opacity: 0.5 }
                      ]}
                      onPress={handleAcceptBlindDateWithLocation}
                      disabled={loading || !blindDateForm.locationName || !blindDateForm.locationCoords || !blindDateForm.meetTime}
                    >
                      <LinearGradient 
                        colors={["#4CAF50", "#66BB6A"]}
                        style={styles.blindDateFlowSendGradient}
                      >
                        <Text style={styles.blindDateFlowSendText}>
                          {loading ? 'Accepting...' : 'Accept & Set Location'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              {/* Matched Actions */}
              {isMatched && (
                <View style={styles.userSheetMatchedActions}>
                  <TouchableOpacity 
                    style={styles.userSheetSecondaryBtn}
                    onPress={handleViewProfile}
                  >
                    <Ionicons name="person-outline" size={20} color={BLUE} />
                    <Text style={styles.userSheetSecondaryBtnText}>View Profile</Text>
                  </TouchableOpacity>
                  
                  {matchStatus?.chat_allowed && (
                    <TouchableOpacity 
                      style={styles.userSheetPrimaryBtn}
                      onPress={handleStartChat}
                    >
                      <LinearGradient 
                        colors={[BLUES.b50, BLUES.b70]}
                        style={styles.userSheetPrimaryBtnGradient}
                      >
                        <Ionicons name="chatbubbles-outline" size={20} color="#FFF" />
                        <Text style={styles.userSheetPrimaryBtnText}>Start Chat</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              
              {/* Incoming Request Actions */}
              {isPending && !isRequester && !blindDateStep && (
                <View style={styles.userSheetIncomingActions}>
                  {targetNeedsToPick && (
                    <Text style={styles.targetPickHint}>
                      They want you to pick the spot
                    </Text>
                  )}
                  <View style={styles.userSheetIncomingBtns}>
                    <TouchableOpacity 
                      style={styles.userSheetDeclineBtn}
                      onPress={handlePass}
                      disabled={loading}
                    >
                      <Ionicons name="close" size={24} color="#9E9E9E" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={styles.userSheetAcceptBtn}
                      onPress={handleAcceptRequest}
                      disabled={loading}
                    >
                      <LinearGradient 
                        colors={["#4CAF50", "#66BB6A"]}
                        style={styles.userSheetAcceptBtnGradient}
                      >
                        <Ionicons name="checkmark" size={24} color="#FFF" />
                        <Text style={styles.userSheetAcceptBtnText}>
                          {targetNeedsToPick ? 'Pick Spot' : 'Accept'}
                        </Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
            
            {/* Footer Links */}
            {!blindDateStep && (
              <View style={styles.userSheetFooter}>
                <TouchableOpacity onPress={handleBlock}>
                  <Text style={styles.userSheetFooterLink}>Block</Text>
                </TouchableOpacity>
                <Text style={styles.userSheetFooterDot}>•</Text>
                <TouchableOpacity onPress={() => Alert.alert("Report", "Report feature coming soon")}>
                  <Text style={styles.userSheetFooterLink}>Report</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </RNAnimated.View>
      </Pressable>
      
      {/* Location Picker Modal */}
      <Modal 
        visible={showLocationPicker} 
        animationType="slide" 
        transparent={false}
        onRequestClose={() => setShowLocationPicker(false)}
      >
        <View style={styles.locationPickerContainer}>
          <View style={styles.locationPickerHeader}>
            <TouchableOpacity 
              style={styles.locationPickerCloseBtn}
              onPress={() => setShowLocationPicker(false)}
            >
              <Ionicons name="close" size={24} color="#0A0E1A" />
            </TouchableOpacity>
            <Text style={styles.locationPickerTitle}>Pick Location</Text>
            <TouchableOpacity 
              style={[
                styles.locationPickerConfirmBtn,
                !tempPickedLocation && { opacity: 0.5 }
              ]}
              onPress={confirmLocationPick}
              disabled={!tempPickedLocation}
            >
              <Text style={styles.locationPickerConfirmText}>Confirm</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.locationPickerMapContainer}>
            <MapView
              ref={locationPickerMapRef}
              style={styles.locationPickerMap}
              provider={PROVIDER_GOOGLE}
              initialRegion={{
                latitude: userPosition?.lat || 41.0082,
                longitude: userPosition?.lng || 28.9784,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              onPress={handleMapPress}
              showsUserLocation
              showsMyLocationButton
            >
              {tempPickedLocation && (
                <Marker
                  coordinate={{
                    latitude: tempPickedLocation.lat,
                    longitude: tempPickedLocation.lng
                  }}
                  pinColor={BLUE}
                />
              )}
            </MapView>
            
            {/* Center Pin Overlay */}
            <View style={styles.locationPickerPinOverlay} pointerEvents="none">
              <Ionicons name="location" size={40} color={BLUE} />
            </View>
          </View>
          
          <View style={styles.locationPickerFooter}>
            <Text style={styles.locationPickerHint}>
              Tap on the map to select location
            </Text>
            {tempPickedLocation && (
              <Text style={styles.locationPickerCoords}>
                {tempPickedLocation.lat.toFixed(5)}, {tempPickedLocation.lng.toFixed(5)}
              </Text>
            )}
          </View>
        </View>
      </Modal>
      
      {/* Date Time Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={blindDateForm.meetTime || new Date()}
          mode={showDatePickerMode}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateTimeChange}
          minimumDate={new Date()}
        />
      )}
    </Modal>
  );
};

/* ===================== EVENT DETAILS MODAL ===================== */
const EventDetailsModal: React.FC<{
  visible: boolean;
  event: EventData | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  isOwnEvent: boolean;
}> = ({ visible, event, onClose, onEdit, onDelete, isOwnEvent }) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new RNAnimated.Value(SCREEN_H)).current;
  const panY = useRef(new RNAnimated.Value(0)).current;
  const startY = useRef(0);
  const isClosing = useRef(false);

  useEffect(() => {
    if (visible) {
      isClosing.current = false;
      RNAnimated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 65, friction: 11 }).start();
    } else if (!isClosing.current) {
      RNAnimated.timing(slideAnim, { toValue: SCREEN_H, duration: 250, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!event) return null;

  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const openInGoogleMaps = () => {
    Alert.alert(
      "Open in Maps",
      `Navigate to ${event.location_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: () => {
            const url = Platform.select({
              ios: `maps://app?daddr=${event.latitude},${event.longitude}`,
              android: `google.navigation:q=${event.latitude},${event.longitude}`,
            });
            const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;
            
            Linking.canOpenURL(url!)
              .then((supported) => {
                if (supported) {
                  return Linking.openURL(url!);
                } else {
                  return Linking.openURL(fallbackUrl);
                }
              })
              .catch(() => Linking.openURL(fallbackUrl));
          }
        }
      ]
    );
  };

  const handleTouchStart = (e: any) => {
    startY.current = e.nativeEvent.pageY;
  };

  const handleTouchMove = (e: any) => {
    const deltaY = e.nativeEvent.pageY - startY.current;
    if (deltaY > 0) {
      panY.setValue(deltaY);
    }
  };

  const handleTouchEnd = (e: any) => {
    const deltaY = e.nativeEvent.pageY - startY.current;
    if (deltaY > 100) {
      // Swiped down more than 100px - animate slide down smoothly
      isClosing.current = true; // Prevent double animation
      panY.setValue(0); // Reset panY
      RNAnimated.timing(slideAnim, {
        toValue: SCREEN_H,
        duration: 200,
        useNativeDriver: true,
      }).start(() => {
        onClose(); // Call onClose after animation completes
      });
    } else {
      // Spring back to original position
      RNAnimated.spring(panY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <RNAnimated.View 
          style={[
            styles.modalContainer, 
            { 
              transform: [
                { translateY: RNAnimated.add(slideAnim, panY) }
              ], 
              paddingBottom: Math.max(insets.bottom, 20) 
            }
          ]}
        >
          <Pressable onPress={(e) => e.stopPropagation()}>
            {/* Swipeable handle area */}
            <View
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{ paddingVertical: 8 }}
            >
              <View style={styles.modalHandle} />
            </View>

            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <View style={styles.categoryBadge}>
                  <MaterialCommunityIcons name={categoryInfo.icon as any} size={16} color={BLUE} />
                  <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
                </View>
                <Text style={styles.eventTitle} numberOfLines={2}>{event.event_name}</Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={26} color="#0A0E1A" />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView style={{ maxHeight: SCREEN_H * 0.5 }} showsVerticalScrollIndicator={false}>
              <View style={{ padding: 20, gap: 20 }}>
                {/* Time */}
                <View style={styles.infoCard}>
                  <View style={styles.infoRow}>
                    <Ionicons name="calendar-outline" size={20} color={BLUE} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Starts</Text>
                      <Text style={styles.infoValue}>{formatTime(event.time_start)}</Text>
                    </View>
                  </View>
                  <View style={styles.infoRow}>
                    <Ionicons name="time-outline" size={20} color={BLUE} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.infoLabel}>Ends</Text>
                      <Text style={styles.infoValue}>{formatTime(event.time_end)}</Text>
                    </View>
                  </View>
                </View>

                {/* Location - Tappable */}
                <TouchableOpacity onPress={openInGoogleMaps} activeOpacity={0.7}>
                  <View style={styles.infoCard}>
                    <View style={styles.infoRow}>
                      <Ionicons name="location-outline" size={20} color={BLUE} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.infoLabel}>Location</Text>
                        <Text style={styles.infoValue}>{event.location_name}</Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color="rgba(10, 14, 26, 0.3)" />
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Description */}
                {event.event_description && (
                  <View style={styles.infoCard}>
                    <Text style={styles.sectionLabel}>Description</Text>
                    <Text style={styles.descText}>{event.event_description}</Text>
                  </View>
                )}

                {/* Details Grid */}
                <View style={styles.detailsGrid}>
                  <View style={styles.detailBox}>
                    <Ionicons name="people-outline" size={18} color={BLUE} />
                    <Text style={styles.detailBoxText}>{event.capacity} spots</Text>
                  </View>
                  <View style={styles.detailBox}>
                    <Ionicons name="person-outline" size={18} color={BLUE} />
                    <Text style={styles.detailBoxText}>{event.age_min}–{event.age_max} y/o</Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {/* Action Buttons */}
            {isOwnEvent && (
              <View style={styles.modalFooter}>
                <TouchableOpacity onPress={onDelete} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={20} color="#D5222B" />
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={onEdit} style={styles.editBtn}>
                  <LinearGradient colors={GRADIENTS.chipActive} style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", paddingVertical: 14, gap: 8, borderRadius: 14 }}>
                    <Ionicons name="create-outline" size={20} color="#FFF" />
                    <Text style={styles.editBtnText}>Edit</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};

/* ===================== MAIN SCREEN ===================== */
export default function MapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<MapView>(null);
  const fabRotation = useRef(new RNAnimated.Value(0)).current;

  const [pos, setPos] = useState<{ lat: number; lng: number; acc?: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(true);
  const [userProfilePhoto, setUserProfilePhoto] = useState<string | null>(DEFAULT_PROFILE_PHOTO);
  const [headingDeg, setHeadingDeg] = useState(0);
  const [events, setEvents] = useState<EventData[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventData | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // User discovery states
  const [users, setUsers] = useState<UserMapCard[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserMapCard | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [currentUserMode, setCurrentUserMode] = useState<'dating' | 'friend'>('dating');
  const [showFrameViewerMain, setShowFrameViewerMain] = useState(false);
  const [frameViewerFrames, setFrameViewerFrames] = useState<any[]>([]);
  
  // Events have a fixed 30km radius (separate from dating radius)
  const EVENT_RADIUS_METERS = 30000; // 30km

  const lastRawPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const smoothPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCameraAtRef = useRef<number>(0);
  const lastSetPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const cameraPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const searchAnim = useRef(new RNAnimated.Value(0)).current;
  const searchScale = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.02] });
  const backdropOpacity = searchAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 0.26] });

  const openSearch = useCallback(() => {
    setSearchActive(true);
    RNAnimated.timing(searchAnim, { toValue: 1, duration: 180, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [searchAnim]);

  const closeSearch = useCallback(() => {
    RNAnimated.timing(searchAnim, { toValue: 0, duration: 160, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(() => setSearchActive(false));
  }, [searchAnim]);

  const closeKeyboard = useCallback(() => {
    Keyboard.dismiss();
    closeSearch();
  }, [closeSearch]);

  const plusRef = useRef<View>(null);
  const [revealVisible, setRevealVisible] = useState(false);
  const revealAnim = useRef(new RNAnimated.Value(0)).current;
  const [revealOrigin, setRevealOrigin] = useState({ x: 0, y: 0 });
  const [revealScaleFinal, setRevealScaleFinal] = useState(1);
  const BASE_DIAM = 40;

  const startPlusReveal = useCallback(() => {
    plusRef.current?.measureInWindow?.((x, y, w, h) => {
      const cx = x + w / 2, cy = y + h / 2;
      const dx = Math.max(cx, SCREEN_W - cx);
      const dy = Math.max(cy, SCREEN_H - cy);
      const maxRadius = Math.sqrt(dx * dx + dy * dy);
      const finalScale = (maxRadius * 2) / BASE_DIAM;

      setRevealOrigin({ x: cx, y: cy });
      setRevealScaleFinal(finalScale);
      setRevealVisible(true);

      revealAnim.setValue(0);
      RNAnimated.timing(revealAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) {
          router.push("/(events)/add_event");
          setTimeout(() => setRevealVisible(false), 200);
        }
      });
    });
  }, [revealAnim, router]);

  useEffect(() => {
    let mounted = true;
    let authSubscription: any = null;
    
    (async () => {
      try {
        // Get current session (more reliable than getUser)
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user && mounted) {
          console.log("✅ User authenticated:", session.user.id);
          setCurrentUserId(session.user.id);
          
          // Fetch user profile photo - same approach as profile.tsx
          const userId = session.user.id;
          const { data: mainPhoto } = await supabase
            .from("user_photos")
            .select("photo_url")
            .eq("user_id", userId)
            .eq("is_main", true)
            .maybeSingle();

          if (mainPhoto?.photo_url) {
            const storagePath = toStoragePath(mainPhoto.photo_url);
            const signed = await signPath(storagePath);
            setUserProfilePhoto(signed ?? mainPhoto.photo_url);
          } else {
            setUserProfilePhoto(null);
          }
        } else {
          console.log("❌ No session found");
        }
        
        // Listen for auth changes
        const { data } = supabase.auth.onAuthStateChange((_event, session) => {
          if (session?.user && mounted) {
            console.log("✅ Auth state changed, user:", session.user.id);
            setCurrentUserId(session.user.id);
          }
        });
        authSubscription = data.subscription;
      } catch (error) {
        console.error("Auth setup error:", error);
        setUserProfilePhoto(null);
      }
    })();
    
    return () => {
      mounted = false;
      if (authSubscription) {
        authSubscription.unsubscribe();
      }
    };
  }, []);

  // Fetch events from Supabase
  const fetchEvents = useCallback(async () => {
    if (!pos) return;
    
    try {
      const { data, error } = await supabase.rpc('get_nearby_events_with_coordinates', {
        p_user_lat: pos.lat,
        p_user_lng: pos.lng,
        p_radius_meters: EVENT_RADIUS_METERS,
        p_status: 'active'
      });

      if (error) {
        console.error("❌ Error fetching events:", error);
        return;
      }
      
      if (data) {
        const validEvents = data
          .filter((event: any) => {
            const lat = event.latitude;
            const lng = event.longitude;
            if (lat === null || lat === undefined || lng === null || lng === undefined) return false;
            
            const eventEndTime = new Date(event.time_end).getTime();
            if (eventEndTime < Date.now()) return false;
            
            return true;
          })
          .map((event: any) => ({
            ...event,
            latitude: typeof event.latitude === 'string' ? parseFloat(event.latitude) : event.latitude,
            longitude: typeof event.longitude === 'string' ? parseFloat(event.longitude) : event.longitude,
          }));
        
        console.log(`✅ Loaded ${validEvents.length} events`);
        setEvents(validEvents as EventData[]);
      }
    } catch (error) {
      console.error("Exception in fetchEvents:", error);
    }
  }, [pos]);

  // Fetch users from Supabase
  const fetchUsers = useCallback(async (retryCount: number = 0) => {
    if (!currentUserId) {
      console.log("⚠️ No currentUserId, can't fetch users");
      return;
    }
    
    try {
      console.log(`🔍 Fetching users for mode: ${currentUserMode} (attempt ${retryCount + 1})`);
      console.log("📌 Current user ID:", currentUserId);
      
      // Use regular get_map_cards (works without time filter)
      const { data, error } = await supabase.rpc('get_map_cards', {
        p_mode: currentUserMode
      });

      if (error) {
        console.error("❌ Error fetching users:", error);
        return;
      }
      
      if (data) {
        console.log(`✅ Loaded ${data.length} user(s) on map`);
        
        // Debug: Log each user found
        data.forEach((u: any) => {
          console.log(`   👤 ${u.full_name}, age ${u.age}, mode: ${u.mode}, lat: ${u.approx_lat?.toFixed(4)}, lng: ${u.approx_lng?.toFixed(4)}`);
        });
        
        // Process photo URLs with signed URLs (bucket is not public)
        const usersWithPhotos = await Promise.all(
          data.map(async (user: any) => {
            if (user.main_photo_url && !user.main_photo_url.startsWith('http')) {
              const { data: signedData } = await supabase.storage
                .from("user_photos")
                .createSignedUrl(user.main_photo_url, 3600);
              return { ...user, main_photo_url: signedData?.signedUrl || null };
            }
            return user;
          })
        );
        
        setUsers(usersWithPhotos as UserMapCard[]);
      }
    } catch (error) {
      console.error("Exception in fetchUsers:", error);
    }
  }, [currentUserId, currentUserMode]);

  const fetchEventsRef = useRef(fetchEvents);
  useEffect(() => {
    fetchEventsRef.current = fetchEvents;
  }, [fetchEvents]);

  // 🔥 Add fetchUsersRef for real-time subscription
  const fetchUsersRef = useRef(fetchUsers);
  useEffect(() => {
    fetchUsersRef.current = fetchUsers;
  }, [fetchUsers]);

  // Initial fetch when position is available
  useEffect(() => {
    if (pos) {
      fetchEvents();
    }
  }, [pos, fetchEvents]);

  // Fetch users when currentUserId is available
  // Use multiple retries with exponential backoff to handle race conditions
  useEffect(() => {
    if (!currentUserId || !pos) return;
    
    let isMounted = true;
    const retryDelays = [0, 1000, 2000, 4000]; // Initial + 3 retries at 1s, 2s, 4s
    
    const fetchWithRetries = async () => {
      for (let i = 0; i < retryDelays.length; i++) {
        if (!isMounted) return;
        
        if (retryDelays[i] > 0) {
          console.log(`🔄 Retry ${i}: waiting ${retryDelays[i]}ms before fetching users...`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[i]));
        }
        
        if (!isMounted) return;
        await fetchUsers(i);
      }
    };
    
    fetchWithRetries();
    
    return () => {
      isMounted = false;
    };
  }, [currentUserId, pos, fetchUsers]);

  // Refresh events and users when screen comes into focus (e.g., returning from add_event)
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 Map screen focused - refreshing events and users");
      if (pos) {
        fetchEvents();
        if (currentUserId) {
          fetchUsers(0); // Pass 0 as retry count for focus refresh
        }
      }
    }, [pos, currentUserId, fetchEvents, fetchUsers])
  );

  // Set up real-time subscription ONCE on mount
  useEffect(() => {
    console.log("📡 Setting up real-time subscriptions...");

    const eventsChannel = supabase
      .channel("events_updates")
      .on(
        "postgres_changes",
        { 
          event: "*", 
          schema: "public", 
          table: "events"
        },
        (payload) => {
          console.log("🔔 Real-time event:", payload.eventType);
          
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            console.log("♻️ Refetching events");
            fetchEventsRef.current();
          } else if (payload.eventType === "DELETE") {
            const eventId = (payload.old as any)?.id;
            if (eventId) {
              setEvents(prev => prev.filter(e => e.id !== eventId));
            }
          }
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Events real-time connected");
        }
      });

    // 🔥 Also subscribe to profile updates to detect when other users come online
    const profilesChannel = supabase
      .channel("profiles_updates")
      .on(
        "postgres_changes",
        { 
          event: "UPDATE", 
          schema: "public", 
          table: "profiles"
        },
        (payload) => {
          // When any profile updates (like location/last_seen), refresh users
          console.log("🔔 Profile updated, refreshing users...");
          // Use a small delay to avoid hammering the API
          setTimeout(() => {
            fetchUsersRef.current?.();
          }, 500);
        }
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("✅ Profiles real-time connected");
        }
      });

    return () => {
      eventsChannel.unsubscribe();
      profilesChannel.unsubscribe();
    };
  }, []); // Empty deps - set up once

  // Periodic cleanup for expired events
  useEffect(() => {
    const interval = setInterval(() => {
      setEvents(prev => {
        const now = Date.now();
        const active = prev.filter(e => new Date(e.time_end).getTime() > now);
        if (active.length !== prev.length) {
          console.log(`🧹 Removed ${prev.length - active.length} expired events`);
        }
        return active;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const haversineMeters = useCallback((a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
    const R = 6371000;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lng - a.lng);
    const la1 = toRad(a.lat);
    const la2 = toRad(b.lat);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }, []);

  const smoothPoint = useCallback((prev: { lat: number; lng: number }, next: { lat: number; lng: number }, accuracy?: number) => {
    const dist = haversineMeters(prev, next);
    let alpha = dist > 25 ? 0.7 : dist > 10 ? 0.5 : 0.25;
    if ((accuracy ?? 0) > 50 && dist < 15) alpha = Math.min(alpha, 0.15);
    return { lat: prev.lat + alpha * (next.lat - prev.lat), lng: prev.lng + alpha * (next.lng - prev.lng) };
  }, [haversineMeters]);

  useEffect(() => {
    let subPos: Location.LocationSubscription | null = null;
    let subHeading: Location.LocationSubscription | null = null;
    let locationUpdateTimer: ReturnType<typeof setInterval> | null = null;

    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.log("📍 Location permission denied, using fallback location");
          const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
          setPos(fallback);
          smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          cameraPositionRef.current = { lat: fallback.lat, lng: fallback.lng };
          setLoading(false);
          
          // Animate to fallback location
          setTimeout(() => {
            mapRef.current?.animateCamera(
              { center: { latitude: fallback.lat, longitude: fallback.lng }, zoom: 16, pitch: 0, heading: 0 },
              { duration: 400 }
            );
            lastCameraAtRef.current = Date.now();
          }, 0);
          return;
        }

        // Try to get current position with error handling
        let initial;
        try {
          initial = await Location.getCurrentPositionAsync({ 
            accuracy: Location.Accuracy.Balanced,
          });
        } catch (locationError) {
          console.log("📍 Could not get current location, using fallback:", locationError);
          const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
          setPos(fallback);
          smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          cameraPositionRef.current = { lat: fallback.lat, lng: fallback.lng };
          setLoading(false);
          
          setTimeout(() => {
            mapRef.current?.animateCamera(
              { center: { latitude: fallback.lat, longitude: fallback.lng }, zoom: 16, pitch: 0, heading: 0 },
              { duration: 400 }
            );
            lastCameraAtRef.current = Date.now();
          }, 0);
          return;
        }

        const init = { lat: initial.coords.latitude, lng: initial.coords.longitude, acc: initial.coords.accuracy ?? 30 };
        console.log("📍 Got user location:", init.lat, init.lng);
        setPos(init);
        lastSetPosRef.current = { lat: init.lat, lng: init.lng };
        lastRawPosRef.current = { lat: init.lat, lng: init.lng };
        smoothPosRef.current = { lat: init.lat, lng: init.lng };
        cameraPositionRef.current = { lat: init.lat, lng: init.lng };

        // 🔥 Save location to database - AWAIT to ensure it's saved before fetching users
        if (currentUserId) {
          console.log("📍 Saving initial location to database...");
          const saved = await updateUserLocationInDB(currentUserId, init.lat, init.lng);
          if (saved) {
            console.log("✅ Location saved successfully, users can now discover this user");
          } else {
            console.warn("⚠️ Failed to save location, other users may not see this user");
          }
        }

        // 🔥 Set up periodic location updates to database (every 30 seconds)
        locationUpdateTimer = setInterval(() => {
          if (currentUserId && smoothPosRef.current) {
            updateUserLocationInDB(currentUserId, smoothPosRef.current.lat, smoothPosRef.current.lng);
          }
        }, 30000);

        setTimeout(() => {
          mapRef.current?.animateCamera(
            { center: { latitude: init.lat, longitude: init.lng }, zoom: 16, pitch: 0, heading: 0 },
            { duration: 400 }
          );
          lastCameraAtRef.current = Date.now();
        }, 0);

        // Watch position updates
        try {
          subPos = await Location.watchPositionAsync(
            { accuracy: Location.Accuracy.Balanced, timeInterval: 1500, distanceInterval: 8 },
            (loc) => {
              const { latitude, longitude } = loc.coords;
              const locAcc: number | undefined = loc.coords.accuracy ?? undefined;
              const raw = { lat: latitude, lng: longitude };

              // Reject obvious GPS jumps
              const prevRaw = lastRawPosRef.current;
              if (prevRaw) {
                const jump = haversineMeters(prevRaw, raw);
                // More aggressive filtering: reject large jumps when accuracy is poor
                if ((locAcc ?? 999) > 80 && jump > 50) {
                  console.log("📍 Rejected GPS jump:", jump.toFixed(1), "m, accuracy:", locAcc);
                  return;
                }
                // Even with good accuracy, reject unrealistic jumps
                if (jump > 200) {
                  console.log("📍 Rejected unrealistic jump:", jump.toFixed(1), "m");
                  return;
                }
              }
              lastRawPosRef.current = raw;

              const prevSmooth = smoothPosRef.current ?? raw;
              const smoothed = smoothPoint(prevSmooth, raw, locAcc);
              smoothPosRef.current = smoothed;

              const lastSet = lastSetPosRef.current ?? smoothed;
              const movedSinceSet = haversineMeters(lastSet, smoothed);

              // Only update position state if moved significantly
              if (movedSinceSet >= 5) {
                setPos({ lat: smoothed.lat, lng: smoothed.lng, acc: locAcc ?? 25 });
                lastSetPosRef.current = { lat: smoothed.lat, lng: smoothed.lng };
                
                // 🔥 Update database if moved >50 meters
                if (currentUserId && movedSinceSet > 50) {
                  updateUserLocationInDB(currentUserId, smoothed.lat, smoothed.lng);
                }
              }

              // Camera follow logic - only if following mode is enabled
              if (isFollowing) {
                const now = Date.now();
                const lastCam = lastCameraAtRef.current;
                
                // Calculate distance from ACTUAL camera position (not previous smoothed position)
                const camPos = cameraPositionRef.current ?? smoothed;
                const distFromCamera = haversineMeters(camPos, smoothed);

                // More conservative thresholds:
                // - Only move camera if user has moved at least 15 meters from camera center
                // - Rate limit to max once per 1.2 seconds
                // - Require decent accuracy
                if (distFromCamera > 15 && now - lastCam >= 1200 && (locAcc ?? 999) < 100) {
                  console.log("📍 Following user - moved", distFromCamera.toFixed(1), "m from camera");
                  mapRef.current?.animateCamera(
                    { center: { latitude: smoothed.lat, longitude: smoothed.lng }, pitch: 0, heading: 0 },
                    { duration: 400 }
                  );
                  cameraPositionRef.current = { lat: smoothed.lat, lng: smoothed.lng };
                  lastCameraAtRef.current = now;
                }
              }
            }
          );
        } catch (watchError) {
          console.log("📍 Could not watch position, using static location:", watchError);
        }

        // Watch heading updates
        try {
          subHeading = await Location.watchHeadingAsync((h) => {
            const deg = Number.isFinite(h?.trueHeading) && h.trueHeading >= 0 ? h.trueHeading : h.magHeading ?? 0;
            setHeadingDeg(deg);
          });
        } catch (headingError) {
          console.log("📍 Could not watch heading:", headingError);
        }
      } catch (error) {
        console.error("📍 Location setup error:", error);
        // Final fallback
        const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
        setPos(fallback);
        smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
        lastSetPosRef.current = { lat: fallback.lat, lng: fallback.lng };
      } finally {
        setLoading(false);
      }
    })();

    return () => {
      subPos?.remove?.();
      subHeading?.remove?.();
      if (locationUpdateTimer) {
        clearInterval(locationUpdateTimer);
      }
    };
  }, [isFollowing, haversineMeters, smoothPoint, currentUserId]);

  const initialCamera: Camera = useMemo(() => ({
    center: { latitude: pos?.lat ?? FALLBACK.lat, longitude: pos?.lng ?? FALLBACK.lng },
    zoom: 16, heading: 0, pitch: 0, altitude: 0,
  }), [pos]);

  const recenter = useCallback(() => {
    const c = pos ?? { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
    setIsFollowing(true);
    cameraPositionRef.current = { lat: c.lat, lng: c.lng };
    mapRef.current?.animateCamera({ center: { latitude: c.lat, longitude: c.lng }, zoom: 16, pitch: 0, heading: 0 }, { duration: 400 });
    RNAnimated.sequence([
      RNAnimated.timing(fabRotation, { toValue: 1, duration: 300, useNativeDriver: true, easing: Easing.out(Easing.cubic) }),
      RNAnimated.timing(fabRotation, { toValue: 0, duration: 300, useNativeDriver: true, easing: Easing.in(Easing.cubic) }),
    ]).start();
  }, [pos, fabRotation]);

  
  // 🔥 Auto-refresh live users every 30 seconds
  useEffect(() => {
    if (!currentUserId || !pos) return;
    
    const refreshInterval = setInterval(() => {
      console.log("♻️ Refreshing live users...");
      fetchUsers(0); // Pass 0 as retry count for periodic refresh
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [currentUserId, pos, fetchUsers]);

  if (loading) return <IiLoader />;

  const fabSpin = fabRotation.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const FAB_LOWERING = verticalScale(30);
  const revealScale = revealAnim.interpolate({ inputRange: [0, 1], outputRange: [0.001, revealScaleFinal] });

  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef} style={styles.map} provider={PROVIDER_GOOGLE} initialCamera={initialCamera} customMapStyle={googleBlueStyle}
        showsCompass={false} showsPointsOfInterest={false} showsMyLocationButton={false} toolbarEnabled={false}
        showsScale={false} showsIndoors={false} showsIndoorLevelPicker={false} showsBuildings pitchEnabled={false}
        rotateEnabled={false} scrollEnabled zoomEnabled moveOnMarkerPress={false} onPanDrag={() => setIsFollowing(false)}
        minZoomLevel={10} maxZoomLevel={20}
      >
        {pos && (
          <Marker
            key={userProfilePhoto || "placeholder"} tracksViewChanges={true}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }} anchor={{ x: 0.5, y: 0.5 }} stopPropagation
            zIndex={1000}
          >
            <ProfileMarker photoUrl={userProfilePhoto} headingDeg={headingDeg} />
          </Marker>
        )}

        {/* Other user markers */}
        {users.map((user) => (
          <Marker
            key={`user-${user.user_id}-${user.main_photo_url}`}
            coordinate={{ latitude: user.approx_lat, longitude: user.approx_lng }}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={!!user.main_photo_url}
            zIndex={500}
            onPress={() => {
              setSelectedUser(user);
              setShowUserModal(true);
            }}
          >
            <UserMarker user={user} hasFrame={!!user.frame_id} />
          </Marker>
        ))}

        {/* Event markers */}
        {events.map((event) => (
          <Marker
            key={`evt-${event.id}`}
            coordinate={{ latitude: event.latitude, longitude: event.longitude }}
            anchor={{ x: 0.5, y: 1 }}
            tracksViewChanges={false}
            onPress={() => {
              setSelectedEvent(event);
              setShowEventModal(true);
            }}
          >
            <EventMarker event={event} />
          </Marker>
        ))}

      </MapView>

      <RNAnimated.View
        pointerEvents={searchActive ? "auto" : "none"}
        style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.4)", opacity: backdropOpacity, zIndex: 9 }]}
      >
        <Pressable style={{ flex: 1 }} onPress={closeKeyboard} />
      </RNAnimated.View>

      <View style={[styles.overlayTop, { paddingTop: Math.max(insets.top, verticalScale(12)) }]}>
        <RNAnimated.View style={{ transform: [{ scale: searchScale }] }}>
          <GlassSurface thickness="thick" radius={scale(24)} style={[styles.searchWrap, { height: SEARCH_HEIGHT }]}>
            <View style={styles.searchInner}>
              <View style={styles.searchIconWrap}>
                <SearchIcon size={18} />
              </View>
              <TextInput
                value={searchQuery} onChangeText={setSearchQuery} placeholder="Search for people & places"
                placeholderTextColor={PLACEHOLDER_COLOR} style={styles.searchInput} returnKeyType="search"
                selectionColor="rgba(27,68,205,0.5)" onFocus={openSearch} onBlur={closeSearch} onSubmitEditing={closeKeyboard}
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery("")} style={styles.clearBtn}>
                  <Text style={styles.clearTxt}>×</Text>
                </Pressable>
              )}
            </View>
          </GlassSurface>
        </RNAnimated.View>

        <View style={styles.chipsRow}>
          <View style={styles.chipsLeft} />
          <PlusChipDiamondGlass ref={plusRef} onPress={startPlusReveal} />
        </View>
      </View>


      {revealVisible && (
        <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, { zIndex: 999, backgroundColor: "transparent" }]}>
          <RNAnimated.View
            style={{
              position: "absolute", left: revealOrigin.x - BASE_DIAM / 2, top: revealOrigin.y - BASE_DIAM / 2,
              width: BASE_DIAM, height: BASE_DIAM, borderRadius: BASE_DIAM / 2, backgroundColor: "#FFFFFF",
              transform: [{ scale: revealScale }],
              ...(Platform.OS === "android" ? { elevation: 1001, renderToHardwareTextureAndroid: true } : {}),
            }}
          />
        </View>
      )}

      <GlassFab onPress={recenter} spin={fabSpin} bottom={Math.max(insets.bottom + TAB_HEIGHT, TAB_HEIGHT) - FAB_LOWERING} right={scale(18)} />

      {/* User Profile Modal */}
      <UserProfileModal
        visible={showUserModal}
        user={selectedUser}
        onClose={() => {
          setShowUserModal(false);
          setSelectedUser(null);
        }}
        currentUserId={currentUserId}
        onOpenFrames={(frames) => {
          setFrameViewerFrames(frames);
          setShowFrameViewerMain(true);
        }}
        userPosition={pos}
      />

{/* Frames viewer - at root level, not nested */}
<ActiveFramesModal
  visible={showFrameViewerMain}
  onClose={() => setShowFrameViewerMain(false)}
  frames={frameViewerFrames}
  isOwnProfile={false}
/>

      {/* Event Details Modal */}
      <EventDetailsModal
        visible={showEventModal}
        event={selectedEvent}
        onClose={() => {
          setShowEventModal(false);
          setSelectedEvent(null);
        }}
        onEdit={() => {
          setShowEventModal(false);
          // TODO: Navigate to edit event page with event ID
          router.push({
            pathname: "/(events)/edit_event",
            params: { eventId: selectedEvent?.id }
          });
        }}
        onDelete={() => {
          Alert.alert(
            "Delete Event",
            "Are you sure you want to delete this event? This action cannot be undone.",
            [
              {
                text: "Cancel",
                style: "cancel"
              },
              {
                text: "Delete",
                style: "destructive",
                onPress: async () => {
                  if (!selectedEvent) return;
                  
                  try {
                    // Delete from database
                    const { error } = await supabase
                      .from("events")
                      .delete()
                      .eq("id", selectedEvent.id);
                    
                    if (error) {
                      console.error("Delete error:", error);
                      Alert.alert("Error", "Failed to delete event. Please try again.");
                    } else {
                      console.log("✅ Event deleted:", selectedEvent.id);
                      // Remove from local state immediately
                      setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
                      // Close modal
                      setShowEventModal(false);
                      setSelectedEvent(null);
                      Alert.alert("Success", "Event deleted successfully");
                    }
                  } catch (error) {
                    console.error("Delete exception:", error);
                    Alert.alert("Error", "An unexpected error occurred");
                  }
                }
              }
            ]
          );
        }}
        isOwnEvent={selectedEvent?.host_id === currentUserId}
      />
    </View>
  );
}

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: BG },
  map: { flex: 1 },
  loading: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: BG, gap: verticalScale(12) },
  loadingText: { fontFamily: Fonts.bold, fontSize: scale(14), color: BLUE, letterSpacing: 0.5 },
  overlayTop: { position: "absolute", left: scale(14), right: scale(14), zIndex: 10, gap: verticalScale(12) },
  glassBase: { overflow: "hidden", backgroundColor: "transparent", shadowColor: "#0F172A", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.16, shadowRadius: 22, elevation: 12 },
  searchWrap: { alignSelf: "stretch" },
  searchInner: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: scale(12), gap: scale(10) },
  searchIconWrap: { width: SEARCH_HEIGHT - scale(18), height: SEARCH_HEIGHT - scale(18), borderRadius: (SEARCH_HEIGHT - scale(18)) / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: "rgba(27,68,205,0.28)" },
  searchInput: { flex: 1, height: SEARCH_HEIGHT - scale(22), backgroundColor: "transparent", color: "#0B1020", fontFamily: Fonts.bold, fontSize: scale(15.5), includeFontPadding: false, paddingVertical: 0, textAlignVertical: "center" as any },
  clearBtn: { width: SEARCH_HEIGHT - scale(22), height: SEARCH_HEIGHT - scale(22), borderRadius: (SEARCH_HEIGHT - scale(22)) / 2, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.98)", borderWidth: 1, borderColor: "rgba(27,68,205,0.28)" },
  clearTxt: { fontSize: scale(20), lineHeight: scale(20), color: BLUES.b00, marginTop: -1 },
  chipsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  chipsLeft: { flexDirection: "row", alignItems: "center", gap: scale(11) },
  chipGlass: { paddingVertical: verticalScale(10), paddingHorizontal: scale(18), alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(27,68,205,0.35)" },
  chipText: { fontFamily: Fonts.bold, fontSize: scale(14.5), letterSpacing: 0.4, textTransform: "capitalize" },
  iiRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "center", gap: scale(24), marginBottom: verticalScale(10) },
  iLetter: { fontSize: scale(64), lineHeight: scale(64), includeFontPadding: false, textAlignVertical: "center" as any, textAlign: "center", shadowColor: "#0F172A", shadowOpacity: 0.12, shadowRadius: 6, shadowOffset: { width: 0, height: 3 } },
  iDot2: { width: scale(12), height: scale(12), borderRadius: scale(6), backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "rgba(27,68,205,0.35)", shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: verticalScale(6) },
  progressOuter: { width: "68%", height: verticalScale(10), borderRadius: verticalScale(10) / 2, overflow: "hidden", marginTop: verticalScale(8), backgroundColor: "transparent" },
  progressTrack: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(27,68,205,0.28)", borderRadius: verticalScale(10) / 2 },
  progressRunner: { position: "absolute", top: 1.5, bottom: 1.5, left: 0, width: "26%", borderRadius: verticalScale(10) / 2, shadowColor: BLUE, shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
  
  // Event marker styles
  eventMarkerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  eventMarkerBubble: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    overflow: "hidden",
  },
  eventMarkerPin: {
    width: 0,
    height: 0,
    borderLeftWidth: scale(8),
    borderRightWidth: scale(8),
    borderTopWidth: scale(10),
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BLUE,
    marginTop: -2,
  },

  // Event Details Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
  },
  modalHandle: {
    width: 40,
    height: 4,
    backgroundColor: "rgba(10, 14, 26, 0.2)",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 12,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27, 68, 205, 0.08)",
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
    alignSelf: "flex-start",
  },
  categoryBadgeText: {
    fontSize: 11,
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  eventTitle: {
    fontSize: 22,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
  },
  closeBtn: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "rgba(10, 14, 26, 0.05)",
    marginLeft: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
    gap: 12,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  infoLabel: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
  },
  sectionLabel: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    marginBottom: 8,
  },
  descText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "#0A0E1A",
    lineHeight: 20,
  },
  detailsGrid: {
    flexDirection: "row",
    gap: 10,
  },
  detailBox: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
  },
  detailBoxText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.08)",
    gap: 10,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(213, 34, 43, 0.08)",
    borderWidth: 1.5,
    borderColor: "rgba(213, 34, 43, 0.2)",
    gap: 6,
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#D5222B",
  },
  editBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  editBtnText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  
  // User Sheet Styles (new design)
  userSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 16,
  },
  userSheetAvatarWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  userSheetFrameRing: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    overflow: "hidden",
  },
  userSheetAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    overflow: "hidden",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  userSheetAvatarWithRing: {
    width: 68,
    height: 68,
    borderRadius: 34,
  },
  userSheetAvatarImg: {
    width: "100%",
    height: "100%",
    borderRadius: 36,
  },
  userSheetAvatarPlaceholder: {
    backgroundColor: BLUES.b100,
    alignItems: "center",
    justifyContent: "center",
  },
  userSheetInfo: {
    flex: 1,
    gap: 4,
  },
  userSheetName: {
    fontSize: 24,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    letterSpacing: 0.3,
  },
  userSheetDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  userSheetDistance: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  userSheetChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 8,
  },
  userSheetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  userSheetChipText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
    color: BLUE,
    textTransform: "capitalize",
  },
  userSheetBioSection: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  userSheetBioLabel: {
    fontSize: 12,
    fontFamily: Fonts.bold,
    color: "rgba(10, 14, 26, 0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  userSheetBio: {
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: "#0A0E1A",
    lineHeight: 22,
  },
  userSheetStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  userSheetStatusText: {
    fontSize: 13,
    fontFamily: Fonts.bold,
  },
  userSheetActions: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 12,
  },
  userSheetPrimaryBtn: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  userSheetPrimaryBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  userSheetPrimaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  userSheetSecondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.15)",
    gap: 10,
  },
  userSheetSecondaryBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.3,
  },
  userSheetBlindConfirm: {
    alignItems: "center",
    paddingVertical: 8,
    gap: 8,
  },
  userSheetBlindTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
  },
  userSheetBlindDesc: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.6)",
    textAlign: "center",
  },
  userSheetBlindBtns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    width: "100%",
  },
  userSheetBlindCancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
  },
  userSheetBlindCancelText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#9E9E9E",
  },
  userSheetBlindSend: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  userSheetBlindSendGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  userSheetBlindSendText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  userSheetMatchedActions: {
    gap: 12,
  },
  userSheetIncomingActions: {
    alignItems: "center",
    gap: 12,
  },
  userSheetIncomingBtns: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  targetPickHint: {
    fontSize: 13,
    fontFamily: Fonts.primary,
    color: BLUE,
    textAlign: "center",
    marginBottom: 4,
  },
  userSheetDeclineBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  userSheetAcceptBtn: {
    flex: 1,
    maxWidth: 200,
    borderRadius: 28,
    overflow: "hidden",
  },
  userSheetAcceptBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  userSheetAcceptBtnText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  userSheetFooter: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 14, 26, 0.06)",
    gap: 16,
  },
  userSheetFooterLink: {
    fontSize: 13,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.4)",
  },
  userSheetFooterDot: {
    fontSize: 13,
    color: "rgba(10, 14, 26, 0.2)",
  },
  userModalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: SCREEN_H * 0.75,
  },
  // Blind Date Flow Styles
  blindDateFlow: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 8,
  },
  blindDateFlowTitle: {
    fontSize: 20,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    marginBottom: 4,
  },
  blindDateFlowDesc: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.6)",
    textAlign: "center",
    marginBottom: 20,
  },
  blindDateFlowOptions: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 16,
  },
  blindDateFlowOption: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  blindDateFlowOptionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  blindDateFlowOptionText: {
    fontSize: 16,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    marginBottom: 4,
  },
  blindDateFlowOptionHint: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  blindDateFlowCancel: {
    paddingVertical: 12,
  },
  blindDateFlowCancelText: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  blindDateFlowInputs: {
    width: "100%",
    gap: 12,
    marginBottom: 20,
  },
  blindDateFlowInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  blindDateFlowInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: "#0A0E1A",
    padding: 0,
  },
  blindDateFlowInputText: {
    flex: 1,
    fontSize: 15,
    fontFamily: Fonts.primary,
    color: "#0A0E1A",
  },
  blindDateFlowActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  blindDateFlowBackBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: "#F5F5F5",
  },
  blindDateFlowBackText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#9E9E9E",
  },
  blindDateFlowSendBtn: {
    flex: 1,
    borderRadius: 14,
    overflow: "hidden",
  },
  blindDateFlowSendGradient: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  blindDateFlowSendText: {
    fontSize: 15,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  // Location Picker Modal Styles
  locationPickerContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  locationPickerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10, 14, 26, 0.08)",
  },
  locationPickerCloseBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  locationPickerTitle: {
    fontSize: 18,
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
  },
  locationPickerConfirmBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BLUE,
    borderRadius: 20,
  },
  locationPickerConfirmText: {
    fontSize: 14,
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  locationPickerMapContainer: {
    flex: 1,
    position: "relative",
  },
  locationPickerMap: {
    flex: 1,
  },
  locationPickerPinOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -20,
    marginTop: -40,
  },
  locationPickerFooter: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 14, 26, 0.08)",
    alignItems: "center",
  },
  locationPickerHint: {
    fontSize: 14,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.6)",
  },
  locationPickerCoords: {
    fontSize: 12,
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.4)",
    marginTop: 4,
  },
});