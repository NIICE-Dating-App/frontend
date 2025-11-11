// app/(tabs)/edit_profile/index.tsx
// Requires: expo-image-picker, @expo/vector-icons
import { FontAwesome5, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
  Animated as RNAnimated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

/* ===================== THEME ===================== */
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BG = "#FAFBFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";

const GRADIENTS = {
  primary: [BLUE, "#2E54E8"],
  card: ["#FFFFFF", "#F8FAFF"],
  accent: ["#EEF4FF", "#DCE8FF"],
} as const;

/* photo sizes */
const EXTRA_GAP = scale(12);
const H_PAD = scale(20);
const EXTRA_SLOT_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - EXTRA_GAP * 2) / 3;

/* ===================== HELPERS ===================== */
const toTitleCase = (s?: string | null) =>
  s?.toLowerCase().split(" ").map(w => (w[0] ? w[0].toUpperCase() + w.slice(1) : w)).join(" ") || "";

const humanize = (s?: string | null) => toTitleCase((s ?? "").replace(/_/g, " "));

const uniq = <T,>(arr: T[] = []) => Array.from(new Set(arr.filter(Boolean))) as T[];

const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http") && !urlOrPath.startsWith("blob:")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
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

const parseList = (raw: any): string[] => {
  const list =
    Array.isArray(raw)
      ? raw.map((s) => humanize(String(s)))
      : typeof raw === "string"
      ? raw.split(/[,/&]| and /i).map((s) => humanize(s.trim()))
      : [];
  return uniq(list);
};

const summarizeList = (arr: string[], max = 2) =>
  !arr?.length ? "Add items" : arr.length <= max ? arr.join(" · ") : `${arr.slice(0, max).join(" · ")} +${arr.length - max}`;

// Remove any leading emoji/symbol so values start from plain text
const textOnly = (s?: string | null): string => {
  let v = humanize(s ?? "");
  if (!v) return "";
  if (/[A-Za-z0-9]/.test(v[0])) return v; // already starts with text/number
  const c0 = v.charCodeAt(0);
  v = c0 >= 0xd800 && c0 <= 0xdbff ? v.slice(2) : v.slice(1); // drop leading grapheme
  return v.trimStart();
};

/* ===================== TYPES ===================== */
type PhotoRow = { id: string; photo_url: string | null; is_main: boolean | null; created_at?: string | null };
type Slot = { id?: string; signedUrl?: string; storagePath?: string; rawUrl?: string; key?: string };
type PromptAnswer = { title: string; answer: string };
type SlotsState = { main: Slot; extra: [Slot, Slot, Slot] };

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

type ModesRow = { looking_for_date?: string[] | string | null; value_date?: string[] | string | null };
type HobbyRow = { hobbies_master?: { label?: string | null } | null };

/* ===================== UI PRIMITIVES ===================== */
const SectionCard: React.FC<{ title: string; icon?: React.ReactNode; children: React.ReactNode; action?: () => void }> = ({
  title,
  icon,
  children,
  action,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    if (action) {
      RNAnimated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, friction: 8, tension: 150 }).start();
    }
  };

  const handlePressOut = () => {
    if (action) {
      RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5, tension: 100 }).start();
    }
  };

  return (
    <View style={styles.sectionCard}>
      <LinearGradient colors={GRADIENTS.card} style={StyleSheet.absoluteFillObject} />
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          {icon && <View style={styles.sectionIcon}>{icon}</View>}
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <TouchableOpacity onPress={action} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={0.8}>
            <RNAnimated.View style={[styles.editButtonSmall, { transform: [{ scale: scaleAnim }] }]}>
              <Ionicons name="chevron-forward" size={18} color={BLUE} />
            </RNAnimated.View>
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
};

const InfoRow: React.FC<{ label: string; value: string; onPress?: () => void; showArrow?: boolean }> = ({
  label,
  value,
  onPress,
  showArrow = false,
}) => {
  const scaleAnim = useRef(new RNAnimated.Value(1)).current;

  const handlePressIn = () => {
    if (onPress) {
      RNAnimated.timing(scaleAnim, { toValue: 0.98, duration: 100, useNativeDriver: true }).start();
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      RNAnimated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, friction: 5 }).start();
    }
  };

  const content = (
    <RNAnimated.View style={[styles.infoRow, { transform: [{ scale: scaleAnim }] }]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <View style={styles.infoRight}>
        <Text style={[styles.infoValue, !value.includes("Add") && styles.infoValueSet]}>{value}</Text>
        {showArrow && <Ionicons name="chevron-forward" size={18} color="rgba(10,14,26,0.3)" style={{ marginLeft: scale(8) }} />}
      </View>
    </RNAnimated.View>
  );

  return onPress ? (
    <TouchableOpacity onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut} activeOpacity={1}>
      {content}
    </TouchableOpacity>
  ) : content;
};

const TagChip: React.FC<{ label: string }> = ({ label }) => (
  <View style={styles.tagChip}>
    <Text style={styles.tagText}>{label}</Text>
  </View>
);

