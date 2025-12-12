// utils/responsive.ts
import { Dimensions, Platform, StatusBar } from "react-native";

const { width, height } = Dimensions.get("window");

// Export screen dimensions for components that need them
export const SCREEN_WIDTH = width;
export const SCREEN_HEIGHT = height;

// Reference design is 393x852 (iPhone 14 Pro)
const guidelineBaseWidth = 393;
const guidelineBaseHeight = 852;

// Get actual usable height
const getUsableHeight = () => {
  if (Platform.OS === 'android') {
    const statusBarHeight = StatusBar.currentHeight || 0;
    return height - statusBarHeight;
  }
  return height;
};

const usableHeight = getUsableHeight();

// Calculate scale factors
const widthScale = width / guidelineBaseWidth;
const heightScale = usableHeight / guidelineBaseHeight;

/**
 * Clamp a value between min and max
 */
const clamp = (value: number, min: number, max: number): number => {
  return Math.min(Math.max(value, min), max);
};

/**
 * Horizontal scaling with clamping
 * Prevents elements from becoming too large or too small
 */
export const scale = (size: number): number => {
  const newSize = size * widthScale;
  
  // Clamp between 85% and 125% of base size
  if (size > 0) {
    return clamp(newSize, size * 0.85, size * 1.25);
  }
  return newSize;
};

/**
 * Vertical scaling with MORE flexible clamping for tall screens
 * Allows more growth vertically since screens vary more in height
 */
export const verticalScale = (size: number): number => {
  const newSize = size * heightScale;
  
  // More flexible vertical clamping: 80% to 140%
  // This allows tall screens like Pixel 8 Pro to use more vertical space
  if (size > 0) {
    return clamp(newSize, size * 0.8, size * 1.4);
  }
  return newSize;
};

/**
 * Moderate scaling for fonts - conservative
 */
export const moderateScale = (size: number, factor = 0.5): number => {
  const scaledSize = size + (widthScale - 1) * size * factor;
  
  // Tight clamp for fonts: 90% to 115%
  return clamp(scaledSize, size * 0.9, size * 1.15);
};

/**
 * Debug information
 */
export const getScreenDimensions = () => ({
  width,
  height,
  usableHeight,
  widthScale: widthScale.toFixed(3),
  heightScale: heightScale.toFixed(3),
  platform: Platform.OS,
  statusBarHeight: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  // Test examples
  scale100: scale(100).toFixed(1),
  verticalScale100: verticalScale(100).toFixed(1),
  moderateScale18: moderateScale(18).toFixed(1),
});