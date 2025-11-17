import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Pressable,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import type { Slot } from "./mainphotoslot_";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const H_PAD = scale(20);
const EXTRA_GAP = scale(12);
const EXTRA_SLOT_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - EXTRA_GAP * 2) / 3;


interface PhotoSlotProps {
  slot: Slot;
  isMain?: boolean;
  label: string;
  onPress: () => void;
  onLongPress?: () => void;
  index?: number;
  isUploading?: boolean;
  width?: number;
}

export const PhotoSlot: React.FC<PhotoSlotProps> = ({
  slot,
  isMain = false,
  label,
  onPress,
  onLongPress,
  index = 0,
  isUploading = false,
  width = EXTRA_SLOT_WIDTH,
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
      delay: index * 50,
    }).start();
  }, [index]);

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
      <RNAnimated.View
        style={[
          styles.photoEmpty,
          { transform: [{ scale: scaleIn }], width },
        ]}
      >
        <TouchableOpacity
          onPress={onPress}
          style={styles.emptyContent}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={["rgba(27,68,205,0.03)", "rgba(168,196,255,0.05)"] as const}
            style={StyleSheet.absoluteFillObject}
          />
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
    <RNAnimated.View
      style={[
        styles.photoFilled,
        {
          transform: [{ scale: RNAnimated.multiply(scaleIn, pressScale) }],
          width,
        },
      ]}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={styles.photoContent}
      >
        <Image
          source={{ uri: slot.signedUrl }}
          style={styles.photoImage}
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
            colors={["rgba(27,68,205,0.4)", "rgba(27,68,205,0.2)"] as const}
            style={StyleSheet.absoluteFillObject}
          />
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

const styles = StyleSheet.create({
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
  emptyContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.98)",
  },
  photoContent: {
    flex: 1,
  },
  photoImage: {
    width: "100%",
    height: "100%",
    backgroundColor: "#F0F3F8",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  photoLongPressOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(16),
  },
  photoActions: {
    position: "absolute",
    bottom: scale(12),
    right: scale(12),
  },
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
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  uploadIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(8),
  },
  uploadLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(2),
  },
  uploadHint: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
  },
});