// app/(tabs_support)/host_applications.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = "#EEF7FF";
const INK = "#0A0E1A";
const BLUE = "#1B44CD";

const BLUES = {
  b00: "#0B1C60", b10: "#0D236F", b20: "#0F2C8A", b30: "#1437A4", b40: "#1840B8",
  b50: "#1B44CD", b60: "#2D58D6", b70: "#3E6BE0", b80: "#4E7DE9", b90: "#6B95F0",
  b100: "#86A9F5", b110: "#A5BFF9", b120: "#C4D5FC", b130: "#E6EFFF",
} as const;

const GRADIENTS = { chipActive: [BLUES.b60, BLUES.b80] } as const;

type ApplicationStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

type EventType = 'public' | 'public_application' | 'private' | 'invite_only' | 'group_event' | 'community_event';

interface EventData {
  id: string;
  event_name: string;
  event_type: EventType;
  time_start: string;
  time_end: string;
  capacity: number;
}

interface ApplicationData {
  id: string;
  event_id: string;
  applicant_id: string;
  status: ApplicationStatus;
  message: string | null;
  created_at: string;
  updated_at: string;
  // Joined from profiles
  applicant_name: string;
  applicant_age: number | null;
  applicant_photo_url: string | null;
  // Additional profile info for host to see
  applicant_gender: string | null;
  applicant_bio: string | null;
  applicant_looking_for: string[];
}

const statusConfig: Record<ApplicationStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: "Pending", color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.1)", icon: "hourglass-outline" },
  approved: { label: "Approved", color: "#22C55E", bgColor: "rgba(34, 197, 94, 0.1)", icon: "checkmark-circle" },
  rejected: { label: "Rejected", color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.1)", icon: "close-circle" },
  cancelled: { label: "Cancelled", color: "#6B7280", bgColor: "rgba(107, 114, 128, 0.1)", icon: "ban" },
};

