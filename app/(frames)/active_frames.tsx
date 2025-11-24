// app/(frames)/active_frames.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { AVPlaybackStatus, ResizeMode, Video } from "expo-av";
import { router } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

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
  onDeleted?: (id: string) => void;
  onEdit?: (frame: Frame) => void;
}

// helpers for Supabase avatar
const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = [
    "/object/sign/user_photos/",
    "/object/public/user_photos/",
    "/user_photos/",
  ];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) {
      return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
    }
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("user_photos")
    .createSignedUrl(path, 3600);

  if (error) {
    console.warn("signPath error:", error.message);
    return null;
  }
  return data?.signedUrl ?? null;
};

const ActiveFramesModal: React.FC<ActiveFramesModalProps> = ({
  visible,
  onClose,
  frames,
  onDeleted,
  onEdit,
}) => {
  const [frameList, setFrameList] = useState<Frame[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [mediaError, setMediaError] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const progressAnim = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const videoRef = useRef<Video>(null);
  const pausedProgressValue = useRef(0);

  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const currentFrame = frameList[currentIndex];

  // time ago
  const getTimeAgo = (createdAt: string): string => {
    const now = new Date();
    const created = new Date(createdAt);
    const diffMs = now.getTime() - created.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    if (hours <= 0) {
      const mins = Math.floor(diffMs / (1000 * 60));
      return mins <= 0 ? "now" : `${mins}m`;
    }
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  // load frames when modal opens
  useEffect(() => {
    if (visible) {
      setFrameList(frames || []);
      setCurrentIndex(0);
      progressAnim.setValue(0);
      setIsLoading(true);
      setMediaError(false);
      setIsPaused(false);
      pausedProgressValue.current = 0;
      setMenuVisible(false);
    }
  }, [visible, frames, progressAnim]);

  // load main avatar from user_photos where is_main = true
  useEffect(() => {
    if (!visible) return;
    let isMounted = true;

    const loadAvatar = async () => {
      try {
        const { data: auth } = await supabase.auth.getUser();
        const userId = auth?.user?.id;
        if (!userId) return;

        const { data, error } = await supabase
          .from("user_photos")
          .select("photo_url")
          .eq("user_id", userId)
          .eq("is_main", true)
          .maybeSingle();

        if (error) {
          console.error("Error loading main photo:", error);
          return;
        }

        const rawUrl = (data as any)?.photo_url ?? null;
        if (!rawUrl) return;

        const signed = await signPath(toStoragePath(rawUrl));
        if (isMounted) {
          setAvatarUrl(signed ?? rawUrl);
        }
      } catch (e) {
        console.error("Avatar load error:", e);
      }
    };

    loadAvatar();
    return () => {
      isMounted = false;
    };
  }, [visible]);

  // 15s progress animation
  const moveToNextFrame = useCallback(() => {
    setCurrentIndex((prev) => {
      const next = Math.min(prev + 1, Math.max(frameList.length - 1, 0));
      return next;
    });
    progressAnim.setValue(0);
    setIsLoading(true);
    setMediaError(false);
    pausedProgressValue.current = 0;
  }, [frameList.length, progressAnim]);

  const moveToPreviousFrame = useCallback(() => {
    setCurrentIndex((prev) => Math.max(prev - 1, 0));
    progressAnim.setValue(0);
    setIsLoading(true);
    setMediaError(false);
    pausedProgressValue.current = 0;
  }, [progressAnim]);

  const startProgressAnimation = useCallback(
    (fromValue: number = 0) => {
      if (!currentFrame || !visible || frameList.length === 0) return;

      const duration = 15000; // 15s photo & video
      const remainingDuration = duration * (1 - fromValue);

      progressAnim.setValue(fromValue);

      if (animationRef.current) {
        animationRef.current.stop();
      }

      animationRef.current = Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingDuration,
        useNativeDriver: false,
      });

      animationRef.current.start(({ finished }) => {
        if (finished && !isPaused) {
          if (currentIndex < frameList.length - 1) {
            moveToNextFrame();
          } else {
            onClose();
          }
        }
      });
    },
    [currentFrame, visible, frameList.length, isPaused, currentIndex, moveToNextFrame, onClose, progressAnim]
  );

  // pause / resume (long press)
  const handlePause = useCallback(() => {
    if (isPaused) return;
    setIsPaused(true);

    progressAnim.stopAnimation((value) => {
      pausedProgressValue.current = value;
    });

    if (currentFrame?.media_kind === "video" && videoRef.current) {
      videoRef.current.pauseAsync();
    }
  }, [isPaused, currentFrame, progressAnim]);

  const handleResume = useCallback(() => {
    if (!isPaused) return;
    setIsPaused(false);

    if (currentFrame?.media_kind === "video" && videoRef.current) {
      videoRef.current.playAsync();
    }

    startProgressAnimation(pausedProgressValue.current);
  }, [isPaused, currentFrame, startProgressAnimation]);

  // swipe down to close
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 10 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
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

  const handleTapLeft = () => {
    if (currentIndex > 0) {
      moveToPreviousFrame();
    }
  };

  const handleTapRight = () => {
    if (currentIndex < frameList.length - 1) {
      moveToNextFrame();
    } else {
      onClose();
    }
  };

  // media events
  const handleMediaLoaded = useCallback(() => {
    setIsLoading(false);
    setMediaError(false);
    if (!isPaused) {
      startProgressAnimation(0);
    }
  }, [isPaused, startProgressAnimation]);

  const handleMediaError = useCallback(
    (error?: any) => {
      console.error("Media failed to load:", currentFrame?.media_url, error);
      setIsLoading(false);
      setMediaError(true);
      if (!isPaused) {
        startProgressAnimation(0);
      }
    },
    [currentFrame, isPaused, startProgressAnimation]
  );

  useEffect(() => {
    if (animationRef.current) {
      animationRef.current.stop();
    }
    progressAnim.setValue(0);
    return () => {
      if (animationRef.current) {
        animationRef.current.stop();
      }
    };
  }, [currentIndex, visible, progressAnim]);

  if (!currentFrame || frameList.length === 0) return null;

  // delete helpers
  const removeFrameLocally = (id: string) => {
    setFrameList((prev) => {
      const updated = prev.filter((f) => f.id !== id);
      if (updated.length === 0) {
        onClose();
        return updated;
      }

      const deletedIndex = prev.findIndex((f) => f.id === id);
      const nextIndex =
        deletedIndex >= updated.length ? updated.length - 1 : deletedIndex;

      setCurrentIndex(nextIndex);
      progressAnim.setValue(0);
      setIsLoading(true);
      setMediaError(false);
      pausedProgressValue.current = 0;

      return updated;
    });
  };

  const handleDeleteFrame = () => {
    if (!currentFrame) return;
    Alert.alert("Delete frame?", "This frame will be removed permanently.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const { error } = await supabase
              .from("frames")
              .delete()
              .eq("id", currentFrame.id);
            if (error) {
              console.error("Failed to delete frame:", error);
              Alert.alert("Error", "Could not delete frame. Please try again.");
              return;
            }
            setMenuVisible(false);
            removeFrameLocally(currentFrame.id);
            onDeleted?.(currentFrame.id);
          } catch (e) {
            console.error("Delete frame exception:", e);
            Alert.alert("Error", "Could not delete frame. Please try again.");
          }
        },
      },
    ]);
  };

  const handleEditFrame = () => {
    if (!currentFrame) return;
    setMenuVisible(false);
    handlePause();

    // go back to editor (or caption page if you change it)
    router.push({
      pathname: "/(frames)/frame_editor",
      params: {
        frameId: currentFrame.id,
      },
    });

    onEdit?.(currentFrame);
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="overFullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={styles.safeContainer} edges={["top"]}>
        <Animated.View
          style={[
            styles.container,
            {
              opacity,
              transform: [{ translateY }],
            },
          ]}
        >
          <View style={styles.background} />

          {/* TOP overlay: progress + avatar in top-left */}
          <View style={styles.topOverlay}>
            <View style={styles.progressContainer}>
              {frameList.map((_, index) => (
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

            <View style={styles.topUserRow}>
              <View style={styles.avatarWrapper}>
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={styles.avatar}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.avatarPlaceholder} />
                )}
              </View>
              <View style={styles.headerTextColumn}>
                <Text style={styles.headerName}>You</Text>
                <Text style={styles.headerTime}>
                  {getTimeAgo(currentFrame.created_at)}
                </Text>
              </View>
            </View>
          </View>

          {/* media */}
          <View style={styles.mediaWrapper} {...panResponder.panHandlers}>
            <Pressable
              style={styles.mediaPressable}
              onLongPress={handlePause}
              onPressOut={handleResume}
              delayLongPress={120}
            >
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <Text style={styles.loadingText}>Loading frame...</Text>
                </View>
              )}

              {mediaError && !isLoading && (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText}>Failed to load media</Text>
                  <Text style={styles.errorSubtext}>
                    Moving to next frame…
                  </Text>
                </View>
              )}

              {currentFrame.media_kind === "image" ? (
                <Image
                  source={{ uri: currentFrame.media_url }}
                  style={[
                    styles.media,
                    { opacity: isLoading || mediaError ? 0 : 1 },
                  ]}
                  resizeMode="contain"
                  onLoad={handleMediaLoaded}
                  onError={handleMediaError}
                />
              ) : (
                <Video
                  ref={videoRef}
                  source={{ uri: currentFrame.media_url }}
                  style={[
                    styles.media,
                    { opacity: isLoading || mediaError ? 0 : 1 },
                  ]}
                  resizeMode={ResizeMode.CONTAIN}
                  shouldPlay={visible && !isPaused && !isLoading}
                  isLooping={false}
                  volume={1.0}
                  onLoad={handleMediaLoaded}
                  onError={handleMediaError}
                  onPlaybackStatusUpdate={(status: AVPlaybackStatus) => {
                    if (
                      status.isLoaded &&
                      status.didJustFinish &&
                      !isPaused
                    ) {
                      handleTapRight();
                    }
                  }}
                />
              )}

              {/* caption pill, centered text */}
              {(currentFrame.caption || "").trim().length > 0 &&
                !isLoading &&
                !mediaError && (
                  <View style={styles.bottomOverlay}>
                    <View style={styles.captionCard}>
                      <Text style={styles.captionText}>
                        {currentFrame.caption}
                      </Text>
                    </View>
                  </View>
                )}

              {/* tap zones */}
              <View style={styles.tapZones} pointerEvents="box-none">
                <Pressable style={styles.tapLeft} onPress={handleTapLeft} />
                <Pressable style={styles.tapRight} onPress={handleTapRight} />
              </View>
            </Pressable>
          </View>

          {/* bottom-right 3-dots menu */}
          <View style={styles.bottomMenu}>
            {menuVisible && (
              <View style={styles.menuDropdown}>
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.85}
                  onPress={handleEditFrame}
                >
                  <Text style={styles.menuItemText}>Edit frame</Text>
                </TouchableOpacity>
                <View style={styles.menuDivider} />
                <TouchableOpacity
                  style={styles.menuItem}
                  activeOpacity={0.85}
                  onPress={handleDeleteFrame}
                >
                  <Text style={[styles.menuItemText, styles.menuDelete]}>
                    Delete frame
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setMenuVisible((v) => !v);
                handlePause();
              }}
              style={styles.menuButton}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
};

