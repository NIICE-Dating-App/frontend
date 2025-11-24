// app/(frames)/camera.tsx

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const BG = Colors.BG;
const INK = Colors.INK;
// const BLUE = Colors.BLUE; // not used here on purpose

type CameraFacing = "front" | "back";
type CaptureMode = "photo" | "video";

// Correct way to type the ref for CameraView
type CameraRef = React.ElementRef<typeof CameraView>;

export default function FramesCamera() {
  const [permission, requestPermission] = useCameraPermissions();

  const cameraRef = useRef<CameraRef | null>(null);

  const [facing, setFacing] = useState<CameraFacing>("back");
  const [mode, setMode] = useState<CaptureMode>("photo");
  const [torchOn, setTorchOn] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);

  // Ask for permission on mount
  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const ensurePermission = async () => {
    if (permission?.granted) return true;
    const result = await requestPermission();
    if (!result.granted) {
      Alert.alert(
        "Camera permission",
        "Camera access is required to take photos and videos."
      );
      return false;
    }
    return true;
  };

  const handleToggleFacing = () => {
    setFacing((prev) => (prev === "back" ? "front" : "back"));
  };

  const handleToggleTorch = () => {
    setTorchOn((prev) => !prev);
  };

  const handleCapture = async () => {
    const ok = await ensurePermission();
    if (!ok) return;

    if (!cameraRef.current || !cameraReady) {
      Alert.alert("Camera not ready", "Please wait a moment and try again.");
      return;
    }

    try {
      // PHOTO MODE
      if (mode === "photo") {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.9,
          skipProcessing: true,
        });

        if (photo?.uri) {
          router.push({
            pathname: "/(frames)/frame_editor",
            params: {
              uri: photo.uri,
              type: "image",
            },
          });
        }
        return;
      }

      // VIDEO MODE
      if (mode === "video") {
        // If already recording → stop
        if (isRecording) {
          cameraRef.current.stopRecording();
          return;
        }

        // Start recording
        setIsRecording(true);
        const video = await cameraRef.current.recordAsync({
          maxDuration: 30,
          // NOTE: no "quality" field here – that fixed the TS error
        });
        setIsRecording(false);

        if (video?.uri) {
          router.push({
            pathname: "/(frames)/frame_editor",
            params: {
              uri: video.uri,
              type: "video",
            },
          });
        }
      }
    } catch (error) {
      console.error("Camera capture error:", error);
      setIsRecording(false);
      const msg = error instanceof Error ? error.message : "Unknown error.";
      Alert.alert("Camera error", msg);
    }
  };

  // === Permission UI states ===
  if (!permission) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.permissionTitle}>Loading camera…</Text>
      </SafeAreaView>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.permissionContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.permissionTitle}>Allow Camera Access</Text>
        <Text style={styles.permissionText}>
          NIICE needs access to your camera so you can create frames with
          photos and videos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          activeOpacity={0.85}
          onPress={ensurePermission}
        >
          <Text style={styles.permissionButtonText}>Enable Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.permissionSecondary}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.permissionSecondaryText}>Go back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // === MAIN CAMERA UI ===
  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <StatusBar barStyle="light-content" />

      <View style={styles.cameraRoot}>
        {/* Fullscreen camera */}
        <CameraView
          ref={cameraRef}
          style={styles.cameraView}
          facing={facing}
          mode={mode === "photo" ? "picture" : "video"}
          enableTorch={torchOn}
          videoQuality="1080p"
          onCameraReady={() => setCameraReady(true)}
        />

        {/* Overlay UI on top of camera */}
        <View style={styles.cameraOverlay} pointerEvents="box-none">
          {/* Top bar INSIDE camera (back + title) */}
          <View style={styles.topBar}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => router.back()}
              style={styles.topIconButton}
            >
              <Ionicons name="chevron-back" size={22} color="#FFFFFF" />
            </TouchableOpacity>

            

            {/* fake spacer to keep title centered */}
            <View style={styles.topRightSpacer} />
          </View>

          {/* Bottom controls over camera */}
          <View style={styles.bottomArea} pointerEvents="box-none">
            {mode === "video" && (
              <View style={styles.recordHintRow}>
                <View
                  style={[
                    styles.recordDot,
                    isRecording && styles.recordDotActive,
                  ]}
                />
                <Text style={styles.recordHintText}>
                  {isRecording
                    ? "Recording… tap the button to stop"
                    : "Tap to start recording"}
                </Text>
              </View>
            )}

            <View style={styles.controlsRow}>
              {/* Left: Torch */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleTorch}
                style={styles.smallControlButton}
              >
                <Ionicons
                  name={torchOn ? "flash" : "flash-off"}
                  size={22}
                  color={torchOn ? "#FFD966" : "#FFFFFF"}
                />
              </TouchableOpacity>

              {/* Center: Shutter */}
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={handleCapture}
                style={styles.shutterOuter}
              >
                <View
                  style={[
                    styles.shutterInner,
                    isRecording && styles.shutterInnerRecording,
                  ]}
                />
              </TouchableOpacity>

              {/* Right: Switch camera */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={handleToggleFacing}
                style={styles.smallControlButton}
              >
                <MaterialCommunityIcons
                  name="camera-switch"
                  size={24}
                  color="#FFFFFF"
                />
              </TouchableOpacity>
            </View>

            {/* Photo / Video mode bar on top of camera, transparent */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.modeChip,
                  mode === "photo" && styles.modeChipActive,
                ]}
                onPress={() => setMode("photo")}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    mode === "photo" && styles.modeChipTextActive,
                  ]}
                >
                  Photo
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.9}
                style={[
                  styles.modeChip,
                  mode === "video" && styles.modeChipActive,
                ]}
                onPress={() => setMode("video")}
              >
                <Text
                  style={[
                    styles.modeChipText,
                    mode === "video" && styles.modeChipTextActive,
                  ]}
                >
                  Video
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