const PromptCard: React.FC<{ prompt: PromptAnswer; index: number }> = ({ prompt, index }) => {
  const fade = useRef(new RNAnimated.Value(0)).current;
  useEffect(() => {
    RNAnimated.timing(fade, { toValue: 1, duration: 400, delay: index * 100, useNativeDriver: true }).start();
  }, []);
  return (
    <RNAnimated.View style={[styles.promptCard, { opacity: fade }]}>
      <LinearGradient colors={["#F0F5FF", "#E8F0FF"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.promptContent}>
        <Text style={styles.promptTitle}>{prompt.title}</Text>
        <Text style={styles.promptAnswer}>{prompt.answer}</Text>
      </View>
    </RNAnimated.View>
  );
};

const FloatingHeader: React.FC<{ title?: string; fullName: string }> = ({ title, fullName }) => {
  const insets = useSafeAreaInsets();
  const TOOLBAR_HEIGHT = verticalScale(56);
  const headerHeight = insets.top + TOOLBAR_HEIGHT;
  return (
    <View style={[styles.floatingHeader, { height: headerHeight, paddingTop: insets.top }]}>
      <BlurView intensity={98} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient colors={["rgba(255,255,255,0.98)", "rgba(250,251,255,0.95)"]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.chevronWrapper}>
            <View style={[styles.chevronLine, styles.chevronLineTop]} />
            <View style={[styles.chevronLine, styles.chevronLineBottom]} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{fullName || title || "Profile"}</Text>
          <Text style={styles.headerSubtitle}>Edit Mode</Text>
        </View>
        <TouchableOpacity onPress={() => router.back()} style={styles.saveButton}>
          <LinearGradient colors={GRADIENTS.primary} style={styles.saveGradient}>
            <Text style={styles.saveText}>Save</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const MainPhotoSlot: React.FC<{
  slot: Slot;
  onPress: () => void;
  onLongPress?: () => void;
  isUploading?: boolean;
}> = ({ slot, onPress, onLongPress, isUploading = false }) => {
  const scaleIn = useRef(new RNAnimated.Value(0)).current;
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  const overlayOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(scaleIn, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true }).start();
  }, []);

  const handlePressIn = () => {
    RNAnimated.parallel([
      RNAnimated.timing(pressScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      RNAnimated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const handlePressOut = () => {
    RNAnimated.parallel([
      RNAnimated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      RNAnimated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
  };

  const AVATAR_SIZE = scale(180);

  if (!slot.signedUrl) {
    return (
      <View style={styles.mainPhotoWrapperContainer}>
        <RNAnimated.View style={[styles.mainPhotoEmpty, { transform: [{ scale: scaleIn }], width: AVATAR_SIZE, height: AVATAR_SIZE }]}>
          <TouchableOpacity onPress={onPress} style={styles.mainEmptyContent} activeOpacity={0.8}>
            <LinearGradient colors={["rgba(27,68,205,0.03)", "rgba(168,196,255,0.05)"]} style={StyleSheet.absoluteFillObject} />
            <View style={styles.uploadIconMain}>
              <Ionicons name="add" size={28} color="#FFFFFF" />
            </View>
            <Text style={styles.uploadLabelMain}>Main Photo</Text>
            <Text style={styles.uploadHintMain}>Tap to add</Text>
          </TouchableOpacity>
        </RNAnimated.View>
      </View>
    );
  }

  return (
    <View style={styles.mainPhotoWrapperContainer}>
      <RNAnimated.View style={[styles.mainPhotoFilled, { transform: [{ scale: RNAnimated.multiply(scaleIn, pressScale) }], width: AVATAR_SIZE, height: AVATAR_SIZE }]}>
        <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.mainPhotoContent}>
          <Image source={{ uri: slot.signedUrl }} style={styles.mainPhotoImage} resizeMode="cover" />
          <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.photoOverlay} />
          <RNAnimated.View style={[styles.photoLongPressOverlay, { opacity: overlayOpacity }]}>
            <LinearGradient colors={["rgba(27,68,205,0.5)", "rgba(27,68,205,0.3)"]} style={StyleSheet.absoluteFillObject} />
          </RNAnimated.View>
          {isUploading && (
            <View style={styles.uploadingOverlay}>
              <ActivityIndicator color="#FFFFFF" size="large" />
            </View>
          )}
        </Pressable>
      </RNAnimated.View>

      {/* MAIN badge top-left */}
      <View style={styles.mainBadgeOutside}>
        <Text style={styles.mainBadgeText}>MAIN</Text>
      </View>

      {/* Edit button bottom-right */}
      <TouchableOpacity onPress={onPress} style={styles.mainEditBtn} activeOpacity={0.85}>
        <LinearGradient colors={[BLUE, "#2E54E8"]} style={styles.editBtnGradient}>
          <Ionicons name="pencil" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const PhotoSlot: React.FC<{
  slot: Slot;
  isMain?: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  index?: number;
  isUploading?: boolean;
  width?: number;
}> = ({ slot, isMain = false, label, onPress, onLongPress, index = 0, isUploading = false, width = EXTRA_SLOT_WIDTH }) => {
  const scaleIn = useRef(new RNAnimated.Value(0)).current;
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  const overlayOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(scaleIn, { toValue: 1, tension: 100, friction: 8, useNativeDriver: true, delay: index * 50 }).start();
  }, []);

  const handlePressIn = () => {
    RNAnimated.parallel([
      RNAnimated.timing(pressScale, { toValue: 0.95, duration: 150, useNativeDriver: true }),
      RNAnimated.timing(overlayOpacity, { toValue: 1, duration: 150, useNativeDriver: true })
    ]).start();
  };

  const handlePressOut = () => {
    RNAnimated.parallel([
      RNAnimated.spring(pressScale, { toValue: 1, friction: 5, tension: 100, useNativeDriver: true }),
      RNAnimated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true })
    ]).start();
  };

  if (!slot.signedUrl) {
    return (
      <RNAnimated.View style={[styles.photoEmpty, { transform: [{ scale: scaleIn }], width }]}>
        <TouchableOpacity onPress={onPress} style={styles.emptyContent} activeOpacity={0.85}>
          <LinearGradient colors={["rgba(27,68,205,0.03)", "rgba(168,196,255,0.05)"]} style={StyleSheet.absoluteFillObject} />
          <View style={styles.uploadIcon}>
            <Ionicons name="add" size={22} color="#FFFFFF" />
          </View>
          <Text style={styles.uploadLabel}>{label}</Text>
          <Text style={styles.uploadHint}>Tap to add</Text>
        </TouchableOpacity>
      </RNAnimated.View>
    );
  }

  return (
    <RNAnimated.View style={[styles.photoFilled, { transform: [{ scale: RNAnimated.multiply(scaleIn, pressScale) }], width }]}>
      <Pressable onPress={onPress} onLongPress={onLongPress} onPressIn={handlePressIn} onPressOut={handlePressOut} style={styles.photoContent}>
        <Image source={{ uri: slot.signedUrl }} style={styles.photoImage} resizeMode="cover" />
        <LinearGradient colors={["transparent", "rgba(0,0,0,0.3)"]} style={styles.photoOverlay} />
        <RNAnimated.View style={[styles.photoLongPressOverlay, { opacity: overlayOpacity }]}>
          <LinearGradient colors={["rgba(27,68,205,0.4)", "rgba(27,68,205,0.2)"]} style={StyleSheet.absoluteFillObject} />
        </RNAnimated.View>
        <View style={styles.photoActions}>
          <View style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </View>
        </View>
        {isUploading && (
          <View style={styles.uploadingOverlay}>
            <ActivityIndicator color="#FFFFFF" size="large" />
          </View>
        )}
      </Pressable>
    </RNAnimated.View>
  );
};

/* ---- Height Picker with Fixed Scrolling ---- */
const HeightPickerModal: React.FC<{
  visible: boolean;
  onClose: () => void;
  onSave: (h: number) => void;
  initialHeight?: number | null;
}> = ({ visible, onClose, onSave, initialHeight = 170 }) => {
  const [selected, setSelected] = useState<number>((initialHeight ?? 170) || 170);
  const scrollRef = useRef<ScrollView>(null);
  const heights = useMemo(() => Array.from({ length: 101 }, (_, i) => 140 + i), []);
  const itemHeight = verticalScale(50);

  useEffect(() => {
    if (!visible) return;
    const idx = selected - 140;
    const y = idx * itemHeight;
    setTimeout(() => scrollRef.current?.scrollTo({ y, animated: false }), 100);
  }, [visible, selected, itemHeight]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable style={styles.modalContent} onPress={(e) => e.stopPropagation()}>
          <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFillObject} />
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Height</Text>
          <View style={styles.pickerContainer}>
            <View style={[styles.pickerHighlight, { height: itemHeight }]} />
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={itemHeight}
              decelerationRate="fast"
              onMomentumScrollEnd={(e) => {
                const y = e.nativeEvent.contentOffset.y;
                const i = Math.round(y / itemHeight);
                setSelected(heights[i] || 170);
              }}
              contentContainerStyle={{ paddingVertical: verticalScale(100) }}
            >
              {heights.map((h) => (
                <Pressable
                  key={h}
                  onPress={() => {
                    setSelected(h);
                    scrollRef.current?.scrollTo({ y: (h - 140) * itemHeight, animated: true });
                  }}
                  style={[styles.pickerItem, { height: itemHeight }]}
                >
                  <Text style={[styles.pickerText, selected === h && styles.pickerTextActive]}>{h} cm</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onSave(selected)} style={styles.modalSave}>
              <LinearGradient colors={GRADIENTS.primary} style={styles.modalSaveGradient}>
                <Text style={styles.modalSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

/* ---- Photo Action Sheet ---- */
const PhotoActionsSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  canSetMain: boolean;
  onChange: () => void;
  onSetMain?: () => void;
  onRemove?: () => void;
}> = ({ visible, onClose, canSetMain, onChange, onSetMain, onRemove }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Photo Options</Text>

        {canSetMain && (
          <TouchableOpacity style={styles.sheetOption} onPress={() => { onClose(); onSetMain?.(); }}>
            <View style={styles.sheetOptionIcon}>
              <Ionicons name="star-outline" size={20} color={BLUE} />
            </View>
            <Text style={styles.sheetOptionText}>Set as Main Photo</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.sheetOption} onPress={() => { onClose(); onChange(); }}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="swap-horizontal-outline" size={20} color={BLUE} />
          </View>
          <Text style={styles.sheetOptionText}>Change Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetOption} onPress={() => { onClose(); onRemove?.(); }}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="trash-outline" size={20} color="#D5222B" />
          </View>
          <Text style={[styles.sheetOptionText, { color: "#D5222B" }]}>Remove Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetCancelOption} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ---- Image Source Sheet (Library or Camera) ---- */
const ImageSourceSheet: React.FC<{
  visible: boolean;
  onClose: () => void;
  onPickLibrary: () => void;
  onPickCamera: () => void;
}> = ({ visible, onClose, onPickLibrary, onPickCamera }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable style={styles.sheetContent} onPress={(e) => e.stopPropagation()}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Add Photo</Text>

        <TouchableOpacity style={styles.sheetOption} onPress={() => { onClose(); onPickLibrary(); }}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="images-outline" size={20} color={BLUE} />
          </View>
          <Text style={styles.sheetOptionText}>Choose from Library</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetOption} onPress={() => { onClose(); onPickCamera(); }}>
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="camera-outline" size={20} color={BLUE} />
          </View>
          <Text style={styles.sheetOptionText}>Camera Roll</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.sheetCancelOption} onPress={onClose}>
          <Text style={styles.sheetCancelText}>Cancel</Text>
        </TouchableOpacity>
      </Pressable>
    </Pressable>
  </Modal>
);

/* ===================== MAIN SCREEN ===================== */
export default function EditProfileScreen() {
  const insets = useSafeAreaInsets();
  const TOOLBAR_HEIGHT = verticalScale(56);
  const headerHeight = insets.top + TOOLBAR_HEIGHT;

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
  }>({ drinking: null, smoking: null, workout: null, religion: null, politics: null, kids: null, zodiac: null, communication: null, love_language: null, pets: null });

  const [slots, setSlots] = useState<SlotsState>({ main: {}, extra: [{}, {}, {}] as [Slot, Slot, Slot] });
  const [uploadingSlot, setUploadingSlot] = useState<{ kind: "main" | "extra"; index?: number } | null>(null);

  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [sheetVisible, setSheetVisible] = useState(false);
  const [sheetKind, setSheetKind] = useState<"main" | "extra">("main");
  const [sheetIndex, setSheetIndex] = useState(0);

  // source picker state
  const [sourceVisible, setSourceVisible] = useState(false);
  const [sourceKind, setSourceKind] = useState<"main" | "extra">("main");
  const [sourceIndex, setSourceIndex] = useState(0);

  // keep a copy of current extra rows order by created_at for persistence-by-swap
  const extrasRowIdsRef = useRef<string[]>([]);

  useEffect(() => {
    (async () => {
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
          supabase.from("lifestyle").select("drinking, smoking, workout, religion, politics, kids, communities, zodiac, communication, love_language, pets").eq("user_id", userId).maybeSingle(),
          supabase.from("user_modes").select("looking_for_date, value_date").eq("user_id", userId).maybeSingle(),
          supabase.from("user_hobbies").select("hobbies_master(label)").eq("user_id", userId),
        ]);

        const p = (profRes?.data ?? {}) as ProfileRow;
        setFullName(toTitleCase((p.full_name ?? "").trim()));
        setHeightCm(p.height_cm ?? null);
        setSexualOrientation(p.sexual_orientation ?? null);
        setEducation(p.education ?? null);
        setInstitution(p.institution ?? null);
        setInterestedIn(parseList(p.interested_in));

        const promptAnswers: PromptAnswer[] = Array.isArray(p.prompt_answers)
          ? p.prompt_answers
              .filter((x: any) => x?.answer && x?.title)
              .map((x: any) => ({ title: String(x.title), answer: String(x.answer) }))
              .slice(0, 3)
          : [];
        setPrompts(promptAnswers);

        const l = (lifeRes?.data ?? {}) as LifestyleRow;
        setLifestyle({
          drinking: l.drinking ?? null,
          smoking: l.smoking ?? null,
          workout: l.workout ?? null,
          religion: l.religion ?? null,
          politics: l.politics ?? null,
          kids: l.kids ?? null,
          zodiac: l.zodiac ?? null,
          communication: l.communication ?? null,
          love_language: l.love_language ?? null,
          pets: l.pets ?? null,
        });
        setCommunities(uniq((Array.isArray(l.communities) ? l.communities : []).map(humanize)));

        const m = (modesRes?.data ?? {}) as ModesRow;
        setLookingFor(parseList(m.looking_for_date));
        setPartnerValues(parseList(m.value_date));

        const hs = uniq(((hobbiesRes?.data as HobbyRow[] | null) ?? []).map((x) => x?.hobbies_master?.label).filter(Boolean) as string[]);
        setHobbies(hs.map(humanize));

        await reloadPhotos(userId);
      } catch (e) {
        console.log("Edit screen load error:", e);
      }
    })();
  }, []);

  const reloadPhotos = async (userId: string) => {
    try {
      const [mainRes, othersRes] = await Promise.all([
        supabase.from("user_photos").select("id, photo_url, is_main").eq("user_id", userId).eq("is_main", true).maybeSingle(),
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
          extras[i] = { id: r.id }; // empty row placeholder
        }
      }

      setSlots({ main: mainSlot, extra: extras });
    } catch (e) {
      console.log("reloadPhotos error:", e);
    }
  };

  /* ====== pickers (Library / Camera) ====== */
  const chooseFromLibrary = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow access to your photo library to upload photos.");
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        (ImagePicker as any).MediaType?.IMAGES ??
        (ImagePicker as any).MediaType?.Images ??
        (ImagePicker as any).MediaTypeOptions?.Images ??
        (["images"] as any),
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    return !result.canceled && result.assets?.[0] ? result.assets[0].uri : null;
  };

  const takePhotoWithCamera = async (): Promise<string | null> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow camera access to take a photo.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 5],
      quality: 0.8,
    });
    return !result.canceled && result.assets?.[0] ? result.assets[0].uri : null;
  };

  /* ====== Upload logic (reused by both sources) ====== */
  const uploadToSupabase = async (userId: string, localUri: string) => {
    try {
      const res = await fetch(localUri);
      const arrayBuffer = await res.arrayBuffer();
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
      const { error } = await supabase.storage.from("user_photos").upload(fileName, arrayBuffer, {
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
          await supabase.from("user_photos").update({ photo_url: uploaded.storagePath, is_main: true }).eq("id", slots.main.id);
        } else {
          await supabase.from("user_photos").insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: true });
        }
      } else {
        const i = index ?? 0;
        const target = slots.extra[i];
        if (target.id) {
          await supabase.from("user_photos").update({ photo_url: uploaded.storagePath, is_main: false }).eq("id", target.id);
        } else {
          await supabase.from("user_photos").insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: false });
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

  /* ====== UI sheet orchestration ====== */
  const openSheet = (k: "main" | "extra", i = 0) => {
    setSheetKind(k);
    setSheetIndex(i);
    setSheetVisible(true);
  };
  const closeSheet = () => setSheetVisible(false);

  const openSourceSheet = (k: "main" | "extra", i = 0) => {
    setSourceKind(k);
    setSourceIndex(i);
    setSourceVisible(true);
  };
  const closeSourceSheet = () => setSourceVisible(false);

  const onChangeFromSheet = () => openSourceSheet(sheetKind, sheetIndex);
  const onRemoveFromSheet = () => (sheetKind === "main" ? removeSlot("main") : removeSlot("extra", sheetIndex));
  const onSetMainFromSheet = () => sheetKind === "extra" && setAsMainFromExtra(sheetIndex);

  const onPickLibrary = async () => {
    const uri = await chooseFromLibrary();
    if (uri) await uploadUriToSlot(sourceKind, sourceIndex, uri);
  };

  const onPickCamera = async () => {
    const uri = await takePhotoWithCamera();
    if (uri) await uploadUriToSlot(sourceKind, sourceIndex, uri);
  };

  /* ====== Remaining CRUD helpers ====== */
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
      await supabase.from("profiles").update({ height_cm: h }).eq("id", userId);
      setHeightCm(h);
      setHeightModalVisible(false);
    } catch (e) {
      console.log("Error saving height:", e);
    }
  };

  /* ====== Drag to reorder extras (persist by swapping photo_url across rows in created_at order) ====== */
  const persistExtrasOrder = async (newOrder: Slot[]) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      // Load current 3 extra rows in created_at order to map static row IDs
      const { data: rows } = await supabase
        .from("user_photos")
        .select("id, photo_url, is_main, created_at")
        .eq("user_id", userId)
        .neq("is_main", true)
        .order("created_at", { ascending: true })
        .limit(3);

      if (!rows) return;

      // For each row position i, assign the storagePath from newOrder[i]
      // This keeps row order stable but swaps the photos inside those rows
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
      <FloatingHeader title="Edit Profile" fullName={fullName} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: headerHeight - verticalScale(60) }]}
        showsVerticalScrollIndicator={false}
        bounces
      >
        {/* Photos */}
        <View style={styles.photosSection}>
          <View style={styles.mainTitleRow}>
            <Ionicons name="images-outline" size={22} color={BLUE} style={styles.mainTitleIcon} />
            <Text style={styles.mainSectionTitle}>Photos</Text>
          </View>
          <Text style={styles.sectionHint}>Tap to add/change; long-press for menu • long-press & drag to reorder</Text>

          {/* Main photo centered and rounded */}
          <View style={styles.mainPhotoWrapper}>
            <MainPhotoSlot
              slot={slots.main}
              onPress={() => openSourceSheet("main")}
              onLongPress={() => slots.main.id && openSheet("main")}
              isUploading={uploadingSlot?.kind === "main"}
            />
          </View>

          {/* Extra photos draggable row */}
          <View style={{ marginTop: verticalScale(8) }}>
            <DraggableFlatList
              horizontal
              data={slots.extra.map((s, i) => ({ ...s, key: `extra-${i}-${s.id ?? "empty"}` }))}
              keyExtractor={(item) => item.key as string}
              containerStyle={styles.extraPhotosGrid}
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
              renderItem={(params: RenderItemParams<Slot>) => {
  const { item, drag, getIndex } = params;
  // getIndex() can be undefined while measuring — guard it
  const idx = (typeof getIndex === 'function' ? getIndex() : 0) ?? 0;

  return (
    <View style={{ width: EXTRA_SLOT_WIDTH, marginRight: idx < 2 ? EXTRA_GAP : 0 }}>
      <PhotoSlot
        slot={item}
        label={`Photo ${idx + 2}`}
        onPress={() => openSourceSheet("extra", idx)}
        onLongPress={() => (item?.signedUrl ? drag() : undefined)}
        index={idx + 1}
        isUploading={uploadingSlot?.kind === "extra" && uploadingSlot.index === idx}
        width={EXTRA_SLOT_WIDTH}
      />
    </View>
  );
}}
            />
          </View>
        </View>

        {/* Prompts with Edit functionality */}
        <SectionCard
          title="My Prompts"
          icon={<Ionicons name="chatbubbles-outline" size={20} color={BLUE} />}
          action={() => router.push("/(onboarding)/(common)/in_progress")}
        >
          {prompts.length ? (
            <View style={styles.promptsList}>
              {prompts.map((p, i) => (
                <PromptCard key={`${p.title}-${i}`} prompt={p} index={i} />
              ))}
            </View>
          ) : (
            <TouchableOpacity style={styles.addPromptButton} onPress={() => router.push("/(onboarding)/(common)/in_progress")}>
              <LinearGradient colors={["#EEF4FF", "#DCE8FF"]} style={StyleSheet.absoluteFillObject} />
              <Text style={styles.addPromptText}>+ Add Prompts</Text>
            </TouchableOpacity>
          )}
        </SectionCard>

        {/* === Identity FIRST === */}
        <SectionCard
          title="Identity"
          icon={<MaterialCommunityIcons name="drama-masks" size={20} color={BLUE} />}
        >
          <InfoRow
            label="Sexual Orientation"
            value={sexualOrientation ? humanize(sexualOrientation) : "Add orientation"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          <InfoRow
            label="Who I'd Like to Meet"
            value={summarizeList(interestedIn)}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          <InfoRow label="Height" value={heightCm ? `${heightCm} cm` : "Add height"} onPress={() => setHeightModalVisible(true)} showArrow />
        </SectionCard>

        {/* === My Essentials AFTER Identity === */}
        <SectionCard
          title="My Essentials"
          icon={<Ionicons name="sparkles-outline" size={20} color={BLUE} />}
        >
          <InfoRow
            label="Communication Style"
            value={lifestyle.communication ? textOnly(lifestyle.communication) : "Add style"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          <InfoRow
            label="Love Language"
            value={lifestyle.love_language ? textOnly(lifestyle.love_language) : "Add language"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          <InfoRow
            label="Zodiac Sign"
            value={lifestyle.zodiac ? textOnly(lifestyle.zodiac) : "Add sign"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          <InfoRow
            label="Pets"
            value={lifestyle.pets ? textOnly(lifestyle.pets) : "Add pets"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
        </SectionCard>

        {/* Intent */}
        <SectionCard
          title="What I'm Looking For"
          icon={<MaterialCommunityIcons name="heart-outline" size={20} color={BLUE} />}
          action={() => router.push("/(onboarding)/(common)/in_progress")}
        >
          <View style={styles.tagsList}>
            {lookingFor.length ? lookingFor.map((v, i) => <TagChip key={`${v}-${i}`} label={v} />) : <Text style={styles.emptyText}>Not specified</Text>}
          </View>
          <Text style={styles.subSectionTitle}>Values in a Partner</Text>
          <View style={styles.tagsList}>
            {partnerValues.length ? partnerValues.map((v, i) => <TagChip key={`${v}-${i}`} label={v} />) : <Text style={styles.emptyText}>Not specified</Text>}
          </View>
        </SectionCard>

        {/* Lifestyle (bigger tiles, no “Drinking/Smoking/…” labels) */}
        <SectionCard
          title="Lifestyle"
          icon={<Ionicons name="star-outline" size={20} color={BLUE} />}
          action={() => router.push("/(onboarding)/(common)/in_progress")}
        >
          <View style={styles.lifestyleGrid}>
            <View style={styles.lifestyleRow}>
              {lifestyle.drinking && (
                <LifestyleItem icon={<MaterialCommunityIcons name="glass-wine" size={30} color={BLUE} />} value={textOnly(lifestyle.drinking)} />
              )}
              {lifestyle.smoking && (
                <LifestyleItem icon={<MaterialCommunityIcons name="smoking" size={30} color={BLUE} />} value={textOnly(lifestyle.smoking)} />
              )}
              {lifestyle.workout && (
                <LifestyleItem icon={<MaterialCommunityIcons name="dumbbell" size={30} color={BLUE} />} value={textOnly(lifestyle.workout)} />
              )}
            </View>
            <View style={styles.lifestyleRow}>
              {lifestyle.religion && (
                <LifestyleItem icon={<FontAwesome5 name="praying-hands" size={28} color={BLUE} />} value={textOnly(lifestyle.religion)} />
              )}
              {lifestyle.politics && (
                <LifestyleItem icon={<MaterialCommunityIcons name="bank" size={30} color={BLUE} />} value={textOnly(lifestyle.politics)} />
              )}
              {lifestyle.kids && (
                <LifestyleItem icon={<MaterialCommunityIcons name="baby-face-outline" size={30} color={BLUE} />} value={textOnly(lifestyle.kids)} />
              )}
            </View>
          </View>
        </SectionCard>

        {/* Interests */}
        <SectionCard
          title="Interests & Hobbies"
          icon={<MaterialCommunityIcons name="palette-outline" size={20} color={BLUE} />}
          action={() => router.push("/(onboarding)/(common)/in_progress")}
        >
          <View style={styles.tagsList}>
            {hobbies.length ? hobbies.map((h, i) => <TagChip key={`${h}-${i}`} label={h} />) : <Text style={styles.emptyText}>Add your hobbies</Text>}
          </View>
          {!!communities.length && (
            <>
              <Text style={styles.subSectionTitle}>Communities I Support</Text>
              <View style={styles.tagsList}>{communities.map((c, i) => <TagChip key={`${c}-${i}`} label={c} />)}</View>
            </>
          )}
        </SectionCard>

        {/* Education */}
        <SectionCard
          title="Background"
          icon={<MaterialCommunityIcons name="school-outline" size={20} color={BLUE} />}
        >
          <InfoRow
            label="Education"
            value={education ? humanize(education) : "Add education"}
            onPress={() => router.push("/(onboarding)/(common)/in_progress")}
            showArrow
          />
          {institution && (
            <InfoRow
              label="Institution"
              value={humanize(institution)}
              onPress={() => router.push("/(onboarding)/(common)/in_progress")}
              showArrow
            />
          )}
        </SectionCard>
      </ScrollView>

      {/* Modals */}
      <HeightPickerModal visible={heightModalVisible} onClose={() => setHeightModalVisible(false)} onSave={saveHeight} initialHeight={heightCm} />
      <PhotoActionsSheet
        visible={sheetVisible}
        onClose={closeSheet}
        canSetMain={sheetKind === "extra" && !!slots.extra[sheetIndex]?.id}
        onChange={onChangeFromSheet}
        onSetMain={onSetMainFromSheet}
        onRemove={onRemoveFromSheet}
      />
      <ImageSourceSheet visible={sourceVisible} onClose={closeSourceSheet} onPickLibrary={onPickLibrary} onPickCamera={onPickCamera} />
    </SafeAreaView>
  );
}

/* Lifestyle item WITHOUT labels (only icon + value) */
const LifestyleItem: React.FC<{ icon: React.ReactNode; value: string }> = ({ icon, value }) => (
  <View style={styles.lifestyleItem}>
    <View style={styles.lifestyleIcon}>{icon}</View>
    <Text style={styles.lifestyleValue}>{value}</Text>
  </View>
);

/* ===================== STYLES ===================== */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },
  scrollView: { flex: 1 },
  scrollContent: { paddingTop: verticalScale(70), paddingBottom: verticalScale(30) },

  // Main photo styles (rounded)
  mainPhotoWrapper: {
    alignItems: "center",
    marginVertical: verticalScale(20),
  },
  mainPhotoWrapperContainer: {
    position: "relative",
  },
  mainPhotoEmpty: {
    borderRadius: scale(90),
    overflow: "hidden",
    borderWidth: 2.5,
    borderColor: "rgba(27,68,205,0.2)",
    borderStyle: "dashed",
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  mainPhotoFilled: {
    borderRadius: scale(90),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  mainEmptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(14),
  },
  mainPhotoContent: { flex: 1 },
  mainPhotoImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F3F8",
  },

  uploadIconMain: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(10),
  },
  uploadLabelMain: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(2),
  },
  uploadHintMain: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },

  // MAIN badge top-left
  mainBadgeOutside: {
    position: "absolute",
    top: scale(8),
    left: scale(8),
    backgroundColor: BLUE,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: scale(14),
  },
  mainBadgeText: { fontSize: scale(10), fontFamily: Fonts.bold, color: "#FFFFFF", letterSpacing: 0.5 },

  // Edit button bottom-right
  mainEditBtn: {
    position: "absolute",
    bottom: scale(8),
    right: scale(8),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  editBtnGradient: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Regular upload icon styles (centered)
  uploadIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  uploadLabel: { fontSize: scale(14), fontFamily: Fonts.bold, color: INK, marginBottom: verticalScale(2) },
  uploadHint: { fontSize: scale(12), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.4)" },

  // Header
  floatingHeader: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 100, overflow: "hidden" },
  headerContent: { flex: 1, flexDirection: "row", alignItems: "center", paddingHorizontal: scale(20) },
  headerCenter: { flex: 1, alignItems: "center" },
  headerTitle: { fontSize: scale(18), fontFamily: Fonts.bold, color: INK },
  headerSubtitle: { fontSize: scale(11), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.5)", marginTop: verticalScale(2) },
  saveButton: { borderRadius: scale(20), overflow: "hidden" },
  saveGradient: { paddingHorizontal: scale(20), paddingVertical: verticalScale(8) },
  saveText: { fontSize: scale(14), fontFamily: Fonts.bold, color: "#FFFFFF" },

  backButton: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  chevronWrapper: { width: scale(16), height: scale(16), alignItems: "center", justifyContent: "center", transform: [{ scaleX: -1 }] },
  chevronLine: { position: "absolute", width: scale(12), height: Math.max(2, Math.round(scale(2))), backgroundColor: "#FFFFFF", borderRadius: scale(1), left: scale(2) },
  chevronLineTop: { top: scale(3), transform: [{ rotate: "45deg" }] },
  chevronLineBottom: { bottom: scale(4), transform: [{ rotate: "-45deg" }] },

  // Photos
  photosSection: { paddingHorizontal: H_PAD, paddingTop: verticalScale(15), marginBottom: verticalScale(25) },
  mainTitleRow: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(4) },
  mainTitleIcon: { marginRight: scale(6) },
  mainSectionTitle: { fontSize: scale(22), fontFamily: Fonts.bold, color: INK },
  sectionHint: { fontSize: scale(13), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.45)", marginBottom: verticalScale(15), textAlign: "center" },
  extraPhotosGrid: { paddingHorizontal: H_PAD - 0 },

  photoEmpty: {
    height: verticalScale(140),
    borderRadius: scale(16),
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "rgba(27,68,205,0.12)",
    borderStyle: "dashed",
  },
  photoFilled: {
    height: verticalScale(140),
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyContent: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.98)" },
  photoContent: { flex: 1 },
  photoImage: { width: "100%", height: "100%", backgroundColor: "#F0F3F8" },
  photoOverlay: { ...StyleSheet.absoluteFillObject },
  photoLongPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(16),
  },
  photoActions: { position: "absolute", bottom: scale(12), right: scale(12) },
  editBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  uploadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" },

  // Section with edit button
  sectionCard: {
    marginHorizontal: H_PAD,
    marginBottom: verticalScale(20),
    borderRadius: scale(20),
    overflow: "hidden",
    backgroundColor: CARD_BG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(18),
    paddingBottom: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  sectionTitleRow: { flexDirection: "row", alignItems: "center" },
  sectionIcon: { marginRight: scale(8), justifyContent: "center", alignItems: "center" },
  sectionTitle: { fontSize: scale(17), fontFamily: Fonts.bold, color: INK },
  sectionContent: { padding: scale(20) },

  // Centered circular edit arrow
  editButtonSmall: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },

  // InfoRow
  infoRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: verticalScale(12), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  infoLabel: { fontSize: scale(15), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.7)" },
  infoRight: { flexDirection: "row", alignItems: "center" },
  infoValue: { fontSize: scale(15), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.4)" },
  infoValueSet: { fontFamily: Fonts.bold, color: INK },

  // Prompts
  promptsList: { gap: verticalScale(12) },
  promptCard: { padding: scale(16), borderRadius: scale(14), overflow: "hidden" },
  promptContent: { flex: 1, paddingRight: scale(10) },
  promptTitle: { fontSize: scale(14), fontFamily: Fonts.bold, color: BLUE, marginBottom: verticalScale(6) },
  promptAnswer: { fontSize: scale(15), fontFamily: Fonts.primary, color: INK, lineHeight: verticalScale(22) },
  addPromptButton: { height: verticalScale(50), borderRadius: scale(14), alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1.5, borderColor: "rgba(27,68,205,0.15)", borderStyle: "dashed" },
  addPromptText: { fontSize: scale(15), fontFamily: Fonts.bold, color: BLUE },

  // Tags
  tagsList: { flexDirection: "row", flexWrap: "wrap", gap: scale(8), marginTop: verticalScale(8) },
  tagChip: { paddingHorizontal: scale(14), paddingVertical: verticalScale(6), borderRadius: scale(16), backgroundColor: "rgba(27,68,205,0.08)" },
  tagText: { fontSize: scale(13), fontFamily: Fonts.bold, color: BLUE },
  subSectionTitle: { fontSize: scale(14), fontFamily: Fonts.bold, color: "rgba(10,14,26,0.6)", marginTop: verticalScale(16), marginBottom: verticalScale(8) },
  emptyText: { fontSize: scale(14), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.4)", fontStyle: "italic" },

  // Lifestyle grid (bigger tiles, 3x2)
  lifestyleGrid: { gap: verticalScale(12) },
  lifestyleRow: { flexDirection: "row", gap: scale(12) },
  lifestyleItem: {
    flex: 1,
    height: verticalScale(130),
    padding: scale(12),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  lifestyleIcon: { marginBottom: verticalScale(6) },
  lifestyleValue: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
  },

  // Modal / Sheet
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), paddingBottom: verticalScale(34), maxHeight: "60%" },
  modalHandle: { width: scale(36), height: verticalScale(4), borderRadius: scale(2), backgroundColor: "rgba(10,14,26,0.15)", alignSelf: "center", marginTop: verticalScale(12) },
  modalTitle: { fontSize: scale(20), fontFamily: Fonts.bold, color: INK, textAlign: "center", marginTop: verticalScale(16), marginBottom: verticalScale(24) },
  pickerContainer: { height: verticalScale(200), position: "relative" },
  pickerHighlight: {
    position: "absolute",
    top: "50%",
    left: scale(30),
    right: scale(30),
    marginTop: -verticalScale(25),
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: BLUE,
  },
  pickerItem: { alignItems: "center", justifyContent: "center" },
  pickerText: { fontSize: scale(16), fontFamily: Fonts.primary, color: "rgba(10,14,26,0.4)" },
  pickerTextActive: { fontSize: scale(18), fontFamily: Fonts.bold, color: BLUE },
  modalActions: { flexDirection: "row", paddingHorizontal: scale(24), paddingTop: verticalScale(24), gap: scale(12) },
  modalCancel: { flex: 1, height: verticalScale(48), borderRadius: scale(24), backgroundColor: "rgba(27,68,205,0.08)", alignItems: "center", justifyContent: "center" },
  modalCancelText: { fontSize: scale(16), fontFamily: Fonts.bold, color: BLUE },
  modalSave: { flex: 1, borderRadius: scale(24), overflow: "hidden" },
  modalSaveGradient: { height: verticalScale(48), alignItems: "center", justifyContent: "center" },
  modalSaveText: { fontSize: scale(16), fontFamily: Fonts.bold, color: "#FFFFFF" },

  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  sheetContent: { backgroundColor: "#FFFFFF", borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), paddingBottom: verticalScale(34) },
  sheetHandle: { width: scale(36), height: verticalScale(4), borderRadius: scale(2), backgroundColor: "rgba(10,14,26,0.15)", alignSelf: "center", marginTop: verticalScale(12) },
  sheetTitle: { fontSize: scale(18), fontFamily: Fonts.bold, color: INK, textAlign: "center", marginTop: verticalScale(12), marginBottom: verticalScale(20) },
  sheetOption: { flexDirection: "row", alignItems: "center", paddingVertical: verticalScale(16), paddingHorizontal: scale(24), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: BORDER },
  sheetOptionIcon: { marginRight: scale(16), alignItems: "center", justifyContent: "center", width: scale(24) },
  sheetOptionText: { fontSize: scale(16), fontFamily: Fonts.primary, color: INK },
  sheetCancelOption: { marginTop: verticalScale(8), paddingVertical: verticalScale(16), alignItems: "center" },
  sheetCancelText: { fontSize: scale(16), fontFamily: Fonts.bold, color: "rgba(10,14,26,0.6)" },
});
