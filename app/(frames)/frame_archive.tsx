import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import ActiveFramesModal from "./active_frames";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const ITEM_SPACING = scale(8);
const H_PAD = scale(20);
const ITEM_WIDTH = (SCREEN_WIDTH - H_PAD * 2 - ITEM_SPACING * 2) / NUM_COLUMNS;
const ITEM_HEIGHT = ITEM_WIDTH * (16 / 9);

type FrameItem = {
  id: string;
  thumbnail: string;
  media_kind: "image" | "video";
  duration?: string;
  created_at: string;
  media_url: string;
  caption?: string | null;
  expires_at?: string;
};

const formatMonth = (dateString: string): string => {
  const date = new Date(dateString);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const getVideoDuration = (createdAt: string): string => {
  const rand = Math.floor(Math.random() * 30) + 1;
  return `0:${rand.toString().padStart(2, '0')}`;
};

const ArchiveHeader: React.FC<{ fullName: string }> = ({ fullName }) => {
  const insets = useSafeAreaInsets();
  const TOOLBAR_HEIGHT = verticalScale(56);
  const headerHeight = insets.top + TOOLBAR_HEIGHT;

  return (
    <View
      style={[
        styles.floatingHeader,
        { height: headerHeight, paddingTop: insets.top },
      ]}
    >
      <BlurView intensity={98} tint="light" style={StyleSheet.absoluteFillObject} />
      <LinearGradient
        colors={["rgba(255,255,255,0.98)", "rgba(250,251,255,0.95)"] as const}
        style={StyleSheet.absoluteFillObject}
      />
      <View style={styles.headerContent}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <View style={styles.chevronWrapper}>
            <View style={[styles.chevronLine, styles.chevronLineTop]} />
            <View style={[styles.chevronLine, styles.chevronLineBottom]} />
          </View>
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{fullName || "Frame Archive"}</Text>
          <Text style={styles.headerSubtitle}>Frame Archive</Text>
        </View>
        <View style={styles.headerRight} />
      </View>
    </View>
  );
};

export default function FrameArchiveScreen() {
  const [frames, setFrames] = useState<FrameItem[]>([]);
  const [fullName, setFullName] = useState("");
  const [currentMonth, setCurrentMonth] = useState("");
  const monthBubbleOpacity = useRef(new Animated.Value(0)).current;
  const monthBubbleScale = useRef(new Animated.Value(0.8)).current;
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showFrameViewer, setShowFrameViewer] = useState(false);
  const [selectedFrameIndex, setSelectedFrameIndex] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      const [profileRes, framesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name")
          .eq("id", userId)
          .single(),
        supabase
          .from("frames")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
      ]);

      if (profileRes.data) {
        setFullName(profileRes.data.full_name || "");
      }

      let realFrames: FrameItem[] = [];
      
      if (framesRes.data && framesRes.data.length > 0) {
        realFrames = await Promise.all(
          framesRes.data.map(async (frame) => {
            let signedUrl = frame.media_url;
            
            if (frame.media_url && !frame.media_url.startsWith('http')) {
              const { data: signedUrlData } = await supabase.storage
                .from("frames")
                .createSignedUrl(frame.media_url, 3600);
              
              if (signedUrlData?.signedUrl) {
                signedUrl = signedUrlData.signedUrl;
              }
            }

            return {
              id: frame.id,
              thumbnail: signedUrl,
              media_kind: frame.media_kind,
              duration: frame.media_kind === 'video' ? getVideoDuration(frame.created_at) : undefined,
              created_at: frame.created_at,
              media_url: signedUrl,
              caption: frame.caption || null,
              expires_at: frame.expires_at,
            };
          })
        );
      }
      
      setFrames(realFrames);
      if (realFrames.length > 0) {
        setCurrentMonth(formatMonth(realFrames[0].created_at));
      }
    } catch (error) {
      console.error("Error loading frame archive:", error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetY = event.nativeEvent.contentOffset.y;
    
    if (!isScrolling && offsetY > 50) {
      setIsScrolling(true);
      Animated.parallel([
        Animated.timing(monthBubbleOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(monthBubbleScale, {
          toValue: 1,
          friction: 8,
          tension: 100,
          useNativeDriver: true,
        }),
      ]).start();
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
      Animated.parallel([
        Animated.timing(monthBubbleOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(monthBubbleScale, {
          toValue: 0.8,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
    }, 1500);

    const contentHeight = event.nativeEvent.contentSize.height;
    const scrollViewHeight = event.nativeEvent.layoutMeasurement.height;
    const currentOffset = offsetY;

    if (frames.length > 0) {
      const visibleIndex = Math.floor(
        (currentOffset / (contentHeight - scrollViewHeight)) * frames.length
      );
      
      if (visibleIndex >= 0 && visibleIndex < frames.length) {
        const newMonth = formatMonth(frames[visibleIndex].created_at);
        if (newMonth !== currentMonth) {
          setCurrentMonth(newMonth);
        }
      }
    }
  };

  const handleFramePress = (index: number) => {
    setSelectedFrameIndex(index);
    setShowFrameViewer(true);
  };

  const getFramesFromIndex = (startIndex: number) => {
    return frames.slice(startIndex).map(frame => ({
      id: frame.id,
      created_at: frame.created_at,
      expires_at: frame.expires_at || new Date(new Date(frame.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString(),
      media_url: frame.media_url,
      media_kind: frame.media_kind,
      caption: frame.caption || null,
    }));
  };

  const renderItem = ({ item, index }: { item: FrameItem; index: number }) => {
    const isLastInRow = (index + 1) % NUM_COLUMNS === 0;
    
    return (
      <TouchableOpacity 
        style={[
          styles.itemContainer,
          !isLastInRow && { marginRight: ITEM_SPACING }
        ]}
        activeOpacity={0.85}
        onPress={() => handleFramePress(index)}
      >
        <View style={styles.thumbnailWrapper}>
          <Image source={{ uri: item.thumbnail }} style={styles.thumbnail} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.4)"] as const}
            style={styles.thumbnailOverlay}
          />
          {item.media_kind === "video" && item.duration && (
            <View style={styles.durationBadge}>
              <Ionicons name="play" size={8} color="#FFFFFF" style={{ marginRight: scale(2) }} />
              <Text style={styles.durationText}>{item.duration}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderHeader = () => (
    <View style={styles.headerSection}>
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{frames.length}</Text>
          <Text style={styles.statLabel}>Frames</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {frames.filter(f => f.media_kind === "image").length}
          </Text>
          <Text style={styles.statLabel}>Photos</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {frames.filter(f => f.media_kind === "video").length}
          </Text>
          <Text style={styles.statLabel}>Videos</Text>
        </View>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="albums-outline" size={64} color={Colors.TEXT_TERTIARY} />
      <Text style={styles.emptyTitle}>No Archived Frames</Text>
      <Text style={styles.emptySubtitle}>
        Your archived frames will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ArchiveHeader fullName={fullName} />
      
      <View style={styles.contentWrapper}>
        <FlatList
          data={frames}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={NUM_COLUMNS}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.gridContent}
          ListHeaderComponent={frames.length > 0 ? renderHeader : null}
          ListEmptyComponent={renderEmpty}
          scrollEventThrottle={16}
          onScroll={handleScroll}
        />

        {frames.length > 0 && (
          <Animated.View 
            style={[
              styles.monthBubble,
              {
                opacity: monthBubbleOpacity,
                transform: [{ scale: monthBubbleScale }]
              }
            ]}
          >
            <LinearGradient
              colors={["#FFFFFF", "#F8FAFF"] as const}
              style={StyleSheet.absoluteFillObject}
            />
            <Text style={styles.monthText}>{currentMonth}</Text>
          </Animated.View>
        )}
      </View>

      <ActiveFramesModal
        visible={showFrameViewer}
        onClose={() => setShowFrameViewer(false)}
        frames={getFramesFromIndex(selectedFrameIndex)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  contentWrapper: {
    flex: 1,
    paddingTop: verticalScale(100),
  },
  gridContent: {
    paddingHorizontal: H_PAD,
    paddingBottom: verticalScale(30),
  },
  headerSection: {
    marginBottom: verticalScale(20),
    paddingBottom: verticalScale(20),
    borderBottomWidth: 1,
    borderBottomColor: Colors.BORDER,
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: verticalScale(16),
    backgroundColor: Colors.CARD_BG,
    borderRadius: scale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statNumber: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: Colors.BLUE,
    marginBottom: verticalScale(2),
  },
  statLabel: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: Colors.TEXT_SECONDARY,
  },
  statDivider: {
    width: 1,
    height: verticalScale(30),
    backgroundColor: Colors.BORDER,
  },
  itemContainer: {
    marginBottom: ITEM_SPACING,
    width: ITEM_WIDTH,
    height: ITEM_HEIGHT,
  },
  thumbnailWrapper: {
    flex: 1,
    borderRadius: scale(12),
    overflow: "hidden",
    backgroundColor: "#F0F3F8",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  thumbnailOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  durationBadge: {
    position: "absolute",
    bottom: scale(6),
    right: scale(6),
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(8),
    backgroundColor: "rgba(0,0,0,0.7)",
  },
  durationText: {
    fontSize: scale(10),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  monthBubble: {
    position: "absolute",
    top: verticalScale(120),
    right: scale(20),
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(8),
    borderRadius: scale(20),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 4,
  },
  monthText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(100),
    paddingHorizontal: scale(40),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: Colors.TEXT_PRIMARY,
    marginTop: verticalScale(16),
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: Colors.TEXT_SECONDARY,
    textAlign: "center",
  },
  floatingHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    overflow: "hidden",
  },
  headerContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  headerSubtitle: {
    fontSize: scale(11),
    fontFamily: Fonts.primary,
    color: Colors.BLUE,
    marginTop: verticalScale(2),
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
  },
  chevronWrapper: {
    width: scale(10),
    height: scale(16),
    position: "relative",
  },
  chevronLine: {
    position: "absolute",
    width: scale(12),
    height: scale(2),
    backgroundColor: Colors.BLUE,
    borderRadius: scale(1),
  },
  chevronLineTop: {
    top: scale(3),
    left: 0,
    transform: [{ rotate: "-45deg" }],
  },
  chevronLineBottom: {
    bottom: scale(3),
    left: 0,
    transform: [{ rotate: "45deg" }],
  },
  headerRight: {
    width: scale(40),
  },
});