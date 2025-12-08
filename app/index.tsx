// index.tsx
import { Fonts } from "@/constants/theme";
import { router } from "expo-router";
import React from "react";
import {
	Image,
	StyleSheet,
	Text,
	TouchableOpacity,
	View,
	useWindowDimensions,
} from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withRepeat,
	withSequence,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";

// ─────────────────────────────────────────────────────────────
// Theme Constants
// ─────────────────────────────────────────────────────────────
const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
  WHITE: "#FFFFFF",
  BORDER: "rgba(27,68,205,0.12)",
  CIRCLE_BG: "rgba(27,68,205,0.08)",
  DIVIDER_TEXT: "rgba(10,14,26,0.5)",
};

// Base dimensions (iPhone 11)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// ─────────────────────────────────────────────────────────────
// Responsive Hook
// ─────────────────────────────────────────────────────────────
const useResponsive = () => {
  const { width, height } = useWindowDimensions();
  
  const scale = (size: number) => (width / BASE_WIDTH) * size;
  const verticalScale = (size: number) => (height / BASE_HEIGHT) * size;
  const moderateScale = (size: number, factor = 0.5) => 
    size + (scale(size) - size) * factor;
  
  return { width, height, scale, verticalScale, moderateScale };
};

// ─────────────────────────────────────────────────────────────
// MapPin SVG Component
// ─────────────────────────────────────────────────────────────
const MapPinSvg: React.FC<{ size: number }> = ({ size }) => (
  <Svg
    width={size}
    height={size * 1.4}
    viewBox="0 0 50 70"
    preserveAspectRatio="xMidYMid meet"
  >
    <Path
      d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z"
      fill={Colors.BLUE}
    />
    <SvgCircle cx="25" cy="25" r="8" fill={Colors.WHITE} />
  </Svg>
);

// ─────────────────────────────────────────────────────────────
// CircleWithPin Animated Component
// ─────────────────────────────────────────────────────────────
interface CircleWithPinProps {
  x: number; // scaled pixel position
  y: number; // scaled pixel position
  circleSize: number;
  pinSize: number;
  delay: number;
}

