// app/(tabs_support)/niices_view.tsx

import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import ActiveFramesModal from "../(frames)/active_frames";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Theme
const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;
const CARD_BG = "#FFFFFF";
const BORDER = "rgba(27, 68, 205, 0.08)";

// ================== TYPES ==================
interface NiiceMatch {
  id: string;
  other_user_id: string;
  full_name: string;
  age: number | null;
  main_photo_url: string | null;
  last_message_preview: string | null;
  last_message_at: string | null;
  created_at: string;
}

// ================== UTILITY FUNCTIONS ==================
const capitalizeName = (name: string): string => {
  return name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const formatRelativeTime = (dateStr: string | null): string => {
  if (!dateStr) return "";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
};

// ================== NIICE CARD COMPONENT ==================
const NiiceCard: React.FC<{ 
  match: NiiceMatch; 
  onOpenFrames: (userId: string) => void;
  onChatPress: () => void;
}> = ({ match, onOpenFrames, onChatPress }) => {
  const hasNewMessage = !match.last_message_preview;
  
  return (
    <View style={styles.niiceCard}>
      <TouchableOpacity style={styles.niiceCardBody} onPress={onChatPress} activeOpacity={0.9}>
        {/* Avatar - Opens Frames or Profile */}
        <TouchableOpacity 
          style={styles.niiceAvatarContainer}
          onPress={(e) => { e.stopPropagation(); onOpenFrames(match.other_user_id); }}
          activeOpacity={0.8}
        >
          <View style={styles.niiceAvatarInner}>
            {match.main_photo_url ? (
              <Image source={{ uri: match.main_photo_url }} style={styles.niiceAvatar} />
            ) : (
              <View style={styles.niiceAvatarPlaceholder}>
                <Ionicons name="person" size={20} color={BLUE} />
              </View>
            )}
          </View>
        </TouchableOpacity>
        
        {/* Info */}
        <View style={styles.niiceInfo}>
          <View style={styles.niiceNameRow}>
            <Text style={styles.niiceName} numberOfLines={1}>
              {capitalizeName(match.full_name)}{match.age ? `, ${match.age}` : ""}
            </Text>
            {hasNewMessage && (
              <View style={styles.niiceNewBadge}>
                <Text style={styles.niiceNewText}>New</Text>
              </View>
            )}
          </View>
          
          {match.last_message_preview ? (
            <Text style={styles.niiceLastMessage} numberOfLines={1}>
              {match.last_message_preview}
            </Text>
          ) : (
            <View style={styles.niiceLastMessageRow}>
              <Ionicons name="chatbubble-ellipses-outline" size={14} color="rgba(10,14,26,0.4)" />
              <Text style={styles.niiceLastMessageMuted}>Say hi and break the ice</Text>
            </View>
          )}
          
          <Text style={styles.niiceMeta}>
            {match.last_message_at ? `Last talked ${formatRelativeTime(match.last_message_at)}` : `Connected ${formatRelativeTime(match.created_at)}`}
          </Text>
        </View>

        {/* Chevron Only */}
        <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" style={{ marginLeft: scale(8) }} />
      </TouchableOpacity>
      
      {/* Hairline Divider */}
      <View style={styles.niiceCardDivider} />
    </View>
  );
};

// ================== EMPTY STATE ==================
const EmptyState: React.FC<{ 
  icon: string; 
  title: string; 
  subtitle: string; 
  ctaLabel?: string; 
  onCta?: () => void;
}> = ({ icon, title, subtitle, ctaLabel, onCta }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <Ionicons name={icon as any} size={32} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    {ctaLabel && onCta && (
      <TouchableOpacity style={styles.emptyCta} onPress={onCta} activeOpacity={0.85}>
        <Text style={styles.emptyCtaText}>{ctaLabel}</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ================== MAIN COMPONENT ==================
export default function NiicesViewScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [niiceMatches, setNiiceMatches] = useState<NiiceMatch[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<NiiceMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [showFramesModal, setShowFramesModal] = useState(false);
  const [framesData, setFramesData] = useState<any[]>([]);

  // Load User ID
  useEffect(() => {
    const loadUserId = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) setUserId(user.id);
    };
    loadUserId();
  }, []);

  // Get user preview using RPC (same as niices.tsx)
  const getUserPreview = useCallback(async (targetUserId: string) => {
    try {
      const { data } = await supabase.rpc('get_matched_user_profile', { target_user_id: targetUserId });
      const row = Array.isArray(data) ? data[0] : data;
      let photoUrl = row?.main_photo_url;
      if (photoUrl && !photoUrl.startsWith('http')) {
        const { data: signedData } = await supabase.storage.from("user_photos").createSignedUrl(photoUrl, 3600);
        photoUrl = signedData?.signedUrl || null;
      }
      return { full_name: row?.full_name ?? null, age: row?.age ?? null, main_photo_url: photoUrl };
    } catch { 
      return { full_name: null, age: null, main_photo_url: null }; 
    }
  }, []);

  // Load Niice Matches (Friends only)
  const loadNiiceMatches = useCallback(async () => {
    if (!userId) return;
    
    try {
      // Query all accepted full_profile friend matches
      const { data: matches, error } = await supabase
        .from('match_requests')
        .select('id, requester_id, target_id, match_mode, connection_visibility, created_at, responded_at')
        .eq('status', 'accepted')
        .eq('connection_visibility', 'full_profile')
        .eq('match_mode', 'friend')
        .or(`requester_id.eq.${userId},target_id.eq.${userId}`)
        .order('responded_at', { ascending: false, nullsFirst: false });

      if (error) {
        setNiiceMatches([]);
        setFilteredMatches([]);
        return;
      }

      if (!matches || matches.length === 0) {
        setNiiceMatches([]);
        setFilteredMatches([]);
        return;
      }

      // Build niice matches array using RPC for profile data
      const niices: NiiceMatch[] = await Promise.all(
        matches.map(async (m) => {
          const otherId = m.requester_id === userId ? m.target_id : m.requester_id;
          const preview = await getUserPreview(otherId);
          
          // Get last message
          const { data: conv } = await supabase
            .from("conversations")
            .select("id")
            .eq("match_request_id", m.id)
            .maybeSingle();
          
          let lastMsg: { content: string; created_at: string } | null = null;
          if (conv) {
            const { data: msg } = await supabase
              .from("messages")
              .select("content, created_at")
              .eq("conversation_id", conv.id)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();
            lastMsg = msg;
          }

          return {
            id: m.id,
            other_user_id: otherId,
            full_name: preview.full_name || "Unknown",
            age: preview.age || null,
            main_photo_url: preview.main_photo_url || null,
            last_message_preview: lastMsg?.content || null,
            last_message_at: lastMsg?.created_at || null,
            created_at: m.responded_at || m.created_at,
          };
        })
      );

      setNiiceMatches(niices);
      setFilteredMatches(niices);
    } catch (err) {
      setNiiceMatches([]);
      setFilteredMatches([]);
    } finally {
      setLoading(false);
    }
  }, [userId, getUserPreview]);

  useEffect(() => {
    if (userId) loadNiiceMatches();
  }, [userId, loadNiiceMatches]);

  // Filter matches based on search only
  useEffect(() => {
    let filtered = niiceMatches;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(m => 
        m.full_name.toLowerCase().includes(query)
      );
    }

    setFilteredMatches(filtered);
  }, [niiceMatches, searchQuery]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNiiceMatches();
    setRefreshing(false);
  };

  // Check for frames first, if none exist go to profile
  const handleOpenFrames = useCallback(async (targetUserId: string, matchId: string) => {
    try {
      const { data } = await supabase.rpc('get_user_active_frames', { target_user_id: targetUserId });
      if (data && data.length > 0) {
        const processed = await Promise.all(data.map(async (frame: any) => {
          if (frame.media_url && !frame.media_url.startsWith('http')) {
            const { data: signedData } = await supabase.storage.from("frames").createSignedUrl(frame.media_url, 3600);
            return { ...frame, media_url: signedData?.signedUrl || frame.media_url };
          }
          return frame;
        }));
        setFramesData(processed);
        setShowFramesModal(true);
      } else {
        // No frames, go to profile
        router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId } });
      }
    } catch (err) { 
      // On error, go to profile
      router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId } });
    }
  }, []);

  const handleViewProfile = (targetUserId: string, matchId: string) => {
    router.push({ pathname: "/(tabs_support)/other_profile", params: { userId: targetUserId, matchId: matchId } });
  };

  const handleChatPress = (matchId: string) => {
    router.push({ pathname: "/(tabs_support)/chat_talk", params: { matchId } });
  };

  const totalCount = niiceMatches.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Ionicons name="arrow-back" size={24} color={BLUE} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Niices</Text>
        <View style={styles.headerCount}>
          <Text style={styles.headerCountText}>{totalCount}</Text>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={BLUE} style={{ opacity: 0.6 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search niices..."
            placeholderTextColor="rgba(10,14,26,0.4)"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={BLUE} style={{ opacity: 0.6 }} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
          <Text style={styles.loadingText}>Loading your niices...</Text>
        </View>
      ) : (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLUE} />
          }
        >
          {filteredMatches.length === 0 ? (
            searchQuery.trim() ? (
              <View style={styles.emptyInlineState}>
                <View style={styles.emptyInlineIconContainer}>
                  <Ionicons name="search" size={24} color={BLUE} />
                </View>
                <Text style={styles.emptyInlineText}>No niices found</Text>
              </View>
            ) : (
              <EmptyState
                icon="people-outline"
                title="No Niices Yet"
                subtitle="Start connecting with people nearby to grow your network of niices"
                ctaLabel="Find People"
                onCta={() => router.push("/(tabs)/nicees")}
              />
            )
          ) : (
            <View style={styles.niicesList}>
              {filteredMatches.map((match) => (
                <NiiceCard
                  key={match.id}
                  match={match}
                  onOpenFrames={(userId) => handleOpenFrames(userId, match.id)}
                  onChatPress={() => handleChatPress(match.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}
      
      <ActiveFramesModal 
        visible={showFramesModal} 
        onClose={() => setShowFramesModal(false)} 
        frames={framesData}
        isOwnProfile={false}
      />
    </SafeAreaView>
  );
}

// ================== STYLES (MATCHING MAIN NIICES SECTION) ==================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },
  
  // Header - Clean minimal style
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(14),
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
    backgroundColor: BG,
  },
  backButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  headerTitle: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    letterSpacing: 0.2,
  },
  headerCount: {
    backgroundColor: BLUE,
    borderRadius: scale(16),
    paddingHorizontal: scale(12),
    paddingVertical: verticalScale(4),
    minWidth: scale(32),
    alignItems: "center",
  },
  headerCountText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  
  // Search - Minimal compact style
  searchContainer: {
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(12),
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(20),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(10),
    gap: scale(10),
    borderWidth: 1,
    borderColor: BORDER,
  },
  searchInput: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: INK,
    padding: 0,
    fontWeight: "500",
  },
  
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: verticalScale(100),
  },
  
  // Niices List Container - NO HORIZONTAL PADDING (full width)
  niicesList: {
    // Removed paddingHorizontal to make cards full width
  },
  
  // Niice Card - Full width with internal padding
  niiceCard: {
    backgroundColor: CARD_BG,
    marginBottom: verticalScale(0),
  },
  niiceCardBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(20), // Padding inside the card for content
    minHeight: verticalScale(64),
  },
  niiceCardDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: BORDER,
    marginLeft: scale(78), // Adjusted to account for internal padding + avatar width
  },
  
  // Avatar - 44x44 matching main section
  niiceAvatarContainer: {
    position: "relative",
    marginRight: scale(14),
    width: scale(44),
    height: scale(44),
  },
  niiceAvatarInner: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    overflow: "hidden",
    backgroundColor: "#E8F4FF",
  },
  niiceAvatar: {
    width: "100%",
    height: "100%",
  },
  niiceAvatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E8F4FF",
  },
  
  // Info Section
  niiceInfo: {
    flex: 1,
  },
  niiceNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(6),
    marginBottom: verticalScale(2),
  },
  niiceName: {
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
    letterSpacing: 0.2,
    flexShrink: 1,
  },
  niiceNewBadge: {
    backgroundColor: "rgba(27,68,205,0.08)",
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: verticalScale(2),
  },
  niiceNewText: {
    fontFamily: Fonts.bold,
    fontSize: scale(10),
    color: BLUE,
    letterSpacing: 0.2,
  },
  niiceLastMessage: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.7)",
    marginBottom: verticalScale(2),
    fontWeight: "500",
  },
  niiceLastMessageRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: scale(4),
    marginBottom: verticalScale(2),
  },
  niiceLastMessageMuted: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    fontStyle: "italic",
    fontWeight: "500",
  },
  niiceMeta: {
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.4)",
  },
  
  // Loading - Minimal style
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(100),
  },
  loadingText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    marginTop: verticalScale(12),
  },
  
  // Empty State - Minimal clean style
  emptyState: {
    alignItems: "center",
    paddingVertical: verticalScale(60),
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
    fontSize: scale(18),
    color: INK,
    marginBottom: verticalScale(8),
    textAlign: "center",
    letterSpacing: 0.2,
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
    marginBottom: verticalScale(20),
  },
  emptyCta: {
    borderRadius: scale(28),
    backgroundColor: BLUE,
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
  },
  emptyCtaText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
    letterSpacing: 0.2,
  },
  emptyInlineState: {
    alignItems: "center",
    paddingVertical: verticalScale(40),
    gap: verticalScale(12),
  },
  emptyInlineIconContainer: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: "rgba(27,68,205,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyInlineText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
    letterSpacing: 0.2,
  },
});