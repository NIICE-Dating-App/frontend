// app/(onboarding)/(common)/photo_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActionSheetIOS,
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";
const INK_MUTED = "#5C6B7C";

type UploadTarget = "main" | { type: "extra"; index: number };

type DBPhoto = {
  id: number;
  photo_url: string;
  is_main: boolean | null;
  created_at?: string;
};

export default function PhotoSignup() {
  const [uploading, setUploading] = useState(false);
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);
  const [extraPhotos, setExtraPhotos] = useState<(string | null)[]>([null, null, null]);
  const [totalCount, setTotalCount] = useState(0); // internal only, not shown

  // Keep latest extras to preserve slot positions across refetches
  const extrasRef = useRef<(string | null)[]>(extraPhotos);
  useEffect(() => {
    extrasRef.current = extraPhotos;
  }, [extraPhotos]);

  const getStoragePathFromPublicUrl = (url: string): string | null => {
    const marker = "/user_photos/";
    const idx = url.indexOf(marker);
    if (idx === -1) return null;
    return url.substring(idx + marker.length); // e.g. "{userId}/{filename}.jpg"
  };

  const fetchPhotos = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) return;

    const { data, error } = await supabase
      .from("user_photos")
      .select("id, photo_url, is_main, created_at")
      .eq("user_id", userId)
      .order("is_main", { ascending: false }) // main first
      .order("created_at", { ascending: true });

    if (error) {
      console.error("fetchPhotos error:", error);
      return;
    }

    const rows = (data ?? []) as DBPhoto[];
    setTotalCount(rows.length);

    // MAIN: do NOT auto-promote extras if main is missing
    const main = rows.find((r) => r.is_main === true) ?? null;
    setMainPhoto(main ? main.photo_url : null);

    // EXTRAS (preserve previous slot positions)
    const extrasRows = rows.filter((r) => !r.is_main);
    const remaining = new Set(extrasRows.map((r) => r.photo_url));

    const newSlots: (string | null)[] = [null, null, null];
    // 1) keep existing urls in same slot if they still exist
    for (let i = 0; i < 3; i++) {
      const prevUrl = extrasRef.current[i];
      if (prevUrl && remaining.has(prevUrl)) {
        newSlots[i] = prevUrl;
        remaining.delete(prevUrl);
      }
    }
    // 2) fill leftover slots with remaining urls by created_at order
    const leftover = extrasRows.map((r) => r.photo_url).filter((u) => remaining.has(u));
    for (let i = 0; i < 3; i++) {
      if (!newSlots[i] && leftover.length) {
        newSlots[i] = leftover.shift() ?? null;
      }
    }

    setExtraPhotos(newSlots);
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchPhotos();
    }, [fetchPhotos])
  );

  const canAddAnother = totalCount < 4; // main + extras <= 4

  const removePhoto = useCallback(
    async (url: string, silent?: boolean) => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;
        if (!userId) throw new Error("Session not found.");

        // 1) Storage delete
        const storagePath = getStoragePathFromPublicUrl(url);
        if (storagePath) {
          await supabase.storage.from("user_photos").remove([storagePath]);
        }

        // 2) DB delete
        const { error: delError } = await supabase
          .from("user_photos")
          .delete()
          .eq("user_id", userId)
          .eq("photo_url", url);

        if (delError) throw delError;

        if (!silent) await fetchPhotos();
      } catch (e: any) {
        console.error("removePhoto error:", e);
        Alert.alert("Delete failed", e?.message ?? "Please try again.");
      }
    },
    [fetchPhotos]
  );

  // center-crop to target aspect then resize to exact output resolution
  const processToResolution = async (
    uri: string,
    sourceW: number,
    sourceH: number,
    targetW: number,
    targetH: number
  ) => {
    const targetAspect = targetW / targetH;
    const srcAspect = sourceW / sourceH;

    let cropW = sourceW;
    let cropH = sourceH;
    let originX = 0;
    let originY = 0;

    if (srcAspect > targetAspect) {
      cropH = sourceH;
      cropW = Math.round(cropH * targetAspect);
      originX = Math.round((sourceW - cropW) / 2);
    } else if (srcAspect < targetAspect) {
      cropW = sourceW;
      cropH = Math.round(cropW / targetAspect);
      originY = Math.round((sourceH - cropH) / 2);
    }

    const cropped = await ImageManipulator.manipulateAsync(
      uri,
      [{ crop: { originX, originY, width: cropW, height: cropH } }],
      { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
    );

    const resized = await ImageManipulator.manipulateAsync(
      cropped.uri,
      [{ resize: { width: targetW, height: targetH } }],
      { compress: 0.95, format: ImageManipulator.SaveFormat.JPEG }
    );

    return resized.uri;
  };

  const uploadAndInsert = async (userId: string, uri: string, isMain: boolean) => {
    const base64 = await FileSystem.readAsStringAsync(uri, { encoding: "base64" });
    const filename = `${userId}/${Date.now()}_${Math.floor(Math.random() * 1e6)}.jpg`;

    const { error: uploadError } = await supabase.storage
      .from("user_photos")
      .upload(filename, decode(base64), { contentType: "image/jpeg" });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage.from("user_photos").getPublicUrl(filename);
    const publicUrl = urlData.publicUrl;

    const { data: inserted, error: insertError } = await supabase
      .from("user_photos")
      .insert({ user_id: userId, photo_url: publicUrl, is_main: isMain })
      .select("id, photo_url")
      .single();

    if (insertError) throw insertError;

    if (isMain && inserted?.id) {
      await supabase
        .from("user_photos")
        .update({ is_main: false })
        .eq("user_id", userId)
        .neq("id", inserted.id);
    }

    return publicUrl;
  };

  const selectSource = async (): Promise<"camera" | "library" | null> => {
    if (Platform.OS === "ios") {
      return new Promise((resolve) => {
        ActionSheetIOS.showActionSheetWithOptions(
          {
            options: ["Cancel", "Take Photo", "Choose from Library"],
            cancelButtonIndex: 0,
          },
          (idx) => {
            if (idx === 1) resolve("camera");
            else if (idx === 2) resolve("library");
            else resolve(null);
          }
        );
      });
    }
    return new Promise((resolve) => {
      Alert.alert(
        "Add photo",
        "Select source",
        [
          { text: "Camera", onPress: () => resolve("camera") },
          { text: "Library", onPress: () => resolve("library") },
          { text: "Cancel", style: "cancel", onPress: () => resolve(null) },
        ],
        { cancelable: true }
      );
    });
  };

  const pickImage = useCallback(
    async (target: UploadTarget) => {
      try {
        const source = await selectSource();
        if (!source) return;

        if (source === "camera") {
          const camPerm = await ImagePicker.requestCameraPermissionsAsync();
          if (!camPerm.granted) {
            Alert.alert("Permission needed", "Please allow camera access.");
            return;
          }
        } else {
          const libPerm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!libPerm.granted) {
            Alert.alert("Permission needed", "Please allow photo library access.");
            return;
          }
        }

        const isMain = target === "main";
        const isExtra = typeof target === "object";

        let result: ImagePicker.ImagePickerResult;
        if (source === "camera") {
          // Camera is single-shot
          result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
          });
        } else {
          // Library: limit to MAX 3 selections for extras
          const libraryOpts: any = {
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: false,
            quality: 1,
            allowsMultipleSelection: isExtra, // multi-select only for extras
          };
          // Try to hard-limit picker UI (supported on some platforms)
          if (isExtra) libraryOpts.selectionLimit = 3;

          result = await ImagePicker.launchImageLibraryAsync(libraryOpts);
        }

        if (result.canceled) return;

        let assets = result.assets ?? [];
        if (!assets.length) return;

        // Enforce MAX 3 for extras at code level (fallback if picker UI can't limit)
        if (!isMain && assets.length > 3) {
          assets = assets.slice(0, 3);
          Alert.alert("Limit reached", "You can select up to 3 photos at a time.");
        }

        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData?.session?.user) {
          throw new Error("Session not found. Please log in again.");
        }
        const userId = sessionData.session.user.id;

        setUploading(true);

        // MAIN: single replace or add
        if (isMain) {
          const asset = assets[0];
          if (!asset?.uri || !asset.width || !asset.height) {
            Alert.alert("Upload failed", "Could not read image.");
            setUploading(false);
            return;
          }

          if (mainPhoto) {
            await removePhoto(mainPhoto, true); // replace silently
          } else if (!canAddAnother) {
            Alert.alert("Limit reached", "You can upload up to 4 photos.");
            setUploading(false);
            return;
          }

          const processedUri = await processToResolution(asset.uri, asset.width, asset.height, 800, 800);
          const publicUrl = await uploadAndInsert(userId, processedUri, true);

          // Update local state instantly; then reconcile with DB
          setMainPhoto(publicUrl);
          await fetchPhotos();
          setUploading(false);
          return;
        }

        // EXTRAS: multi-select allowed (MAX 3 per selection, enforced above)
        const startIndex = (target as any).index as number;

        const current = extraPhotos;
        const empties: number[] = [];
        for (let i = 0; i < 3; i++) if (!current[i]) empties.push(i);

        // Plan: tapped slot first (replace or fill), then remaining empties (to the right/any)
        const plan: number[] = [];
        if (current[startIndex]) plan.push(startIndex);
        else plan.push(startIndex);
        for (const idx of empties) if (!plan.includes(idx)) plan.push(idx);

        // Additions cap = number of empty slots (replacements don't count towards cap)
        const additionsCap = empties.length;

        // Map assets to target indices respecting caps
        const toProcess: { idx: number; asset: ImagePicker.ImagePickerAsset }[] = [];
        let usedAdditions = 0;
        for (let a = 0, p = 0; a < assets.length && p < plan.length; a++, p++) {
          const idx = plan[p];
          const replacing = Boolean(current[idx]);
          if (!replacing && usedAdditions >= additionsCap) break;
          toProcess.push({ idx, asset: assets[a] });
          if (!replacing) usedAdditions++;
        }

        if (!toProcess.length) {
          Alert.alert("Limit reached", "No free slots left. Delete a photo to add more.");
          setUploading(false);
          return;
        }

        // If replacing any, delete first (silent)
        for (const step of toProcess) {
          const { idx } = step;
          if (current[idx]) {
            await removePhoto(current[idx] as string, true);
          }
        }

        // Upload sequentially to keep order predictable
        const local = [...current];
        for (const { idx, asset } of toProcess) {
          if (!asset?.uri || !asset.width || !asset.height) continue;
          const processedUri = await processToResolution(asset.uri, asset.width, asset.height, 600, 848);
          const publicUrl = await uploadAndInsert(userId, processedUri, false);
          local[idx] = publicUrl;
          setExtraPhotos(local.slice());
          extrasRef.current = local.slice();
        }

        // Reconcile with DB
        await fetchPhotos();
      } catch (e: any) {
        console.error("Photo upload error:", e);
        const msg =
          typeof e?.message === "string" && e.message.includes("at most 4")
            ? "You can upload up to 4 photos."
            : e?.message ?? "Please try again.";
        Alert.alert("Upload failed", msg);
      } finally {
        setUploading(false);
      }
    },
    [mainPhoto, extraPhotos, canAddAnother, fetchPhotos, removePhoto]
  );

  const handleNext = useCallback(async () => {
    const extraCount = extraPhotos.filter(Boolean).length;
    if (!mainPhoto) {
      Alert.alert("One more step", "Please add your profile picture.");
      return;
    }
    if (extraCount < 1) {
      Alert.alert("Almost there", "Please add at least one more photo.");
      return;
    }

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (sessionData?.session?.user) {
        await supabase.from("profiles").update({ onboarding_step: 4 }).eq("id", sessionData.session.user.id);
      }
    } catch {
      /* non-fatal */
    }

    router.push("/in_progress");
  }, [mainPhoto, extraPhotos]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back button (UNCHANGED) */}
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Progress (UNCHANGED) */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={verticalScale(20)}
      >
        <ScrollView
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Now let’s make you stand out</Text>

          {/* Profile picture */}
          <View style={styles.row}>
            <View style={{ position: "relative" }}>
              <LinearGradient
                colors={["#9FB7FF", "#1B44CD"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatarRing}
              >
                <Pressable
                  onPress={() => pickImage("main")}
                  style={({ pressed }) => [styles.avatarCircle, pressed && { opacity: 0.92, transform: [{ scale: 0.98 }] }]}
                >
                  {mainPhoto ? (
                    <Image source={{ uri: mainPhoto }} style={styles.avatarImg} resizeMode="cover" />
                  ) : (
                    <Ionicons name="camera" size={moderateScale(28)} color="#7E8A98" />
                  )}
                </Pressable>
              </LinearGradient>
              {mainPhoto && (
                <Pressable style={styles.removeBadge} onPress={() => removePhoto(mainPhoto!)}>
                  <Ionicons name="close" size={moderateScale(16)} color="#fff" />
                </Pressable>
              )}
            </View>

            {/* Right-aligned clean button instead of text */}
            <View style={{ flex: 1, marginLeft: scale(16), alignItems: "flex-end", justifyContent: "center" }}>
              <TouchableOpacity onPress={() => pickImage("main")} activeOpacity={0.9} style={styles.chooseMainBtn}>
                <Ionicons name="images-outline" size={moderateScale(16)} color="#fff" />
                <Text style={styles.chooseMainText}>{mainPhoto ? "Change profile photo" : "Choose profile photo"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* BEAUTIFIED WRAPPER RECTANGLE includes photos AND the helper text below */}
          <LinearGradient
            colors={["#DDE7FF", "#F1F5FF"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardOuter}
          >
            <View style={styles.cardInner}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.cardTitle}>Add up to 3 more photos</Text>
                <View style={styles.counterPill}>
                  <Ionicons name="images-outline" size={moderateScale(20)} color={BLUE} />
                  <Text style={styles.counterText}>
                    {(extraPhotos.filter(Boolean).length).toString()}/3
                  </Text>
                </View>
              </View>

              <View style={styles.grid3}>
                {extraPhotos.map((uri, i) => (
                  <View key={i} style={{ position: "relative", flex: 1 }}>
                    <Pressable
                      onPress={() => pickImage({ type: "extra", index: i })}
                      style={({ pressed }) => [
                        styles.gridItem,
                        pressed && { opacity: 0.95, transform: [{ scale: 0.985 }] },
                      ]}
                    >
                      {uri ? (
                        <Image source={{ uri }} style={styles.gridImg} resizeMode="cover" />
                      ) : (
                        <View style={styles.emptyCell}>
                          <Ionicons name="add" size={moderateScale(24)} color={INK_MUTED} />
                          <Text style={styles.emptyText}>Add photo</Text>
                        </View>
                      )}
                    </Pressable>
                    {uri && (
                      <Pressable style={styles.removeBadgeSmall} onPress={() => removePhoto(uri!)}>
                        <Ionicons name="close" size={moderateScale(14)} color="#fff" />
                      </Pressable>
                    )}
                  </View>
                ))}
              </View>

              {/* Helper row (INSIDE the rectangle) */}
              <View style={styles.tipRow}>
                <Ionicons name="information-circle-outline" size={moderateScale(15)} color={BLUE} />
                <Text style={styles.tipText}>
                  Crisp, solo shots work best. Avoid heavy filters. You can delete or replace anytime.
                </Text>
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Uploading overlay (non-blocking, small, no layout shift) */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.uploadingText}>Uploading…</Text>
        </View>
      )}

      {/* Next button (UNCHANGED) */}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext} disabled={uploading}>
        <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BG },

  backButton: {
    position: "absolute",
    top: verticalScale(58),
    left: scale(24),
    width: scale(56),
    height: verticalScale(56),
    borderRadius: scale(28),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },

  progressWrapper: { marginTop: verticalScale(88), paddingHorizontal: scale(24) },
  progressTrack: { height: verticalScale(6), backgroundColor: "#C8CDD2", borderRadius: scale(3) },
  progressFill: { height: verticalScale(6), width: "94.98%", backgroundColor: BLUE, borderRadius: scale(3) },

  scrollContainer: { flex: 1 },
  scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(18), paddingBottom: verticalScale(120) },

  title: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(26),
    lineHeight: verticalScale(40),
    color: INK,
    marginBottom: verticalScale(-6),
  },

  row: { flexDirection: "row", alignItems: "center", marginBottom: verticalScale(16) },

  // Gradient ring around avatar
  avatarRing: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: "#D9DDE2",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },

  /* Choose profile button (right-aligned, clean) */
  chooseMainBtn: {
    flexDirection: "row",
    gap: scale(8),
    paddingHorizontal: scale(17),
    paddingVertical: verticalScale(10),
    borderRadius: scale(12),
    marginHorizontal: scale(20),
    backgroundColor: BLUE,
    alignItems: "center",
  },
  chooseMainText: {
    color: "#fff",
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
  },

  /* Rectangle wrapper — gradient outer w/ soft inner card */
  cardOuter: {
    marginTop: verticalScale(12),
    borderRadius: scale(20),
    padding: 1.5,
  },
  cardInner: {
    backgroundColor: "#F7FAFF",
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#D4DAE1",
    shadowColor: "#000",
    shadowOpacity: 0.07,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  cardTitle: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(18),
    color: INK_SOFT,
  },
  counterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: "#E4ECFF",
  },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    color: BLUE,
  },

  // 3 fixed slots, no overflow
  grid3: { flexDirection: "row", gap: scale(10) },
  gridItem: {
    flex: 1,
    height: verticalScale(168),
    backgroundColor: "#E2E7EF",
    borderRadius: scale(12),
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D6DEE8",
  },
  gridImg: { width: "100%", height: "100%" },

  emptyCell: { alignItems: "center", justifyContent: "center" },
  emptyText: {
    marginTop: verticalScale(6),
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
    color: INK_MUTED,
  },

  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    paddingTop: verticalScale(12),
  },
  tipText: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
    lineHeight: verticalScale(20),
    color: INK_MUTED,
  },

  removeBadge: {
    position: "absolute",
    right: -4,
    top: -4,
    width: scale(24),
    height: verticalScale(24),
    borderRadius: scale(12),
    backgroundColor: "#000000aa",
    alignItems: "center",
    justifyContent: "center",
  },
  removeBadgeSmall: {
    position: "absolute",
    right: 6,
    top: 6,
    width: scale(22),
    height: verticalScale(22),
    borderRadius: scale(11),
    backgroundColor: "#000000aa",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  },

  uploadingOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: verticalScale(118),
    alignSelf: "center",
    marginHorizontal: scale(24),
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    backgroundColor: "#111827CC",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  uploadingText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: moderateScale(13),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(24),
    width: scale(70),
    height: verticalScale(70),
    borderRadius: scale(35),
    backgroundColor: INK,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
  },
});
