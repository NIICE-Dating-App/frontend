// app/(event)/past_events.tsx
// Past Events page - shows past hosted and joined events

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
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

// Types
interface PastHostedEvent {
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

interface PastJoinedEvent {
  id: string;
  event_name: string;
  category: string;
  location_name: string | null;
  time_start: string;
  time_end: string;
  host_id: string;
  host_name: string | null;
  host_photo: string | null;
  has_rated?: boolean;
}

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
    return cat.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  return (
    <View style={styles.categoryBadge}>
      <Text style={styles.categoryBadgeText}>{formatCategory(category)}</Text>
    </View>
  );
};

// Hosted Event Card
const HostedEventCard: React.FC<{
  event: PastHostedEvent;
  onPress: () => void;
}> = ({ event, onPress }) => {
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

        <Text style={styles.eventName} numberOfLines={2}>
          {event.event_name}
        </Text>

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
      
      {/* Hosting Badge */}
      <View style={styles.hostingBadge}>
        <Ionicons name="star" size={10} color="#F59E0B" />
        <Text style={styles.hostingBadgeText}>Hosted</Text>
      </View>
    </TouchableOpacity>
  );
};

// Joined Event Card
const JoinedEventCard: React.FC<{
  event: PastJoinedEvent;
  onPress: () => void;
}> = ({ event, onPress }) => {
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

        <Text style={styles.eventName} numberOfLines={2}>
          {event.event_name}
        </Text>

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
          
          {/* Rate indicator */}
          {!event.has_rated && (
            <View style={styles.rateIndicator}>
              <Ionicons name="star-outline" size={12} color="#F59E0B" />
              <Text style={styles.rateIndicatorText}>Rate</Text>
            </View>
          )}
        </View>
      </View>
      
      {/* Joined Badge */}
      <View style={styles.joinedBadge}>
        <Ionicons name="checkmark-circle" size={10} color="#10B981" />
        <Text style={styles.joinedBadgeText}>Joined</Text>
      </View>
    </TouchableOpacity>
  );
};

// Empty State
const EmptyState: React.FC<{ title: string; subtitle: string; icon: string }> = ({
  title,
  subtitle,
  icon,
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
export default function PastEventsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [hostedEvents, setHostedEvents] = useState<PastHostedEvent[]>([]);
  const [joinedEvents, setJoinedEvents] = useState<PastJoinedEvent[]>([]);

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

      setCurrentUserId(userId);

      // Fetch hosted events using RPC function
      const { data: hostedData, error: hostedError } = await supabase.rpc(
        "get_my_hosted_events",
        { p_user_id: userId }
      );

      if (!hostedError && hostedData) {
        const eventsWithDetails: PastHostedEvent[] = hostedData.map((event: any) => ({
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

        setHostedEvents(eventsWithDetails);
      }

      // Fetch joined events using RPC function
      const { data: joinedData, error: joinedError } = await supabase.rpc(
        "get_my_joined_events",
        { p_user_id: userId }
      );

      if (!joinedError && joinedData) {
        // Check which events the user has already rated
        const eventIds = joinedData.map((e: any) => e.id);
        const { data: ratingsData } = await supabase
          .from("event_ratings")
          .select("event_id")
          .eq("rater_id", userId)
          .in("event_id", eventIds);

        const ratedEventIds = new Set((ratingsData || []).map((r: any) => r.event_id));

        const joinedProcessed: PastJoinedEvent[] = await Promise.all(
          joinedData.map(async (event: any) => {
            // Get host photo
            let hostPhoto = null;
            if (event.host_id) {
              const { data: photoData } = await supabase
                .from("user_photos")
                .select("photo_url")
                .eq("user_id", event.host_id)
                .eq("position", 0)
                .single();

              if (photoData?.photo_url) {
                const { data: signedData } = await supabase.storage
                  .from("user_photos")
                  .createSignedUrl(photoData.photo_url, 3600);
                hostPhoto = signedData?.signedUrl || null;
              }
            }

            return {
              id: event.id,
              event_name: event.event_name,
              category: event.category,
              location_name: event.location_name,
              time_start: event.time_start,
              time_end: event.time_end,
              host_id: event.host_id,
              host_name: event.host_name || null,
              host_photo: hostPhoto,
              has_rated: ratedEventIds.has(event.id),
            };
          })
        );

        setJoinedEvents(joinedProcessed);
      }
    } catch (error) {
      console.error("Error fetching past events:", error);
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

  const navigateToFinishedEvent = (eventId: string, isHost: boolean) => {
    router.push({
      pathname: "/(events)/finished_event",
      params: { eventId, isHost: isHost ? "true" : "false" },
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading past events...</Text>
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
          <Text style={styles.headerTitle}>Past Events</Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
          }
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="time" size={24} color={BLUE} />
            </View>
            <View style={styles.infoTextContainer}>
              <Text style={styles.infoTitle}>Your Event History</Text>
              <Text style={styles.infoSubtitle}>
                View events you've hosted or attended. Rate hosts to help the community!
              </Text>
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
                  name="star"
                  size={18}
                  color={activeTab === "hosted" ? "#FFFFFF" : "rgba(10,14,26,0.5)"}
                />
                <Text
                  style={[styles.tabText, activeTab === "hosted" && styles.tabTextActive]}
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
                  style={[styles.tabText, activeTab === "joined" && styles.tabTextActive]}
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
                  <HostedEventCard
                    key={event.id}
                    event={event}
                    onPress={() => navigateToFinishedEvent(event.id, true)}
                  />
                ))
              ) : (
                <EmptyState
                  title="No past hosted events"
                  subtitle="Events you host will appear here after they end"
                  icon="calendar-outline"
                />
              )
            ) : joinedEvents.length > 0 ? (
              joinedEvents.map((event) => (
                <JoinedEventCard
                  key={event.id}
                  event={event}
                  onPress={() => navigateToFinishedEvent(event.id, false)}
                />
              ))
            ) : (
              <EmptyState
                title="No past joined events"
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
    width: scale(40),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(30),
  },

  // Info Card
  infoCard: {
    marginTop: verticalScale(20),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(16),
    padding: scale(16),
    gap: scale(12),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.1)",
  },
  infoIconContainer: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    marginBottom: verticalScale(4),
  },
  infoSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
    lineHeight: scale(18),
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
    position: "relative",
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
  
  // Rate Indicator
  rateIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    backgroundColor: "rgba(245,158,11,0.1)",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(10),
  },
  rateIndicatorText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#F59E0B",
  },

  // Status Badges
  hostingBadge: {
    position: "absolute",
    top: scale(16),
    right: scale(16),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245,158,11,0.12)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(10),
    gap: scale(4),
  },
  hostingBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#F59E0B",
  },
  joinedBadge: {
    position: "absolute",
    top: scale(16),
    right: scale(16),
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16,185,129,0.12)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(10),
    gap: scale(4),
  },
  joinedBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#10B981",
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