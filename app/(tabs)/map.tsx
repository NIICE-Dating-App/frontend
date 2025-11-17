import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
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

/* ===================== EVENT TYPES ===================== */
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
const normalizeStoragePath = (input: string | null): string | null => {
  if (!input) return null;
  let s = input.trim();
  if (s.startsWith("http")) {
    const m = s.match(/\/user_photos\/([^?]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  }
  return s.replace(/^\/+/, "")
    .replace(/^storage\/v1\/object\/public\//, "")
    .replace(/^public\//, "")
    .replace(/^user_photos\//, "");
};

const urlForUserPhoto = async (raw: string | null): Promise<string | null> => {
  const rel = normalizeStoragePath(raw);
  if (!rel) return null;
  const { data: signed, error } = await supabase.storage.from("user_photos").createSignedUrl(rel, 3600);
  if (!error && signed?.signedUrl) return signed.signedUrl;
  const { data: pub } = supabase.storage.from("user_photos").getPublicUrl(rel);
  return pub?.publicUrl ?? null;
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
      width: MARKER_BOX, height: MARKER_BOX, alignItems: "center", justifyContent: "center", overflow: "hidden",
      ...(Platform.OS === "ios" ? { shadowColor: "transparent" as any } : {}),
    }}
    collapsable={false} pointerEvents="none"
  >
    <DirectionCone degrees={headingDeg} />
    <PulseRing size={RING_SIZE} delay={0} left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={800} ringColor="rgba(27,68,205,0.18)" left={RING_OFFSET} top={RING_OFFSET} />
    <PulseRing size={RING_SIZE} delay={1600} ringColor="rgba(27,68,205,0.12)" left={RING_OFFSET} top={RING_OFFSET} />

    {photoUrl ? (
      <Image
        source={{ uri: photoUrl }} resizeMode="cover"
        style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2, backgroundColor: "#fff", borderWidth: 2, borderColor: BLUE }}
      />
    ) : (
      <View style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2, overflow: "hidden", alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: BLUE, backgroundColor: BLUES.b100 }}>
        <LinearGradient colors={[BLUES.b90, BLUES.b110]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
        <Svg width={18} height={18} viewBox="0 0 24 24">
          <Path d="M12 12c2.2 0 4-1.8 4-4s-1.8-4-4-4-4 1.8-4 4 1.8 4 4 4Zm0 2c-3.3 0-6 2.2-6 5v1h12v-1c0-2.8-2.7-5-6-5Z" fill="#fff" opacity={0.9} />
        </Svg>
      </View>
    )}
  </View>
));

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
      "Open in Google Maps",
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
  
  // Events have a fixed 30km radius (separate from dating radius)
  const EVENT_RADIUS_METERS = 30000; // 30km

  const lastRawPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const smoothPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCameraAtRef = useRef<number>(0);
  const lastSetPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const cameraPositionRef = useRef<{ lat: number; lng: number } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [filters, setFilters] = useState({ nearby: true, online: false });
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
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (userId) {
          setCurrentUserId(userId);
        }

        // Fetch user profile photo
        if (!userId) return;

        // Fetch user profile photo
        let { data: mainPhoto } = await supabase.from("user_photos").select("photo_url, created_at")
          .eq("user_id", userId).eq("is_main", true).order("created_at", { ascending: false }).limit(1).maybeSingle();

        if (!mainPhoto?.photo_url) {
          const { data: latest } = await supabase.from("user_photos").select("photo_url, created_at")
            .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
          if (latest?.photo_url) mainPhoto = latest;
        }

        if (mainPhoto?.photo_url) {
          const signed = await urlForUserPhoto(mainPhoto.photo_url);
          setUserProfilePhoto(signed ?? null);
        } else {
          setUserProfilePhoto(null);
        }
      } catch {
        setUserProfilePhoto(null);
      }
    })();
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

  const fetchEventsRef = useRef(fetchEvents);
  useEffect(() => {
    fetchEventsRef.current = fetchEvents;
  }, [fetchEvents]);

  // Initial fetch when position is available
  useEffect(() => {
    if (pos) {
      fetchEvents();
    }
  }, [pos, fetchEvents]);

  // Refresh events when screen comes into focus (e.g., returning from add_event)
  useFocusEffect(
    useCallback(() => {
      console.log("🔄 Map screen focused - refreshing events");
      if (pos) {
        fetchEvents();
      }
    }, [pos, fetchEvents])
  );

  // Set up real-time subscription ONCE on mount
  useEffect(() => {
    console.log("📡 Setting up real-time subscription...");

    const channel = supabase
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
          console.log("✅ Real-time connected");
        }
      });

    return () => {
      channel.unsubscribe();
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
    };
  }, [isFollowing, haversineMeters, smoothPoint]);

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

  const toggleNearby = useCallback(() => setFilters(s => ({ ...s, nearby: !s.nearby })), []);
  const toggleOnline = useCallback(() => setFilters(s => ({ ...s, online: !s.online })), []);

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
          <View style={styles.chipsLeft}>
            <FilterChip label="Nearby" active={filters.nearby} onPress={toggleNearby} />
            <FilterChip label="Online" active={filters.online} onPress={toggleOnline} />
          </View>
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
});