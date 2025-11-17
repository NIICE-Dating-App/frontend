import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const BORDER = "rgba(27, 68, 205, 0.08)";

interface ImageSourceSheetProps {
  visible: boolean;
  onClose: () => void;
  // can be async
  onPickLibrary: () => void | Promise<void>;
  onPickCamera: () => void | Promise<void>;
}

export const ImageSourceSheet: React.FC<ImageSourceSheetProps> = ({
  visible,
  onClose,
  onPickLibrary,
  onPickCamera,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <Pressable style={styles.sheetBackdrop} onPress={onClose}>
      <Pressable
        style={styles.sheetContent}
        onPress={(e) => e.stopPropagation()}
      >
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>Add Photo</Text>

        {/* Library button – directly calls the picker handler */}
        <TouchableOpacity
          style={styles.sheetOption}
          onPress={onPickLibrary}
        >
          <View style={styles.sheetOptionIcon}>
            <Ionicons name="images-outline" size={20} color={BLUE} />
          </View>
          <Text style={styles.sheetOptionText}>Choose from Library</Text>
        </TouchableOpacity>

        {/* Camera button – directly calls the picker handler */}
        <TouchableOpacity
          style={styles.sheetOption}
          onPress={onPickCamera}
        >
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

const styles = StyleSheet.create({
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingBottom: verticalScale(34),
  },
  sheetHandle: {
    width: scale(36),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(10,14,26,0.15)",
    alignSelf: "center",
    marginTop: verticalScale(12),
  },
  sheetTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginTop: verticalScale(12),
    marginBottom: verticalScale(20),
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: BORDER,
  },
  sheetOptionIcon: {
    marginRight: scale(16),
    alignItems: "center",
    justifyContent: "center",
    width: scale(24),
  },
  sheetOptionText: {
    fontSize: scale(16),
    fontFamily: Fonts.primary,
    color: INK,
  },
  sheetCancelOption: {
    marginTop: verticalScale(8),
    paddingVertical: verticalScale(16),
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "rgba(10,14,26,0.6)",
  },
});
