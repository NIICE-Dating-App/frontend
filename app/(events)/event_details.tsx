// event_details.tsx - Event Details Page
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Linking,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = "#FFFFFF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";
const CARD_BG = "#FFFFFF";

// Category Display Names
const categoryDisplayNames: Record<string, { label: string; icon: string }> = {
  food_drinks: { label: "Food & Drinks", icon: "food-fork-drink" },
  nightlife_party: { label: "Nightlife & Party", icon: "party-popper" },
  outdoors_nature: { label: "Outdoors & Nature", icon: "tree" },
  sports_fitness: { label: "Sports & Fitness", icon: "dumbbell" },
  games_hobbies: { label: "Games & Hobbies", icon: "gamepad-variant" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "palette" },
  learning_career: { label: "Learning & Career", icon: "school" },
  community_volunteering: { label: "Community", icon: "hand-heart" },
  romantic_dating: { label: "Dating", icon: "heart" },
  travel_adventure: { label: "Travel & Adventure", icon: "airplane" },
  online_virtual: { label: "Online/Virtual", icon: "laptop" },
  other: { label: "Other", icon: "calendar" },
};

// Event Type Display Names
const eventTypeDisplayNames: Record<string, { label: string; color: string }> = {
  public: { label: "Public", color: "#22C55E" },
  public_application: { label: "Application Required", color: "#3B82F6" },
  private: { label: "Private", color: "#EF4444" },
  invite_only: { label: "Invite Only", color: "#8B5CF6" },
  group_event: { label: "Group Event", color: "#F59E0B" },
  community_event: { label: "Community Event", color: "#10B981" },
};

interface EventData {
  id: string;
  host_id: string;
  event_name: string;
  category: string;
  event_description: string;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  status: string;
  event_type: string;
  latitude: number;
  longitude: number;
  gender_allowed: string;
  age_min: number;
  age_max: number;
  accepted_count?: number;
  group_id?: string;
  community_id?: string;
}

