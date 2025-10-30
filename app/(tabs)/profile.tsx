// app/(tabs)/profile.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Image,
    Keyboard,
    Modal,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Capitalize first letter of each word
const toTitleCase = (str: string | null | undefined): string => {
  if (!str) return "";
  return str
    .toString()
    .toLowerCase()
    .split(" ")
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : ""))
    .join(" ");
};

// Dynamic font size based on name length
const getNameFontSize = (nameLength: number): number => {
  if (nameLength <= 7) return scale(26);
  if (nameLength <= 12) return scale(24);
  if (nameLength <= 17) return scale(22);
  if (nameLength <= 20) return scale(20);
  return scale(22);
};

const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1B44CD";
const LIGHT_BLUE = "#A8C4FF";

const FRAMES_COLORS: [string, string] = ["#1B44CD", "#678CFF"];
const SAVE_COLORS: [string, string] = [BLUE, LIGHT_BLUE];
const CANCEL_COLORS: [string, string] = ["#EEF4FF", "#DCE8FF"];

// --- Helpers for signed URLs ---
const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");

  const signIdx = urlOrPath.indexOf("/object/sign/user_photos/");
  if (signIdx !== -1) {
    const rest = urlOrPath.substring(signIdx + "/object/sign/user_photos/".length);
    return decodeURIComponent(rest.split("?")[0]);
  }
  const pubIdx = urlOrPath.indexOf("/object/public/user_photos/");
  if (pubIdx !== -1) {
    const rest = urlOrPath.substring(pubIdx + "/object/public/user_photos/".length);
    return decodeURIComponent(rest);
  }
  const marker = "/user_photos/";
  const idx = urlOrPath.indexOf(marker);
  return idx === -1 ? null : decodeURIComponent(urlOrPath.substring(idx + marker.length));
};

const signPath = async (path: string | null, expiresSeconds = 3600): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, expiresSeconds);
  if (error) {
    console.warn("signPath error:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
};

const AVATAR_SIZE = scale(125);

/* --------------------------- Basics (Hinge-like) --------------------------- */

type BasicsProps = {
  gender: string;
  orientation: string;
  lookingFor: string[];
  onOpenEditor: () => void;
  loading?: boolean;
};

const Pill: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <View style={styles.vitalPill}>
      <Text style={styles.vitalText} numberOfLines={1} ellipsizeMode="middle">
        {children}
      </Text>
    </View>
  );
};

const BasicsCard: React.FC<BasicsProps> = ({ gender, orientation, lookingFor, onOpenEditor, loading }) => {
  // Order: Orientation → Gender → Looking for[…]
  const pills = useMemo(() => {
    const list: string[] = [];
    if (orientation) list.push(toTitleCase(orientation));
    if (gender) list.push(toTitleCase(gender));
    const lf = (lookingFor || []).map((s) => toTitleCase(s)).filter(Boolean);
    return [...list, ...lf];
  }, [gender, orientation, lookingFor]);

  const MAX_INLINE = 3;
  const visible = pills.slice(0, MAX_INLINE);
  const overflowCount = Math.max(0, pills.length - MAX_INLINE);

  if (loading) {
    // Shimmer skeleton: 3 fake pills
    return (
      <View style={styles.basicsCard}>
        {[0, 1, 2].map((i) => (
          <View key={i} style={[styles.vitalPill, { width: scale(70 + i * 12), backgroundColor: "#F1F6FF" }]} />
        ))}
      </View>
    );
  }

  if (pills.length === 0) {
    return (
      <Pressable onPress={onOpenEditor} style={styles.basicsCard} android_ripple={{ color: "#E7EEFF" }}>
        <Pill>+ Add basics</Pill>
      </Pressable>
    );
  }

  return (
    <Pressable onPress={onOpenEditor} style={styles.basicsCard} android_ripple={{ color: "#E7EEFF" }}>
      {visible.map((p, idx) => (
        <Pill key={`${p}-${idx}`}>{p}</Pill>
      ))}
      {overflowCount > 0 && <Pill>{`+${overflowCount} more`}</Pill>}
    </Pressable>
  );
};

