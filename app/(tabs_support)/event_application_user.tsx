// app/(tabs_support)/event_application_user.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

const BLUES = {
  b00: "#0B1C60", b10: "#0D236F", b20: "#0F2C8A", b30: "#1437A4", b40: "#1840B8",
  b50: "#1B44CD", b60: "#2D58D6", b70: "#3E6BE0", b80: "#4E7DE9", b90: "#6B95F0",
  b100: "#86A9F5", b110: "#A5BFF9", b120: "#C4D5FC", b130: "#E6EFFF",
} as const;

const GRADIENTS = { chipActive: [BLUES.b60, BLUES.b80] } as const;

type EventCategory = 
  | "food_drinks"
  | "nightlife_party"
  | "outdoors_nature"
  | "sports_fitness"
  | "games_hobbies"
  | "arts_culture_entertainment"
  | "learning_career"
  | "community_volunteering"
  | "romantic_dating"
  | "travel_adventure"
  | "online_virtual"
  | "other";

type EventType = 'public' | 'public_application' | 'private' | 'invite_only' | 'group_event' | 'community_event';

interface EventData {
  id: string;
  event_name: string;
  category: EventCategory;
  latitude: number;
  longitude: number;
  location_name: string;
  time_start: string;
  time_end: string;
  capacity: number;
  event_description?: string;
  host_id: string;
  age_min: number;
  age_max: number;
  gender_allowed: string;
  status: string;
  event_type?: EventType;
  accepted_count?: number;
  fuzzy_radius_meters?: number;
}

interface HostProfile {
  id: string;
  full_name: string;
  age: number | null;
  bio: string | null;
  main_photo_url: string | null;
  frame_id: string | null;
  lat: number | null;
  lng: number | null;
  sexual_orientation: string | null;
  looking_for_friend: string[] | null;
  value_friend: string[] | null;
}

const eventTypeDisplayNames: Record<EventType, { label: string; icon: string; color: string }> = {
  public: { label: "Public", icon: "earth", color: "#22C55E" },
  public_application: { label: "Apply to Join", icon: "clipboard-check-outline", color: "#3B82F6" },
  private: { label: "Private", icon: "lock-outline", color: "#8B5CF6" },
  invite_only: { label: "Invite Only", icon: "email-outline", color: "#F59E0B" },
  group_event: { label: "Group Event", icon: "account-group", color: "#EC4899" },
  community_event: { label: "Community", icon: "home-group", color: "#06B6D4" },
};

const categoryDisplayNames: Record<EventCategory, { label: string; icon: string }> = {
  food_drinks: { label: "Food & Drinks", icon: "silverware-fork-knife" },
  nightlife_party: { label: "Nightlife & Party", icon: "weather-night" },
  outdoors_nature: { label: "Outdoors & Nature", icon: "pine-tree" },
  sports_fitness: { label: "Sports & Fitness", icon: "dumbbell" },
  games_hobbies: { label: "Games & Hobbies", icon: "gamepad-variant" },
  arts_culture_entertainment: { label: "Arts & Culture", icon: "palette" },
  learning_career: { label: "Learning & Career", icon: "school" },
  community_volunteering: { label: "Community", icon: "account-group" },
  romantic_dating: { label: "Romantic & Dating", icon: "heart" },
  travel_adventure: { label: "Travel & Adventure", icon: "airplane" },
  online_virtual: { label: "Online / Virtual", icon: "laptop" },
  other: { label: "Other", icon: "dots-horizontal" },
};

// Helper functions
const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/","/object/public/user_photos/","/user_photos/"];
  for (const m of markers) {
    const i = urlOrPath.indexOf(m);
    if (i !== -1) return decodeURIComponent(urlOrPath.substring(i + m.length).split("?")[0]);
  }
  return null;
};

const signPath = async (path: string | null): Promise<string | null> => {
  if (!path) return null;
  const { data, error } = await supabase.storage.from("user_photos").createSignedUrl(path, 3600);
  if (error) console.warn("signPath error:", error.message);
  return data?.signedUrl ?? null;
};

// Humanize string helper
const humanize = (s: string | null | undefined): string => {
  if (!s) return "";
  return s
    .replace(/_/g, " ")
    .split(" ")
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
};

