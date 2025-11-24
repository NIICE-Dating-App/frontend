// app/(frames)/frame_editor.tsx
import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { decode } from "base64-arraybuffer";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Animated as RNAnimated,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Circular loader constants
const LOADER_SIZE = scale(130);
const LOADER_STROKE = scale(4);
const LOADER_RADIUS = LOADER_SIZE / 2 - LOADER_STROKE / 2;
const LOADER_CIRCUMFERENCE = 2 * Math.PI * LOADER_RADIUS;

const AnimatedCircle = RNAnimated.createAnimatedComponent(Circle);

export default function FrameEditor() {
  const params = useLocalSearchParams();
  const mediaUri = params.uri as string;
  const mediaType = params.type as "image" | "video";

  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] =
    useState<"editing" | "uploading" | "success">("editing");

  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const successAnim = useRef(new RNAnimated.Value(0)).current;
  const pulseAnim = useRef(new RNAnimated.Value(1)).current;

  // photo scale for keyboard animation
  const photoScale = useRef(new RNAnimated.Value(1)).current;

  // animate photo when keyboard shows/hides
  useEffect(() => {
    const showEvent =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleShow = () => {
      RNAnimated.timing(photoScale, {
        toValue: 0.55, // smaller when typing
        duration: 150,
        useNativeDriver: true,
      }).start();
    };

    const handleHide = () => {
      RNAnimated.timing(photoScale, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }).start();
    };

    const subShow = Keyboard.addListener(showEvent, handleShow);
    const subHide = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      subShow.remove();
      subHide.remove();
    };
  }, [photoScale]);

  // subtle pulse on uploading loader (slower)
  useEffect(() => {
    if (uploadState === "uploading") {
      const pulse = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 1200,
            useNativeDriver: true,
          }),
          RNAnimated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => {
        pulse.stop();
      };
    }
  }, [uploadState, pulseAnim]);

  const handleUpload = async () => {
    if (!caption.trim()) {
      Alert.alert("Missing Caption", "Please add a caption to your frame");
      return;
    }

    Keyboard.dismiss();
    setIsUploading(true);
    setUploadState("uploading");

    RNAnimated.timing(progressAnim, {
      toValue: 0.9,
      duration: 2000,
      useNativeDriver: false,
    }).start();

    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user?.id) {
        throw new Error("Not authenticated");
      }

      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const reader = new FileReader();

      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64String = base64data.split(",")[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      const fileExt = mediaType === "video" ? "mp4" : "jpg";
      const contentType = mediaType === "video" ? "video/mp4" : "image/jpeg";
      const fileName = `${auth.user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("frames")
        .upload(fileName, decode(base64), {
          contentType,
        });

      if (uploadError) throw uploadError;

      const { error: frameError } = await supabase
        .from("frames")
        .insert({
          user_id: auth.user.id,
          media_url: uploadData.path,
          media_kind: mediaType,
          caption: caption.trim(),
        })
        .select()
        .single();

      if (frameError) throw frameError;

      RNAnimated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setUploadState("success");

        RNAnimated.spring(successAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();

        setTimeout(() => {
          router.back();
        }, 1500);
      });
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert(
        "Upload Failed",
        "Failed to upload your frame. Please try again."
      );
      setUploadState("editing");
      progressAnim.setValue(0);
    } finally {
      setIsUploading(false);
    }
  };

  // ========== UPLOADING STATE ==========
  if (uploadState === "uploading") {
    // circle progress from empty -> full, starting at 90°
    const strokeDashoffset = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [LOADER_CIRCUMFERENCE, 0],
    });

    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.uploadingOuter}>
          {/* Niice circular loader */}
          <RNAnimated.View
            style={[
              styles.uploadingCard,
              { transform: [{ scale: pulseAnim }] },
            ]}
          >
            <Svg width={LOADER_SIZE} height={LOADER_SIZE}>
              {/* track circle */}
              <Circle
                cx={LOADER_SIZE / 2}
                cy={LOADER_SIZE / 2}
                r={LOADER_RADIUS}
                stroke="rgba(27,68,205,0.18)"
                strokeWidth={LOADER_STROKE}
                fill="transparent"
              />
              {/* progress circle, starting at 90° (top) */}
              <AnimatedCircle
                cx={LOADER_SIZE / 2}
                cy={LOADER_SIZE / 2}
                r={LOADER_RADIUS}
                stroke={Colors.BLUE}
                strokeWidth={LOADER_STROKE}
                fill="transparent"
                strokeDasharray={`${LOADER_CIRCUMFERENCE}, ${LOADER_CIRCUMFERENCE}`}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                rotation={-90}
                originX={LOADER_SIZE / 2}
                originY={LOADER_SIZE / 2}
              />
            </Svg>

            {/* Niice logo in the center */}
            <View style={styles.loaderLogoOverlay}>
              <View style={styles.loaderLogoContainer}>
                <Image
                  source={require("../../assets/images/niice_logo_icon.png")}
                  style={styles.loaderLogo}
                  resizeMode="contain"
                />
              </View>
            </View>
          </RNAnimated.View>

          {/* Text under loader */}
          <Text style={styles.uploadingTitle}>Uploading frame...</Text>
          <Text style={styles.uploadingSubtext}>
            Hang on while we share your NiiceFrame
          </Text>

          <View style={styles.loadingDots}>
            <View style={styles.dot} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ========== SUCCESS STATE ==========
  if (uploadState === "success") {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.successContainer}>
          <RNAnimated.View
            style={[
              styles.successContent,
              {
                transform: [{ scale: successAnim }],
                opacity: successAnim,
              },
            ]}
          >
            {/* Niice logo + full ring + check badge */}
            <View style={styles.successIconWrapper}>
              <View style={styles.successRing} />

              <View style={styles.successIconBg}>
                <Image
                  source={require("../../assets/images/niice_logo_icon.png")}
                  style={styles.successLogo}
                  resizeMode="contain"
                />
              </View>

              <View style={styles.successCheckBadge}>
                <Ionicons name="checkmark" size={20} color="#FFFFFF" />
              </View>
            </View>

            <Text style={styles.successTitle}>Frame uploaded</Text>
            <Text style={styles.successSubtext}>
              Your frame is now live for everyone to see.
            </Text>
          </RNAnimated.View>
        </View>
      </SafeAreaView>
    );
  }

  // ========== EDITING STATE ==========
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <TouchableWithoutFeedback
        onPress={Keyboard.dismiss}
        accessible={false}
      >
        <KeyboardAvoidingView
          style={styles.editingContainer}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Top bar */}
          <View style={styles.topBar}>
            {/* Left: 24h pill */}
            <View style={styles.leftSlot}>
              <View style={styles.lifetimePill}>
                <Ionicons
                  name="time-outline"
                  size={14}
                  color={Colors.BLUE}
                  style={{ marginRight: scale(4) }}
                />
                <Text style={styles.lifetimeText}>24h</Text>
              </View>
            </View>

            {/* Center: Niice logo + "Frame" = NiiceFrame */}
            <View style={styles.centerTitle}>
              <Image
                source={require("../../assets/images/niice_logo_icon.png")}
                style={styles.logoIcon}
                resizeMode="contain"
              />
              <Text style={styles.titleText}>Frame</Text>
            </View>

            {/* Right: close */}
            <TouchableOpacity
              onPress={() => router.back()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={22} color={Colors.BLUE} />
            </TouchableOpacity>
          </View>

          {/* Media preview */}
          <View style={styles.photoWrapper}>
            <RNAnimated.View
              style={[
                styles.photoCard,
                { transform: [{ scale: photoScale }] },
              ]}
            >
              <View style={styles.photoCardInner}>
                {mediaUri ? (
                  <Image
                    source={{ uri: mediaUri }}
                    style={styles.photo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.photoPlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={40}
                      color="rgba(0,0,0,0.3)"
                    />
                    <Text style={styles.placeholderText}>Photo preview</Text>
                  </View>
                )}
              </View>
            </RNAnimated.View>
          </View>

          {/* Caption bar */}
          <View style={styles.captionWrapper}>
            <View style={styles.captionContainer}>
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(0,0,0,0.35)"
                value={caption}
                onChangeText={setCaption}
                multiline={false}
                returnKeyType="send"
                onSubmitEditing={handleUpload}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!caption.trim() || isUploading) && styles.sendButtonDisabled,
                ]}
                onPress={handleUpload}
                disabled={!caption.trim() || isUploading}
                activeOpacity={0.8}
              >
                <Ionicons name="arrow-forward" size={22} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // ===== editing layout =====
  editingContainer: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(10),
    paddingBottom: verticalScale(16),
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(16),
  },
  leftSlot: {
    width: scale(70),
    alignItems: "flex-start",
    justifyContent: "center",
  },
  lifetimePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.3)",
    backgroundColor: "rgba(27,68,205,0.06)",
  },
  lifetimeText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  centerTitle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    marginLeft: scale(-20), // to offset left slot width
    columnGap: scale(0),
  },
  logoIcon: {
    height: verticalScale(22),
    width: scale(70),
    marginRight: scale(4),
  },
  titleText: {
    color: BLUE,
    fontSize: scale(25),
    fontFamily: Fonts.bold,
    letterSpacing: 0.3,
    marginTop: verticalScale(4.7),
  },
  closeButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
  },

  photoWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  photoCard: {
    width: SCREEN_WIDTH * 0.8,
    aspectRatio: 9 / 16,
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  photoCardInner: {
    flex: 1,
    margin: scale(8),
    borderRadius: scale(16),
    overflow: "hidden",
    backgroundColor: "#000",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4FA",
  },
  placeholderText: {
    marginTop: verticalScale(8),
    color: "rgba(0,0,0,0.4)",
    fontSize: scale(13),
    fontFamily: Fonts.primary,
  },

  captionWrapper: {
    marginTop: verticalScale(18),
  },
  captionContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(999),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  captionInput: {
    flex: 1,
    color: INK,
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    paddingRight: scale(10),
  },
  sendButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },

  // ===== uploading =====
  uploadingOuter: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(40),
  },
  uploadingCard: {
    width: scale(160),
    height: scale(160),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
  },
  loaderLogoOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderLogoContainer: {
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  loaderLogo: {
    width: "70%",
    height: "70%",
  },
  uploadingTitle: {
    fontSize: scale(22),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(6),
  },
  uploadingSubtext: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.65)",
    textAlign: "center",
    marginBottom: verticalScale(12),
  },
  loadingDots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    columnGap: scale(8),
  },
  dot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "rgba(27,68,205,0.6)",
  },

  // ===== success =====
  successContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  successContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  successIconWrapper: {
    width: scale(170),
    height: scale(170),
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(24),
  },
  successRing: {
    position: "absolute",
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    borderWidth: scale(3),
    borderColor: BLUE,
  },
  successIconBg: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
  successLogo: {
    width: "70%",
    height: "70%",
  },
  successCheckBadge: {
    position: "absolute",
    bottom: verticalScale(22),
    right: scale(30),
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  successTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(6),
  },
  successSubtext: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.65)",
    textAlign: "center",
    paddingHorizontal: scale(8),
  },
});
