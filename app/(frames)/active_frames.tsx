// app/(frames)/active_frames.tsx
import { Fonts } from "@/constants/theme";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Image,
    Modal,
    PanResponder,
    Pressable,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const BLUE = "#1B44CD";
const INK = "#000910";

interface Frame {
  id: string;
  created_at: string;
  expires_at: string;
  media_url: string;
  media_kind: "image" | "video";
  caption?: string | null;
}

interface ActiveFramesModalProps {
  visible: boolean;
  onClose: () => void;
  frames: Frame[];
}

export default function ActiveFramesModal({ visible, onClose, frames }: ActiveFramesModalProps) {
  const safeFrames = frames || [];
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);
  const pausedProgressValue = useRef(0);
  
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentFrame = safeFrames[currentIndex];

  // Calculate time since posted
  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const hoursAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
    
    if (hoursAgo === 0) {
      const minsAgo = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
      return minsAgo === 0 ? "now" : `${minsAgo}m`;
    }
    return `${hoursAgo}h`;
  };

  // Start progress animation - FIXED: Removed dependency on isLoading
  const startProgressAnimation = useCallback((fromValue: number = 0) => {
    if (!currentFrame || !visible) return;
    
    const duration = currentFrame.media_kind === "video" ? 15000 : 5000;
    const remainingDuration = duration * (1 - fromValue);
    
    progressAnim.setValue(fromValue);
    
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: remainingDuration,
      useNativeDriver: false,
    });
    
    animationRef.current.start(({ finished }) => {
      if (finished && !isPaused) {
        // Move to next frame or close
        if (currentIndex < frames.length - 1) {
          moveToNextFrame();
        } else {
          onClose();
        }
      }
    });
  }, [currentFrame, currentIndex, frames.length, isPaused, visible, onClose]);

  // Helper function to move to next frame
  const moveToNextFrame = () => {
    setCurrentIndex(prev => prev + 1);
    progressAnim.setValue(0);
    setIsLoading(true);
    setMediaError(false);
  };

  // Helper function to move to previous frame
  const moveToPreviousFrame = () => {
    setCurrentIndex(prev => prev - 1);
    progressAnim.setValue(0);
    setIsLoading(true);
    setMediaError(false);
  };

  // Handle pause
  const handlePause = useCallback(() => {
    if (isPaused) return;
    
    setIsPaused(true);
    
    // Save current progress
    progressAnim.stopAnimation((value) => {
      pausedProgressValue.current = value;
    });
    
    // Pause video if playing
    if (currentFrame?.media_kind === "video" && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isPaused, currentFrame]);

  // Handle resume
  const handleResume = useCallback(() => {
    if (!isPaused) return;
    
    setIsPaused(false);
    
    // Resume video if needed
    if (currentFrame?.media_kind === "video" && videoRef.current) {
      videoRef.current.playAsync();
    }
    
    // Resume animation from saved position
    startProgressAnimation(pausedProgressValue.current);
  }, [isPaused, currentFrame, startProgressAnimation]);

  // Pan responder for swipe down
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
          opacity.setValue(Math.max(0, 1 - gestureState.dy / 300));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100 || gestureState.vy > 0.5) {
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: SCREEN_HEIGHT,
              duration: 200,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: 200,
              useNativeDriver: true,
            }),
          ]).start(() => {
            onClose();
            translateY.setValue(0);
            opacity.setValue(1);
          });
        } else {
          Animated.parallel([
            Animated.spring(translateY, {
              toValue: 0,
              useNativeDriver: true,
              friction: 8,
            }),
            Animated.spring(opacity, {
              toValue: 1,
              useNativeDriver: true,
            }),
          ]).start();
        }
      },
    })
  ).current;

  // Handle tap navigation
  const handleTapLeft = () => {
    if (currentIndex > 0) {
      moveToPreviousFrame();
    }
  };

  const handleTapRight = () => {
    if (currentIndex < frames.length - 1) {
      moveToNextFrame();
    } else {
      onClose();
    }
  };

  // Handle media load success
  const handleMediaLoaded = useCallback(() => {
    console.log("Media loaded successfully for frame:", currentFrame?.id);
    setIsLoading(false);
    setMediaError(false);
    // Start animation immediately after media loads
    if (!isPaused) {
      startProgressAnimation(0);
    }
  }, [currentFrame, isPaused, startProgressAnimation]);

  // Handle media load error
  const handleMediaError = useCallback((error?: any) => {
    console.error("Media failed to load:", currentFrame?.media_url, error);
    setIsLoading(false);
    setMediaError(true);
    // Still start the animation to move to next frame after timeout
    if (!isPaused) {
      startProgressAnimation(0);
    }
  }, [currentFrame, isPaused, startProgressAnimation]);

  // Start animation when frame changes or modal opens - FIXED: Now depends on media loading
  useEffect(() => {
    // Stop any existing animation when frame changes
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progressAnim.setValue(0);
    
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentIndex, visible]);

  // Reset when modal opens/closes
  useEffect(() => {
    if (visible) {
      setCurrentIndex(0);
      progressAnim.setValue(0);
      setIsLoading(true);
      setMediaError(false);
      setIsPaused(false);
      pausedProgressValue.current = 0;
      console.log("Modal opened with frames:", frames.length);
    }
  }, [visible]);

  // Debug logging
  useEffect(() => {
    if (currentFrame) {
      console.log("Current frame:", {
        id: currentFrame.id,
        media_kind: currentFrame.media_kind,
        media_url: currentFrame.media_url,
        caption: currentFrame.caption,
        isLoading,
        mediaError
      });
    }
  }, [currentFrame, isLoading, mediaError]);

  if (!currentFrame || frames.length === 0) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      
      <Animated.View
        style={[
          styles.container,
          {
            opacity,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Background */}
        <View style={styles.background} />
        
        {/* Progress Bars */}
        <View style={styles.progressContainer}>
          {frames.map((_, index) => (
            <View key={index} style={styles.progressSegment}>
              <View style={styles.progressTrack}>
                {index < currentIndex && (
                  <View style={[styles.progressFill, { width: "100%" }]} />
                )}
                {index === currentIndex && (
                  <Animated.View
                    style={[
                      styles.progressFill,
                      {
                        width: progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ["0%", "100%"],
                        }),
                      },
                    ]}
                  />
                )}
              </View>
            </View>
          ))}
        </View>

        {/* Header */}
        <View style={styles.header}>
          <BlurView intensity={80} tint="dark" style={styles.headerBlur}>
            <View style={styles.headerContent}>
              <Text style={styles.timestamp}>{getTimeAgo(currentFrame.created_at)}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>

        {/* Media Content with gesture wrapper */}
        <View style={styles.mediaWrapper} {...panResponder.panHandlers}>
          <Pressable
            style={styles.mediaContainer}
            onLongPress={handlePause}
            onPressOut={handleResume}
            delayLongPress={200}
          >
            {/* Show loading indicator while media is loading */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FFFFFF" />
                <Text style={styles.loadingText}>Loading frame...</Text>
              </View>
            )}

            {/* Show error state if media failed to load */}
            {mediaError && !isLoading && (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>Failed to load media</Text>
                <Text style={styles.errorSubtext}>Moving to next frame...</Text>
              </View>
            )}

            {/* Media content */}
            {currentFrame.media_kind === "image" ? (
              <Image
                source={{ uri: currentFrame.media_url }}
                style={[styles.media, { opacity: isLoading || mediaError ? 0 : 1 }]}
                resizeMode="contain"
                onLoad={handleMediaLoaded}
                onError={handleMediaError}
              />
            ) : (
              <Video
                ref={videoRef}
                source={{ uri: currentFrame.media_url }}
                style={[styles.media, { opacity: isLoading || mediaError ? 0 : 1 }]}
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay={visible && !isPaused && !isLoading}
                isLooping={false}
                volume={1.0}
                onLoad={handleMediaLoaded}
                onError={handleMediaError}
                onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                  if (status.isLoaded && status.didJustFinish && !isPaused) {
                    handleTapRight();
                  }
                }}
              />
            )}
            
            {/* Caption Overlay */}
            {currentFrame.caption && !isLoading && !mediaError && (
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles.captionGradient}
              >
                <Text style={styles.captionText}>{currentFrame.caption}</Text>
              </LinearGradient>
            )}
          </Pressable>

          {/* Tap zones for navigation */}
          <View style={styles.tapZones} pointerEvents="box-none">
            <Pressable style={styles.tapLeft} onPress={handleTapLeft} />
            <Pressable style={styles.tapRight} onPress={handleTapRight} />
          </View>
        </View>

        {/* Pause indicator */}
        {isPaused && (
          <View style={styles.pausedIndicator}>
            <Text style={styles.pausedText}>PAUSED</Text>
          </View>
        )}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },
  progressContainer: {
    position: "absolute",
    top: verticalScale(50),
    left: scale(16),
    right: scale(16),
    flexDirection: "row",
    gap: scale(4),
    zIndex: 10,
  },
  progressSegment: {
    flex: 1,
  },
  progressTrack: {
    height: verticalScale(3),
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: scale(2),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(2),
  },
  header: {
    position: "absolute",
    top: verticalScale(60),
    left: 0,
    right: 0,
    zIndex: 10,
  },
  headerBlur: {
    borderRadius: scale(12),
    overflow: "hidden",
    marginHorizontal: scale(16),
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
  },
  timestamp: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  closeButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  closeIcon: {
    fontSize: moderateScale(18),
    color: "#FFFFFF",
  },
  mediaWrapper: {
    flex: 1,
  },
  mediaContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  media: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    position: "absolute",
  },
  loadingContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  loadingText: {
    marginTop: verticalScale(10),
    fontSize: moderateScale(14),
    fontFamily: Fonts.primary,
    color: "#FFFFFF",
  },
  errorContainer: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: "100%",
  },
  errorText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
    marginBottom: verticalScale(5),
  },
  errorSubtext: {
    fontSize: moderateScale(14),
    fontFamily: Fonts.primary,
    color: "rgba(255,255,255,0.7)",
  },
  captionGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: verticalScale(60),
    paddingBottom: verticalScale(100),
    paddingHorizontal: scale(20),
  },
  captionText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.primary,
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: verticalScale(22),
  },
  tapZones: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
  },
  tapLeft: {
    flex: 1,
  },
  tapRight: {
    flex: 1,
  },
  pausedIndicator: {
    position: "absolute",
    top: "50%",
    alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(8),
  },
  pausedText: {
    color: "#FFFFFF",
    fontFamily: Fonts.bold,
    fontSize: moderateScale(14),
  },
});