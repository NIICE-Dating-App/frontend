// app/(tabs)/(up_tab)/chat.tsx
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router, useFocusEffect } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
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

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

type TabKey = "chat" | "groups" | "communities";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type ChatConversation = {
  id: string;
  type: string;
  name: string;
  avatarUrl: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  updatedAt: string;
  unreadCount: number;
  matchRequestId: string | null;
  isBlind: boolean;
  matchMode: "dating" | "friend" | null;
};

type Community = {
  id: string;
  name: string;
  iconUrl: string | null;
  coverImageUrl: string | null;
  memberCount: number;
  category: string;
};

type Announcement = {
  id: string;
  title: string | null;
  content: string;
  pinned: boolean;
  createdAt: string;
  authorName: string | null;
};

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<TabKey>("chat");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [communities, setCommunities] = useState<Community[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  
  // Community detail state
  const [selectedCommunity, setSelectedCommunity] = useState<Community | null>(null);
  const [communityChat, setCommunityChat] = useState<ChatConversation | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [communityLoading, setCommunityLoading] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Fetch functions
  // ─────────────────────────────────────────────────────────────────────────────

  const fetchChats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      setCurrentUserId(user.id);

      // Get 1:1 match conversations with match request info
      const { data, error } = await supabase
        .from("conversations")
        .select(`
          id,
          type,
          updated_at,
          match_request_id,
          conversation_members!inner(user_id, last_read_at),
          messages(content, created_at, sender_id)
        `)
        .in("type", ["dating_match", "friend_match", "blind_date"])
        .eq("conversation_members.user_id", user.id)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get other user info for each conversation
      const chats: ChatConversation[] = [];
      
      for (const conv of (data || []) as any[]) {
        // Get match request info for visibility and mode
        let connectionVisibility: "full_profile" | "blind" = "full_profile";
        let matchMode: "dating" | "friend" = "dating";
        let otherUserId: string | null = null;

        if (conv.match_request_id) {
          const { data: matchData } = await supabase
            .from("match_requests")
            .select("requester_id, target_id, connection_visibility, match_mode")
            .eq("id", conv.match_request_id)
            .single();

          if (matchData) {
            connectionVisibility = matchData.connection_visibility || "full_profile";
            matchMode = matchData.match_mode || "dating";
            // Determine other user
            otherUserId = matchData.requester_id === user.id 
              ? matchData.target_id 
              : matchData.requester_id;
          }
        }

        // If we couldn't get other user from match, get from conversation members
        if (!otherUserId) {
          const { data: members } = await supabase
            .from("conversation_members")
            .select("user_id")
            .eq("conversation_id", conv.id)
            .neq("user_id", user.id)
            .limit(1)
            .single();
          
          otherUserId = members?.user_id || null;
        }

        let name = connectionVisibility === "blind" 
          ? (matchMode === "dating" ? "Mystery Date" : "Mystery Friend")
          : "Match";
        let avatarUrl: string | null = null;
        const isBlind = connectionVisibility === "blind";

        // Only fetch profile if not blind
        if (otherUserId && !isBlind) {
          try {
            // Use the RPC function to get profile (it checks if we can view it)
            const { data: profileData, error: profileError } = await supabase
              .rpc("get_profile_full_for_user", { target_user: otherUserId });

            if (!profileError && profileData && profileData.length > 0) {
              const profile = profileData[0];
              name = profile.full_name || "Match";
              
              // Get and sign avatar URL
              if (profile.main_photo_url) {
                const storagePath = toStoragePath(profile.main_photo_url);
                if (storagePath) {
                  avatarUrl = await signPath(storagePath);
                }
              }
            }
          } catch (err) {
            console.warn("Error fetching profile for user:", otherUserId, err);
          }
        }

        // Get messages array and calculate unread count
        const messages = Array.isArray(conv.messages) ? conv.messages : [];
        const lastMsg = messages.length > 0 ? messages[messages.length - 1] : null;
        
        // Get user's last_read_at from conversation_members
        const memberData = Array.isArray(conv.conversation_members) 
          ? conv.conversation_members[0] 
          : conv.conversation_members;
        const lastReadAt = memberData?.last_read_at ? new Date(memberData.last_read_at) : null;
        
        // Find the user's last sent message timestamp (implicit read - if you replied, you saw the messages)
        const userMessages = messages.filter((msg: any) => msg.sender_id === user.id);
        const lastSentAt = userMessages.length > 0 
          ? new Date(Math.max(...userMessages.map((msg: any) => new Date(msg.created_at).getTime())))
          : null;
        
        // Use the later of lastReadAt or lastSentAt as the "read" threshold
        const readThreshold = lastSentAt && lastReadAt 
          ? (lastSentAt > lastReadAt ? lastSentAt : lastReadAt)
          : (lastSentAt || lastReadAt);
        
        // Count unread messages (messages from OTHER user after read threshold)
        let unreadCount = 0;
        if (readThreshold) {
          unreadCount = messages.filter((msg: any) => 
            msg.sender_id !== user.id && new Date(msg.created_at) > readThreshold
          ).length;
        } else {
          // If never read and never sent, count all messages from other user
          unreadCount = messages.filter((msg: any) => msg.sender_id !== user.id).length;
        }
        
        chats.push({
          id: conv.id,
          type: conv.type,
          name,
          avatarUrl,
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          updatedAt: conv.updated_at,
          unreadCount,
          matchRequestId: conv.match_request_id,
          isBlind,
          matchMode,
        });
      }

      setConversations(chats);
    } catch (err) {
      console.error("fetchChats error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchGroups = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use RPC function to avoid RLS recursion
      const { data: groups, error } = await supabase.rpc("get_my_groups");

      if (error) throw error;

      // Get conversations for each group
      const chats: ChatConversation[] = [];
      
      for (const group of (groups || []) as any[]) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("id, type, updated_at, messages(content, created_at)")
          .eq("type", "group_chat")
          .eq("group_id", group.group_id)
          .single();

        if (convData) {
          const lastMsg = Array.isArray(convData.messages) && convData.messages.length > 0
            ? convData.messages[convData.messages.length - 1] 
            : null;
            
          chats.push({
            id: convData.id,
            type: convData.type,
            name: group.name || "Group",
            avatarUrl: group.cover_image_url || null,
            lastMessage: lastMsg?.content || null,
            lastMessageAt: lastMsg?.created_at || null,
            updatedAt: convData.updated_at,
            unreadCount: 0,
            matchRequestId: null,
            isBlind: false,
            matchMode: null,
          });
        }
      }

      // Sort by updated_at desc
      chats.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
      setConversations(chats);
    } catch (err) {
      console.error("fetchGroups error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCommunities = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use RPC function to avoid RLS recursion
      const { data, error } = await supabase.rpc("get_my_communities");

      if (error) throw error;

      const list: Community[] = ((data || []) as any[]).map((c: any) => ({
        id: c.community_id,
        name: c.name,
        iconUrl: c.icon_url,
        coverImageUrl: c.cover_image_url,
        memberCount: c.member_count,
        category: c.category,
      }));

      setCommunities(list);
    } catch (err) {
      console.error("fetchCommunities error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const fetchCommunityDetail = useCallback(async (community: Community) => {
    setCommunityLoading(true);
    setSelectedCommunity(community);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get community chat conversation
      const { data: convData } = await supabase
        .from("conversations")
        .select(`
          id,
          type,
          updated_at,
          messages(content, created_at)
        `)
        .eq("type", "community_chat")
        .eq("community_id", community.id)
        .single();

      if (convData) {
        const lastMsg = Array.isArray(convData.messages) && convData.messages.length > 0 
          ? convData.messages[convData.messages.length - 1] 
          : null;
        setCommunityChat({
          id: convData.id,
          type: convData.type,
          name: `${community.name} Chat`,
          avatarUrl: community.iconUrl,
          lastMessage: lastMsg?.content || null,
          lastMessageAt: lastMsg?.created_at || null,
          updatedAt: convData.updated_at,
          unreadCount: 0,
          matchRequestId: null,
          isBlind: false,
          matchMode: null,
        });
      }

      // Get announcements
      const { data: announceData } = await supabase
        .from("community_announcements")
        .select(`
          id,
          title,
          content,
          pinned,
          created_at,
          profiles:author_id(full_name)
        `)
        .eq("community_id", community.id)
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });

      setAnnouncements(
        ((announceData || []) as any[]).map((a) => ({
          id: a.id,
          title: a.title,
          content: a.content,
          pinned: a.pinned,
          createdAt: a.created_at,
          authorName: a.profiles?.full_name || null,
        }))
      );
    } catch (err) {
      console.error("fetchCommunityDetail error:", err);
    } finally {
      setCommunityLoading(false);
    }
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────────────────────

  // Refresh when screen comes into focus (e.g., coming back from chat_talk)
  useFocusEffect(
    useCallback(() => {
      if (selectedCommunity) return;
      
      if (activeTab === "chat") {
        fetchChats();
      } else if (activeTab === "groups") {
        fetchGroups();
      } else {
        fetchCommunities();
      }
    }, [activeTab, selectedCommunity])
  );

  // Real-time subscription for new messages
  useEffect(() => {
    if (!currentUserId || activeTab !== "chat") return;

    const subscription = supabase
      .channel("chat-list-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
        },
        (payload) => {
          // Refresh chat list when any new message arrives
          fetchChats();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "conversations",
        },
        () => {
          // Refresh when conversation is updated
          fetchChats();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [currentUserId, activeTab, fetchChats]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    if (activeTab === "chat") {
      fetchChats(true);
    } else if (activeTab === "groups") {
      fetchGroups(true);
    } else {
      fetchCommunities(true);
    }
  }, [activeTab, fetchChats, fetchGroups, fetchCommunities]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────────────────────

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation
  // ─────────────────────────────────────────────────────────────────────────────

  const handleChatPress = (conversation: ChatConversation) => {
    // Navigate to chat_talk with matchId or conversationId
    if (conversation.matchRequestId) {
      router.push({
        pathname: "/(tabs_support)/chat_talk",
        params: { matchId: conversation.matchRequestId },
      });
    } else {
      router.push({
        pathname: "/(tabs_support)/chat_talk",
        params: { conversationId: conversation.id },
      });
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  // Community detail view
  if (selectedCommunity) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerBackButton}
            activeOpacity={0.8}
            onPress={() => {
              setSelectedCommunity(null);
              setCommunityChat(null);
              setAnnouncements([]);
            }}
          >
            <Ionicons name="chevron-back" size={22} color={INK} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {selectedCommunity.name}
            </Text>
            <Text style={styles.headerSubtitle}>
              {selectedCommunity.memberCount} members
            </Text>
          </View>
        </View>

        {communityLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={BLUE} />
          </View>
        ) : (
          <FlatList
            data={[
              { type: "chat" as const, data: communityChat },
              { type: "header" as const, data: null },
              ...announcements.map((a) => ({ type: "announcement" as const, data: a })),
            ]}
            keyExtractor={(item, idx) => 
              item.type === "chat" ? "chat" : 
              item.type === "header" ? "header" : 
              (item.data as Announcement).id
            }
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => {
              if (item.type === "chat" && item.data) {
                return (
                  <TouchableOpacity
                    style={styles.communityChatRow}
                    activeOpacity={0.9}
                    onPress={() => {
                      handleChatPress(item.data as ChatConversation);
                    }}
                  >
                    <View style={styles.chatIconWrapper}>
                      <Ionicons name="chatbubbles" size={24} color={BLUE} />
                    </View>
                    <View style={styles.chatRowMain}>
                      <Text style={styles.chatName}>Community Chat</Text>
                      <Text style={styles.chatPreview} numberOfLines={1}>
                        {(item.data as ChatConversation).lastMessage || "No messages yet"}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
                  </TouchableOpacity>
                );
              }

              if (item.type === "header") {
                return (
                  <View style={styles.sectionHeader}>
                    <Ionicons name="megaphone" size={18} color={BLUE} />
                    <Text style={styles.sectionHeaderText}>Announcements</Text>
                  </View>
                );
              }

              if (item.type === "announcement" && item.data) {
                const a = item.data as Announcement;
                return (
                  <View style={styles.announcementCard}>
                    {a.pinned && (
                      <View style={styles.pinnedBadge}>
                        <Ionicons name="pin" size={12} color={BLUE} />
                        <Text style={styles.pinnedText}>Pinned</Text>
                      </View>
                    )}
                    {a.title && <Text style={styles.announcementTitle}>{a.title}</Text>}
                    <Text style={styles.announcementContent} numberOfLines={3}>
                      {a.content}
                    </Text>
                    <Text style={styles.announcementMeta}>
                      {a.authorName || "Admin"} · {formatTime(a.createdAt)}
                    </Text>
                  </View>
                );
              }

              return null;
            }}
            ListEmptyComponent={
              <View style={styles.emptySmall}>
                <Text style={styles.emptySmallText}>No announcements yet</Text>
              </View>
            }
          />
        )}
      </SafeAreaView>
    );
  }

  // Main chat list view
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerBackButton}
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Ionicons name="chevron-back" size={22} color={INK} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Messages</Text>
        </View>

        <TouchableOpacity style={styles.headerIconButton} activeOpacity={0.8}>
          <Ionicons name="options-outline" size={20} color="rgba(10,14,26,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TabButton
          label="Chat"
          active={activeTab === "chat"}
          onPress={() => setActiveTab("chat")}
        />
        <TabButton
          label="Groups"
          active={activeTab === "groups"}
          onPress={() => setActiveTab("groups")}
        />
        <TabButton
          label="Communities"
          active={activeTab === "communities"}
          onPress={() => setActiveTab("communities")}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={BLUE} />
        </View>
      ) : activeTab === "communities" ? (
        // Communities list
        communities.length > 0 ? (
          <FlatList
            data={communities}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
                colors={[BLUE]}
              />
            }
            renderItem={({ item }) => (
              <CommunityRow
                community={item}
                onPress={() => fetchCommunityDetail(item)}
              />
            )}
          />
        ) : (
          <EmptyState
            icon="people-outline"
            title="No communities yet"
            subtitle="Join or create a community to connect with others who share your interests."
            buttonLabel="Explore communities"
            onPress={() => router.push("/in_progress")}
          />
        )
      ) : (
        // Chat/Groups list
        conversations.length > 0 ? (
          <FlatList
            data={conversations}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={BLUE}
                colors={[BLUE]}
              />
            }
            renderItem={({ item }) => (
              <ChatRow
                conversation={item}
                onPress={() => handleChatPress(item)}
              />
            )}
          />
        ) : (
          <EmptyState
            icon={activeTab === "chat" ? "chatbubble-outline" : "people-outline"}
            title={activeTab === "chat" ? "No chats yet" : "No groups yet"}
            subtitle={
              activeTab === "chat"
                ? "When you match with someone, your conversations will appear here."
                : "Create or join a group to start chatting with friends."
            }
            buttonLabel={activeTab === "chat" ? "Find people" : "Create group"}
            onPress={() => router.push(activeTab === "chat" ? "/(tabs)/map" : "/in_progress")}
          />
        )
      )}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

type TabButtonProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const TabButton: React.FC<TabButtonProps> = ({ label, active, onPress }) => (
  <TouchableOpacity
    style={[styles.tabButton, active && styles.tabButtonActive]}
    onPress={onPress}
    activeOpacity={0.85}
  >
    <Text style={[styles.tabButtonText, active && styles.tabButtonTextActive]}>
      {label}
    </Text>
  </TouchableOpacity>
);

type ChatRowProps = {
  conversation: ChatConversation;
  onPress: () => void;
};

const ChatRow: React.FC<ChatRowProps> = ({ conversation, onPress }) => {
  const { name, avatarUrl, lastMessage, updatedAt, unreadCount, isBlind, matchMode } = conversation;
  const hasUnread = unreadCount > 0;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "Now";
    if (diffMins < 60) return `${diffMins}m`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h`;
    return `${Math.floor(diffMins / 1440)}d`;
  };

  return (
    <TouchableOpacity 
      style={[styles.chatRow, hasUnread && styles.chatRowUnread]} 
      activeOpacity={0.9} 
      onPress={onPress}
    >
      <View style={[styles.avatarWrapper, isBlind && styles.avatarWrapperBlind]}>
        {isBlind ? (
          <LinearGradient
            colors={matchMode === "dating" ? ["#EF4444", "#F87171"] : ["#22C55E", "#4ADE80"]}
            style={styles.avatarBlindGradient}
          >
            <Ionicons name="eye-off" size={22} color="#FFFFFF" />
          </LinearGradient>
        ) : avatarUrl ? (
          <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons name="person" size={24} color={BLUE} />
          </View>
        )}
        {hasUnread && (
          <View style={styles.unreadDot} />
        )}
      </View>

      <View style={styles.chatMain}>
        <View style={styles.chatHeaderRow}>
          <Text style={[styles.chatName, hasUnread && styles.chatNameUnread]} numberOfLines={1}>
            {name}
          </Text>
          <Text style={[styles.chatTime, hasUnread && styles.chatTimeUnread]}>
            {formatTime(updatedAt)}
          </Text>
        </View>
        <View style={styles.chatPreviewRow}>
          <Text
            style={[styles.chatPreview, hasUnread && styles.chatPreviewUnread]}
            numberOfLines={1}
          >
            {lastMessage || "Start a conversation"}
          </Text>
          {hasUnread && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type CommunityRowProps = {
  community: Community;
  onPress: () => void;
};

const CommunityRow: React.FC<CommunityRowProps> = ({ community, onPress }) => (
  <TouchableOpacity style={styles.chatRow} activeOpacity={0.9} onPress={onPress}>
    <View style={styles.avatarWrapper}>
      {community.iconUrl ? (
        <Image source={{ uri: community.iconUrl }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Ionicons name="people" size={24} color={BLUE} />
        </View>
      )}
    </View>

    <View style={styles.chatMain}>
      <View style={styles.chatHeaderRow}>
        <Text style={styles.chatName} numberOfLines={1}>
          {community.name}
        </Text>
      </View>
      <Text style={styles.chatPreview} numberOfLines={1}>
        {community.memberCount} members · {community.category}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="rgba(10,14,26,0.3)" />
  </TouchableOpacity>
);

type EmptyStateProps = {
  icon: string;
  title: string;
  subtitle: string;
  buttonLabel: string;
  onPress: () => void;
};

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  buttonLabel,
  onPress,
}) => (
  <View style={styles.emptyContainer}>
    <View style={styles.emptyCircle}>
      <Ionicons name={icon as any} size={40} color={BLUE} />
    </View>
    <Text style={styles.emptyTitle}>{title}</Text>
    <Text style={styles.emptySubtitle}>{subtitle}</Text>
    <TouchableOpacity style={styles.primaryButton} activeOpacity={0.85} onPress={onPress}>
      <Text style={styles.primaryButtonText}>{buttonLabel}</Text>
    </TouchableOpacity>
  </View>
);

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BG,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(10),
  },
  headerBackButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(10),
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
    color: INK,
  },
  headerSubtitle: {
    marginTop: verticalScale(2),
    fontFamily: Fonts.primary,
    fontSize: scale(13),
    color: "rgba(10,14,26,0.6)",
  },
  headerIconButton: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    alignItems: "center",
    justifyContent: "center",
  },

  // Tab Bar
  tabBar: {
    flexDirection: "row",
    marginHorizontal: scale(20),
    marginBottom: verticalScale(10),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
    padding: scale(4),
  },
  tabButton: {
    flex: 1,
    paddingVertical: verticalScale(10),
    alignItems: "center",
    borderRadius: scale(10),
  },
  tabButtonActive: {
    backgroundColor: BLUE,
  },
  tabButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: INK,
  },
  tabButtonTextActive: {
    color: "#FFFFFF",
  },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // List
  listContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(4),
    paddingBottom: verticalScale(24),
  },

  // Chat Row
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(4),
    marginHorizontal: scale(-4),
    borderRadius: scale(12),
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10,14,26,0.08)",
  },
  chatRowUnread: {
    backgroundColor: "rgba(27,68,205,0.04)",
  },
  avatarWrapper: {
    width: scale(52),
    height: scale(52),
    borderRadius: scale(18),
    marginRight: scale(12),
    overflow: "hidden",
    backgroundColor: "#E4EBFA",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarWrapperBlind: {
    backgroundColor: "transparent",
  },
  avatarBlindGradient: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: scale(18),
  },
  avatar: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: scale(14),
    height: scale(14),
    borderRadius: scale(7),
    backgroundColor: BLUE,
    borderWidth: 2,
    borderColor: BG,
  },
  chatMain: {
    flex: 1,
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  chatName: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(16),
    color: INK,
  },
  chatNameUnread: {
    fontFamily: Fonts.bold,
    color: INK,
  },
  chatTime: {
    marginLeft: scale(8),
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.45)",
  },
  chatTimeUnread: {
    fontFamily: Fonts.bold,
    color: BLUE,
  },
  chatPreviewRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  chatPreview: {
    flex: 1,
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.65)",
  },
  chatPreviewUnread: {
    fontFamily: Fonts.bold,
    color: INK,
  },
  unreadBadge: {
    marginLeft: scale(8),
    minWidth: scale(20),
    paddingHorizontal: scale(6),
    paddingVertical: verticalScale(2),
    borderRadius: scale(10),
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },
  unreadBadgeText: {
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: "#FFFFFF",
  },

  // Community Detail
  communityChatRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(16),
  },
  chatIconWrapper: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: scale(12),
  },
  chatRowMain: {
    flex: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: verticalScale(8),
    marginBottom: verticalScale(12),
  },
  sectionHeaderText: {
    marginLeft: scale(8),
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  announcementCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: verticalScale(10),
    borderWidth: 1,
    borderColor: "rgba(10,14,26,0.06)",
  },
  pinnedBadge: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(6),
  },
  pinnedText: {
    marginLeft: scale(4),
    fontFamily: Fonts.bold,
    fontSize: scale(11),
    color: BLUE,
  },
  announcementTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: INK,
    marginBottom: verticalScale(4),
  },
  announcementContent: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.75)",
    lineHeight: scale(20),
  },
  announcementMeta: {
    marginTop: verticalScale(8),
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.45)",
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  emptyCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: verticalScale(20),
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(20),
    color: INK,
    textAlign: "center",
    marginBottom: verticalScale(6),
  },
  emptySubtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
    textAlign: "center",
    marginBottom: verticalScale(18),
    lineHeight: scale(20),
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(24),
    paddingVertical: verticalScale(12),
    borderRadius: scale(24),
    backgroundColor: BLUE,
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
  },
  emptySmall: {
    padding: scale(20),
    alignItems: "center",
  },
  emptySmallText: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.5)",
  },
});