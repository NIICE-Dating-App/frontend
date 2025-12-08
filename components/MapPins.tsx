// components/MapPins.tsx
import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path, Circle as SvgCircle } from "react-native-svg";

// ─────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────
const BASE_WIDTH = 375; // iPhone 11 as design base

const Colors = {
  BLUE: "#1B44CD",
  WHITE: "#ffffff",
};

// ─────────────────────────────────────────────────────────────
// MapPin Component
// ─────────────────────────────────────────────────────────────
type MapPinProps = {
  size?: number;
  color?: string;
  dotColor?: string;
  delay?: number;
  style?: any;
  pulse?: boolean;
};

export const MapPin: React.FC<MapPinProps> = ({
  size = 72,
  color = Colors.BLUE,
  dotColor = Colors.WHITE,
  delay = 0,
  style,
  pulse = false,
}) => {
  const translateY = useSharedValue(-120);
  const scale = useSharedValue(1);

  React.useEffect(() => {
    // Drop animation
    translateY.value = withDelay(
      delay,
      withSpring(0, { damping: 12, stiffness: 120 })
    );

    // Optional pulse animation for center pin
    if (pulse) {
      scale.value = withDelay(
        delay + 400,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 1500 }),
            withTiming(1, { duration: 1500 })
          ),
          -1,
          true
        )
      );
    }
  }, [delay, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Svg width={size} height={size * 1.4} viewBox="0 0 50 70">
        <Path
          d="M25 5 C36 5 45 14 45 25 C45 32 40 42 25 62 C10 42 5 32 5 25 C5 14 14 5 25 5 Z"
          fill={color}
        />
        <SvgCircle cx="25" cy="25" r="8" fill={dotColor} />
      </Svg>
    </Animated.View>
  );
};

// ─────────────────────────────────────────────────────────────
// Pin Configuration (percentage-based)
// ─────────────────────────────────────────────────────────────
// All positions are percentages (0-100) of the container
// sizeRatio is relative to base pin size
const PIN_CONFIG = [
  // Center pin - largest, drops first
  { 
    id: 'center',
    top: 22, 
    left: 50, 
    sizeRatio: 2.9, 
    delay: 0,
    pulse: true,
    // Center alignment offset
    alignCenter: true,
  },
  // Top pin
  { 
    id: 'top',
    top: 0, 
    left: 45, 
    sizeRatio: 0.9, 
    delay: 300,
  },
  // Left upper pin
  { 
    id: 'left-upper',
    top: 22, 
    left: 6, 
    sizeRatio: 1, 
    delay: 500,
  },
  // Right upper pin
  { 
    id: 'right-upper',
    top: 24, 
    right: 6, 
    sizeRatio: 1, 
    delay: 700,
  },
  // Left lower pin
  { 
    id: 'left-lower',
    bottom: 2, 
    left: 10, 
    sizeRatio: 0.97, 
    delay: 900,
  },
  // Right lower pin
  { 
    id: 'right-lower',
    bottom: 0, 
    right: 10, 
    sizeRatio: 0.97, 
    delay: 1100,
  },
];

// ─────────────────────────────────────────────────────────────
// LocationPinsHero Component
// ─────────────────────────────────────────────────────────────
export const LocationPinsHero: React.FC = () => {
  const { width, height } = useWindowDimensions();
  
  // Responsive calculations
  const scaleFactor = width / BASE_WIDTH;
  const basePinSize = 72 * scaleFactor;
  
  // Container height scales with screen, with min/max bounds
  const containerHeight = Math.min(
    Math.max(height * 0.4, 280), // Min 280
    420 // Max 420
  );

  return (
    <View style={[styles.heroWrap, { height: containerHeight }]}>
      {PIN_CONFIG.map((pin) => {
        const pinSize = basePinSize * pin.sizeRatio;
        
        // Build position style
        const positionStyle: any = {
          position: 'absolute' as const,
        };
        
        // Handle horizontal positioning
        if (pin.alignCenter) {
          // Center the pin horizontally
          positionStyle.left = '50%';
          positionStyle.marginLeft = -pinSize / 2;
        } else if (pin.left !== undefined) {
          positionStyle.left = `${pin.left}%`;
        } else if (pin.right !== undefined) {
          positionStyle.right = `${pin.right}%`;
        }
        
        // Handle vertical positioning
        if (pin.top !== undefined) {
          positionStyle.top = `${pin.top}%`;
        } else if (pin.bottom !== undefined) {
          positionStyle.bottom = `${pin.bottom}%`;
        }

        return (
          <MapPin
            key={pin.id}
            size={pinSize}
            delay={pin.delay}
            pulse={pin.pulse}
            style={positionStyle}
          />
        );
      })}
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Alternative: Grid-based Layout (more predictable)
// ─────────────────────────────────────────────────────────────
export const LocationPinsHeroGrid: React.FC = () => {
  const { width, height } = useWindowDimensions();
  
  const scaleFactor = width / BASE_WIDTH;
  const basePinSize = 72 * scaleFactor;
  
  const containerHeight = Math.min(Math.max(height * 0.4, 280), 420);
  const centerPinSize = basePinSize * 2.9;
  const smallPinSize = basePinSize * 0.95;

  return (
    <View style={[styles.heroWrap, { height: containerHeight }]}>
      {/* Top row */}
      <View style={styles.topRow}>
        <View style={styles.spacer} />
        <MapPin size={smallPinSize} delay={300} />
        <View style={styles.spacer} />
      </View>

      {/* Middle row with center pin */}
      <View style={styles.middleRow}>
        <MapPin size={basePinSize} delay={500} />
        <MapPin size={centerPinSize} delay={0} pulse />
        <MapPin size={basePinSize} delay={700} />
      </View>

      {/* Bottom row */}
      <View style={styles.bottomRow}>
        <MapPin size={smallPinSize} delay={900} style={styles.bottomLeft} />
        <View style={styles.spacer} />
        <MapPin size={smallPinSize} delay={1100} style={styles.bottomRight} />
      </View>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  heroWrap: {
    width: "100%",
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
    marginBottom: 24,
    // Debug border - remove in production
    // borderWidth: 1,
    // borderColor: 'red',
  },

  // Grid layout styles
  topRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
    flex: 0.25,
  },
  
  middleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    flex: 0.5,
    paddingHorizontal: '5%',
  },
  
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    width: '100%',
    flex: 0.25,
    paddingHorizontal: '8%',
  },
  
  spacer: {
    flex: 1,
  },
  
  bottomLeft: {
    marginTop: -20,
  },
  
  bottomRight: {
    marginTop: -10,
  },
});

export default MapPin;