const CircleWithPin: React.FC<CircleWithPinProps> = ({
  x,
  y,
  circleSize,
  pinSize,
  delay,
}) => {
  const translateY = useSharedValue(-100);
  const scaleAnim = useSharedValue(0);
  const pulseScale = useSharedValue(1);

  React.useEffect(() => {
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 12, stiffness: 120 })
    );
    scaleAnim.value = withDelay(
      delay,
      withSpring(1, { damping: 12, stiffness: 120 })
    );

    pulseScale.value = withDelay(
      delay + 400,
      withRepeat(
        withSequence(
          withTiming(1.08, { duration: 2000 }),
          withTiming(1, { duration: 2000 })
        ),
        -1,
        true
      )
    );
  }, [delay]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scaleAnim.value },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.circleContainer,
        animatedStyle,
        {
          left: x,
          top: y,
        },
      ]}
    >
      <View
        style={[
          styles.backgroundCircle,
          {
            width: circleSize,
            height: circleSize,
            borderRadius: circleSize / 2,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.pinWrapper,
          pulseStyle,
          { top: -pinSize * 0.6 },
        ]}
      >
        <MapPinSvg size={pinSize} />
      </Animated.View>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// Background Coordinates - Original design values (base 375x812)
// These will be scaled proportionally to any screen size
// ─────────────────────────────────────────────────────────────
const BG_COORDS = [
  // Top row
  { x: 10, y: 60 },
  { x: 250, y: 75 },
  
  // Upper middle
  { x: 140, y: 100 },
  { x: 320, y: 140 },
  { x: -45, y: 170 },
  { x: 390, y: 175 },
  
  // Center area (will be filtered by safe zone)
  { x: 165, y: 250 },
  
  // Lower middle - sides
  { x: -40, y: 340 },
  { x: 395, y: 350 },
  
  // Bottom row - PUSHED LOWER
  { x: 40, y: 400 },
  { x: 160, y: 370 },
  { x: 280, y: 350 },
];

// ─────────────────────────────────────────────────────────────
// Background Pattern Component
// ─────────────────────────────────────────────────────────────
const BackgroundPattern: React.FC = () => {
  const { height, scale, verticalScale, moderateScale } = useResponsive();
  
  const circleSize = moderateScale(71);
  const pinSize = moderateScale(70);

  // Safe zone for logo (in base pixels, will be scaled)
  const safeTop = verticalScale(180);
  const safeBottom = verticalScale(340);

  return (
    <View style={styles.backgroundPattern} pointerEvents="none">
      {BG_COORDS.map((coord, i) => {
        const scaledY = verticalScale(coord.y);
        
        // Skip pins in the safe zone (where logo is)
        if (scaledY > safeTop && scaledY < safeBottom) {
          return null;
        }

        return (
          <CircleWithPin
            key={i}
            x={scale(coord.x)}
            y={scaledY}
            circleSize={circleSize}
            pinSize={pinSize}
            delay={i * 40}
          />
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────
export default function IndexScreen() {
  const { width, scale, verticalScale, moderateScale } = useResponsive();
  
  // Responsive logo size
  const logoSize = scale(350);

  return (
    <View style={styles.container}>
      {/* Background Pattern - covers full screen */}
      <BackgroundPattern />

      {/* Centered Logo */}
      <View style={[styles.logoContainer, { paddingBottom: verticalScale(290) }]}>
        <Image
          source={require("../assets/images/niice_logo_icon.png")}
          resizeMode="contain"
          style={{ 
            width: logoSize, 
            height: logoSize,
            marginBottom: verticalScale(50),
          }}
        />
      </View>

      {/* Bottom Section with Buttons */}
      <View style={styles.bottomSection}>
        <View
          style={[
            styles.buttonCard,
            {
              borderTopLeftRadius: scale(30),
              borderTopRightRadius: scale(30),
              paddingTop: verticalScale(30),
              paddingHorizontal: scale(20),
            },
          ]}
        >
          <TouchableOpacity 
            style={[styles.socialButton, styles.appleButton, { 
              paddingVertical: verticalScale(16),
              borderRadius: scale(50),
              gap: scale(12),
            }]}
          >
            <Image
              source={require("../assets/images/apple_logo.png")}
              resizeMode="contain"
              style={{ width: scale(22), height: scale(22) }}
            />
            <Text style={[styles.buttonText, { fontSize: scale(16), color: Colors.WHITE }]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>

          <View style={{ height: verticalScale(12) }} />

          <TouchableOpacity 
            style={[styles.socialButton, styles.googleButton, { 
              paddingVertical: verticalScale(16),
              borderRadius: scale(50),
              gap: scale(12),
            }]}
          >
            <Image
              source={require("../assets/images/google_logo.png")}
              resizeMode="contain"
              style={{ width: scale(22), height: scale(22) }}
            />
            <Text style={[styles.buttonText, { fontSize: scale(16), color: Colors.INK }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>

          {/* Divider */}
          <View style={[styles.dividerContainer, { marginVertical: verticalScale(8) }]}>
            <View style={styles.dividerLine} />
            <Text style={[styles.dividerText, { fontSize: scale(14), marginHorizontal: scale(16) }]}>
              or
            </Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.signUpButton, { 
              paddingVertical: verticalScale(16),
              borderRadius: scale(50),
            }]}
            onPress={() => router.push("/signup_phone")}
          >
            <Text style={[styles.buttonText, { fontSize: scale(16), color: Colors.WHITE }]}>
              Sign Up
            </Text>
          </TouchableOpacity>

          <View style={{ height: verticalScale(12) }} />

          <TouchableOpacity
            style={[styles.logInButton, { 
              paddingVertical: verticalScale(16),
              borderRadius: scale(50),
            }]}
            onPress={() => router.push("/login")}
          >
            <Text style={[styles.buttonText, { fontSize: scale(16), color: Colors.INK }]}>
              Log In
            </Text>
          </TouchableOpacity>

          <SafeAreaView edges={["bottom"]} />
        </View>
      </View>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },

  // Background Pattern - full screen
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
    zIndex: 0,
  },

  circleContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  backgroundCircle: {
    backgroundColor: Colors.CIRCLE_BG,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  pinWrapper: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },

  // Logo - centered
  logoContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },

  // Bottom Section
  bottomSection: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },

  buttonCard: {
    backgroundColor: "#E8EEFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },

  // Buttons
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },

  appleButton: {
    backgroundColor: "#000000",
  },

  googleButton: {
    backgroundColor: Colors.WHITE,
    borderWidth: 1,
    borderColor: Colors.BORDER,
  },

  buttonText: {
    fontFamily: Fonts.bold,
  },

  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
  },

  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.BORDER,
  },

  dividerText: {
    fontFamily: Fonts.primary,
    color: Colors.DIVIDER_TEXT,
  },

  signUpButton: {
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },

  logInButton: {
    backgroundColor: Colors.WHITE,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
});