// Distance calculation
const toRad = (d: number) => (d * Math.PI) / 180;
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Format looking for display
const formatLookingFor = (options: string[] | null): string | null => {
  if (!options || options.length === 0) return null;
  
  const displayMap: Record<string, string> = {
    'new_friends_nearby': 'New friends nearby',
    'workout_fitness_buddy': 'Workout buddy',
    'travel_companions': 'Travel companions',
    'activity_hobby_partners': 'Hobby partners',
    'casual_hangouts': 'Casual hangouts',
    'professional_networking': 'Networking',
    'close_friendships': 'Close friendships',
  };
  
  const mapped = options.slice(0, 2).map(o => displayMap[o] || humanize(o));
  return mapped.join(' · ');
};

// Format values display
const formatValues = (values: string[] | null): string | null => {
  if (!values || values.length === 0) return null;
  return values.slice(0, 3).map(v => humanize(v)).join(' · ');
};

// Host Preview Card Component
const HostPreviewCard: React.FC<{
  host: HostProfile;
  hostPhotoUrl: string | null;
  userPosition: { lat: number; lng: number } | null;
}> = ({ host, hostPhotoUrl, userPosition }) => {
  const [expanded, setExpanded] = useState(false);
  const [animatedHeight] = useState(new Animated.Value(0));

  const hasFrame = !!host.frame_id;
  
  // Calculate distance
  const distanceText = (() => {
    if (!userPosition || !host.lat || !host.lng) return null;
    const km = calculateDistance(userPosition.lat, userPosition.lng, host.lat, host.lng);
    if (km < 1) return `${Math.round(km * 1000)}m away`;
    return `${km.toFixed(1)}km away`;
  })();

  const orientationDisplay = host.sexual_orientation ? humanize(host.sexual_orientation) : null;
  const lookingForDisplay = formatLookingFor(host.looking_for_friend);
  const valuesDisplay = formatValues(host.value_friend);

  const hasExpandedContent = host.bio || orientationDisplay || lookingForDisplay || valuesDisplay;

  useEffect(() => {
    Animated.timing(animatedHeight, {
      toValue: expanded ? 1 : 0,
      duration: 250,
      useNativeDriver: false,
    }).start();
  }, [expanded]);

  const toggleExpand = () => {
    if (hasExpandedContent) {
      setExpanded(!expanded);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.hostCard}
      onPress={toggleExpand}
      activeOpacity={hasExpandedContent ? 0.7 : 1}
    >
      {/* Main Host Row - Always Visible */}
      <View style={styles.hostMainRow}>
        {/* Photo with Frame indicator */}
        <View style={styles.hostPhotoContainer}>
          {hasFrame && (
            <View style={styles.frameRing}>
              <LinearGradient
                colors={[BLUES.b50, BLUES.b80]}
                style={styles.frameRingGradient}
              />
            </View>
          )}
          <View style={styles.hostPhotoWrap}>
            {hostPhotoUrl ? (
              <Image source={{ uri: hostPhotoUrl }} style={styles.hostPhoto} />
            ) : (
              <View style={styles.hostPhotoPlaceholder}>
                <Ionicons name="person" size={scale(24)} color={BLUES.b90} />
              </View>
            )}
          </View>
        </View>

        {/* Name, Age, Distance */}
        <View style={styles.hostInfoMain}>
          <Text style={styles.hostLabel}>Hosted by</Text>
          <Text style={styles.hostName}>
            {host.full_name}{host.age ? `, ${host.age}` : ''}
          </Text>
          {distanceText && (
            <View style={styles.hostDistanceRow}>
              <Ionicons name="location-outline" size={scale(12)} color="rgba(10, 14, 26, 0.5)" />
              <Text style={styles.hostDistanceText}>{distanceText}</Text>
            </View>
          )}
        </View>

        {/* Expand indicator */}
        {hasExpandedContent && (
          <Ionicons 
            name={expanded ? "chevron-up" : "chevron-down"} 
            size={scale(20)} 
            color={BLUES.b90} 
          />
        )}
      </View>

      {/* Expanded Content */}
      {expanded && hasExpandedContent && (
        <Animated.View style={[
          styles.hostExpandedContent,
          {
            opacity: animatedHeight,
          }
        ]}>
          {/* Bio */}
          {host.bio && (
            <View style={styles.hostBioSection}>
              <Text style={styles.hostBioText} numberOfLines={3}>{host.bio}</Text>
            </View>
          )}

          {/* Chips Row */}
          {(lookingForDisplay || orientationDisplay) && (
            <View style={styles.hostChipsRow}>
              {lookingForDisplay && (
                <View style={styles.hostChip}>
                  <Ionicons name="people-outline" size={scale(12)} color={BLUE} />
                  <Text style={styles.hostChipText}>{lookingForDisplay}</Text>
                </View>
              )}
              {orientationDisplay && (
                <View style={styles.hostChip}>
                  <Ionicons name="sparkles-outline" size={scale(12)} color={BLUE} />
                  <Text style={styles.hostChipText}>{orientationDisplay}</Text>
                </View>
              )}
            </View>
          )}

          {/* Values */}
          {valuesDisplay && (
            <View style={styles.hostValuesSection}>
              <Text style={styles.hostValuesLabel}>Values</Text>
              <Text style={styles.hostValuesText}>{valuesDisplay}</Text>
            </View>
          )}
        </Animated.View>
      )}

      {/* Tap hint */}
      {hasExpandedContent && !expanded && (
        <Text style={styles.hostTapHint}>Tap to see more about the host</Text>
      )}
    </TouchableOpacity>
  );
};

