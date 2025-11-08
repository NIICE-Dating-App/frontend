import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { BlurView } from "expo-blur";
import * as Font from "expo-font";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { forwardRef, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  Easing,
  Image,
  Keyboard,
  Platform,
  Pressable,
  Animated as RNAnimated,
  StyleSheet, Text,
  TextInput,
  View,
} from "react-native";
import MapView, { Camera, Circle, Marker, PROVIDER_GOOGLE } from "react-native-maps";
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
  const [radiusMeters, setRadiusMeters] = useState<number | null>(null);

  const lastRawPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const smoothPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastCameraAtRef = useRef<number>(0);
  const lastSetPosRef = useRef<{ lat: number; lng: number } | null>(null);

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
          router.push("(tabs)/(up_tab)/event");
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

        // Fetch user radius from profiles table
        const { data: profile } = await supabase
          .from("profiles")
          .select("distance_meters")
          .eq("id", userId)
          .single();

        if (profile?.distance_meters) {
          setRadiusMeters(profile.distance_meters);
        }
      } catch {
        setUserProfilePhoto(null);
      }
    })();
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
          const fallback = { lat: FALLBACK.lat, lng: FALLBACK.lng, acc: 100 };
          setPos(fallback);
          smoothPosRef.current = { lat: fallback.lat, lng: fallback.lng };
          return;
        }

        const initial = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
        const init = { lat: initial.coords.latitude, lng: initial.coords.longitude, acc: initial.coords.accuracy ?? 30 };
        setPos(init);
        lastSetPosRef.current = { lat: init.lat, lng: init.lng };
        lastRawPosRef.current = { lat: init.lat, lng: init.lng };
        smoothPosRef.current = { lat: init.lat, lng: init.lng };

        setTimeout(() => {
          mapRef.current?.animateCamera(
            { center: { latitude: init.lat, longitude: init.lng }, zoom: 16, pitch: 0, heading: 0 },
            { duration: 400 }
          );
          lastCameraAtRef.current = Date.now();
        }, 0);

        subPos = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 1200, distanceInterval: 5 },
          (loc) => {
            const { latitude, longitude } = loc.coords;
            const locAcc: number | undefined = loc.coords.accuracy ?? undefined;
            const raw = { lat: latitude, lng: longitude };

            const prevRaw = lastRawPosRef.current;
            if (prevRaw) {
              const jump = haversineMeters(prevRaw, raw);
              if ((locAcc ?? 999) > 80 && jump > 80) return;
            }
            lastRawPosRef.current = raw;

            const prevSmooth = smoothPosRef.current ?? raw;
            const smoothed = smoothPoint(prevSmooth, raw, locAcc);
            smoothPosRef.current = smoothed;

            const lastSet = lastSetPosRef.current ?? smoothed;
            const movedSinceSet = haversineMeters(lastSet, smoothed);

            if (movedSinceSet >= 3) {
              setPos({ lat: smoothed.lat, lng: smoothed.lng, acc: locAcc ?? 25 });
              lastSetPosRef.current = { lat: smoothed.lat, lng: smoothed.lng };
            }

            const now = Date.now();
            const lastCam = lastCameraAtRef.current;
            const distFromCam = mapRef.current && prevSmooth ? haversineMeters(prevSmooth, smoothed) : 999;

            if (isFollowing && distFromCam > 10 && now - lastCam >= 800) {
              mapRef.current?.animateCamera(
                { center: { latitude: smoothed.lat, longitude: smoothed.lng }, pitch: 0, heading: 0 },
                { duration: 300 }
              );
              lastCameraAtRef.current = now;
            }
          }
        );

        subHeading = await Location.watchHeadingAsync((h) => {
          const deg = Number.isFinite(h?.trueHeading) && h.trueHeading >= 0 ? h.trueHeading : h.magHeading ?? 0;
          setHeadingDeg(deg);
        });
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
        {pos && radiusMeters && (
          <Circle
            center={{ latitude: pos.lat, longitude: pos.lng }}
            radius={radiusMeters}
            fillColor="rgba(27,68,205,0.12)"
            strokeColor="rgba(27,68,205,0.35)"
            strokeWidth={2}
          />
        )}
        
        {pos && (
          <Marker
            key={userProfilePhoto || "placeholder"} tracksViewChanges={true}
            coordinate={{ latitude: pos.lat, longitude: pos.lng }} anchor={{ x: 0.5, y: 0.5 }} stopPropagation
          >
            <ProfileMarker photoUrl={userProfilePhoto} headingDeg={headingDeg} />
          </Marker>
        )}
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
});