// =================== STYLES ===================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000", // dark neutral, no main blue
  },

  // Permission screen
  permissionContainer: {
    flex: 1,
    backgroundColor: BG,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  permissionTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(10),
  },
  permissionText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    textAlign: "center",
    lineHeight: verticalScale(20),
    marginBottom: verticalScale(18),
  },
  permissionButton: {
    backgroundColor: "#111827",
    borderRadius: scale(24),
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: verticalScale(8),
  },
  permissionButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  permissionSecondary: {
    paddingVertical: verticalScale(6),
  },
  permissionSecondaryText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "#111827",
  },

  // Camera root & overlay
  cameraRoot: {
    flex: 1,
    backgroundColor: "#000000",
  },
  cameraView: {
    flex: 1,
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(24),
    paddingTop: verticalScale(6),
  },

  // Top bar INSIDE camera
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topIconButton: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.18)",
  },
  topTitleWrapper: {
    flex: 1,
    alignItems: "center",
  },
  topTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  topRightSpacer: {
    width: scale(38),
    height: scale(38),
  },

  // Bottom overlay area (controls + Photo/Video bar)
  bottomArea: {
    paddingBottom: verticalScale(4),
  },

  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(40),
    marginBottom: verticalScale(12),
  },
  smallControlButton: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(21),
    backgroundColor: "rgba(0,0,0,0.65)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.24)",
  },

  shutterOuter: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    borderWidth: scale(4),
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  shutterInner: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: "#FFFFFF",
  },
  shutterInnerRecording: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(10),
    backgroundColor: "#FF4D4F",
  },

  // Photo / Video mode bar – transparent on top of camera
  modeSwitcher: {
    alignSelf: "center",
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: scale(24),
    padding: scale(4),
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  modeChip: {
    flex: 1,
    borderRadius: scale(20),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(16),
    alignItems: "center",
    justifyContent: "center",
  },
  modeChipActive: {
    backgroundColor: "#FFFFFF",
  },
  modeChipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 0.4,
  },
  modeChipTextActive: {
    color: "#050814",
  },

  // Recording hint
  recordHintRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  recordDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: "rgba(255,255,255,0.5)",
    marginRight: scale(6),
  },
  recordDotActive: {
    backgroundColor: "#FF4D4F",
  },
  recordHintText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(255,255,255,0.9)",
  },
});