// Helper functions
const toStoragePath = (urlOrPath: string | null): string | null => {
  if (!urlOrPath) return null;
  if (!urlOrPath.startsWith("http")) return urlOrPath.replace(/^\/+/, "");
  const markers = ["/object/sign/user_photos/", "/object/public/user_photos/", "/user_photos/"];
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

export default function HostApplicationsScreen() {
  const params = useLocalSearchParams<{ eventId: string }>();
  const eventId = params.eventId;
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [event, setEvent] = useState<EventData | null>(null);
  const [applications, setApplications] = useState<ApplicationData[]>([]);
  const [signedPhotos, setSignedPhotos] = useState<Record<string, string>>({});
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<ApplicationStatus | 'all'>('pending');

  // Fetch event and applications
  const loadData = useCallback(async () => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    try {
      // Fetch event details
      const { data: eventData, error: eventError } = await supabase
        .from("events")
        .select("id, event_name, event_type, time_start, time_end, capacity")
        .eq("id", eventId)
        .single();

      if (eventError || !eventData) {
        console.error("Error fetching event:", eventError);
        Alert.alert("Error", "Could not load event details");
        router.back();
        return;
      }

      setEvent(eventData as EventData);

      // Fetch applications with applicant profiles
      const { data: appData, error: appError } = await supabase
        .from("event_applications")
        .select(`
          id,
          event_id,
          applicant_id,
          status,
          message,
          created_at,
          updated_at
        `)
        .eq("event_id", eventId)
        .order("created_at", { ascending: false });

      if (appError) {
        console.error("Error fetching applications:", appError);
        return;
      }

      // Fetch applicant profiles separately
      const applicantIds = (appData || []).map(app => app.applicant_id);
      
      if (applicantIds.length === 0) {
        setApplications([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, age, gender, bio, prompt")
        .in("id", applicantIds);

      // Fetch main photos for all applicants
      const { data: photosData } = await supabase
        .from("user_photos")
        .select("user_id, photo_url")
        .in("user_id", applicantIds)
        .eq("is_main", true);

      // Fetch user_modes (looking for) for all applicants
      const { data: modesData } = await supabase
        .from("user_modes")
        .select("user_id, mode, looking_for_date, looking_for_friend")
        .in("user_id", applicantIds);

      // Build profiles map
      const profilesMap: Record<string, { full_name: string; age: number | null; gender: string | null; bio: string | null }> = {};
      (profilesData || []).forEach(p => {
        profilesMap[p.id] = { 
          full_name: p.full_name, 
          age: p.age, 
          gender: p.gender,
          bio: p.bio || p.prompt || null
        };
      });

      // Build photos map
      const photosMap: Record<string, string> = {};
      (photosData || []).forEach(p => {
        photosMap[p.user_id] = p.photo_url;
      });

      // Build looking_for map - combine both dating and friend modes
      const lookingForMap: Record<string, string[]> = {};
      if (modesData) {
        modesData.forEach((m: any) => {
          const userId = m.user_id;
          if (!lookingForMap[userId]) lookingForMap[userId] = [];
          
          // Add looking_for_date values
          if (m.looking_for_date && Array.isArray(m.looking_for_date)) {
            lookingForMap[userId].push(...m.looking_for_date);
          }
          
          // Add looking_for_friend values
          if (m.looking_for_friend && Array.isArray(m.looking_for_friend)) {
            lookingForMap[userId].push(...m.looking_for_friend);
          }
        });
      }

      // Combine data
      const combinedApps: ApplicationData[] = (appData || []).map(app => ({
        ...app,
        applicant_name: profilesMap[app.applicant_id]?.full_name || "Unknown",
        applicant_age: profilesMap[app.applicant_id]?.age ?? null,
        applicant_photo_url: photosMap[app.applicant_id] || null,
        applicant_gender: profilesMap[app.applicant_id]?.gender ?? null,
        applicant_bio: profilesMap[app.applicant_id]?.bio ?? null,
        applicant_looking_for: lookingForMap[app.applicant_id] || [],
      }));

      setApplications(combinedApps);

      // Sign all photo URLs
      const signedMap: Record<string, string> = {};
      for (const app of combinedApps) {
        if (app.applicant_photo_url) {
          const signed = await signPath(toStoragePath(app.applicant_photo_url));
          if (signed) {
            signedMap[app.applicant_id] = signed;
          }
        }
      }
      setSignedPhotos(signedMap);

    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
  }, [loadData]);

  // Handle approve/reject
  const handleUpdateStatus = async (applicationId: string, newStatus: 'approved' | 'rejected') => {
    setProcessingId(applicationId);

    try {
      const { error } = await supabase
        .from("event_applications")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", applicationId);

      if (error) {
        console.error("Error updating application:", error);
        Alert.alert("Error", error.message || "Failed to update application");
        return;
      }

      // Update local state
      setApplications(prev =>
        prev.map(app =>
          app.id === applicationId ? { ...app, status: newStatus } : app
        )
      );

      const actionText = newStatus === 'approved' ? 'approved' : 'rejected';
      Alert.alert("Success", `Application ${actionText} successfully`);

    } catch (error: any) {
      console.error("Exception updating application:", error);
      Alert.alert("Error", error.message || "Something went wrong");
    } finally {
      setProcessingId(null);
    }
  };

  const confirmAction = (applicationId: string, applicantName: string, action: 'approved' | 'rejected') => {
    const actionText = action === 'approved' ? 'approve' : 'reject';
    const messageText = action === 'approved' 
      ? `${applicantName} will be added to the event and can see the exact location.`
      : `${applicantName} will not be able to join this event.`;

    Alert.alert(
      `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Application?`,
      messageText,
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: actionText.charAt(0).toUpperCase() + actionText.slice(1), 
          style: action === 'rejected' ? "destructive" : "default",
          onPress: () => handleUpdateStatus(applicationId, action)
        },
      ]
    );
  };

  // Filter applications
  const filteredApplications = applications.filter(app => {
    if (activeFilter === 'all') return true;
    return app.status === activeFilter;
  });

  // Counts for filter badges
  const counts = {
    all: applications.length,
    pending: applications.filter(a => a.status === 'pending').length,
    approved: applications.filter(a => a.status === 'approved').length,
    rejected: applications.filter(a => a.status === 'rejected').length,
  };

  // Format date
  const formatDate = (dateString: string) => {
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
    
    return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
  };

  // Helper function to format gender display
  const formatGender = (gender: string | null): string => {
    if (!gender) return '';
    return gender.charAt(0).toUpperCase() + gender.slice(1);
  };

  // Helper function to format looking_for enum values to readable text
  const formatLookingFor = (value: string): string => {
    const lookingForLabels: Record<string, string> = {
      // Dating
      'long_term_relationship': 'Long-term',
      'life_partner': 'Life partner',
      'casual_dates': 'Casual dates',
      'intimacy': 'Intimacy',
      'marriage': 'Marriage',
      'short_term_relationship': 'Short-term',
      'new_friends': 'New friends',
      'figuring_it_out': 'Figuring it out',
      // Friend
      'new_friends_nearby': 'Local friends',
      'workout_fitness_buddy': 'Workout buddy',
      'travel_companions': 'Travel buddy',
      'activity_hobby_partners': 'Hobby partners',
      'casual_hangouts': 'Casual hangouts',
      'professional_networking': 'Networking',
      'close_friendships': 'Close friends',
    };
    return lookingForLabels[value] || value.replace(/_/g, ' ');
  };

  // Render application card
  const renderApplicationCard = ({ item }: { item: ApplicationData }) => {
    const config = statusConfig[item.status];
    const isProcessing = processingId === item.id;
    const isPending = item.status === 'pending';

    return (
      <View style={styles.applicationCard}>
        {/* Header: Photo + Name + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.applicantInfo}>
            <View style={styles.photoWrap}>
              {signedPhotos[item.applicant_id] ? (
                <Image
                  source={{ uri: signedPhotos[item.applicant_id] }}
                  style={styles.photo}
                />
              ) : (
                <View style={styles.photoPlaceholder}>
                  <Ionicons name="person" size={scale(24)} color={BLUES.b100} />
                </View>
              )}
            </View>
            <View style={styles.nameContainer}>
              <Text style={styles.applicantName}>
                {item.applicant_name}{item.applicant_age ? `, ${item.applicant_age}` : ''}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: verticalScale(2) }}>
                {item.applicant_gender && (
                  <View style={styles.infoChip}>
                    <Ionicons 
                      name={item.applicant_gender === 'man' ? 'male' : item.applicant_gender === 'woman' ? 'female' : 'male-female'} 
                      size={scale(12)} 
                      color={BLUES.b60} 
                    />
                    <Text style={styles.infoChipText}>{formatGender(item.applicant_gender)}</Text>
                  </View>
                )}
                <Text style={styles.appliedTime}>Applied {formatDate(item.created_at)}</Text>
              </View>
            </View>
          </View>

          <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
            <Ionicons name={config.icon as any} size={scale(14)} color={config.color} />
            <Text style={[styles.statusText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        {/* Bio - Preview */}
        {item.applicant_bio && (
          <View style={styles.bioContainer}>
            <Text style={styles.bioText} numberOfLines={2}>{item.applicant_bio}</Text>
          </View>
        )}

        {/* Looking For */}
        {item.applicant_looking_for && item.applicant_looking_for.length > 0 && (
          <View style={styles.lookingForContainer}>
            <Text style={styles.lookingForLabel}>Looking for</Text>
            <View style={styles.lookingForChips}>
              {item.applicant_looking_for.slice(0, 4).map((lookingFor, idx) => (
                <View key={idx} style={styles.lookingForChip}>
                  <Text style={styles.lookingForChipText}>{formatLookingFor(lookingFor)}</Text>
                </View>
              ))}
              {item.applicant_looking_for.length > 4 && (
                <View style={styles.lookingForChip}>
                  <Text style={styles.lookingForChipText}>+{item.applicant_looking_for.length - 4}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Message */}
        {item.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageLabel}>Message</Text>
            <Text style={styles.messageText}>{item.message}</Text>
          </View>
        )}

        {/* Action Buttons (only for pending) */}
        {isPending && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.rejectBtn}
              onPress={() => confirmAction(item.id, item.applicant_name, 'rejected')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#EF4444" />
              ) : (
                <>
                  <Ionicons name="close" size={scale(18)} color="#EF4444" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.approveBtn}
              onPress={() => confirmAction(item.id, item.applicant_name, 'approved')}
              disabled={isProcessing}
            >
              <LinearGradient
                colors={['#22C55E', '#16A34A']}
                style={styles.approveBtnGradient}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark" size={scale(18)} color="#FFFFFF" />
                    <Text style={styles.approveBtnText}>Approve</Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  // Empty state
  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrap}>
        <Ionicons 
          name={activeFilter === 'pending' ? "hourglass-outline" : "document-text-outline"} 
          size={scale(40)} 
          color={BLUES.b100} 
        />
      </View>
      <Text style={styles.emptyTitle}>
        {activeFilter === 'pending' ? 'No Pending Applications' : 'No Applications'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {activeFilter === 'pending' 
          ? "You're all caught up! Check back later for new applications."
          : "No applications match this filter."}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading applications...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "left", "right"]}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={scale(24)} color={INK} />
          </TouchableOpacity>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Applications</Text>
            {event && (
              <Text style={styles.headerSubtitle} numberOfLines={1}>{event.event_name}</Text>
            )}
          </View>
          <View style={styles.headerRight} />
        </View>

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryNumber}>{counts.pending}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#22C55E" }]}>{counts.approved}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryNumber, { color: "#EF4444" }]}>{counts.rejected}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={styles.filterRow}>
          {(['pending', 'approved', 'rejected', 'all'] as const).map((filter) => {
            const isActive = activeFilter === filter;
            const count = filter === 'all' ? counts.all : counts[filter];
            
            return (
              <TouchableOpacity
                key={filter}
                style={[styles.filterTab, isActive && styles.filterTabActive]}
                onPress={() => setActiveFilter(filter)}
              >
                {isActive ? (
                  <LinearGradient colors={GRADIENTS.chipActive} style={styles.filterTabGradient}>
                    <Text style={styles.filterTabTextActive}>
                      {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
                    </Text>
                  </LinearGradient>
                ) : (
                  <Text style={styles.filterTabText}>
                    {filter.charAt(0).toUpperCase() + filter.slice(1)} ({count})
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Applications List */}
        <FlatList
          data={filteredApplications}
          keyExtractor={(item) => item.id}
          renderItem={renderApplicationCard}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={filteredApplications.length === 0 ? styles.listEmpty : styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={BLUE}
            />
          }
          showsVerticalScrollIndicator={false}
        />
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
    gap: verticalScale(12),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.7,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    borderBottomWidth: 1,
    borderBottomColor: "rgba(27, 68, 205, 0.08)",
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
  },
  headerTitleWrap: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
  },
  headerSubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: BLUE,
    marginTop: verticalScale(2),
  },
  headerRight: {
    width: scale(40),
  },

  // Summary Card
  summaryCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    marginHorizontal: scale(16),
    marginTop: verticalScale(16),
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryNumber: {
    fontFamily: Fonts.bold,
    fontSize: scale(28),
    color: BLUE,
  },
  summaryLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
    opacity: 0.6,
    marginTop: verticalScale(4),
  },
  summaryDivider: {
    width: 1,
    backgroundColor: "rgba(27, 68, 205, 0.1)",
    marginVertical: verticalScale(4),
  },

  // Filter Tabs
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    gap: scale(8),
  },
  filterTab: {
    flex: 1,
    borderRadius: scale(12),
    overflow: "hidden",
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.12)",
  },
  filterTabActive: {
    borderColor: "transparent",
  },
  filterTabGradient: {
    paddingVertical: verticalScale(10),
    alignItems: "center",
    justifyContent: "center",
  },
  filterTabText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: BLUES.b40,
    textAlign: "center",
    paddingVertical: verticalScale(10),
  },
  filterTabTextActive: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#FFFFFF",
  },

  // List
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: verticalScale(100),
  },
  listEmpty: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: scale(16),
  },

  // Application Card
  applicationCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: verticalScale(12),
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.06)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  applicantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  photoWrap: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(25),
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "rgba(27, 68, 205, 0.15)",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoPlaceholder: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  nameContainer: {
    marginLeft: scale(12),
    flex: 1,
  },
  applicantName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  appliedTime: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: INK,
    opacity: 0.5,
    marginTop: verticalScale(2),
  },
  infoChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(8),
    gap: scale(3),
  },
  infoChipText: {
    fontFamily: Fonts.primary,
    fontSize: scale(11),
    color: BLUES.b60,
  },
  bioContainer: {
    marginTop: verticalScale(12),
    paddingTop: verticalScale(12),
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.08)",
  },
  bioText: {
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: INK,
    opacity: 0.8,
    lineHeight: scale(20),
  },
  lookingForContainer: {
    marginTop: verticalScale(10),
  },
  lookingForLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: INK,
    opacity: 0.5,
    marginBottom: verticalScale(6),
  },
  lookingForChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(6),
  },
  lookingForChip: {
    backgroundColor: "rgba(27, 68, 205, 0.06)",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(5),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: "rgba(27, 68, 205, 0.1)",
  },
  lookingForChipText: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: BLUES.b50,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(10),
    paddingVertical: verticalScale(6),
    borderRadius: scale(20),
    gap: scale(4),
  },
  statusText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
  },

  // Message
  messageContainer: {
    marginTop: verticalScale(14),
    paddingTop: verticalScale(14),
    borderTopWidth: 1,
    borderTopColor: "rgba(27, 68, 205, 0.08)",
  },
  messageLabel: {
    fontFamily: Fonts.bold,
    fontSize: scale(12),
    color: INK,
    opacity: 0.5,
    marginBottom: verticalScale(6),
  },
  messageText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    lineHeight: scale(20),
  },

  // Action Buttons
  actionRow: {
    flexDirection: "row",
    marginTop: verticalScale(16),
    gap: scale(12),
  },
  rejectBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    borderRadius: scale(12),
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
    gap: scale(6),
  },
  rejectBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#EF4444",
  },
  approveBtn: {
    flex: 1,
    borderRadius: scale(12),
    overflow: "hidden",
  },
  approveBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    gap: scale(6),
  },
  approveBtnText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },

  // Empty State
  emptyContainer: {
    alignItems: "center",
    paddingHorizontal: scale(32),
  },
  emptyIconWrap: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: "rgba(27, 68, 205, 0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(16),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: INK,
    marginBottom: verticalScale(8),
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    opacity: 0.6,
    textAlign: "center",
    lineHeight: scale(20),
  },
});