// app/(tabs_support)/finished_event.tsx
// Shows finished event details with all participants visible
// Since the event has ended, users can see full profiles of all attendees

import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
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

// Types
interface EventDetails {
  id: string;
  event_name: string;
  category: string;
  event_description: string;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  status: string;
  event_type: string;
  host_id: string;
  host_name?: string;
  host_photo?: string;
}

interface Participant {
  id: string;
  full_name: string;
  age?: number;
  photo_url?: string;
  bio?: string;
}

// Category display info
const categoryDisplayNames: Record<string, { label: string; icon: string }> = {
  food_drinks: { label: "Food & Drinks", icon: "food-fork-drink" },
  nightlife_party: { label: "Nightlife", icon: "party-popper" },
  outdoors_nature: { label: "Outdoors", icon: "tree" },
  sports_fitness: { label: "Sports", icon: "basketball" },
  games_hobbies: { label: "Games", icon: "gamepad-variant" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "palette" },
  learning_career: { label: "Learning", icon: "school" },
  community_volunteering: { label: "Volunteering", icon: "hand-heart" },
  romantic_dating: { label: "Dating", icon: "heart" },
  travel_adventure: { label: "Travel", icon: "airplane" },
  online_virtual: { label: "Online", icon: "laptop" },
  other: { label: "Other", icon: "dots-horizontal" },
};

// Participant Card Component
const ParticipantCard: React.FC<{
  participant: Participant;
  onPress: () => void;
  isHost?: boolean;
}> = ({ participant, onPress, isHost }) => {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.participantCard}
    >
      <View style={styles.participantAvatar}>
        {participant.photo_url ? (
          <Image
            source={{ uri: participant.photo_url }}
            style={styles.participantAvatarImage}
          />
        ) : (
          <View style={styles.participantAvatarPlaceholder}>
            <Ionicons name="person" size={24} color="rgba(27,68,205,0.4)" />
          </View>
        )}
        {isHost && (
          <View style={styles.hostBadge}>
            <Ionicons name="star" size={10} color="#F59E0B" />
          </View>
        )}
      </View>

      <View style={styles.participantInfo}>
        <View style={styles.participantNameRow}>
          <Text style={styles.participantName} numberOfLines={1}>
            {participant.full_name || "Anonymous"}
          </Text>
          {isHost && (
            <View style={styles.hostLabel}>
              <Text style={styles.hostLabelText}>Host</Text>
            </View>
          )}
        </View>
        {participant.age && (
          <Text style={styles.participantAge}>{participant.age} years old</Text>
        )}
        {participant.bio && (
          <Text style={styles.participantBio} numberOfLines={2}>
            {participant.bio}
          </Text>
        )}
      </View>

      <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
    </TouchableOpacity>
  );
};

