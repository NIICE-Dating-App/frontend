// components/NotificationContext.tsx
// Custom iOS-style notification system matching app design (clean, no gradients)

import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import {
    Dimensions,
    Modal,
    Pressable,
    Animated as RNAnimated,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme colors - matching your design system
const BLUE = "#1B44CD";
const INK = "#0A0E1A";
const CARD_BG = "#FFFFFF";
const BG = "#F6F8FC";

type NotificationType = "success" | "error" | "warning" | "info";

interface NotificationConfig {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number;
}

interface ConfirmationConfig {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: string;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface NotificationContextType {
  showNotification: (config: NotificationConfig) => void;
  showConfirmation: (config: ConfirmationConfig) => void;
  hideNotification: () => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within NotificationProvider");
  }
  return context;
};

// iOS-style notification banner component
const NotificationBanner: React.FC<{
  config: NotificationConfig;
  onDismiss: () => void;
}> = ({ config, onDismiss }) => {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new RNAnimated.Value(-200)).current;
  const opacity = useRef(new RNAnimated.Value(0)).current;

  React.useEffect(() => {
    // Slide in
    RNAnimated.parallel([
      RNAnimated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 65,
        friction: 8,
      }),
      RNAnimated.timing(opacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // Auto dismiss
    const duration = config.duration || 3000;
    const timer = setTimeout(() => {
      handleDismiss();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    RNAnimated.parallel([
      RNAnimated.timing(translateY, {
        toValue: -200,
        duration: 250,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIconConfig = () => {
    switch (config.type) {
      case "success":
        return { name: "checkmark-circle", color: "#22C55E" };
      case "error":
        return { name: "close-circle", color: "#EF4444" };
      case "warning":
        return { name: "warning", color: "#F59E0B" };
      case "info":
        return { name: "information-circle", color: BLUE };
    }
  };

  const iconConfig = getIconConfig();

  return (
    <RNAnimated.View
      style={[
        styles.bannerContainer,
        {
          top: insets.top + verticalScale(8),
          transform: [{ translateY }],
          opacity,
        },
      ]}
    >
      <Pressable onPress={handleDismiss} style={styles.banner}>
        <BlurView intensity={95} tint="light" style={StyleSheet.absoluteFillObject} />
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(255,255,255,0.92)" }]} />
        
        <View style={styles.bannerContent}>
          <View style={[styles.iconCircle, { backgroundColor: `${iconConfig.color}15` }]}>
            <Ionicons name={iconConfig.name as any} size={22} color={iconConfig.color} />
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.bannerTitle} numberOfLines={1}>{config.title}</Text>
            {config.message && (
              <Text style={styles.bannerMessage} numberOfLines={2}>{config.message}</Text>
            )}
          </View>

          <TouchableOpacity onPress={handleDismiss} style={styles.dismissButton} hitSlop={8}>
            <Ionicons name="close" size={18} color="rgba(10,14,26,0.4)" />
          </TouchableOpacity>
        </View>
      </Pressable>
    </RNAnimated.View>
  );
};

// iOS-style confirmation modal
const ConfirmationModal: React.FC<{
  config: ConfirmationConfig;
  onDismiss: () => void;
}> = ({ config, onDismiss }) => {
  const scaleAnim = useRef(new RNAnimated.Value(0.9)).current;
  const opacityAnim = useRef(new RNAnimated.Value(0)).current;
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    RNAnimated.parallel([
      RNAnimated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      RNAnimated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleDismiss = () => {
    RNAnimated.parallel([
      RNAnimated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 150,
        useNativeDriver: true,
      }),
      RNAnimated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await config.onConfirm();
      handleDismiss();
    } catch (error) {
      console.error("Confirmation action failed:", error);
      setLoading(false);
    }
  };

  const handleCancel = () => {
    config.onCancel?.();
    handleDismiss();
  };

  return (
    <Modal transparent visible animationType="none">
      <Pressable style={styles.modalBackdrop} onPress={handleCancel}>
        <RNAnimated.View style={{ opacity: opacityAnim, flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Pressable onPress={(e) => e.stopPropagation()}>
            <RNAnimated.View style={[styles.confirmationContainer, { transform: [{ scale: scaleAnim }] }]}>
              <BlurView intensity={100} tint="light" style={StyleSheet.absoluteFillObject} />
              <View style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(255,255,255,0.98)" }]} />
              
              <View style={styles.confirmationContent}>
                <Text style={styles.confirmationTitle}>{config.title}</Text>
                <Text style={styles.confirmationMessage}>{config.message}</Text>
                
                <View style={styles.confirmationButtons}>
                  <TouchableOpacity
                    onPress={handleCancel}
                    style={[styles.confirmationButton, styles.cancelButton]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>
                      {config.cancelText || "Cancel"}
                    </Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleConfirm}
                    style={[
                      styles.confirmationButton,
                      styles.confirmButton,
                      { backgroundColor: config.confirmColor || "#EF4444" },
                    ]}
                    activeOpacity={0.7}
                    disabled={loading}
                  >
                    <Text style={styles.confirmButtonText}>
                      {loading ? "..." : (config.confirmText || "Confirm")}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </RNAnimated.View>
          </Pressable>
        </RNAnimated.View>
      </Pressable>
    </Modal>
  );
};

// Provider component
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notification, setNotification] = useState<NotificationConfig | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationConfig | null>(null);

  const showNotification = useCallback((config: NotificationConfig) => {
    setNotification(config);
  }, []);

  const showConfirmation = useCallback((config: ConfirmationConfig) => {
    setConfirmation(config);
  }, []);

  const hideNotification = useCallback(() => {
    setNotification(null);
  }, []);

  const hideConfirmation = useCallback(() => {
    setConfirmation(null);
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification, showConfirmation, hideNotification }}>
      {children}
      
      {notification && (
        <NotificationBanner config={notification} onDismiss={hideNotification} />
      )}
      
      {confirmation && (
        <ConfirmationModal config={confirmation} onDismiss={hideConfirmation} />
      )}
    </NotificationContext.Provider>
  );
};

const styles = StyleSheet.create({
  // Banner styles
  bannerContainer: {
    position: "absolute",
    left: scale(16),
    right: scale(16),
    zIndex: 9999,
  },
  banner: {
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 10,
  },
  bannerContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(14),
    gap: scale(12),
  },
  iconCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: verticalScale(2),
  },
  bannerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    letterSpacing: 0.2,
  },
  bannerMessage: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
    lineHeight: scale(18),
  },
  dismissButton: {
    padding: scale(4),
  },

  // Confirmation modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
  confirmationContainer: {
    width: SCREEN_WIDTH - scale(64),
    maxWidth: scale(340),
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.25,
    shadowRadius: 32,
    elevation: 20,
  },
  confirmationContent: {
    padding: scale(24),
    gap: verticalScale(20),
  },
  confirmationTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    textAlign: "center",
    letterSpacing: 0.3,
  },
  confirmationMessage: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.7)",
    textAlign: "center",
    lineHeight: scale(22),
  },
  confirmationButtons: {
    flexDirection: "row",
    gap: scale(12),
  },
  confirmationButton: {
    flex: 1,
    paddingVertical: verticalScale(14),
    borderRadius: scale(12),
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "rgba(10,14,26,0.06)",
  },
  cancelButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    letterSpacing: 0.2,
  },
  confirmButton: {
    backgroundColor: "#EF4444",
  },
  confirmButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
});