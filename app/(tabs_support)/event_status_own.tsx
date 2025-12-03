// app/(tabs_support)/event_status_own.tsx

import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";

import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    Animated as RNAnimated,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

const BLUES = {
  b40: "#1840B8",
  b50: "#1B44CD",
  b60: "#2D58D6",
  b70: "#3E6BE0",
  b80: "#4E7DE9",
} as const;

// Types
interface EventRatingSummary {
  averageRating: number;
  totalRatings: number;
  totalEventsHosted: number;
}

interface PastEvent {
  id: string;
  event_name: string;
  category: string;
  location_name: string | null;
  time_start: string;
  time_end: string;
  status: string;
  attendee_count?: number;
  rating?: number | null;
}

interface JoinedEvent {
  id: string;
  event_name: string;
  category: string;
  location_name: string | null;
  time_start: string;
  time_end: string;
  host_name: string | null;
  host_photo: string | null;
}

// Star Rating Component
const StarRating: React.FC<{ rating: number; size?: number; showLabel?: boolean }> = ({ 
  rating, 
  size = 24,
  showLabel = true 
}) => {
  // Ensure rating is a valid number
  const safeRating = isNaN(rating) ? 0 : Math.min(5, Math.max(0, rating));
  
  const fullStars = Math.floor(safeRating);
  const decimal = safeRating - fullStars;
  const hasHalfStar = decimal >= 0.25 && decimal < 0.75;
  const hasAlmostFullStar = decimal >= 0.75;
  const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0) - (hasAlmostFullStar ? 1 : 0);

  return (
    <View style={styles.starRatingContainer}>
      <View style={styles.starsRow}>
        {/* Full stars */}
        {[...Array(fullStars)].map((_, i) => (
          <Ionicons key={`full-${i}`} name="star" size={size} color="#FFB800" />
        ))}
        {/* Almost full star (treat as full) */}
        {hasAlmostFullStar && (
          <Ionicons key="almost" name="star" size={size} color="#FFB800" />
        )}
        {/* Half star */}
        {hasHalfStar && (
          <Ionicons key="half" name="star-half" size={size} color="#FFB800" />
        )}
        {/* Empty stars */}
        {[...Array(Math.max(0, emptyStars))].map((_, i) => (
          <Ionicons key={`empty-${i}`} name="star-outline" size={size} color="#FFB800" />
        ))}
      </View>
      {showLabel && safeRating > 0 && (
        <Text style={styles.ratingNumber}>{safeRating.toFixed(1)}</Text>
      )}
    </View>
  );
};

// Mini Star Rating for cards
const MiniStarRating: React.FC<{ rating: number }> = ({ rating }) => {
  return (
    <View style={styles.miniStarContainer}>
      <Ionicons name="star" size={14} color="#FFB800" />
      <Text style={styles.miniStarText}>{rating.toFixed(1)}</Text>
    </View>
  );
};

// Category Badge
const CategoryBadge: React.FC<{ category: string }> = ({ category }) => {
  const formatCategory = (cat: string) => {
    return cat.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase());
  };

  return (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryBadgeText}>{formatCategory(category)}</Text>
    </View>
  );
};