// Empty State Component
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
export default function FinishedEventScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const eventId = params.eventId as string;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<EventDetails | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      // Get current user
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      setCurrentUserId(userId || null);

      if (!eventId) {
        console.log("No event ID provided");
        setLoading(false);
        return;
      }

      // Fetch event details with host info
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          event_name,
          category,
          event_description,
          location_name,
          time_start,
          time_end,
          capacity,
          status,
          event_type,
          host_id,
          profiles!events_host_id_fkey (
            full_name,
            user_photos (photo_url, is_main)
          )
        `)
        .eq("id", eventId)
        .single();

      if (eventError) {
        console.error("Error fetching event:", eventError);
      } else if (eventData) {
        // Get host photo URL
        let hostPhotoUrl = null;
        const hostProfile = eventData.profiles as any;
        if (hostProfile?.user_photos?.length > 0) {
          const mainPhoto = hostProfile.user_photos.find((p: any) => p.is_main);
          const photoPath = mainPhoto?.photo_url || hostProfile.user_photos[0]?.photo_url;
          
          if (photoPath && !photoPath.startsWith("http")) {
            const { data: signedData } = await supabase.storage
              .from("user_photos")
              .createSignedUrl(photoPath, 3600);
            hostPhotoUrl = signedData?.signedUrl || null;
          } else {
            hostPhotoUrl = photoPath;
          }
        }

        setEvent({
          ...eventData,
          host_name: hostProfile?.full_name || "Unknown Host",
          host_photo: hostPhotoUrl,
        });
      }

      // Fetch all approved participants
      // Since event is finished, we can show all participants without privacy restrictions
      const { data: participantsData, error: participantsError } = await supabase
        .from("event_applications")
        .select(`
          applicant_id,
          profiles!event_applications_applicant_id_fkey (
            id,
            full_name,
            age,
            bio,
            user_photos (photo_url, is_main)
          )
        `)
        .eq("event_id", eventId)
        .eq("status", "approved");

      if (participantsError) {
        console.error("Error fetching participants:", participantsError);
      } else if (participantsData) {
        // Process participants and get signed URLs for photos
        const processedParticipants = await Promise.all(
          participantsData.map(async (app: any) => {
            const profile = app.profiles;
            let photoUrl = null;

            if (profile?.user_photos?.length > 0) {
              const mainPhoto = profile.user_photos.find((p: any) => p.is_main);
              const photoPath = mainPhoto?.photo_url || profile.user_photos[0]?.photo_url;

              if (photoPath && !photoPath.startsWith("http")) {
                const { data: signedData } = await supabase.storage
                  .from("user_photos")
                  .createSignedUrl(photoPath, 3600);
                photoUrl = signedData?.signedUrl || null;
              } else {
                photoUrl = photoPath;
              }
            }

            return {
              id: profile?.id || app.applicant_id,
              full_name: profile?.full_name || "Anonymous",
              age: profile?.age,
              bio: profile?.bio,
              photo_url: photoUrl,
            };
          })
        );

        setParticipants(processedParticipants);
      }
    } catch (error) {
      console.error("Error in fetchData:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchData();
    }, [fetchData])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const navigateToProfile = (userId: string) => {
    if (userId === currentUserId) {
      // Navigate to own profile
      router.push("/(tabs)/profile");
    } else {
      // Navigate to other user's profile
      router.push({
        pathname: "/(tabs_support)/other_profile",
        params: { userId },
      });
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (startStr: string, endStr: string) => {
    const start = new Date(startStr);
    const end = new Date(endStr);
    return `${start.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} - ${end.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  };

  const categoryInfo = categoryDisplayNames[event?.category || "other"] || categoryDisplayNames.other;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading event...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event Not Found</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <EmptyState
          icon="calendar-outline"
          title="Event Not Found"
          subtitle="This event may have been deleted or doesn't exist."
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          Event Details
        </Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={BLUE} />
        }
      >
        {/* Event Status Banner */}
        <View style={styles.statusBanner}>
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
          <Text style={styles.statusBannerText}>This event has ended</Text>
        </View>

        {/* Event Info Card */}
        <View style={styles.eventCard}>
          {/* Category Badge */}
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons
              name={categoryInfo.icon as any}
              size={14}
              color={BLUE}
            />
            <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
          </View>

          {/* Event Title */}
          <Text style={styles.eventTitle}>{event.event_name}</Text>

          {/* Event Meta */}
          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <Ionicons name="calendar-outline" size={18} color={BLUE} />
              <Text style={styles.metaText}>{formatDate(event.time_start)}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="time-outline" size={18} color={BLUE} />
              <Text style={styles.metaText}>
                {formatTime(event.time_start, event.time_end)}
              </Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={18} color={BLUE} />
              <Text style={styles.metaText}>{event.location_name}</Text>
            </View>
            <View style={styles.metaRow}>
              <Ionicons name="people-outline" size={18} color={BLUE} />
              <Text style={styles.metaText}>
                {participants.length} / {event.capacity} attended
              </Text>
            </View>
          </View>

          {/* Description */}
          {event.event_description && (
            <View style={styles.descriptionSection}>
              <Text style={styles.sectionLabel}>About this event</Text>
              <Text style={styles.descriptionText}>{event.event_description}</Text>
            </View>
          )}
        </View>

        {/* Host Section */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Event Host</Text>
          <ParticipantCard
            participant={{
              id: event.host_id,
              full_name: event.host_name || "Unknown Host",
              photo_url: event.host_photo,
            }}
            onPress={() => navigateToProfile(event.host_id)}
            isHost
          />
        </View>

        {/* Participants Section */}
        <View style={styles.sectionContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Participants</Text>
            <View style={styles.participantCount}>
              <Ionicons name="people" size={14} color={BLUE} />
              <Text style={styles.participantCountText}>{participants.length}</Text>
            </View>
          </View>

          {participants.length > 0 ? (
            <View style={styles.participantsList}>
              {participants.map((participant) => (
                <ParticipantCard
                  key={participant.id}
                  participant={participant}
                  onPress={() => navigateToProfile(participant.id)}
                  isHost={participant.id === event.host_id}
                />
              ))}
            </View>
          ) : (
            <EmptyState
              icon="people-outline"
              title="No Participants"
              subtitle="No one attended this event."
            />
          )}
        </View>

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons name="information-circle-outline" size={18} color="rgba(10,14,26,0.4)" />
          <Text style={styles.infoNoteText}>
            Since this event has ended, you can view all participants' full profiles.
          </Text>
        </View>

        {/* Bottom spacing */}
        <View style={{ height: insets.bottom + verticalScale(20) }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: verticalScale(16),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.5)",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27,68,205,0.08)",
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    textAlign: "center",
    marginHorizontal: scale(12),
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
  },

  // Status Banner
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    borderRadius: scale(12),
    marginBottom: verticalScale(16),
  },
  statusBannerText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#10B981",
  },

  // Event Card
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(20),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: verticalScale(20),
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
    gap: scale(6),
    alignSelf: "flex-start",
    marginBottom: verticalScale(12),
  },
  categoryBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: BLUE,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  eventTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
    marginBottom: verticalScale(16),
    lineHeight: scale(40),
  },
  eventMeta: {
    gap: verticalScale(10),
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  metaText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    flex: 1,
  },
  descriptionSection: {
    marginTop: verticalScale(16),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(27,68,205,0.08)",
  },
  sectionLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    marginBottom: verticalScale(8),
  },
  descriptionText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    lineHeight: scale(22),
  },

  // Section Container
  sectionContainer: {
    marginBottom: verticalScale(20),
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  sectionTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
  },
  participantCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(14),
  },
  participantCountText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: BLUE,
  },

  // Participant Card
  participantsList: {
    gap: verticalScale(10),
  },
  participantCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.08)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  participantAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    marginRight: scale(14),
    position: "relative",
  },
  participantAvatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: scale(28),
  },
  participantAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    borderRadius: scale(28),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  hostBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: "#FEF3C7",
    borderWidth: 2,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  participantInfo: {
    flex: 1,
  },
  participantNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  participantName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    flex: 1,
  },
  hostLabel: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
  },
  hostLabelText: {
    fontFamily: Fonts.bold,
    fontSize: scale(10),
    color: "#F59E0B",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  participantAge: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(2),
  },
  participantBio: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
    marginTop: verticalScale(4),
    lineHeight: scale(30),
  },

  // Info Note
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(10,14,26,0.04)",
    paddingVertical: verticalScale(14),
    paddingHorizontal: scale(14),
    borderRadius: scale(12),
    gap: scale(10),
    marginTop: verticalScale(4),
  },
  infoNoteText: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.5)",
    lineHeight: scale(30),
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
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
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    textAlign: "center",
    lineHeight: scale(20),
  },
});