export default ActiveFramesModal;

const styles = StyleSheet.create({
  safeContainer: {
    flex: 1,
    backgroundColor: "#000000",
  },
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  background: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000000",
  },

  // top overlay
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingTop: verticalScale(8),
    paddingHorizontal: scale(10),
    zIndex: 20,
  },
  progressContainer: {
    flexDirection: "row",
    gap: scale(4),
    marginBottom: verticalScale(6),
  },
  progressSegment: {
    flex: 1,
  },
  progressTrack: {
    height: verticalScale(3),
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: scale(999),
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(999),
  },
  topUserRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(2),
  },

  // avatar + name/time (top-left)
  avatarWrapper: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    overflow: "hidden",
    marginRight: scale(8),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.7)",
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  headerTextColumn: {
    justifyContent: "center",
  },
  headerName: {
    fontFamily: Fonts.bold,
    fontSize: moderateScale(15),
    color: "#FFFFFF",
  },
  headerTime: {
    fontFamily: Fonts.primary,
    fontSize: moderateScale(11),
    color: "rgba(255,255,255,0.7)",
  },

  // bottom-right menu
  bottomMenu: {
    position: "absolute",
    right: scale(20),
    bottom: verticalScale(32),
    zIndex: 25,
    alignItems: "flex-end",
  },
  menuButton: {
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(8),
    borderRadius: scale(18),
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  menuDropdown: {
    position: "absolute",
    bottom: verticalScale(40),
    right: 0,
    width: scale(160),
    backgroundColor: "rgba(0,0,0,0.92)",
    borderRadius: scale(14),
    paddingVertical: verticalScale(4),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.15)",
  },
  menuItem: {
    paddingVertical: verticalScale(8),
    paddingHorizontal: scale(12),
  },
  menuItemText: {
    fontFamily: Fonts.primary,
    fontSize: moderateScale(13),
    color: "#FFFFFF",
  },
  menuDelete: {
    color: "#FF4D4F",
  },
  menuDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.25)",
    marginHorizontal: scale(6),
  },

  // media
  mediaWrapper: {
    flex: 1,
  },
  mediaPressable: {
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

  // bottom caption pill
  bottomOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: verticalScale(80), // a bit higher so it doesn't overlap 3-dots
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  captionCard: {
    minHeight: verticalScale(36),
    paddingHorizontal: scale(18),
    borderRadius: scale(20),
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  captionText: {
    fontSize: moderateScale(16),
    fontFamily: Fonts.primary,
    color: "#FFFFFF",
    textAlign: "center",
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
});