export default function EventApplicationUserScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = params.eventId;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [host, setHost] = useState<HostProfile | null>(null);
  const [hostPhotoUrl, setHostPhotoUrl] = useState<string | null>(null);
  const [applicationMessage, setApplicationMessage] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [existingStatus, setExistingStatus] = useState<string | null>(null);
  const [userPosition, setUserPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Get user's current position
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const location = await Location.getCurrentPositionAsync({});
          setUserPosition({
            lat: location.coords.latitude,
            lng: location.coords.longitude,
          });
        }
      } catch (error) {
        console.log("Could not get location:", error);
      }
    })();
  }, []);

  // Fetch event and host data
  const loadEventData = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      // Get current user
      const { data: auth } = await supabase.auth.getUser();
      setCurrentUserId(auth?.user?.id ?? null);

      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select(`
          id,
          event_name,
          category,
          latitude,
          longitude,
          location_name,
          time_start,
          time_end,
          capacity,
          event_description,
          host_id,
          age_min,
          age_max,
          gender_allowed,
          status,
          event_type,
          fuzzy_radius_meters
        `)
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        console.error("Error fetching event:", eventError);
        Alert.alert("Error", "Could not load event details");
        router.back();
        return;
      }

      // Get accepted count
      const { count: acceptedCount } = await supabase
        .from("event_applications")
        .select("*", { count: "exact", head: true })
        .eq("event_id", eventId)
        .eq("status", "approved");

      const fullEvent: EventData = {
        ...eventData,
        accepted_count: acceptedCount || 0,
      };
      setEvent(fullEvent);

      // Check if user already applied
      if (auth?.user?.id) {
        const { data: existingApp } = await supabase
          .from("event_applications")
          .select("status")
          .eq("event_id", eventId)
          .eq("applicant_id", auth.user.id)
          .maybeSingle();

        if (existingApp) {
          setExistingStatus(existingApp.status);
        }
      }

      // Fetch host profile with extended info
      if (eventData.host_id) {
        const { data: hostData } = await supabase
          .from("profiles")
          .select("id, full_name, age, bio, frame_id, lat, lng, sexual_orientation")
          .eq("id", eventData.host_id)
          .single();

        if (hostData) {
          // Get host's main photo
          const { data: photoData } = await supabase
            .from("user_photos")
            .select("photo_url")
            .eq("user_id", eventData.host_id)
            .eq("is_main", true)
            .maybeSingle();

          // Fetch host's friend mode data
          let friendModeData: { looking_for_friend: string[] | null; value_friend: string[] | null } | null = null;
          
          try {
            const { data: modeData, error: modeError } = await supabase.rpc('get_user_friend_mode', {
              target_user_id: eventData.host_id
            });
            
            if (!modeError && modeData && modeData.length > 0) {
              friendModeData = modeData[0];
            }
          } catch (err) {
            console.log("Could not fetch friend mode data:", err);
          }

          setHost({
            id: hostData.id,
            full_name: hostData.full_name,
            age: hostData.age,
            bio: hostData.bio,
            main_photo_url: photoData?.photo_url || null,
            frame_id: hostData.frame_id,
            lat: hostData.lat,
            lng: hostData.lng,
            sexual_orientation: hostData.sexual_orientation,
            looking_for_friend: friendModeData?.looking_for_friend || null,
            value_friend: friendModeData?.value_friend || null,
          });

          // Sign the photo URL
          if (photoData?.photo_url) {
            const signedUrl = await signPath(toStoragePath(photoData.photo_url));
            setHostPhotoUrl(signedUrl);
          }
        }
      }

    } catch (error) {
      console.error("Error loading event data:", error);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadEventData();
  }, [loadEventData]);

  // Format date/time
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} · ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  // Submit application
  const handleSubmit = async () => {
    if (!event || !currentUserId) {
      Alert.alert("Error", "Please try again");
      return;
    }

    if (existingStatus) {
      Alert.alert("Already Applied", `You have already applied to this event. Status: ${existingStatus}`);
      return;
    }

    Keyboard.dismiss();
    setSubmitting(true);

    try {
      const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_to_event', {
        p_event_id: event.id,
        p_message: applicationMessage.trim() || null,
      });

      if (rpcError) {
        console.error("RPC error:", rpcError);
        Alert.alert("Error", rpcError.message || "Failed to submit application");
        return;
      }

      if (rpcResult) {
        if (rpcResult.success) {
          const newStatus = rpcResult.status as string;
          
          if (newStatus === 'approved') {
            Alert.alert(
              "You're In! 🎉",
              "You've successfully joined the event. Check your chats for the event group!",
              [{ text: "Great!", onPress: () => router.back() }]
            );
          } else {
            Alert.alert(
              "Application Sent! ✓",
              "Your application has been sent to the host. You'll be notified when they respond.",
              [{ text: "OK", onPress: () => router.back() }]
            );
          }
        } else {
          Alert.alert("Cannot Apply", rpcResult.error || "Failed to submit application");
        }
      }
    } catch (error: any) {
      console.error("Submit exception:", error);
      Alert.alert("Error", error.message || "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  // Render
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading event details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!event) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Ionicons name="alert-circle-outline" size={scale(48)} color="#FF4444" />
          <Text style={styles.errorText}>Event not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const eventTypeInfo = eventTypeDisplayNames[event.event_type || 'public'];
  const categoryInfo = categoryDisplayNames[event.category] || categoryDisplayNames.other;
  const isPrivate = event.event_type === 'private';
  const spotsLeft = event.capacity - (event.accepted_count || 0);

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <KeyboardAvoidingView 
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBackBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={scale(24)} color={INK} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Apply to Event</Text>
          <View style={styles.headerBackBtn} />
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Event Card */}
          <View style={styles.eventCard}>
            {/* Event Type Badge */}
            <View style={[styles.typeBadge, { backgroundColor: eventTypeInfo.color }]}>
              <MaterialCommunityIcons name={eventTypeInfo.icon as any} size={scale(14)} color="#FFFFFF" />
              <Text style={styles.typeBadgeText}>{eventTypeInfo.label}</Text>
            </View>

            {/* Event Name */}
            <Text style={styles.eventName}>{event.event_name}</Text>

            {/* Category */}
            <View style={styles.categoryRow}>
              <MaterialCommunityIcons name={categoryInfo.icon as any} size={scale(16)} color={BLUE} />
              <Text style={styles.categoryText}>{categoryInfo.label}</Text>
            </View>

            {/* Date & Time */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="calendar-outline" size={scale(18)} color={BLUE} />
              </View>
              <Text style={styles.infoText}>{formatDateTime(event.time_start)}</Text>
            </View>

            {/* Location */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="location-outline" size={scale(18)} color={BLUE} />
              </View>
              <Text style={styles.infoText}>
                {isPrivate ? `Near ${event.location_name.split(',')[0] || 'this area'}` : event.location_name}
              </Text>
              {isPrivate && (
                <View style={styles.privateBadge}>
                  <Ionicons name="eye-off-outline" size={scale(12)} color="#8B5CF6" />
                  <Text style={styles.privateText}>Revealed after approval</Text>
                </View>
              )}
            </View>

            {/* Capacity */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="people-outline" size={scale(18)} color={BLUE} />
              </View>
              <Text style={styles.infoText}>
                {event.accepted_count || 0}/{event.capacity} attending
                {spotsLeft > 0 && <Text style={styles.spotsText}> · {spotsLeft} spots left</Text>}
              </Text>
            </View>

            {/* Age Range */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconWrap}>
                <Ionicons name="person-outline" size={scale(18)} color={BLUE} />
              </View>
              <Text style={styles.infoText}>
                {event.age_min}–{event.age_max} y/o
              </Text>
            </View>

            {/* Gender Preference */}
            {event.gender_allowed && (
              <View style={styles.infoRow}>
                <View style={styles.infoIconWrap}>
                  <MaterialCommunityIcons 
                    name={
                      event.gender_allowed === 'Man' ? 'gender-male' :
                      event.gender_allowed === 'Woman' ? 'gender-female' :
                      event.gender_allowed === 'Beyond Binary' ? 'gender-non-binary' :
                      'gender-male-female'
                    } 
                    size={scale(18)} 
                    color={BLUE} 
                  />
                </View>
                <Text style={styles.infoText}>
                  {event.gender_allowed === 'Everyone' ? 'Open to Everyone' : `${event.gender_allowed} Only`}
                </Text>
              </View>
            )}

            {/* Event Description */}
            {event.event_description && (
              <View style={styles.descriptionSection}>
                <Text style={styles.descriptionLabel}>About this event</Text>
                <Text style={styles.descriptionText}>{event.event_description}</Text>
              </View>
            )}
          </View>

          {/* Host Preview Card - NEW EXPANDED VERSION */}
          {host && (
            <HostPreviewCard
              host={host}
              hostPhotoUrl={hostPhotoUrl}
              userPosition={userPosition}
            />
          )}

          {/* Application Section */}
          {existingStatus ? (
            <View style={styles.existingStatusCard}>
              <View style={[
                styles.statusBadge, 
                existingStatus === 'approved' ? styles.statusApproved : 
                existingStatus === 'rejected' ? styles.statusRejected : 
                styles.statusPending
              ]}>
                <Ionicons 
                  name={
                    existingStatus === 'approved' ? 'checkmark-circle' : 
                    existingStatus === 'rejected' ? 'close-circle' : 
                    'time'
                  } 
                  size={scale(20)} 
                  color="#FFFFFF" 
                />
                <Text style={styles.statusText}>
                  {existingStatus === 'approved' ? 'Application Approved' : 
                   existingStatus === 'rejected' ? 'Application Rejected' : 
                   'Application Pending'}
                </Text>
              </View>
              <Text style={styles.statusDescription}>
                {existingStatus === 'approved' 
                  ? "You're going to this event! Check your event chats."
                  : existingStatus === 'rejected'
                  ? "Your application was not accepted for this event."
                  : "The host is reviewing your application. You'll be notified of their decision."}
              </Text>
            </View>
          ) : (
            <View style={styles.applicationSection}>
              <Text style={styles.applicationTitle}>Why do you want to join?</Text>
              <Text style={styles.applicationSubtitle}>
                Introduce yourself to the host. Tell them why you'd be a great addition to this event.
              </Text>
              
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.textInput}
                  placeholder="Hi! I'd love to join because..."
                  placeholderTextColor="rgba(10, 14, 26, 0.4)"
                  multiline
                  maxLength={500}
                  value={applicationMessage}
                  onChangeText={setApplicationMessage}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>{applicationMessage.length}/500</Text>
              </View>

              {/* Tips */}
              <View style={styles.tipsContainer}>
                <View style={styles.tipRow}>
                  <Ionicons name="bulb-outline" size={scale(16)} color={BLUES.b70} />
                  <Text style={styles.tipText}>Share your interests related to this event</Text>
                </View>
                <View style={styles.tipRow}>
                  <Ionicons name="chatbubble-outline" size={scale(16)} color={BLUES.b70} />
                  <Text style={styles.tipText}>A friendly message increases approval chances</Text>
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Submit Button */}
        {!existingStatus && (
          <View style={[styles.bottomBar, { paddingBottom: Math.max(insets.bottom, verticalScale(16)) }]}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmit}
              disabled={submitting}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={GRADIENTS.chipActive}
                style={styles.submitGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="paper-plane" size={scale(20)} color="#FFFFFF" style={{ marginRight: scale(8) }} />
                    <Text style={styles.submitText}>Send Application</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
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
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
    gap: verticalScale(12),
  },
  errorText: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
  },
  backButton: {
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    backgroundColor: BLUE,
    borderRadius: scale(12),
    marginTop: verticalScale(12),
  },
  backButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27, 68, 205, 0.1)",
  },
  headerBackBtn: {
    width: scale(40),
    height: scale(40),
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(20),
    backgroundColor: "rgba(27, 68, 205, 0.06)",
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    letterSpacing: 0.3,
  },

  // ScrollView
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(16),
    paddingBottom: verticalScale(100),
  },

  // Event Card
  eventCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(18),
    marginBottom: verticalScale(16),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
    gap: scale(4),
    marginBottom: verticalScale(12),
  },
  typeBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  eventName: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
    marginBottom: verticalScale(8),
    lineHeight: scale(28),
  },
  categoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(16),
  },
  categoryText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: BLUE,
    fontWeight: "600",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(12),
    flexWrap: "wrap",
  },
  infoIconWrap: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
  },
  infoText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    flex: 1,
  },
  spotsText: {
    color: "#22C55E",
    fontWeight: "600",
  },
  privateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 92, 246, 0.1)",
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(4),
    borderRadius: scale(8),
    gap: scale(4),
    marginLeft: scale(8),
    marginTop: verticalScale(4),
  },
  privateText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: "#8B5CF6",
  },

  // Description
  descriptionSection: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.1)",
  },
  descriptionLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
    marginBottom: verticalScale(8),
  },
  descriptionText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.8,
    lineHeight: scale(22),
  },

  // Host Card - NEW STYLES
  hostCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(16),
    marginBottom: verticalScale(16),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
  },
  hostMainRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  hostPhotoContainer: {
    position: "relative",
    marginRight: scale(12),
  },
  frameRing: {
    position: "absolute",
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: scale(28),
    overflow: "hidden",
  },
  frameRingGradient: {
    flex: 1,
    borderRadius: scale(28),
  },
  hostPhotoWrap: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  hostPhoto: {
    width: "100%",
    height: "100%",
  },
  hostPhotoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  hostInfoMain: {
    flex: 1,
  },
  hostLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
    opacity: 0.6,
  },
  hostName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  hostDistanceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(2),
    gap: scale(4),
  },
  hostDistanceText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10, 14, 26, 0.5)",
  },
  hostTapHint: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: BLUES.b90,
    textAlign: "center",
    marginTop: verticalScale(10),
    fontStyle: "italic",
  },

  // Host Expanded Content
  hostExpandedContent: {
    marginTop: verticalScale(14),
    paddingTop: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.1)",
  },
  hostBioSection: {
    marginBottom: verticalScale(12),
  },
  hostBioText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.8,
    lineHeight: scale(20),
  },
  hostChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  hostChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(12),
    gap: scale(6),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  hostChipText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: BLUE,
    fontWeight: "500",
  },
  hostValuesSection: {
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    padding: scale(12),
    borderRadius: scale(12),
  },
  hostValuesLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: INK,
    opacity: 0.6,
    marginBottom: verticalScale(4),
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hostValuesText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: INK,
    opacity: 0.8,
  },

  // Application Section
  applicationSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(18),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
  },
  applicationTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    marginBottom: verticalScale(6),
  },
  applicationSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.7,
    marginBottom: verticalScale(16),
    lineHeight: scale(20),
  },
  inputContainer: {
    backgroundColor: "rgba(27, 68, 205, 0.04)",
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: "rgba(27, 68, 205, 0.12)",
    marginBottom: verticalScale(16),
  },
  textInput: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: INK,
    padding: scale(16),
    minHeight: verticalScale(120),
    maxHeight: verticalScale(200),
  },
  charCount: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
    opacity: 0.5,
    textAlign: "right",
    paddingRight: scale(16),
    paddingBottom: scale(12),
  },

  // Tips
  tipsContainer: {
    gap: verticalScale(10),
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(10),
  },
  tipText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: BLUES.b40,
    flex: 1,
  },

  // Existing Status
  existingStatusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(20),
    padding: scale(18),
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.08)",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(10),
    borderRadius: scale(14),
    gap: scale(8),
    marginBottom: verticalScale(12),
  },
  statusApproved: {
    backgroundColor: "#22C55E",
  },
  statusRejected: {
    backgroundColor: "#EF4444",
  },
  statusPending: {
    backgroundColor: "#F59E0B",
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
  },
  statusDescription: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.7,
    textAlign: "center",
    lineHeight: scale(20),
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: scale(16),
    paddingTop: verticalScale(12),
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.1)",
  },
  submitButton: {
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(16),
    paddingHorizontal: scale(24),
  },
  submitText: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: "#FFFFFF",
    letterSpacing: 0.4,
  },
});