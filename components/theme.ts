// components/Theme.ts

export const Colors = {
  // Primary colors
  BG: "#FAFBFF",
  INK: "#0A0E1A",
  BLUE: "#1B44CD",
  CARD_BG: "#FFFFFF",
  BORDER: "rgba(27, 68, 205, 0.08)",
  
  // Semantic colors
  ERROR: "#D5222B",
  SUCCESS: "#00B050",
  WARNING: "#FF9500",
  
  // Text colors
  TEXT_PRIMARY: "#0A0E1A",
  TEXT_SECONDARY: "rgba(10,14,26,0.7)",
  TEXT_TERTIARY: "rgba(10,14,26,0.4)",
  TEXT_DISABLED: "rgba(10,14,26,0.3)",
  
  // Overlay colors
  OVERLAY_LIGHT: "rgba(0,0,0,0.3)",
  OVERLAY_MEDIUM: "rgba(0,0,0,0.4)",
  OVERLAY_HEAVY: "rgba(0,0,0,0.5)",
  
  // Component specific
  PHOTO_BORDER: "rgba(27,68,205,0.12)",
  PHOTO_BORDER_MAIN: "rgba(27,68,205,0.2)",
  BADGE_BG: "#1B44CD",
  HANDLE_COLOR: "rgba(10,14,26,0.15)",
  EMPTY_BG: "rgba(255,255,255,0.98)",
} as const;

export const Gradients = {
  primary: ["#1B44CD", "#2E54E8"] as const,
  card: ["#FFFFFF", "#F8FAFF"] as const,
  accent: ["#EEF4FF", "#DCE8FF"] as const,
  photo: ["rgba(27,68,205,0.03)", "rgba(168,196,255,0.05)"] as const,
  photoOverlay: ["transparent", "rgba(0,0,0,0.3)"] as const,
  photoPress: ["rgba(27,68,205,0.5)", "rgba(27,68,205,0.3)"] as const,
  photoPress2: ["rgba(27,68,205,0.4)", "rgba(27,68,205,0.2)"] as const,
  prompt: ["#F0F5FF", "#E8F0FF"] as const,
  header: ["rgba(255,255,255,0.98)", "rgba(250,251,255,0.95)"] as const,
  disabled: ["#CCC", "#AAA"] as const,
} as const;

export const Shadows = {
  small: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  medium: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  large: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
} as const;

export const AnimationConfig = {
  spring: {
    default: {
      tension: 100,
      friction: 8,
    },
    pressIn: {
      tension: 150,
      friction: 8,
    },
    pressOut: {
      tension: 100,
      friction: 5,
    },
  },
  timing: {
    fast: 100,
    normal: 150,
    slow: 200,
    fade: 400,
  },
  scales: {
    pressSmall: 0.98,
    pressMedium: 0.95,
    pressLarge: 0.9,
  },
} as const;

// Re-export for backward compatibility
export const THEME = {
  colors: Colors,
  gradients: Gradients,
  shadows: Shadows,
  animation: AnimationConfig,
} as const;