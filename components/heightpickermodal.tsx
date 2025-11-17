import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";

// Theme constants
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const GRADIENTS = {
  primary: [BLUE, "#2E54E8"] as const,
};

interface HeightPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: (height: number) => void;
  initialHeight?: number | null;
}

export const HeightPickerModal: React.FC<HeightPickerModalProps> = ({
  visible,
  onClose,
  onSave,
  initialHeight = 170,
}) => {
  const [selected, setSelected] = useState<number>((initialHeight ?? 170) || 170);
  const scrollRef = useRef<ScrollView>(null);
  
  // Generate heights from 140cm to 240cm
  const heights = useMemo(() => Array.from({ length: 101 }, (_, i) => 140 + i), []);
  
  // Fixed item height - this is crucial for alignment
  const ITEM_HEIGHT = verticalScale(50);
  
  // Container height - should contain exactly 4 items visible
  const CONTAINER_HEIGHT = verticalScale(200);
  
  // Calculate padding to center the items properly
  // We want the middle item to align with the highlight
  const VERTICAL_PADDING = (CONTAINER_HEIGHT - ITEM_HEIGHT) / 2;

  // Scroll to initial height when modal opens
  useEffect(() => {
    if (!visible) return;
    
    // Small delay to ensure ScrollView is mounted
    const timer = setTimeout(() => {
      const index = selected - 140;
      const scrollY = index * ITEM_HEIGHT;
      scrollRef.current?.scrollTo({ y: scrollY, animated: false });
    }, 150);
    
    return () => clearTimeout(timer);
  }, [visible, selected, ITEM_HEIGHT]);

  // Handle scroll end to snap to nearest item
  const handleScrollEnd = (event: any) => {
    const scrollY = event.nativeEvent.contentOffset.y;
    const index = Math.round(scrollY / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(index, heights.length - 1));
    const newHeight = heights[clampedIndex];
    
    if (newHeight && newHeight !== selected) {
      setSelected(newHeight);
    }
  };

  // Handle item press - scroll to that item
  const handleItemPress = (height: number) => {
    setSelected(height);
    const index = height - 140;
    const scrollY = index * ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y: scrollY, animated: true });
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e.stopPropagation()}
        >
          <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFillObject} />
          
          {/* Modal Handle */}
          <View style={styles.modalHandle} />
          
          {/* Title */}
          <Text style={styles.modalTitle}>Select Height</Text>
          
          {/* Picker Container */}
          <View style={[styles.pickerContainer, { height: CONTAINER_HEIGHT }]}>
            {/* Highlight - Fixed in the center */}
            <View 
              style={[
                styles.pickerHighlight, 
                { 
                  height: ITEM_HEIGHT,
                  top: VERTICAL_PADDING,
                }
              ]} 
            />
            
            {/* Scrollable List */}
            <ScrollView
              ref={scrollRef}
              showsVerticalScrollIndicator={false}
              snapToInterval={ITEM_HEIGHT}
              snapToAlignment="start"
              decelerationRate="fast"
              onMomentumScrollEnd={handleScrollEnd}
              onScrollEndDrag={handleScrollEnd}
              contentContainerStyle={{ 
                paddingTop: VERTICAL_PADDING,
                paddingBottom: VERTICAL_PADDING,
              }}
            >
              {heights.map((height) => (
                <Pressable
                  key={height}
                  onPress={() => handleItemPress(height)}
                  style={[styles.pickerItem, { height: ITEM_HEIGHT }]}
                >
                  <Text
                    style={[
                      styles.pickerText,
                      selected === height && styles.pickerTextActive,
                    ]}
                  >
                    {height} cm
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
          
          {/* Action Buttons */}
          <View style={styles.modalActions}>
            <TouchableOpacity onPress={onClose} style={styles.modalCancel}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                onSave(selected);
                onClose();
              }}
              style={styles.modalSave}
            >
              <LinearGradient
                colors={GRADIENTS.primary}
                style={styles.modalSaveGradient}
              >
                <Text style={styles.modalSaveText}>Save</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    paddingBottom: verticalScale(34),
    maxHeight: "60%",
  },
  modalHandle: {
    width: scale(36),
    height: verticalScale(4),
    borderRadius: scale(2),
    backgroundColor: "rgba(10,14,26,0.15)",
    alignSelf: "center",
    marginTop: verticalScale(12),
  },
  modalTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginTop: verticalScale(16),
    marginBottom: verticalScale(24),
  },
  pickerContainer: {
    position: "relative",
    overflow: "hidden",
  },
  pickerHighlight: {
    position: "absolute",
    left: scale(30),
    right: scale(30),
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: BLUE,
    zIndex: 1,
    pointerEvents: "none", // Allow touches to pass through to ScrollView
  },
  pickerItem: {
    alignItems: "center",
    justifyContent: "center",
  },
  pickerText: {
    fontSize: scale(16),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.4)",
    textAlign: "center",
  },
  pickerTextActive: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  modalActions: {
    flexDirection: "row",
    paddingHorizontal: scale(24),
    paddingTop: verticalScale(24),
    gap: scale(12),
  },
  modalCancel: {
    flex: 1,
    height: verticalScale(48),
    borderRadius: scale(24),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  modalSave: {
    flex: 1,
    borderRadius: scale(24),
    overflow: "hidden",
  },
  modalSaveGradient: {
    height: verticalScale(48),
    alignItems: "center",
    justifyContent: "center",
  },
  modalSaveText: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
});