// app/(onboarding)/photo_signup.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { decode } from "base64-arraybuffer";
import * as FileSystem from "expo-file-system/legacy";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Animated,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View
} from "react-native";
import DraggableFlatList, { RenderItemParams } from "react-native-draggable-flatlist";
import { SafeAreaView } from "react-native-safe-area-context";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

type Slot = {
  id?: string;
  rawUrl?: string;
  storagePath?: string;
  signedUrl?: string;
  key?: string;
};

type SlotsState = {
  main: Slot;
  extra: [Slot, Slot, Slot];
};

type PhotoRow = {
  id: string;
  photo_url: string | null;
  is_main: boolean | null;
  created_at?: string | null;
};

// ---- Storage helpers (matching edit_main.tsx) ----
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

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  try {
    const { data, error } = await supabase.storage
      .from("user_photos")
      .createSignedUrl(path, 3600);
    if (error) return null;
    return data?.signedUrl ?? null;
  } catch {
    return null;
  }
};

export default function PhotoSignup() {
  const [uploading, setUploading] = useState(false);
  const [slots, setSlots] = useState<SlotsState>({
    main: {},
    extra: [{}, {}, {}],
  });

  const mainPhotoOpacity = useRef(new Animated.Value(0)).current;
  const extraPhotoOpacities = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

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
        // Animate main photo in
        Animated.timing(mainPhotoOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start();
      } else {
        mainPhotoOpacity.setValue(0);
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
            key: `extra-${i}-${r.id}`,
          };
          // Animate extra photo in
          Animated.timing(extraPhotoOpacities[i], {
            toValue: 1,
            duration: 300,
            delay: i * 100,
            useNativeDriver: true,
          }).start();
        } else {
          extras[i] = { id: r.id, key: `extra-${i}-empty` };
          extraPhotoOpacities[i].setValue(0);
        }
      }

      setSlots({ main: mainSlot, extra: extras });
    } catch (e) {
      console.log("reloadPhotos error:", e);
    }
  };

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (userId) await reloadPhotos(userId);
      })();
    }, [])
  );

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

  const uploadToSupabase = async (userId: string, localUri: string) => {
    try {
      const base64 = await FileSystem.readAsStringAsync(localUri, {
        encoding: "base64",
      });
      const fileName = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;

      const { error } = await supabase.storage
        .from("user_photos")
        .upload(fileName, decode(base64), {
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

  const pickImageForMain = async () => {
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

      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"] as any,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"] as any,
              quality: 1,
            });

      if (result.canceled || !result.assets?.[0]) return;

      const asset = result.assets[0];
      if (!asset?.uri || !asset.width || !asset.height) {
        Alert.alert("Upload failed", "Could not read image.");
        return;
      }

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      setUploading(true);

      const processedUri = await processToResolution(
        asset.uri,
        asset.width,
        asset.height,
        800,
        800
      );
      const uploaded = await uploadToSupabase(userId, processedUri);
      if (!uploaded) {
        setUploading(false);
        return;
      }

      // Set all existing photos to is_main = false
      await supabase.from("user_photos").update({ is_main: false }).eq("user_id", userId);

      if (slots.main.id) {
        // Update existing main photo
        await supabase
          .from("user_photos")
          .update({ photo_url: uploaded.storagePath, is_main: true })
          .eq("id", slots.main.id);
      } else {
        // Insert new main photo
        await supabase
          .from("user_photos")
          .insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: true });
      }

      await reloadPhotos(userId);
      setUploading(false);
    } catch (e: any) {
      console.error("Photo upload error:", e);
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
      setUploading(false);
    }
  };

  const pickImageForExtra = async (index: number) => {
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

      // For library, allow multiple selection up to 3 photos
      const result =
        source === "camera"
          ? await ImagePicker.launchCameraAsync({
              mediaTypes: ["images"] as any,
              quality: 1,
            })
          : await ImagePicker.launchImageLibraryAsync({
              mediaTypes: ["images"] as any,
              quality: 1,
              allowsMultipleSelection: true,
              selectionLimit: 3,
            });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      setUploading(true);

      // Get empty slots
      const emptySlots: number[] = [];
      slots.extra.forEach((slot, i) => {
        if (!slot.signedUrl) emptySlots.push(i);
      });

      // If clicked on filled slot, replace it first, then fill empties
      const targetSlots: number[] = [];
      if (slots.extra[index].signedUrl) {
        targetSlots.push(index);
        emptySlots.forEach((i) => {
          if (i !== index) targetSlots.push(i);
        });
      } else {
        targetSlots.push(index);
        emptySlots.forEach((i) => {
          if (i !== index) targetSlots.push(i);
        });
      }

      // Process each selected asset
      for (let i = 0; i < Math.min(result.assets.length, targetSlots.length); i++) {
        const asset = result.assets[i];
        const targetIndex = targetSlots[i];

        if (!asset?.uri || !asset.width || !asset.height) continue;

        const processedUri = await processToResolution(
          asset.uri,
          asset.width,
          asset.height,
          600,
          800
        );
        const uploaded = await uploadToSupabase(userId, processedUri);
        if (!uploaded) continue;

        const target = slots.extra[targetIndex];
        if (target.id) {
          // Update existing extra photo
          await supabase
            .from("user_photos")
            .update({ photo_url: uploaded.storagePath, is_main: false })
            .eq("id", target.id);
        } else {
          // Insert new extra photo
          await supabase
            .from("user_photos")
            .insert({ user_id: userId, photo_url: uploaded.storagePath, is_main: false });
        }
      }

      await reloadPhotos(userId);
      setUploading(false);
    } catch (e: any) {
      console.error("Photo upload error:", e);
      Alert.alert("Upload failed", e?.message ?? "Please try again.");
      setUploading(false);
    }
  };

  const removeSlot = async (kind: "main" | "extra", index?: number) => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      if (kind === "main") {
        if (!slots.main.id) return;
        
        // Animate out
        Animated.timing(mainPhotoOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(async () => {
          await supabase.from("user_photos").delete().eq("id", slots.main.id);
          await reloadPhotos(userId);
        });
      } else {
        const i = index ?? 0;
        const target = slots.extra[i];
        if (!target.id) return;

        // Animate out
        Animated.timing(extraPhotoOpacities[i], {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(async () => {
          await supabase.from("user_photos").delete().eq("id", target.id);
          await reloadPhotos(userId);
        });
      }
    } catch (e) {
      console.log("removeSlot error:", e);
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
        await supabase
          .from("user_photos")
          .update({ photo_url: newPath, is_main: false })
          .eq("id", rows[i].id);
      }
    } catch (e) {
      console.log("persistExtrasOrder error:", e);
    }
  };

  const handleNext = useCallback(async () => {
    const extraCount = slots.extra.filter((s) => s.signedUrl).length;
    if (!slots.main.signedUrl) {
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
        await supabase
          .from("profiles")
          .update({ onboarding_step: 4 })
          .eq("id", sessionData.session.user.id);
      }
    } catch {
      /* non-fatal */
    }

    router.push("/final_signup");
  }, [slots]);

  const extraCount = slots.extra.filter((s) => s.signedUrl).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </View>
      </TouchableOpacity>

      {/* Progress Bar */}
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
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.pageTitle}>Now let's make you stand out</Text>
          <Text style={styles.pageSubtitle}>Add your best photos to complete your profile</Text>

          {/* Main Photo Section */}
          <View style={styles.mainPhotoSection}>
            <Text style={styles.sectionLabel}>Profile Photo</Text>
            <View style={styles.mainPhotoContainer}>
              <Pressable
                onPress={pickImageForMain}
                style={({ pressed }) => [
                  styles.mainPhotoSlot,
                  pressed && { opacity: 0.9 },
                ]}
              >
                {slots.main.signedUrl ? (
                  <Animated.View style={{ opacity: mainPhotoOpacity, width: "100%", height: "100%" }}>
                    <Image
                      source={{ uri: slots.main.signedUrl }}
                      style={styles.mainPhotoImage}
                      resizeMode="cover"
                    />
                  </Animated.View>
                ) : (
                  <View style={styles.emptyMainSlot}>
                    <View style={styles.cameraIconCircle}>
                      <Ionicons name="camera" size={32} color={Colors.BLUE} />
                    </View>
                    <Text style={styles.addPhotoText}>Add profile photo</Text>
                  </View>
                )}
              </Pressable>
              {slots.main.signedUrl && (
                <Pressable
                  style={styles.removeMainBadge}
                  onPress={() => removeSlot("main")}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </Pressable>
              )}
            </View>
          </View>

          {/* Extra Photos Section */}
          <View style={styles.extraPhotosSection}>
            <View style={styles.extraPhotoHeader}>
              <Text style={styles.sectionLabel}>More Photos</Text>
              <View style={styles.counterBadge}>
                <Ionicons name="images-outline" size={16} color={Colors.BLUE} />
                <Text style={styles.counterText}>{extraCount}/3</Text>
              </View>
            </View>

            <DraggableFlatList
              data={slots.extra.map((s, i) => ({ ...s, key: s.key || `extra-${i}-empty` }))}
              horizontal
              keyExtractor={(item) => item.key as string}
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
              contentContainerStyle={styles.extraPhotosGrid}
              renderItem={(params: RenderItemParams<Slot>) => {
                const { item, drag, getIndex } = params;
                const idx = (typeof getIndex === "function" ? getIndex() : 0) ?? 0;

                return (
                  <View style={styles.extraPhotoWrapper}>
                    <Pressable
                      onPress={() => pickImageForExtra(idx)}
                      onLongPress={item.signedUrl ? drag : undefined}
                      style={({ pressed }) => [
                        styles.extraPhotoSlot,
                        pressed && { opacity: 0.9 },
                      ]}
                    >
                      {item.signedUrl ? (
                        <Animated.View
                          style={{
                            opacity: extraPhotoOpacities[idx],
                            width: "100%",
                            height: "100%",
                          }}
                        >
                          <Image
                            source={{ uri: item.signedUrl }}
                            style={styles.extraPhotoImage}
                            resizeMode="cover"
                          />
                        </Animated.View>
                      ) : (
                        <View style={styles.emptyExtraSlot}>
                          <Ionicons name="add-circle-outline" size={32} color="rgba(10,14,26,0.3)" />
                          <Text style={styles.photoNumberText}>Photo {idx + 2}</Text>
                        </View>
                      )}
                    </Pressable>
                    {item.signedUrl && (
                      <Pressable
                        style={styles.removeExtraBadge}
                        onPress={() => removeSlot("extra", idx)}
                      >
                        <Ionicons name="close" size={14} color="#FFFFFF" />
                      </Pressable>
                    )}
                  </View>
                );
              }}
            />
          </View>

          {/* Info Note */}
          <View style={styles.infoNote}>
            <Ionicons
              name="bulb-outline"
              size={20}
              color={Colors.BLUE}
              style={{ marginRight: scale(8) }}
            />
            <Text style={styles.infoNoteText}>
              Choose clear photos where your face is visible. Avoid group photos or heavy filters.
            </Text>
          </View>

          <View style={{ height: verticalScale(100) }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Uploading Overlay */}
      {uploading && (
        <View style={styles.uploadingOverlay}>
          <ActivityIndicator size="small" color="#FFFFFF" />
          <Text style={styles.uploadingText}>Uploading...</Text>
        </View>
      )}

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleNext}
        disabled={uploading}
        style={[styles.nextButton, uploading && { opacity: 0.5 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },

  backButton: {
    position: "absolute",
    top: verticalScale(16),
    left: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  progressWrapper: {
    marginTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  progressTrack: {
    height: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressFill: {
    height: verticalScale(8),
    width: "97%",
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(24),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
  },

  pageTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(8),
    paddingTop: verticalScale(1),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(32),
    lineHeight: verticalScale(22),
  },

  mainPhotoSection: {
    marginBottom: verticalScale(32),
  },
  sectionLabel: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(12),
  },
  mainPhotoContainer: {
    alignItems: "center",
    position: "relative",
  },
  mainPhotoSlot: {
    width: scale(160),
    height: scale(160),
    borderRadius: scale(80),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  mainPhotoImage: {
    width: "100%",
    height: "100%",
  },
  emptyMainSlot: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,68,205,0.04)",
  },
  cameraIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  addPhotoText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.5)",
  },
  removeMainBadge: {
    position: "absolute",
    top: scale(0),
    right: scale(0),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "#000000DD",
    alignItems: "center",
    justifyContent: "center",
  },

  extraPhotosSection: {
    marginBottom: verticalScale(24),
  },
  extraPhotoHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  counterBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.08)",
  },
  counterText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
  },
  extraPhotosGrid: {
    gap: scale(12),
  },
  extraPhotoWrapper: {
    width: scale(110),
    position: "relative",
  },
  extraPhotoSlot: {
    width: "100%",
    aspectRatio: 3 / 4,
    borderRadius: scale(12),
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  extraPhotoImage: {
    width: "100%",
    height: "100%",
  },
  emptyExtraSlot: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,68,205,0.04)",
  },
  photoNumberText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.4)",
    marginTop: verticalScale(8),
  },
  removeExtraBadge: {
    position: "absolute",
    top: scale(6),
    right: scale(6),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "#000000DD",
    alignItems: "center",
    justifyContent: "center",
  },

  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: scale(16),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.06)",
    paddingBottom: verticalScale(12),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
    paddingTop: verticalScale(0.5),
  },

  uploadingOverlay: {
    position: "absolute",
    bottom: verticalScale(120),
    left: scale(20),
    right: scale(20),
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    backgroundColor: "#000000CC",
    borderRadius: scale(12),
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
  },
  uploadingText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: scale(13),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});