export default function EventDetails() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserAge, setCurrentUserAge] = useState<number | null>(null);
  const [currentUserGender, setCurrentUserGender] = useState<string | null>(null);
  const [isOwnEvent, setIsOwnEvent] = useState(false);
  
  // Enhanced states
  const [applicationStatus, setApplicationStatus] = useState<'none' | 'pending' | 'approved' | 'rejected'>('none');
  const [hostInfo, setHostInfo] = useState<any>(null);
  const [attendees, setAttendees] = useState<any[]>([]);
  const [countdown, setCountdown] = useState('');
  const [vibeTags, setVibeTags] = useState<string[]>([]);
  const [applyLoading, setApplyLoading] = useState(false);

  // Fetch event data
  const fetchEventData = async () => {
    if (!id) return;
    
    try {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      // Get accepted count
      const { count } = await supabase
        .from("event_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", id)
        .eq("status", "approved");

      setEvent({ ...data, accepted_count: count || 0 });
    } catch (error) {
      console.error("Error fetching event:", error);
      Alert.alert("Error", "Failed to load event details");
    }
  };

  // Fetch current user
  const fetchCurrentUser = async () => {
    try {
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id;
      if (!userId) return;

      setCurrentUserId(userId);

      const { data: profile } = await supabase
        .from("profiles")
        .select("date_of_birth, gender")
        .eq("id", userId)
        .single();

      if (profile) {
        if (profile.date_of_birth) {
          const birthDate = new Date(profile.date_of_birth);
          const today = new Date();
          let age = today.getFullYear() - birthDate.getFullYear();
          const m = today.getMonth() - birthDate.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
          }
          setCurrentUserAge(age);
        }
        setCurrentUserGender(profile.gender);
      }
    } catch (error) {
      console.error("Error fetching user:", error);
    }
  };

  // Check application status
  const checkApplicationStatus = async () => {
    if (!id || !currentUserId) return;

    try {
      const { data, error } = await supabase
        .from("event_applications")
        .select("status")
        .eq("event_id", id)
        .eq("applicant_id", currentUserId)
        .maybeSingle();

      if (error) {
        console.warn("Could not check application:", error.message);
        return;
      }

      if (data) {
        setApplicationStatus(data.status as any);
      }
    } catch (err) {
      console.warn("Exception checking application:", err);
    }
  };

  // Fetch host info
  const fetchHostInfo = async () => {
    if (!event?.host_id) return;

    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, user_photos(photo_url)")
        .eq("id", event.host_id)
        .single();

      if (profile) {
        let photoUrl = profile.user_photos?.[0]?.photo_url;

        if (photoUrl && !photoUrl.startsWith("http")) {
          const { data: signedData } = await supabase.storage
            .from("user_photos")
            .createSignedUrl(photoUrl, 3600);
          photoUrl = signedData?.signedUrl || null;
        }

        const { count } = await supabase
          .from("events")
          .select("id", { count: "exact", head: true })
          .eq("host_id", event.host_id);

        setHostInfo({
          id: profile.id,
          name: profile.full_name,
          photo: photoUrl,
          eventsHosted: count || 0,
        });
      }
    } catch (error) {
      console.error("Error fetching host info:", error);
    }
  };

  // Fetch attendees
  const fetchAttendees = async () => {
    if (!event) return;

    const canSeeAttendees =
      isOwnEvent ||
      applicationStatus === "approved" ||
      event.event_type === "public" ||
      event.event_type === "group_event" ||
      event.event_type === "community_event";

    if (!canSeeAttendees) {
      setAttendees([]);
      return;
    }

    try {
      const { data } = await supabase
        .from("event_applications")
        .select("applicant_id, profiles(id, full_name, user_photos(photo_url))")
        .eq("event_id", event.id)
        .eq("status", "approved")
        .limit(5);

      if (data) {
        const attendeesWithPhotos = await Promise.all(
          data.map(async (app: any) => {
            const profile = app.profiles;
            let photoUrl = profile?.user_photos?.[0]?.photo_url;

            if (photoUrl && !photoUrl.startsWith("http")) {
              const { data: signedData } = await supabase.storage
                .from("user_photos")
                .createSignedUrl(photoUrl, 3600);
              photoUrl = signedData?.signedUrl || null;
            }

            return {
              id: profile?.id,
              name: profile?.full_name,
              photo: photoUrl,
            };
          })
        );

        setAttendees(attendeesWithPhotos);
      }
    } catch (error) {
      console.error("Error fetching attendees:", error);
    }
  };

  // Generate vibe tags
  const generateVibeTags = () => {
    if (!event?.event_description) {
      setVibeTags([]);
      return;
    }

    const description = event.event_description.toLowerCase();
    const tags: string[] = [];

    const vibeKeywords: Record<string, string[]> = {
      chill: ["chill", "relaxed", "laid back", "casual", "easy going"],
      active: ["active", "energetic", "high energy", "intense", "workout"],
      outdoor: ["outdoor", "outside", "nature", "park", "hike"],
      social: ["social", "meet", "network", "mingle", "friends"],
      competitive: ["competitive", "compete", "game", "challenge"],
      learning: ["learn", "study", "workshop", "class", "educational"],
      creative: ["creative", "art", "craft", "make", "design"],
      fun: ["fun", "exciting", "enjoyable", "entertaining"],
    };

    Object.entries(vibeKeywords).forEach(([tag, keywords]) => {
      if (keywords.some((keyword) => description.includes(keyword))) {
        tags.push(tag);
      }
    });

    setVibeTags(tags.slice(0, 3));
  };

  // Update countdown
  useEffect(() => {
    if (!event) return;

    const updateCountdown = () => {
      const now = Date.now();
      const start = new Date(event.time_start).getTime();
      const diff = start - now;

      if (diff < 0) {
        const end = new Date(event.time_end).getTime();
        if (end > now) {
          setCountdown("Happening now!");
        } else {
          setCountdown("Event ended");
        }
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

      if (hours < 1) {
        setCountdown(`Starts in ${minutes}m`);
      } else if (hours < 24) {
        setCountdown(`Starts in ${hours}h ${minutes}m`);
      } else {
        const days = Math.floor(hours / 24);
        setCountdown(`Starts in ${days}d ${hours % 24}h`);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 60000);

    return () => clearInterval(interval);
  }, [event]);

  // Load data
  const loadData = useCallback(async () => {
    try {
      await fetchCurrentUser();
      await fetchEventData();
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Check if own event
  useEffect(() => {
    if (event && currentUserId) {
      setIsOwnEvent(event.host_id === currentUserId);
    }
  }, [event, currentUserId]);

  // Fetch additional data when event is loaded
  useEffect(() => {
    if (event && currentUserId) {
      checkApplicationStatus();
      fetchHostInfo();
      fetchAttendees();
      generateVibeTags();
    }
  }, [event, currentUserId, isOwnEvent]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} - ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Check eligibility
  const isEligible = (() => {
    if (!event || !currentUserAge || !currentUserGender) return true;

    const ageOk = currentUserAge >= event.age_min && currentUserAge <= event.age_max;
    const genderOk =
      event.gender_allowed === "all" ||
      event.gender_allowed === currentUserGender;

    return ageOk && genderOk;
  })();

  // Can apply
  const canApply = (() => {
    if (!event || !currentUserId || isOwnEvent) return false;
    if (applicationStatus === "approved" || applicationStatus === "pending") return false;
    if (!isEligible) return false;

    const filled = event.accepted_count || 0;
    if (filled >= event.capacity) return false;

    return true;
  })();

  // Requires application
  const requiresApplication = event?.event_type === "public_application" || event?.event_type === "private";

  // Handle apply
  const handleApply = async () => {
    if (!event || !currentUserId) return;

    setApplyLoading(true);
    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc("apply_to_event", {
        p_event_id: event.id,
        p_message: null,
      });

      if (rpcError) {
        Alert.alert("Failed to apply", rpcError.message || "Please try again");
        return;
      }

      if (event.event_type === "public") {
        setApplicationStatus("approved");
        Alert.alert("Joined!", "You've joined this event");
      } else {
        setApplicationStatus("pending");
        Alert.alert("Applied!", "Your application has been sent");
      }

      loadData();
    } catch (error) {
      console.error("Error applying:", error);
      Alert.alert("Error", "Failed to apply. Please try again.");
    } finally {
      setApplyLoading(false);
    }
  };

  // Open in Maps
  const openInMaps = () => {
    if (!event) return;

    Alert.alert(
      "Open in Maps",
      `Navigate to ${event.location_name}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open",
          onPress: async () => {
            const url = Platform.select({
              ios: `maps://app?daddr=${event.latitude},${event.longitude}`,
              android: `google.navigation:q=${event.latitude},${event.longitude}`,
            });
            const fallbackUrl = `https://www.google.com/maps/dir/?api=1&destination=${event.latitude},${event.longitude}`;

            try {
              const supported = await Linking.canOpenURL(url!);
              if (supported) {
                await Linking.openURL(url!);
              } else {
                await Linking.openURL(fallbackUrl);
              }
            } catch {
              await Linking.openURL(fallbackUrl);
            }
          },
        },
      ]
    );
  };

  // Share event
  const handleShare = async () => {
    if (!event) return;

    try {
      await Share.share({
        message: `Check out this event: ${event.event_name}\n${event.location_name}\n${new Date(event.time_start).toLocaleString()}`,
        title: "Share Event",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  // Get button text
  const getButtonText = () => {
    if (applicationStatus === "approved") return "Joined";
    if (applicationStatus === "pending") return "Pending";
    if (applicationStatus === "rejected") return "Not Accepted";
    if (!isEligible) return "Not Eligible";
    if (requiresApplication) return "Apply Now";
    return "Join Event";
  };

  // Get button color
  const getButtonColor = () => {
    if (applicationStatus === "approved") return "#22C55E";
    if (applicationStatus === "pending") return "#F59E0B";
    if (applicationStatus === "rejected") return "#EF4444";
    if (!isEligible) return "#9CA3AF";
    return BLUE;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
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
        <StatusBar barStyle="dark-content" />
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle" size={64} color="rgba(10,14,26,0.2)" />
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  const eventTypeInfo = eventTypeDisplayNames[event.event_type] || eventTypeDisplayNames.public;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={INK} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>Event Details</Text>
        <TouchableOpacity
          onPress={handleShare}
          style={styles.headerBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="share-outline" size={24} color={INK} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={BLUE}
            colors={[BLUE]}
          />
        }
      >
        {/* Category & Type Badges */}
        <View style={styles.badgeRow}>
          <View style={styles.categoryBadge}>
            <MaterialCommunityIcons name={categoryInfo.icon as any} size={14} color={BLUE} />
            <Text style={styles.categoryBadgeText}>{categoryInfo.label}</Text>
          </View>
          <View style={[styles.typeBadge, { backgroundColor: `${eventTypeInfo.color}15`, borderColor: `${eventTypeInfo.color}30` }]}>
            <Text style={[styles.typeBadgeText, { color: eventTypeInfo.color }]}>{eventTypeInfo.label}</Text>
          </View>
        </View>

        {/* Event Title */}
        <Text style={styles.eventTitle}>{event.event_name}</Text>

        {/* Countdown */}
        {countdown && (
          <View style={[styles.countdownCard, countdown.includes('now') && styles.countdownCardNow]}>
            <View style={[styles.countdownIcon, countdown.includes('now') && styles.countdownIconNow]}>
              <Ionicons
                name={countdown.includes('now') ? "radio-button-on" : "time-outline"}
                size={18}
                color={countdown.includes('now') ? "#22C55E" : BLUE}
              />
            </View>
            <Text style={[styles.countdownText, countdown.includes('now') && styles.countdownTextNow]}>
              {countdown}
            </Text>
          </View>
        )}

        {/* Info Cards */}
        <View style={styles.infoCard}>
          {/* Date & Time */}
          <View style={styles.infoRow}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="calendar" size={20} color={BLUE} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Date & Time</Text>
              <Text style={styles.infoValue}>{formatTime(event.time_start)}</Text>
              <Text style={styles.infoSubtext}>to {formatTime(event.time_end)}</Text>
            </View>
          </View>

          {/* Location */}
          <TouchableOpacity style={styles.infoRow} onPress={openInMaps} activeOpacity={0.7}>
            <View style={styles.infoIconWrap}>
              <Ionicons name="location" size={20} color={BLUE} />
            </View>
            <View style={[styles.infoContent, { flex: 1 }]}>
              <Text style={styles.infoLabel}>Location</Text>
              <Text style={styles.infoValue} numberOfLines={2}>{event.location_name}</Text>
            </View>
            <Ionicons name="navigate-outline" size={20} color={BLUE} />
          </TouchableOpacity>
        </View>

        {/* Mini Map */}
        {event.latitude && event.longitude && (
          <TouchableOpacity onPress={openInMaps} activeOpacity={0.9} style={styles.mapContainer}>
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              initialRegion={{
                latitude: event.latitude,
                longitude: event.longitude,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01,
              }}
              scrollEnabled={false}
              zoomEnabled={false}
              pitchEnabled={false}
              rotateEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: event.latitude,
                  longitude: event.longitude,
                }}
              >
                <View style={styles.markerContainer}>
                  <View style={styles.markerBubble}>
                    <MaterialCommunityIcons name={categoryInfo.icon as any} size={20} color={BLUE} />
                  </View>
                  <View style={styles.markerPin} />
                </View>
              </Marker>
            </MapView>
            <View style={styles.mapOverlay}>
              <Text style={styles.mapOverlayText}>Tap to navigate</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Capacity Progress */}
        {(() => {
          const filled = event.accepted_count || 0;
          const total = event.capacity || 1;
          const percentage = Math.min(100, Math.max(0, (filled / total) * 100));
          const remaining = Math.max(0, total - filled);

          let barColor = "#22C55E";
          if (percentage > 80) barColor = "#EF4444";
          else if (percentage > 60) barColor = "#F59E0B";

          return (
            <View style={styles.capacityCard}>
              <View style={styles.capacityHeader}>
                <Text style={styles.capacityTitle}>Event Capacity</Text>
                {remaining <= 3 && remaining > 0 && (
                  <View style={styles.spotsLeftBadge}>
                    <Text style={styles.spotsLeftText}>
                      {remaining === 1 ? "1 spot left!" : `${remaining} spots left!`}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.capacityBar}>
                <View style={[styles.capacityFill, { width: `${percentage}%`, backgroundColor: barColor }]} />
              </View>
              <Text style={styles.capacityText}>{filled} / {total} spots filled</Text>
            </View>
          );
        })()}

        {/* Vibe Tags */}
        {vibeTags.length > 0 && (
          <View style={styles.vibeTagsRow}>
            {vibeTags.map((tag, index) => {
              const tagColors: Record<string, string> = {
                chill: "#8B5CF6",
                active: "#EF4444",
                outdoor: "#10B981",
                social: "#3B82F6",
                competitive: "#F59E0B",
                learning: "#6366F1",
                creative: "#EC4899",
                fun: "#F97316",
              };
              const color = tagColors[tag] || "#6B7280";

              return (
                <View
                  key={`vibe-${index}`}
                  style={[styles.vibeTag, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
                >
                  <Text style={[styles.vibeTagText, { color }]}>{tag}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Description */}
        <View style={styles.descriptionCard}>
          <Text style={styles.sectionTitle}>About this Event</Text>
          <Text style={styles.descriptionText}>{event.event_description}</Text>
        </View>

        {/* Requirements */}
        <View style={styles.requirementsCard}>
          <Text style={styles.sectionTitle}>Requirements</Text>
          <View style={styles.requirementsGrid}>
            <View style={styles.requirementItem}>
              <Ionicons name="people-outline" size={18} color="rgba(10,14,26,0.5)" />
              <Text style={styles.requirementText}>
                {event.gender_allowed === "all" ? "All genders" :
                 event.gender_allowed === "male" ? "Men only" : "Women only"}
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Ionicons name="calendar-outline" size={18} color="rgba(10,14,26,0.5)" />
              <Text style={styles.requirementText}>
                Ages {event.age_min} - {event.age_max}
              </Text>
            </View>
          </View>
          {!isEligible && (
            <View style={styles.ineligibleBanner}>
              <Ionicons name="alert-circle" size={18} color="#EF4444" />
              <Text style={styles.ineligibleText}>You don't meet the requirements for this event</Text>
            </View>
          )}
        </View>

        {/* Host Card */}
        {hostInfo && (
          <TouchableOpacity
            onPress={() => {
              if (hostInfo.id !== currentUserId) {
                router.push({
                  pathname: "/(tabs_support)/other_profile",
                  params: { userId: hostInfo.id },
                });
              }
            }}
            disabled={hostInfo.id === currentUserId}
            activeOpacity={0.7}
            style={styles.hostCard}
          >
            <View style={styles.hostAvatar}>
              {hostInfo.photo ? (
                <Image source={{ uri: hostInfo.photo }} style={styles.hostImage} />
              ) : (
                <View style={styles.hostImagePlaceholder}>
                  <Ionicons name="person" size={24} color="#6B7280" />
                </View>
              )}
            </View>
            <View style={styles.hostInfo}>
              <View style={styles.hostNameRow}>
                <Text style={styles.hostName}>{hostInfo.name}</Text>
                <View style={styles.hostBadge}>
                  <Text style={styles.hostBadgeText}>HOST</Text>
                </View>
              </View>
              <Text style={styles.hostStats}>
                {hostInfo.eventsHosted === 1 ? "Hosted 1 event" : `Hosted ${hostInfo.eventsHosted || 0} events`}
              </Text>
            </View>
            {hostInfo.id !== currentUserId && (
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            )}
          </TouchableOpacity>
        )}

        {/* Attendees */}
        {attendees.length > 0 && (
          <TouchableOpacity
            onPress={() => {
              router.push({
                pathname: "/(tabs_support)/host_applications_public",
                params: { eventId: event.id },
              });
            }}
            activeOpacity={0.7}
            style={styles.attendeesCard}
          >
            <View style={styles.attendeesHeader}>
              <Text style={styles.sectionTitle}>Who's Coming</Text>
              <Ionicons name="chevron-forward" size={18} color="#6B7280" />
            </View>
            <View style={styles.attendeesRow}>
              {attendees.map((attendee, index) => (
                <View
                  key={attendee.id}
                  style={[styles.attendeeAvatar, { zIndex: attendees.length - index, marginLeft: index === 0 ? 0 : -12 }]}
                >
                  {attendee.photo ? (
                    <Image source={{ uri: attendee.photo }} style={styles.attendeeImage} />
                  ) : (
                    <View style={styles.attendeeImagePlaceholder}>
                      <Ionicons name="person" size={16} color="#6B7280" />
                    </View>
                  )}
                </View>
              ))}
              {(event.accepted_count || 0) > attendees.length && (
                <View style={[styles.attendeeAvatar, { marginLeft: -12 }]}>
                  <View style={styles.attendeeMorePlaceholder}>
                    <Text style={styles.attendeeMoreText}>+{(event.accepted_count || 0) - attendees.length}</Text>
                  </View>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Bottom Spacer */}
        <View style={{ height: verticalScale(120) }} />
      </ScrollView>

      {/* Action Footer */}
      <View style={styles.footer}>
        {isOwnEvent ? (
          <View style={styles.ownerActions}>
            <TouchableOpacity
              style={styles.viewApplicationsBtn}
              onPress={() => {
                router.push({
                  pathname: "/(tabs_support)/host_applications_public",
                  params: { eventId: event.id },
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="people" size={20} color={BLUE} />
              <Text style={styles.viewApplicationsBtnText}>
                {event.event_type === "public" ? "See Participants" : "View Applications"}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => {
                router.push({
                  pathname: "/(events)/edit_event",
                  params: { id: event.id },
                });
              }}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color="#FFFFFF" />
              <Text style={styles.editBtnText}>Edit Event</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.applyBtn, { backgroundColor: getButtonColor() }]}
            onPress={() => {
              if (canApply) {
                if (requiresApplication) {
                  router.push({
                    pathname: "/(tabs_support)/event_application_user",
                    params: { eventId: event.id },
                  });
                } else {
                  handleApply();
                }
              }
            }}
            disabled={!canApply || applyLoading}
            activeOpacity={0.8}
          >
            <Ionicons
              name={
                applicationStatus === "approved"
                  ? "checkmark-circle"
                  : applicationStatus === "pending"
                  ? "hourglass-outline"
                  : applicationStatus === "rejected"
                  ? "close-circle"
                  : !isEligible
                  ? "ban"
                  : requiresApplication
                  ? "paper-plane"
                  : "enter-outline"
              }
              size={20}
              color="#FFFFFF"
            />
            <Text style={styles.applyBtnText}>
              {applyLoading ? "Processing..." : getButtonText()}
            </Text>
          </TouchableOpacity>
        )}
      </View>
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
  },
  loadingText: {
    marginTop: verticalScale(12),
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(40),
  },
  errorText: {
    marginTop: verticalScale(16),
    fontSize: scale(18),
    fontFamily: Fonts.bold,
    color: INK,
  },
  backBtn: {
    marginTop: verticalScale(20),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(24),
    borderRadius: scale(12),
  },
  backBtnText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(10,14,26,0.06)",
  },
  headerBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(20),
    backgroundColor: "rgba(10,14,26,0.04)",
  },
  headerTitle: {
    flex: 1,
    fontSize: scale(17),
    fontFamily: Fonts.bold,
    color: INK,
    textAlign: "center",
    marginHorizontal: scale(12),
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(16),
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    gap: scale(5),
  },
  categoryBadgeText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  typeBadge: {
    paddingVertical: verticalScale(5),
    paddingHorizontal: scale(10),
    borderRadius: scale(12),
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
  },
  eventTitle: {
    fontSize: scale(24),
    fontFamily: Fonts.bold,
    color: INK,
    lineHeight: scale(32),
    marginBottom: verticalScale(16),
  },
  countdownCard: {
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
    marginBottom: verticalScale(16),
  },
  countdownCardNow: {
    backgroundColor: "rgba(34,197,94,0.08)",
    borderColor: "rgba(34,197,94,0.3)",
  },
  countdownIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27,68,205,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  countdownIconNow: {
    backgroundColor: "rgba(34,197,94,0.2)",
  },
  countdownText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: BLUE,
    letterSpacing: 0.3,
  },
  countdownTextNow: {
    color: "#22C55E",
  },
  infoCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: verticalScale(16),
    marginBottom: verticalScale(16),
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: scale(12),
  },
  infoIconWrap: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: scale(12),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.5)",
    marginBottom: verticalScale(2),
  },
  infoValue: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: INK,
  },
  infoSubtext: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    marginTop: verticalScale(2),
  },
  mapContainer: {
    height: verticalScale(150),
    borderRadius: scale(16),
    overflow: "hidden",
    marginBottom: verticalScale(16),
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  markerContainer: {
    alignItems: "center",
  },
  markerBubble: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: CARD_BG,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: BLUE,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  markerPin: {
    width: 0,
    height: 0,
    borderLeftWidth: scale(8),
    borderRightWidth: scale(8),
    borderTopWidth: scale(10),
    borderStyle: "solid",
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: BLUE,
    marginTop: -2,
  },
  mapOverlay: {
    position: "absolute",
    bottom: scale(10),
    right: scale(10),
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
  },
  mapOverlayText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  capacityCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  capacityHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  capacityTitle: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
  },
  spotsLeftBadge: {
    backgroundColor: "rgba(239,68,68,0.1)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(4),
    borderRadius: scale(12),
  },
  spotsLeftText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "#EF4444",
  },
  capacityBar: {
    height: scale(8),
    backgroundColor: "#E5E7EB",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  capacityFill: {
    height: "100%",
    borderRadius: scale(4),
  },
  capacityText: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "#6B7280",
  },
  vibeTagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: verticalScale(16),
  },
  vibeTag: {
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(6),
    borderRadius: scale(16),
    borderWidth: 1,
  },
  vibeTagText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    textTransform: "capitalize",
  },
  descriptionCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: verticalScale(16),
  },
  sectionTitle: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: INK,
    marginBottom: verticalScale(10),
  },
  descriptionText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: INK,
    lineHeight: scale(22),
  },
  requirementsCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: verticalScale(16),
  },
  requirementsGrid: {
    flexDirection: "row",
    gap: scale(16),
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
  },
  requirementText: {
    fontSize: scale(14),
    fontFamily: Fonts.primary,
    color: INK,
  },
  ineligibleBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(8),
    backgroundColor: "rgba(239,68,68,0.1)",
    padding: scale(12),
    borderRadius: scale(10),
    marginTop: verticalScale(12),
  },
  ineligibleText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "#EF4444",
  },
  hostCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  hostAvatar: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    overflow: "hidden",
  },
  hostImage: {
    width: "100%",
    height: "100%",
  },
  hostImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  hostInfo: {
    flex: 1,
  },
  hostNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
  },
  hostName: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: INK,
  },
  hostBadge: {
    backgroundColor: "rgba(27,68,205,0.15)",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
  },
  hostBadgeText: {
    fontSize: scale(10),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  hostStats: {
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "#6B7280",
    marginTop: verticalScale(2),
  },
  attendeesCard: {
    backgroundColor: "#F9FAFB",
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 1,
    borderColor: "#E5E7EB",
    marginBottom: verticalScale(16),
  },
  attendeesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: verticalScale(12),
  },
  attendeesRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  attendeeAvatar: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    borderWidth: 2,
    borderColor: "#FFFFFF",
    overflow: "hidden",
    backgroundColor: "#E5E7EB",
  },
  attendeeImage: {
    width: "100%",
    height: "100%",
  },
  attendeeImagePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeMorePlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  attendeeMoreText: {
    fontSize: scale(12),
    fontFamily: Fonts.bold,
    color: "#6B7280",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(16),
    paddingBottom: verticalScale(32),
    backgroundColor: BG,
    borderTopWidth: 1,
    borderTopColor: "rgba(10,14,26,0.06)",
  },
  ownerActions: {
    gap: verticalScale(10),
  },
  viewApplicationsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: "rgba(27,68,205,0.08)",
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.15)",
  },
  viewApplicationsBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    backgroundColor: BLUE,
    paddingVertical: verticalScale(14),
    borderRadius: scale(14),
  },
  editBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  applyBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: scale(8),
    paddingVertical: verticalScale(16),
    borderRadius: scale(14),
  },
  applyBtnText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
});