// Hosted Event Card
const HostedEventCard: React.FC<{ event: PastEvent; onPress?: () => void }> = ({ event, onPress }) => {
  const date = new Date(event.time_start);
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.eventCard}>
  <View style={styles.eventCardContent}>
        <View style={styles.eventCardHeader}>
          <CategoryBadge category={event.category} />
          <Text style={styles.eventDate}>{dateLabel}</Text>
        </View>
        
        <Text style={styles.eventName} numberOfLines={2}>{event.event_name}</Text>
        
        <View style={styles.eventCardFooter}>
          <View style={styles.eventLocation}>
            <Ionicons name="location-sharp" size={14} color={BLUE} />
            <Text style={styles.eventLocationText} numberOfLines={1}>
              {event.location_name || "Location TBA"}
            </Text>
          </View>
          
          <View style={styles.eventStats}>
            {event.rating !== null && event.rating !== undefined && (
              <MiniStarRating rating={event.rating} />
            )}
            {event.attendee_count !== undefined && (
              <View style={styles.attendeeCount}>
                <Ionicons name="people" size={14} color="rgba(10,14,26,0.5)" />
                <Text style={styles.attendeeCountText}>{event.attendee_count}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Joined Event Card
const JoinedEventCard: React.FC<{ event: JoinedEvent; onPress?: () => void }> = ({ event, onPress }) => {
  const date = new Date(event.time_start);
  const dateLabel = date.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={onPress} style={styles.eventCard}>
  <View style={styles.eventCardContent}>
        <View style={styles.eventCardHeader}>
          <CategoryBadge category={event.category} />
          <Text style={styles.eventDate}>{dateLabel}</Text>
        </View>
        
        <Text style={styles.eventName} numberOfLines={2}>{event.event_name}</Text>
        
        <View style={styles.eventCardFooter}>
          <View style={styles.eventLocation}>
            <Ionicons name="location-sharp" size={14} color={BLUE} />
            <Text style={styles.eventLocationText} numberOfLines={1}>
              {event.location_name || "Location TBA"}
            </Text>
          </View>
        </View>
        
        {/* Host info */}
        <View style={styles.hostInfo}>
          <View style={styles.hostAvatar}>
            {event.host_photo ? (
              <Image source={{ uri: event.host_photo }} style={styles.hostAvatarImage} />
            ) : (
              <Ionicons name="person" size={12} color="rgba(10,14,26,0.4)" />
            )}
          </View>
          <Text style={styles.hostName} numberOfLines={1}>
            Hosted by {event.host_name || "Unknown"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

// Empty State
const EmptyState: React.FC<{ title: string; subtitle: string; icon: string }> = ({ 
  title, 
  subtitle, 
  icon 
}) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name={icon as any} size={32} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
  </View>
);

// Main Component
export default function EventStatusOwnScreen() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [ratingSummary, setRatingSummary] = useState<EventRatingSummary>({
    averageRating: 0,
    totalRatings: 0,
    totalEventsHosted: 0,
  });
  const [hostedEvents, setHostedEvents] = useState<PastEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<JoinedEvent[]>([]);
  
  const [activeTab, setActiveTab] = useState<"hosted" | "joined">("hosted");
  const tabIndicatorAnim = useRef(new RNAnimated.Value(0)).current;

  const fetchData = useCallback(async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) {
        console.log("No user ID found");
        return;
      }

      console.log("Fetching data for userId:", userId);

      // Fetch rating summary using the RPC function (uses SECURITY DEFINER)
      const { data: ratingSummaryData, error: ratingError } = await supabase
        .rpc("get_host_rating_summary", { p_host_id: userId });

      console.log("Rating summary response:", ratingSummaryData, ratingError);

      // RPC returns an array for TABLE functions, so get first element
      if (!ratingError && ratingSummaryData && ratingSummaryData.length > 0) {
        const summary = ratingSummaryData[0];
        setRatingSummary({
          averageRating: Number(summary.average_rating) || 0,
          totalRatings: Number(summary.total_ratings) || 0,
          totalEventsHosted: Number(summary.total_events_hosted) || 0,
        });
      } else if (!ratingError && ratingSummaryData && !Array.isArray(ratingSummaryData)) {
        // Fallback if it returns a single object
        setRatingSummary({
          averageRating: Number(ratingSummaryData.average_rating) || 0,
          totalRatings: Number(ratingSummaryData.total_ratings) || 0,
          totalEventsHosted: Number(ratingSummaryData.total_events_hosted) || 0,
        });
      }

      // Fetch hosted events using RPC function (bypasses RLS recursion)
      const { data: hostedData, error: hostedError } = await supabase
        .rpc("get_my_hosted_events", { p_user_id: userId });

      console.log("Hosted events response:", hostedData, hostedError);

      if (!hostedError && hostedData) {
        const eventsWithDetails: PastEvent[] = hostedData.map((event: any) => ({
          id: event.id,
          event_name: event.event_name,
          category: event.category,
          location_name: event.location_name,
          time_start: event.time_start,
          time_end: event.time_end,
          status: event.status,
          attendee_count: Number(event.attendee_count) || 0,
          rating: event.avg_rating ? Number(event.avg_rating) : null,
        }));

        console.log("Hosted events processed:", eventsWithDetails);
        setHostedEvents(eventsWithDetails);
      }

      // Fetch joined events using RPC function (bypasses RLS recursion)
      const { data: joinedData, error: joinedError } = await supabase
        .rpc("get_my_joined_events", { p_user_id: userId });

      console.log("Joined events response:", joinedData, joinedError);

      if (!joinedError && joinedData) {
        const joinedProcessed: JoinedEvent[] = joinedData.map((event: any) => ({
          id: event.id,
          event_name: event.event_name,
          category: event.category,
          location_name: event.location_name,
          time_start: event.time_start,
          time_end: event.time_end,
          host_name: event.host_name || null,
          host_photo: null,
        }));

        console.log("Joined events processed:", joinedProcessed);
        setJoinedEvents(joinedProcessed);
      }
    } catch (error) {
      console.error("Error fetching event data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const switchTab = (tab: "hosted" | "joined") => {
    setActiveTab(tab);
    RNAnimated.spring(tabIndicatorAnim, {
      toValue: tab === "hosted" ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 100,
    }).start();
  };

  const tabIndicatorTranslate = tabIndicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCREEN_WIDTH - scale(40)) / 2],
  });

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading your events...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Events</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
          }
        >
          {/* Rating Card */}
          <View style={styles.ratingCard}>
  <View style={styles.ratingCardDecor}>
              <View style={[styles.decorCircle, styles.decorCircle1]} />
              <View style={[styles.decorCircle, styles.decorCircle2]} />
            </View>
            
            <View style={styles.ratingCardContent}>
              <Text style={styles.ratingCardLabel}>Event Host Rating</Text>
              
              {ratingSummary.totalRatings > 0 ? (
                <>
                  <View style={styles.ratingStarsContainer}>
                    <StarRating rating={ratingSummary.averageRating} size={32} />
                  </View>
                  <View style={styles.ratingStats}>
                    <View style={styles.ratingStat}>
                      <Text style={styles.ratingStatValue}>{ratingSummary.totalRatings}</Text>
                      <Text style={styles.ratingStatLabel}>Reviews</Text>
                    </View>
                    <View style={styles.ratingStatDivider} />
                    <View style={styles.ratingStat}>
                      <Text style={styles.ratingStatValue}>{ratingSummary.totalEventsHosted}</Text>
                      <Text style={styles.ratingStatLabel}>Events Hosted</Text>
                    </View>
                  </View>
                </>
              ) : (
                <View style={styles.noRatingContainer}>
                  <View style={styles.noRatingStars}>
                    {[...Array(5)].map((_, i) => (
                      <Ionicons key={i} name="star-outline" size={28} color="rgba(255,255,255,0.5)" />
                    ))}
                  </View>
                  <Text style={styles.noRatingText}>
                    {ratingSummary.totalEventsHosted > 0
                      ? "No ratings yet"
                      : "Host your first event to get rated!"}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <View style={styles.tabsBackground}>
              <RNAnimated.View
                style={[
                  styles.tabIndicator,
                  { transform: [{ translateX: tabIndicatorTranslate }] },
                ]}
              />
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => switchTab("hosted")}
                style={styles.tab}
              >
                <Ionicons
                  name="calendar"
                  size={18}
                  color={activeTab === "hosted" ? "#FFFFFF" : "rgba(10,14,26,0.5)"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "hosted" && styles.tabTextActive,
                  ]}
                >
                  Hosted ({hostedEvents.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => switchTab("joined")}
                style={styles.tab}
              >
                <Ionicons
                  name="ticket"
                  size={18}
                  color={activeTab === "joined" ? "#FFFFFF" : "rgba(10,14,26,0.5)"}
                />
                <Text
                  style={[
                    styles.tabText,
                    activeTab === "joined" && styles.tabTextActive,
                  ]}
                >
                  Joined ({joinedEvents.length})
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Events List */}
          <View style={styles.eventsSection}>
            {activeTab === "hosted" ? (
              hostedEvents.length > 0 ? (
                hostedEvents.map((event) => (
                  <HostedEventCard key={event.id} event={event} />
                ))
              ) : (
                <EmptyState
                  title="No past events"
                  subtitle="Events you host will appear here after they end"
                  icon="calendar-outline"
                />
              )
            ) : joinedEvents.length > 0 ? (
              joinedEvents.map((event) => (
                <JoinedEventCard key={event.id} event={event} />
              ))
            ) : (
              <EmptyState
                title="No past events"
                subtitle="Events you join will appear here after they end"
                icon="ticket-outline"
              />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: BG,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(12),
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.08)",
  },
  backButton: {
  width: scale(40),
  height: scale(40),
  borderRadius: scale(20),
  alignItems: "center",
  justifyContent: "center",
  backgroundColor: "rgba(0,0,0,0.03)",
},
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: INK,
  },
  headerRight: {
    width: scale(36),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
  },

  // Rating Card
  ratingCard: {
  marginTop: verticalScale(20),
  borderRadius: scale(20),
  overflow: "hidden",
  backgroundColor: BLUE,
  shadowColor: BLUE,
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.15,
  shadowRadius: 10,
  elevation: 8,
},
  ratingCardDecor: {
    position: "absolute",
    width: "100%",
    height: "100%",
  },
  decorCircle: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  decorCircle1: {
    width: scale(120),
    height: scale(120),
    top: -scale(40),
    right: -scale(40),
  },
  decorCircle2: {
    width: scale(80),
    height: scale(80),
    bottom: -scale(20),
    left: -scale(20),
  },
  ratingCardContent: {
    padding: scale(20),
    alignItems: "center",
  },
  ratingCardLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: verticalScale(16),
  },
  ratingStarsContainer: {
    marginBottom: verticalScale(18),
  },
  ratingStats: {
    flexDirection: "row",
    alignItems: "center",
  },
  ratingStat: {
    alignItems: "center",
    paddingHorizontal: scale(24),
  },
  ratingStatValue: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: "#FFFFFF",
  },
  ratingStatLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(255,255,255,0.7)",
    marginTop: verticalScale(4),
  },
  ratingStatDivider: {
    width: 1,
    height: scale(40),
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  noRatingContainer: {
    alignItems: "center",
  },
  noRatingStars: {
    flexDirection: "row",
    gap: scale(4),
    marginBottom: verticalScale(12),
  },
  noRatingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
  },

  // Star Rating
  starRatingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },
  starsRow: {
    flexDirection: "row",
    gap: scale(4),
  },
  ratingNumber: {
    fontFamily: Fonts.bold,
    fontSize: scale(26),
    color: "#FFFFFF",
  },

  // Tabs
  tabsContainer: {
    marginTop: verticalScale(24),
    marginBottom: verticalScale(16),
  },
  tabsBackground: {
    flexDirection: "row",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(20),
    padding: scale(4),
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: scale(4),
    left: scale(4),
    width: "50%",
    height: "100%",
    backgroundColor: BLUE,
    borderRadius: scale(16),
  },
  tab: {
  flex: 1,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "center",
  paddingVertical: verticalScale(10),
  gap: scale(6),
  zIndex: 1,
},
  tabText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
  },
  tabTextActive: {
    color: "#FFFFFF",
  },

  // Events Section
  eventsSection: {
    gap: verticalScale(12),
  },

  // Event Card
  eventCard: {
  borderRadius: scale(20),
  overflow: "hidden",
  backgroundColor: "#FFFFFF",
  borderWidth: 1,
  borderColor: "rgba(27,68,205,0.08)",
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 6,
  elevation: 2,
},
  eventCardContent: {
    padding: scale(20),
  },
  eventCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  eventDate: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
  },
  eventName: {
  fontFamily: Fonts.bold,
  fontSize: scale(16),
  color: INK,
  marginBottom: verticalScale(12),
  marginTop: verticalScale(5),
  lineHeight: scale(24),
  paddingTop: verticalScale(2),
},
 eventCardFooter: {
  flexDirection: "row",
  alignItems: "flex-start",
  justifyContent: "space-between",
},
  eventLocation: {
  flexDirection: "row",
  alignItems: "flex-start",
  flex: 1,
  gap: scale(4),
  marginRight: scale(8),
},
  eventLocationText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
    flex: 1,
  },
  eventStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
  },

  // Category Badge
  categoryBadge: {
    backgroundColor: BLUE,
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(5),
    borderRadius: scale(14),
  },
  categoryBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#FFFFFF",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Mini Star Rating
  miniStarContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "rgba(255,184,0,0.1)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(14),
  },
  miniStarText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#B8860B",
  },

  // Attendee Count
  attendeeCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
  },
  attendeeCountText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
  },

  // Host Info
  hostInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(27,68,205,0.08)",
    gap: scale(8),
  },
  hostAvatar: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  hostAvatarImage: {
    width: "100%",
    height: "100%",
  },
  hostName: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
    flex: 1,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(48),
    paddingHorizontal: scale(32),
  },
  emptyIconContainer: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(17),
    color: INK,
    marginBottom: verticalScale(8),
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
  },
});