// app/(tabs)/(up_tab)/chat.tsx
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  FlatList,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors } from "@/components/theme";
import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";

const BG = Colors.BG;
const INK = Colors.INK;
const BLUE = Colors.BLUE;

type FilterKey = "all" | "unread" | "new";

type ChatConversation = {
  id: string;
  name: string;
  age: number | null;
  avatarUrl: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  isOnline: boolean;
  isTyping?: boolean;
};

const MOCK_CHATS: ChatConversation[] = [
  {
    id: "1",
    name: "Alex",
    age: 24,
    avatarUrl: null,
    lastMessage: "That rooftop bar you mentioned sounds amazing 😌",
    lastMessageAt: "2m",
    unreadCount: 2,
    isOnline: true,
  },
  {
    id: "2",
    name: "Mila",
    age: 22,
    avatarUrl: null,
    lastMessage: "Okay, send me the place and time 👀",
    lastMessageAt: "15m",
    unreadCount: 0,
    isOnline: false,
  },
  {
    id: "3",
    name: "Leo",
    age: 26,
    avatarUrl: null,
    lastMessage: "Typing…",
    lastMessageAt: "Now",
    unreadCount: 0,
    isOnline: true,
    isTyping: true,
  },
];

function ChatScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");

  const conversations = useMemo(() => {
    switch (activeFilter) {
      case "unread":
        return MOCK_CHATS.filter((c) => c.unreadCount > 0);
      case "new":
        return MOCK_CHATS; // placeholder – later hook "new niices" logic
      default:
        return MOCK_CHATS;
    }
  }, [activeFilter]);

  const hasChats = conversations.length > 0;

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
          <Text style={styles.headerTitle}>Chats</Text>
          <Text style={styles.headerSubtitle}>
            Conversations with your niices
          </Text>
        </View>

        <TouchableOpacity
          style={styles.headerIconButton}
          activeOpacity={0.8}
          onPress={() => {
            // TODO: open chat settings / filters sheet
          }}
        >
          <Ionicons
            name="options-outline"
            size={20}
            color="rgba(10,14,26,0.7)"
          />
        </TouchableOpacity>
      </View>

      {/* Filters row */}
      <View style={styles.filtersRow}>
        <View style={styles.filtersChipsRow}>
          <FilterPill
            label="All"
            active={activeFilter === "all"}
            onPress={() => setActiveFilter("all")}
          />
          <FilterPill
            label="Unread"
            active={activeFilter === "unread"}
            onPress={() => setActiveFilter("unread")}
          />
          <FilterPill
            label="New niices"
            active={activeFilter === "new"}
            onPress={() => setActiveFilter("new")}
          />
        </View>
      </View>

      {/* Body */}
      {hasChats ? (
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ChatRow
              conversation={item}
              onPress={() => {
                // TODO: navigate to chat thread screen
                router.push("/in_progress");
              }}
            />
          )}
        />
      ) : (
        <EmptyChatState
          onExplorePress={() => {
            // If there are no niices, send them to the map to find people
            router.push("/(tabs)/map");
          }}
        />
      )}
    </SafeAreaView>
  );
}

type FilterPillProps = {
  label: string;
  active: boolean;
  onPress: () => void;
};

const FilterPill: React.FC<FilterPillProps> = ({ label, active, onPress }) => {
  return (
    <TouchableOpacity
      style={[styles.filterPill, active && styles.filterPillActive]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Text
        style={[styles.filterPillText, active && styles.filterPillTextActive]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

type ChatRowProps = {
  conversation: ChatConversation;
  onPress: () => void;
};

const ChatRow: React.FC<ChatRowProps> = ({ conversation, onPress }) => {
  const {
    name,
    age,
    avatarUrl,
    lastMessage,
    lastMessageAt,
    unreadCount,
    isOnline,
    isTyping,
  } = conversation;

  const previewText = isTyping ? "Typing…" : lastMessage;

  return (
    <TouchableOpacity
      style={styles.chatRow}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={styles.avatarWrapper}>
        {avatarUrl ? (
          <Image
            source={{ uri: avatarUrl }}
            style={styles.avatar}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Ionicons
              name="person"
              size={26}
              color="rgba(10,14,26,0.55)"
            />
          </View>
        )}
        {isOnline && <View style={styles.onlineDot} />}
      </View>

      <View style={styles.chatMain}>
        <View style={styles.chatHeaderRow}>
          <Text style={styles.chatName} numberOfLines={1}>
            {name}
            {age != null ? `, ${age}` : ""}
          </Text>
          <Text style={styles.chatTime}>{lastMessageAt}</Text>
        </View>

        <View style={styles.chatPreviewRow}>
          <Text
            style={[
              styles.chatPreview,
              unreadCount > 0 && styles.chatPreviewUnread,
            ]}
            numberOfLines={1}
          >
            {previewText}
          </Text>

          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadBadgeText}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

type EmptyChatProps = {
  onExplorePress: () => void;
};

const EmptyChatState: React.FC<EmptyChatProps> = ({ onExplorePress }) => {
  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIllustration}>
        <View style={styles.emptyCircle}>
          <MaterialCommunityIcons
            name="message-text-outline"
            size={40}
            color={BLUE}
          />
        </View>
      </View>

      <Text style={styles.emptyTitle}>No chats… yet</Text>
      <Text style={styles.emptySubtitle}>
        Once you both say niice to each other, your conversations will show up here.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        activeOpacity={0.85}
        onPress={onExplorePress}
      >
        <Ionicons
          name="map-outline"
          size={18}
          color="#FFFFFF"
          style={{ marginRight: scale(6) }}
        />
        <Text style={styles.primaryButtonText}>Discover people on the map</Text>
      </TouchableOpacity>
    </View>
  );
};

export default ChatScreen;

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

  // Filters
  filtersRow: {
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(6),
  },
  filtersChipsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    columnGap: scale(10),
  },
  filterPill: {
    borderRadius: scale(18),
    paddingHorizontal: scale(14),
    paddingVertical: verticalScale(7),
    backgroundColor: "rgba(27,68,205,0.04)",
    borderWidth: 1,
    borderColor: "rgba(27,68,205,0.12)",
  },
  filterPillActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },
  filterPillText: {
    fontFamily: Fonts.bold,
    fontSize: scale(13),
    color: Colors.INK,
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },

  // List
  listContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(8),
    paddingBottom: verticalScale(24),
  },
  chatRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    marginBottom: verticalScale(4),
    borderRadius: scale(16),
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
  onlineDot: {
    position: "absolute",
    bottom: scale(4),
    right: scale(4),
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: "#35C759",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  chatMain: {
    flex: 1,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(10,14,26,0.08)",
    paddingBottom: verticalScale(10),
  },
  chatHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: verticalScale(4),
  },
  chatName: {
    flex: 1,
    fontFamily: Fonts.bold,
    fontSize: scale(16),
    color: INK,
  },
  chatTime: {
    marginLeft: scale(8),
    fontFamily: Fonts.primary,
    fontSize: scale(12),
    color: "rgba(10,14,26,0.45)",
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

  // Empty state
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(32),
  },
  emptyIllustration: {
    marginBottom: verticalScale(20),
  },
  emptyCircle: {
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: "#E8F0FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(22),
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
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(20),
    paddingVertical: verticalScale(10),
    borderRadius: scale(24),
    backgroundColor: BLUE,
    marginBottom: verticalScale(10),
  },
  primaryButtonText: {
    fontFamily: Fonts.bold,
    fontSize: scale(15),
    color: "#FFFFFF",
  },
});
