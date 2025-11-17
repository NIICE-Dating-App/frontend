import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Image,
    Pressable,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const AVATAR_SIZE = scale(180);

export interface Slot {
  id?: string;
  signedUrl?: string;
  storagePath?: string;
  rawUrl?: string;
  key?: string;
}

interface MainPhotoSlotProps {
  slot: Slot;
  onPress: () => void;
  onLongPress?: () => void;
  isUploading?: boolean;
}

export const MainPhotoSlot: React.FC<MainPhotoSlotProps> = ({
  slot,
  onPress,
  onLongPress,
  isUploading = false,
}) => {
  const scaleIn = useRef(new RNAnimated.Value(0)).current;
  const pressScale = useRef(new RNAnimated.Value(1)).current;
  const overlayOpacity = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    RNAnimated.spring(scaleIn, {
      toValue: 1,
      tension: 100,
      friction: 8,
      useNativeDriver: true,
    }).start();
  }, []);

  const handlePressIn = () => {
    RNAnimated.parallel([
      RNAnimated.timing(pressScale, {
        toValue: 0.95,
        duration: 150,
        useNativeDriver: true,
      }),
      RNAnimated.timing(overlayOpacity, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handlePressOut = () => {
    RNAnimated.parallel([
      RNAnimated.spring(pressScale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      RNAnimated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  if (!slot.signedUrl) {
    return (
      <View style={styles.mainPhotoWrapperContainer}>
        <RNAnimated.View
          style={[
            styles.mainPhotoEmpty,
            { transform: [{ scale: scaleIn }], width: AVATAR_SIZE, height: AVATAR_SIZE },
          ]}
        >
          <TouchableOpacity
            onPress={onPress}
            style={styles.mainEmptyContent}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={["rgba(27,68,205,0.03)", "rgba(168,196,255,0.05)"] as const}
              style={StyleSheet.absoluteFillObject}
            />
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
      <RNAnimated.View
        style={[
          styles.mainPhotoFilled,
          {
            transform: [{ scale: RNAnimated.multiply(scaleIn, pressScale) }],
            width: AVATAR_SIZE,
            height: AVATAR_SIZE,
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          style={styles.mainPhotoContent}
        >
          <Image
            source={{ uri: slot.signedUrl }}
            style={styles.mainPhotoImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.3)"] as const}
            style={styles.photoOverlay}
          />
          <RNAnimated.View
            style={[styles.photoLongPressOverlay, { opacity: overlayOpacity }]}
          >
            <LinearGradient
              colors={["rgba(27,68,205,0.5)", "rgba(27,68,205,0.3)"] as const}
              style={StyleSheet.absoluteFillObject}
            />
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
      <TouchableOpacity
        onPress={onPress}
        style={styles.mainEditBtn}
        activeOpacity={0.85}
      >
        <LinearGradient colors={[BLUE, "#2E54E8"] as const} style={styles.editBtnGradient}>
          <Ionicons name="pencil" size={18} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
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
  mainPhotoContent: {
    flex: 1,
  },
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
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  photoLongPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(16),
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  mainBadgeOutside: {
    position: "absolute",
    top: scale(8),
    left: scale(8),
    backgroundColor: BLUE,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: scale(14),
  },
  mainBadgeText: {
    fontSize: scale(10),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
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
  editBtnGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});