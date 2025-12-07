// app/(tabs_support)/host_applications_public.tsx
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_W } = Dimensions.get("window");

const BLUES = {
  b00: "#0B1C60", b10: "#0D236F", b20: "#0F2C8A", b30: "#1437A4", b40: "#1840B8",
  b50: "#1B44CD", b60: "#2D58D6", b70: "#3E6BE0", b80: "#4E7DE9", b90: "#6B95F0",
  b100: "#86A9F5", b110: "#A5BFF9", b120: "#C4D5FC", b130: "#E6EFFF",
} as const;

const BLUE = BLUES.b50;

interface Participant {
  id: string;
  applicant_id: string;
  status: string;
  joined_at: string;
  user: {
    id: string;
    full_name: string;
    age: number;
    bio: string | null;
    main_photo_url: string | null;
  } | null;
}

interface EventInfo {
  id: string;
  event_name: string;
  capacity: number;
  host_id: string;
}

// Helper to capitalize names
const capitalizeWords = (str: string | null | undefined): string => {
  if (!str) return '';
  return str
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Format date helper
const formatJoinedDate = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export default function EventParticipantsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { eventId } = useLocalSearchParams<{ eventId: string }>();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCurrentUserId(session.user.id);
      }
    })();
  }, []);

  // Fetch event info and participants
  const fetchData = useCallback(async () => {
    if (!eventId) return;

    try {
      // Fetch event info
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, event_name, capacity, host_id")
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("Error fetching event:", eventError);
        Alert.alert("Error", "Could not load event details");
        return;
      }

      setEventInfo(eventData);

      // Fetch participants (approved applications)
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_applications")
        .select(`
          id,
          applicant_id,
          status,
          created_at
        `)
        .eq("event_id", eventId)
        .eq("status", "approved")
        .order("created_at", { ascending: true });

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
        return;
      }

      if (participantsData && participantsData.length > 0) {
        // Fetch user details for each participant
        const userIds = participantsData.map((p) => p.applicant_id);
        
        const { data: usersData } = await supabase
          .from("profiles")
          .select("id, full_name, age, bio")
          .in("id", userIds);

        // Fetch main photos
        const { data: photosData } = await supabase
          .from("user_photos")
          .select("user_id, photo_url")
          .in("user_id", userIds)
          .eq("is_main", true);

        // Create user map
        const userMap: Record<string, any> = {};
        usersData?.forEach((user) => {
          userMap[user.id] = { ...user, main_photo_url: null };
        });

        // Add photos to user map
        photosData?.forEach((photo) => {
          if (userMap[photo.user_id]) {
            userMap[photo.user_id].main_photo_url = photo.photo_url;
          }
        });

        // Sign photo URLs
        const participantsWithUsers = await Promise.all(
          participantsData.map(async (participant) => {
            const user = userMap[participant.applicant_id] || null;
            
            if (user?.main_photo_url && !user.main_photo_url.startsWith("http")) {
              const { data: signedData } = await supabase.storage
                .from("user_photos")
                .createSignedUrl(user.main_photo_url, 3600);
              user.main_photo_url = signedData?.signedUrl || null;
            }

            return {
              ...participant,
              joined_at: participant.created_at,
              user,
            };
          })
        );

        setParticipants(participantsWithUsers);
      } else {
        setParticipants([]);
      }
    } catch (error) {
      console.error("Exception fetching data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  // Remove participant
  const handleRemoveParticipant = useCallback((participant: Participant) => {
    Alert.alert(
      "Remove Participant",
      `Are you sure you want to remove ${capitalizeWords(participant.user?.full_name)} from this event?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase
                .from("event_applications")
                .delete()
                .eq("id", participant.id);

              if (error) {
                console.error("Error removing participant:", error);
                Alert.alert("Error", "Could not remove participant");
                return;
              }

              // Update local state
              setParticipants((prev) => prev.filter((p) => p.id !== participant.id));
              Alert.alert("Success", "Participant removed from the event");
            } catch (error) {
              console.error("Exception removing participant:", error);
              Alert.alert("Error", "An unexpected error occurred");
            }
          },
        },
      ]
    );
  }, []);

  // View participant profile
  const handleViewProfile = useCallback((userId: string) => {
    router.push({
      pathname: "/(tabs_support)/other_profile",
      params: { userId }
    });
  }, [router]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color="#0A0E1A" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Participants</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading participants...</Text>
        </View>
      </View>
    );
  }

  const isHost = eventInfo?.host_id === currentUserId;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0A0E1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Event Participants</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Event Info Card */}
      {eventInfo && (
        <View style={styles.eventInfoCard}>
          <View style={styles.eventInfoContent}>
            <Text style={styles.eventName} numberOfLines={1}>
              {eventInfo.event_name}
            </Text>
            <View style={styles.eventStats}>
              <Ionicons name="people" size={16} color={BLUE} />
              <Text style={styles.eventStatsText}>
                {participants.length} / {eventInfo.capacity} participants
              </Text>
            </View>
          </View>
          {/* Progress bar */}
          <View style={styles.capacityBar}>
            <View 
              style={[
                styles.capacityFill, 
                { width: `${Math.min((participants.length / eventInfo.capacity) * 100, 100)}%` }
              ]} 
            />
          </View>
        </View>
      )}

      {/* Participants List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
        }
      >
        {participants.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="people-outline" size={48} color={BLUES.b100} />
            </View>
            <Text style={styles.emptyTitle}>No Participants Yet</Text>
            <Text style={styles.emptySubtitle}>
              People who join this event will appear here
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.sectionLabel}>
              {participants.length} {participants.length === 1 ? "Person" : "People"} Joining
            </Text>
            {participants.map((participant) => (
              <View key={participant.id} style={styles.participantCard}>
                <TouchableOpacity
                  style={styles.participantMain}
                  onPress={() => participant.user?.id && handleViewProfile(participant.user.id)}
                  activeOpacity={0.7}
                >
                  {/* Avatar */}
                  <View style={styles.avatarContainer}>
                    {participant.user?.main_photo_url ? (
                      <Image
                        source={{ uri: participant.user.main_photo_url }}
                        style={styles.avatar}
                      />
                    ) : (
                      <View style={[styles.avatar, styles.avatarPlaceholder]}>
                        <Text style={styles.avatarInitial}>
                          {participant.user?.full_name?.charAt(0)?.toUpperCase() || "?"}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Info */}
                  <View style={styles.participantInfo}>
                    <View style={styles.nameRow}>
                      <Text style={styles.participantName}>
                        {capitalizeWords(participant.user?.full_name)}
                      </Text>
                      {participant.user?.age && (
                        <Text style={styles.participantAge}>, {participant.user.age}</Text>
                      )}
                    </View>
                    <Text style={styles.joinedText}>
                      Joined {formatJoinedDate(participant.joined_at)}
                    </Text>
                  </View>

                  {/* Arrow */}
                  <Ionicons name="chevron-forward" size={20} color="rgba(10, 14, 26, 0.3)" />
                </TouchableOpacity>

                {/* Host Actions */}
                {isHost && (
                  <View style={styles.hostActions}>
                    <TouchableOpacity
                      style={styles.removeBtn}
                      onPress={() => handleRemoveParticipant(participant)}
                    >
                      <Ionicons name="close-circle-outline" size={20} color="#D5222B" />
                      <Text style={styles.removeBtnText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </>
        )}
        
        {/* Bottom padding */}
        <View style={{ height: verticalScale(40) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27, 68, 205, 0.08)",
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "rgba(10, 14, 26, 0.05)",
  },
  headerTitle: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    letterSpacing: 0.3,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
  },
  loadingText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
  },
  eventInfoCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  eventInfoContent: {
    marginBottom: verticalScale(12),
  },
  eventName: {
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    marginBottom: verticalScale(6),
  },
  eventStats: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  eventStatsText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  capacityBar: {
    height: verticalScale(6),
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    borderRadius: verticalScale(3),
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    backgroundColor: BLUE,
    borderRadius: verticalScale(3),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },
  sectionLabel: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "rgba(10, 14, 26, 0.5)",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: verticalScale(12),
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(60),
    paddingHorizontal: scale(32),
  },
  emptyIcon: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
    textAlign: "center",
    lineHeight: scale(20),
  },
  participantCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    marginBottom: verticalScale(12),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
    overflow: "hidden",
  },
  participantMain: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(14),
    gap: scale(12),
  },
  avatarContainer: {
    position: "relative",
  },
  avatar: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(26),
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: BLUES.b100,
  },
  avatarPlaceholder: {
    backgroundColor: BLUES.b120,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInitial: {
    fontSize: scale(20),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  participantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "baseline",
  },
  participantName: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: "#0A0E1A",
  },
  participantAge: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: "#0A0E1A",
  },
  joinedText: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10, 14, 26, 0.5)",
    marginTop: verticalScale(2),
  },
  hostActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(10, 14, 26, 0.06)",
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
  },
  removeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    backgroundColor: "rgba(213, 34, 43, 0.08)",
  },
  removeBtnText: {
    fontSize: scale(13),
    fontFamily: Fonts.bold,
    color: "#D5222B",
  },
});