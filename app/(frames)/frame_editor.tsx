// app/(frames)/frame_editor.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { decode } from "base64-arraybuffer";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useRef, useState } from "react";
import {
    Alert,
    Dimensions,
    Image,
    KeyboardAvoidingView,
    Platform,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// =========== THEME ===========
const BG = "#EEF7FF";
const INK = "#000910";
const BLUE = "#1B44CD";
const LIGHT_BLUE = "#A8C4FF";
const WHITE = "#FFFFFF";
const GRAY = "#9CA8B7";
const SUCCESS_GREEN = "#10B981";

const GRADIENTS = {
  save: [BLUE, LIGHT_BLUE] as const,
  cancel: ["#EEF4FF", "#DCE8FF"] as const,
  capture: [BLUE, "#678CFF"] as const,
};

// =========== TIMER COMPONENT ===========
const ExpiryTimer: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  return (
    <View style={[styles.timerChip, compact && styles.timerChipCompact]}>
      <BlurView intensity={80} tint="light" style={StyleSheet.absoluteFillObject} />
      <Text style={[styles.timerText, compact && styles.timerTextCompact]}>⏱ 24h</Text>
    </View>
  );
};

// =========== MAIN COMPONENT ===========
export default function FrameEditor() {
  // Get params passed from profile
  const params = useLocalSearchParams();
  const mediaUri = params.uri as string;
  const mediaType = params.type as 'image' | 'video';
  
  // State
  const [caption, setCaption] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [uploadState, setUploadState] = useState<"editing" | "uploading" | "success">("editing");
  
  // Animation refs
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const successAnim = useRef(new RNAnimated.Value(0)).current;

  // Handle upload
  const handleUpload = async () => {
    if (!caption.trim()) {
      Alert.alert("Missing Caption", "Please add a caption to your frame");
      return;
    }

    setIsUploading(true);
    setUploadState("uploading");

    // Animate progress
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

      // Convert media to base64
      const response = await fetch(mediaUri);
      const blob = await response.blob();
      const reader = new FileReader();
      
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => {
          const base64data = reader.result as string;
          const base64String = base64data.split(',')[1];
          resolve(base64String);
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });

      // Upload to storage
      const fileExt = mediaType === 'video' ? 'mp4' : 'jpg';
      const contentType = mediaType === 'video' ? 'video/mp4' : 'image/jpeg';
      const fileName = `${auth.user.id}/${Date.now()}.${fileExt}`;
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("frames")
        .upload(fileName, decode(base64), {
          contentType,
        });

      if (uploadError) throw uploadError;

      // Create frame record
      const { data: frameData, error: frameError } = await supabase
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

      // Complete progress animation
      RNAnimated.timing(progressAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: false,
      }).start(() => {
        setUploadState("success");
        
        // Success animation
        RNAnimated.spring(successAnim, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }).start();

        // Navigate back to profile after a short delay
        setTimeout(() => {
          router.back();
        }, 1500);
      });
    } catch (error) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", "Failed to upload your frame. Please try again.");
      setUploadState("editing");
    } finally {
      setIsUploading(false);
    }
  };

  // Render uploading state
  if (uploadState === "uploading") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.uploadingContainer}>
          <BlurView intensity={95} tint="light" style={styles.uploadingBlur}>
            <LinearGradient
              colors={["rgba(255,255,255,0.95)", "rgba(246,248,252,0.98)"]}
              style={styles.uploadingGradient}
            >
              <View style={styles.uploadingContent}>
                <Text style={styles.uploadingTitle}>Uploading your Frame</Text>
                
                <View style={styles.progressBarContainer}>
                  <View style={styles.progressBarBg} />
                  <RNAnimated.View
                    style={[
                      styles.progressBarFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={GRADIENTS.capture}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={StyleSheet.absoluteFillObject}
                    />
                  </RNAnimated.View>
                </View>

                <Text style={styles.uploadingSubtext}>This will just take a moment...</Text>
              </View>
            </LinearGradient>
          </BlurView>
        </View>
      </SafeAreaView>
    );
  }

  // Render success state
  if (uploadState === "success") {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
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
            <Text style={styles.successIcon}>✨</Text>
            <Text style={styles.successTitle}>Frame Uploaded!</Text>
            <Text style={styles.successSubtext}>Your frame is now live</Text>
          </RNAnimated.View>
        </View>
      </SafeAreaView>
    );
  }

  // Render editing state
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.cancelButton}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Caption</Text>
          <View style={{ width: scale(60) }} />
        </View>

        <View style={styles.editorContainer}>
          <View style={styles.mediaContainer}>
            {mediaType === 'video' ? (
  <View style={styles.videoPlaceholder}>
    <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="contain" />
    <View style={styles.videoOverlay}>
      <Text style={styles.videoOverlayText}>📹 Video</Text>
    </View>
  </View>
) : (
              <Image source={{ uri: mediaUri }} style={styles.mediaPreview} resizeMode="contain" />
            )}
            
            <View style={styles.captionInputContainer}>
              <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFillObject} />
              <TextInput
                style={styles.captionInput}
                placeholder="Add a caption..."
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={caption}
                onChangeText={setCaption}
                multiline
                maxLength={100}
                returnKeyType="done"
                autoFocus
              />
              <Text style={styles.charCount}>{caption.length}/100</Text>
            </View>

            <ExpiryTimer compact />
          </View>

          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleUpload}
            disabled={isUploading || !caption.trim()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={caption.trim() ? GRADIENTS.save : GRADIENTS.cancel}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.uploadButtonGradient}
            >
              <Text style={[styles.uploadButtonText, !caption.trim() && styles.uploadButtonTextDisabled]}>
                Upload Frame
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// =========== STYLES ===========
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    backgroundColor: BG,
  },
  cancelButton: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  cancelText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
    letterSpacing: 0.3,
  },

  // Editor
  editorContainer: {
    flex: 1,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(20),
  },
  mediaContainer: {
    flex: 1,
    borderRadius: scale(24),
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: verticalScale(20),
  },
  mediaPreview: {
    width: "100%",
    height: "100%",
  },
  videoPlaceholder: {
    flex: 1,
    backgroundColor: "#1a1a1a",
    alignItems: "center",
    justifyContent: "center",
  },
  videoPlaceholderText: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: WHITE,
  },

  // Caption Input
  captionInputContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    minHeight: verticalScale(80),
  },
  captionInput: {
    fontSize: scale(16),
    fontFamily: Fonts.primary,
    color: WHITE,
    textAlign: "center",
    minHeight: verticalScale(50),
  },
  charCount: {
    position: "absolute",
    bottom: verticalScale(8),
    right: scale(20),
    fontSize: scale(12),
    color: "rgba(255,255,255,0.6)",
    fontFamily: Fonts.primary,
  },

  // Upload Button
  uploadButton: {
    height: verticalScale(56),
    borderRadius: scale(28),
    overflow: "hidden",
  },
  uploadButtonGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  uploadButtonText: {
    fontSize: moderateScale(18),
    fontFamily: Fonts.bold,
    color: WHITE,
    letterSpacing: 0.4,
  },
  uploadButtonTextDisabled: {
    color: BLUE,
  },

  // Timer
  timerChip: {
    position: "absolute",
    top: verticalScale(20),
    right: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.2)",
    zIndex: 10,
  },
  timerChipCompact: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
  },
  timerText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.3,
  },
  timerTextCompact: {
    fontSize: scale(12),
  },

  // Uploading
  uploadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: scale(40),
  },
  uploadingBlur: {
    borderRadius: scale(24),
    overflow: "hidden",
    width: "100%",
  },
  uploadingGradient: {
    padding: scale(32),
    borderRadius: scale(24),
  },
  uploadingContent: {
    alignItems: "center",
  },
  uploadingTitle: {
    fontSize: scale(22),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(24),
    letterSpacing: 0.3,
  },
  progressBarContainer: {
    width: scale(200),
    height: verticalScale(8),
    borderRadius: scale(4),
    overflow: "hidden",
    marginBottom: verticalScale(20),
  },
  progressBarBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(27,68,205,0.1)",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  uploadingSubtext: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: GRAY,
  },

  // Success
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  successContent: {
    alignItems: "center",
  },
  successIcon: {
    fontSize: scale(72),
    marginBottom: verticalScale(16),
  },
  successTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(8),
  },
  successSubtext: {
    fontSize: scale(16),
    fontFamily: Fonts.primary,
    color: GRAY,
  },
  videoOverlay: {
  position: 'absolute',
  top: scale(20),
  left: scale(20),
  backgroundColor: 'rgba(0,0,0,0.6)',
  paddingHorizontal: scale(12),
  paddingVertical: verticalScale(6),
  borderRadius: scale(16),
},
videoOverlayText: {
  fontSize: scale(14),
  fontFamily: Fonts.bold,
  color: WHITE,
},
});