/* --------------------------------- Screen --------------------------------- */

export default function ProfileTop() {
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState<string>("");
  const [age, setAge] = useState<number | null>(null);
  const [bio, setBio] = useState<string | null>(null);

  // orientation/gender/lookingFor
  const [orientation, setOrientation] = useState<string>("");
  const [gender, setGender] = useState<string>("");
  const [lookingFor, setLookingFor] = useState<string[]>([]);

  const [isEditingBio, setIsEditingBio] = useState(false);
  const [tempBio, setTempBio] = useState("");

  // Basics editor modal
  const [basicsOpen, setBasicsOpen] = useState(false);
  const [tmpGender, setTmpGender] = useState<string>("");
  const [tmpOrientation, setTmpOrientation] = useState<string>("");
  const [tmpLookingFor, setTmpLookingFor] = useState<string[]>([]);
  const [loadingBasics, setLoadingBasics] = useState<boolean>(true);

  const framesPulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(framesPulse, { toValue: 1.03, duration: 1200, useNativeDriver: true }),
        Animated.timing(framesPulse, { toValue: 1, duration: 1200, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [framesPulse]);

  const bioTap = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const cancelScale = useRef(new Animated.Value(1)).current;
  const pressIn = (v: Animated.Value) =>
    Animated.spring(v, { toValue: 0.97, useNativeDriver: true, friction: 6, tension: 150 }).start();
  const pressOut = (v: Animated.Value) =>
    Animated.spring(v, { toValue: 1, useNativeDriver: true, friction: 6, tension: 150 }).start();

  useEffect(() => {
    (async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        // profiles: name, age, bio, orientation, gender
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, age, bio, sexual_orientation, gender")
          .eq("id", userId)
          .single();

        if (profile) {
          setFullName(profile.full_name ?? "");
          setAge(profile.age ?? null);
          setBio(profile.bio ?? null);
          setOrientation(toTitleCase(profile.sexual_orientation));
          setGender(toTitleCase(profile.gender));
        }

        // user_photos: main
        const { data: row, error } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", userId)
          .eq("is_main", true)
          .maybeSingle();
        if (error) console.warn("photo fetch error:", error.message);

        if (row?.photo_url) {
          const path = toStoragePath(row.photo_url);
          const signed = await signPath(path);
          setPhotoUrl(signed ?? row.photo_url);
        }

        // user_modes: looking_for_date (enum[] or text[])
        const { data: mode } = await supabase
          .from("user_modes")
          .select("looking_for_date")
          .eq("user_id", userId)
          .maybeSingle();

        const lfRaw = (mode?.looking_for_date ?? []) as string[] | string;
        const lfArray = Array.isArray(lfRaw) ? lfRaw : lfRaw ? [lfRaw] : [];
        setLookingFor(lfArray.map((s) => toTitleCase(s)));
      } catch (e) {
        console.log("Error loading profile:", e);
      } finally {
        setLoadingBasics(false);
      }
    })();
  }, []);

  const goFrames = () => router.push("/in_progress");

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

  // Basics editor handlers
  const openBasics = () => {
    setTmpGender(gender || "");
    setTmpOrientation(orientation || "");
    setTmpLookingFor([...lookingFor]);
    setBasicsOpen(true);
  };

  const toggleTmpLF = (value: string) => {
    setTmpLookingFor((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const saveBasics = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      // persist to profiles
      await supabase
        .from("profiles")
        .update({
          gender: tmpGender,
          sexual_orientation: tmpOrientation,
        })
        .eq("id", userId);

      // persist to user_modes
      await supabase.from("user_modes").upsert(
        {
          user_id: userId,
          looking_for_date: tmpLookingFor,
        },
        { onConflict: "user_id" }
      );

      setGender(toTitleCase(tmpGender));
      setOrientation(toTitleCase(tmpOrientation));
      setLookingFor(tmpLookingFor.map((s) => toTitleCase(s)));
      setBasicsOpen(false);
    } catch (e) {
      console.warn("Error saving basics:", e);
    }
  }, [tmpGender, tmpOrientation, tmpLookingFor]);

  // Format name
  const displayName = fullName ? toTitleCase(fullName) : "—";
  const nameLength = displayName.length;
  const isLongName = nameLength > 20;
  const dynamicFontSize = getNameFontSize(nameLength);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* TOP BAR */}
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
            onPress={() => router.push("/in_progress")}
          >
            <Image
              source={require("../../assets/images/edit_pencil_icon.png")}
              style={styles.editIcon}
              resizeMode="contain"
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/in_progress")}
            activeOpacity={0.7}
            style={styles.settingsBtn}
          >
            <Image
              source={require("../../assets/images/settings_icon.png")}
              resizeMode="contain"
              style={styles.settingsIcon}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* PROFILE BLOCK */}
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
              <Text
                style={[styles.nameText, { fontSize: dynamicFontSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
              {age != null && (
                <Text style={[styles.ageTextStacked, { fontSize: dynamicFontSize }]}>{age}</Text>
              )}
            </>
          ) : (
            <View style={styles.nameLine}>
              <Text
                style={[styles.nameTextInline, { fontSize: dynamicFontSize }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {displayName}
              </Text>
              {age != null && (
                <Text style={[styles.ageText, { fontSize: dynamicFontSize }]}>{`, ${age}`}</Text>
              )}
            </View>
          )}

          <Animated.View style={[{ transform: [{ scale: framesPulse }] }, styles.framesButtonContainer]}>
            <TouchableOpacity activeOpacity={0.9} onPress={goFrames}>
              <LinearGradient colors={FRAMES_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.framesButton}>
                <Text style={styles.framesButtonText}>Frames</Text>
              </LinearGradient>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </View>

      {/* BIO BLOCK */}
      <View style={styles.bioBlock}>
        <LinearGradient
          colors={isEditingBio ? ["#E4EBFF", "#D4E2FF"] : ["#EEF7FF", "#E3EEFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bioCard, isEditingBio && { borderColor: BLUE, shadowColor: BLUE, shadowOpacity: 0.22 }]}
        >
          {isEditingBio ? (
            <View>
              <Text style={styles.bioLabel}>Bio</Text>
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
                <Animated.View style={{ flex: 1, transform: [{ scale: cancelScale }] }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={() => pressIn(cancelScale)}
                    onPressOut={() => pressOut(cancelScale)}
                    onPress={() => {
                      setIsEditingBio(false);
                      Keyboard.dismiss();
                    }}
                  >
                    <LinearGradient colors={CANCEL_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.smallPill}>
                      <Text style={[styles.pillText, { color: BLUE }]}>Cancel</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>

                <Animated.View style={{ flex: 1, transform: [{ scale: saveScale }] }}>
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPressIn={() => pressIn(saveScale)}
                    onPressOut={() => pressOut(saveScale)}
                    onPress={saveBio}
                  >
                    <LinearGradient colors={SAVE_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.smallPill}>
                      <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Save</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          ) : (
            <Animated.View style={{ transform: [{ scale: bioTap }] }}>
              <TouchableOpacity
                activeOpacity={0.9}
                onPressIn={() => pressIn(bioTap)}
                onPressOut={() => pressOut(bioTap)}
                onPress={() => {
                  setTempBio(bio || "");
                  setIsEditingBio(true);
                }}
              >
                <Text style={styles.bioLabel}>Bio</Text>
                <Text style={bio ? styles.bioText : styles.bioPlaceholder}>{bio || "+ Add bio"}</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </LinearGradient>
      </View>

      {/* BASICS (Hinge-like) */}
      <View style={styles.basicsWrapper}>
        <BasicsCard
          gender={gender}
          orientation={orientation}
          lookingFor={lookingFor}
          onOpenEditor={openBasics}
          loading={loadingBasics}
        />
      </View>

      {/* BASICS EDITOR (Bottom Sheet Modal) */}
      <Modal transparent animationType="slide" visible={basicsOpen} onRequestClose={() => setBasicsOpen(false)}>
        <View style={styles.sheetBackdrop}>
          <Pressable style={{ flex: 1 }} onPress={() => setBasicsOpen(false)} />
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Edit basics</Text>

            {/* Orientation */}
            <Text style={styles.sheetLabel}>Orientation</Text>
            <View style={styles.sheetRow}>
              {["Straight", "Gay", "Lesbian", "Bisexual", "Asexual", "Queer", "Pansexual"].map((o) => {
                const active = tmpOrientation.toLowerCase() === o.toLowerCase();
                return (
                  <TouchableOpacity key={o} onPress={() => setTmpOrientation(o)} activeOpacity={0.8}>
                    <View style={[styles.choicePill, active && styles.choicePillActive]}>
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{o}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Gender */}
            <Text style={[styles.sheetLabel, { marginTop: verticalScale(10) }]}>Gender</Text>
            <View style={styles.sheetRow}>
              {["Woman", "Man", "Non-binary", "Other"].map((g) => {
                const active = tmpGender.toLowerCase() === g.toLowerCase();
                return (
                  <TouchableOpacity key={g} onPress={() => setTmpGender(g)} activeOpacity={0.8}>
                    <View style={[styles.choicePill, active && styles.choicePillActive]}>
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{g}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Looking for (multi) */}
            <Text style={[styles.sheetLabel, { marginTop: verticalScale(10) }]}>Looking for</Text>
            <View style={styles.sheetRow}>
              {["Date", "Relationship", "Friends", "Chat", "Activity Partner"].map((v) => {
                const active = tmpLookingFor.map((s) => s.toLowerCase()).includes(v.toLowerCase());
                return (
                  <TouchableOpacity key={v} onPress={() => toggleTmpLF(v)} activeOpacity={0.8}>
                    <View style={[styles.choicePill, active && styles.choicePillActive]}>
                      <Text style={[styles.choiceText, active && styles.choiceTextActive]}>{v}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Actions */}
            <View style={[styles.bioActions, { marginTop: verticalScale(16) }]}>
              <TouchableOpacity activeOpacity={0.9} onPress={() => setBasicsOpen(false)}>
                <LinearGradient colors={CANCEL_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.smallPill, { paddingVertical: verticalScale(7) }]}>
                  <Text style={[styles.pillText, { color: BLUE }]}>Cancel</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity activeOpacity={0.9} onPress={saveBasics}>
                <LinearGradient colors={SAVE_COLORS} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.smallPill, { paddingVertical: verticalScale(7) }]}>
                  <Text style={[styles.pillText, { color: "#FFFFFF" }]}>Save</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------------------------------- Styles --------------------------------- */

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(22),
    paddingTop: verticalScale(6),
  },
  logo: { width: scale(120), height: verticalScale(42) },
  topRight: { flexDirection: "row", alignItems: "center", gap: scale(12) },
  editButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  editIcon: { width: scale(18), height: scale(18), tintColor: "#FFFFFF" },
  settingsBtn: { padding: scale(8) },
  settingsIcon: { width: scale(22), height: scale(22) },

  profileBlock: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: verticalScale(24),
    paddingHorizontal: scale(22),
  },
  avatarOuterRing: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    borderWidth: scale(2),
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(14),
  },
  avatarInnerRing: {
    width: AVATAR_SIZE - scale(10),
    height: AVATAR_SIZE - scale(10),
    borderRadius: (AVATAR_SIZE - scale(10)) / 2,
    borderWidth: scale(1.5),
    borderColor: INK,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
  },
  avatar: {
    width: AVATAR_SIZE - scale(18),
    height: AVATAR_SIZE - scale(18),
    borderRadius: (AVATAR_SIZE - scale(18)) / 2,
  },
  avatarPlaceholder: { backgroundColor: "#D7E2F2", alignItems: "center", justifyContent: "center" },
  placeholderText: { color: INK, fontSize: scale(13), fontFamily: Fonts.primary, fontWeight: "600" },

  nameBlock: { flex: 1, justifyContent: "center" },
  nameLine: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap" },
  nameText: { color: INK, fontFamily: Fonts.bold, letterSpacing: 0.3 },
  nameTextInline: { color: INK, fontFamily: Fonts.bold, letterSpacing: 0.3, flexShrink: 1 },
  ageText: { color: BLUE, fontFamily: Fonts.bold, letterSpacing: 0.3, flexShrink: 0 },
  ageTextStacked: { color: BLUE, fontFamily: Fonts.bold, letterSpacing: 0.3, marginTop: verticalScale(-2) },
  framesButtonContainer: { marginTop: verticalScale(2) },
  framesButton: {
    borderRadius: scale(30),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(22),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  framesButtonText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: "#FFFFFF",
    textAlign: "center",
    letterSpacing: 0.5,
  },

  bioBlock: { marginTop: verticalScale(22), paddingHorizontal: scale(22) },
  bioCard: {
    borderRadius: scale(20),
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(20),
    borderWidth: 1,
    borderColor: "#C7D6F5",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 5,
    elevation: 3,
  },
  bioLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#63779C",
    letterSpacing: 0.4,
    marginBottom: verticalScale(6),
  },
  bioText: {
    fontFamily: Fonts.primary,
    fontSize: scale(15.5),
    color: INK,
    lineHeight: verticalScale(22),
    fontWeight: "400",
  },
  bioPlaceholder: {
    fontFamily: Fonts.primary,
    fontSize: scale(15.5),
    color: "#678CFF",
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  bioInput: {
    fontFamily: Fonts.primary,
    fontSize: scale(15.5),
    color: INK,
    minHeight: verticalScale(90),
    textAlignVertical: "top",
    lineHeight: verticalScale(22),
    borderRadius: scale(12),
    paddingVertical: verticalScale(4),
  },
  charCount: {
    alignSelf: "flex-end",
    fontSize: scale(12),
    color: "#9BA9B9",
    marginTop: verticalScale(4),
    fontFamily: Fonts.primary,
  },
  bioActions: { flexDirection: "row", gap: scale(10), marginTop: verticalScale(14), justifyContent: "flex-end" },
  smallPill: {
    borderRadius: scale(28),
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(16),
    shadowColor: "#1B44CD",
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
    alignItems: "center",
  },
  pillText: { fontFamily: Fonts.bold, fontSize: moderateScale(16), letterSpacing: 0.4 },

  /* --------- BASICS card --------- */
  basicsWrapper: { marginTop: verticalScale(14), paddingHorizontal: scale(22) },
  basicsCard: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(14),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderWidth: 1,
    borderColor: "#DCE8FF",
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },

  // Pill
  vitalPill: {
    maxWidth: SCREEN_WIDTH * 0.38,
    backgroundColor: "#F7FAFF",
    borderRadius: scale(18),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderWidth: 1,
    borderColor: "#DCE8FF",
    shadowColor: "#A8C4FF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 1,
  },
  vitalText: {
    fontFamily: Fonts.primary,
    fontSize: moderateScale(13.5),
    color: INK,
    fontWeight: "500",
  },

  /* --------- Bottom Sheet --------- */
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: scale(18),
    borderTopRightRadius: scale(18),
    paddingHorizontal: scale(18),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(16),
  },
  sheetHandle: {
    alignSelf: "center",
    width: scale(44),
    height: verticalScale(5),
    borderRadius: scale(3),
    backgroundColor: "#E4E9F5",
    marginBottom: verticalScale(8),
  },
  sheetTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK,
    marginBottom: verticalScale(6),
  },
  sheetLabel: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13.5),
    color: "#63779C",
    marginBottom: verticalScale(6),
  },
  sheetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  choicePill: {
    borderRadius: scale(18),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderWidth: 1,
    borderColor: "#DCE8FF",
    backgroundColor: "#F7FAFF",
  },
  choicePillActive: {
    backgroundColor: "#E8F0FF",
    borderColor: BLUE,
  },
  choiceText: {
    fontFamily: Fonts.primary,
    fontSize: moderateScale(13.5),
    color: INK,
    fontWeight: "500",
  },
  choiceTextActive: {
    color: BLUE,
    fontFamily: Fonts.bold,
  },
});
