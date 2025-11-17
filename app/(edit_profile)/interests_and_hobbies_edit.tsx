import { Fonts } from "@/constants/theme";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    Alert,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    Colors,
    FloatingHeader,
} from "@/components";

import { supabase } from "@/lib/supabase";

// ===========================
// HOBBY GROUPS (same as signup)
// ===========================
const HOBBY_GROUPS: Record<string, string[]> = {
  "Sports and Fitness": [
    "🏹 Archery", "🏃 Athletics", "🏸 Badminton", "⚾ Baseball", "🏀 Basketball", "🏖 Beach sports",
    "💪 Bodybuilding", "🧗 Bouldering", "🎳 Bowling", "🥊 Boxing", "🏎 Car Racing", "❤ Cardio",
    "📣 Cheerleading", "🧗‍♀ Climbing", "🚣 Crew", "🏏 Cricket", "🏋 Crossfit", "🚴 Cycling",
    "🐴 Equestrian", "🤸 Fitness classes", "⚽ Football", "🏃‍♂ Functional fitness", "🏁 Go karting",
    "⛳ Golf", "💪 Gym", "🤸‍♀ Gymnastics", "🤾 Handball", "🔥 HIIT", "🥾 Hiking", "🏒 Hockey",
    "🐎 Horse riding", "🏒 Ice Hockey", "🏃‍♀ Jogging", "🛶 Kayaking", "🥍 Lacrosse", "🏃 Marathon",
    "🥋 Martial Arts", "🧘 Meditation", "🏍 Motorbiking", "🏁 Motorsports",
    "🏐 Netball", "🏓 Padel", "🥒 Pickleball", "🧘‍♀ Pilates", "🏓 Ping pong", "💃 Pole Dancing",
    "🛼 Roller skating", "🏉 Rugby", "👟 Run clubs", "🏃 Running", "⛵ Sailing", "🤿 Scuba diving",
    "🛹 Skateboarding", "⛸ Skating", "⛷ Skiing", "🏂 Snowboarding", "⚽ Soccer", "🥎 Softball",
    "🏅 Sports", "🎯 Sports Shooting", "🎾 Squash", "🏄 Surfing", "🏊 Swimming", "🏓 Table Tennis",
    "🎾 Tennis", "🏃 Track", "🏐 Volleyball", "🚶 Walking", "🏋 Weightlifting", "💪 Working out",
    "🤼 Wrestling", "🧘 Yoga"
  ],
  Creativity: [
    "🎵 Acapella", "🎨 Art", "✍ Blogging", "🎶 Choir", "📱 Content Creation", "🦸 Cosplay",
    "🎨 Crafts", "🧶 Crocheting", "💃 Dancing", "🎨 Design", "🔨 DIY", "✏ Drawing", "💼 Entrepreneurship",
    "🌍 Exchange Program", "👗 Fashion", "💻 Freelancing", "📈 Investing", "🗣 Language Exchange",
    "📚 Literature", "💄 Make-up", "🎥 Making videos", "😂 Memes", "🎸 Musical Instrument",
    "🎼 Musical Writing", "💅 Nail art", "🖼 NFTs", "🖌 Painting", "📷 Photography", "📝 Poetry",
    "🏺 Pottery", "🏠 Real Estate", "🎤 Singing", "👟 Sneakers", "☠ Tattoos", "🛍 Thrifting",
    "♻ Upcycling", "👔 Vintage fashion", "✍ Writing"
  ],
  "Film and TV": [
    "🎬 Action & adventure", "🎥 Action movies", "🎨 Animated movies", "🎌 Anime",
    "🎬 Bollywood", "😂 Comedy", "👨‍🍳 Cooking shows", "🔪 Crime", "🕵 Crime shows",
    "📺 Documentaries", "🎭 Drama", "🐉 Fantasy", "🧙 Fantasy movies", "🎮 Game shows",
    "😱 Horror Movies", "🎬 Indie", "🎞 Indie films", "🇰🇷 K-drama", "🎬 Movies",
    "🔍 Mystery", "🎥 Reality TV", "💑 Rom-coms", "💖 Romance", "🛸 Sci-Fi", "⚽ Sports shows",
    "🦸 Superhero", "🎬 Thriller films", "🔍 True crime"
  ],
  Reading: [
    "📖 Action & adventure", "📚 Biographies", "📕 Classics", "😄 Comedy", "📰 Comic books",
    "🔎 Crime", "🐉 Fantasy", "📜 History", "👻 Horror", "🎌 Manga", "🔍 Mystery", "🤔 Philosophy",
    "📝 Poetry", "🧠 Psychology", "💕 Romance", "🚀 Sci-fi", "🔬 Science", "😰 Thriller"
  ],
  "Social and Content": [
    "📸 Instagram", "😂 Memes", "🌐 Metaverse", "🎬 Netflix", "📌 Pinterest", "🎙 Podcasts",
    "📱 Social Media", "☁ SoundCloud", "🎵 Spotify", "🎵 TikTok", "🎮 Twitch", "🎥 Virtual Reality",
    "📹 Vlogging", "❌ X", "▶ YouTube"
  ],
  "Staying In": [
    "🤖 AI", "🧁 Baking", "📺 Binge-Watching TV shows", "🎯 Board games", "♟ Chess",
    "🍳 Cooking", "🌱 Gardening", "🏋 Home Workout", "🪴 House plants", "🎮 Online Games",
    "🛒 Online Shopping", "🎙 Podcasts", "💻 Programming", "📖 Reading", "❓ Trivia", "🎮 Video games"
  ],
  Traveling: [
    "🎒 Backpacking", "🏖 Beaches", "⛺ Camping", "🏙 Exploring new cities", "🎣 Fishing trips",
    "🥾 Hiking trips", "🚗 Road trips", "🧳 Solo trips", "🧖 Spa weekends", "🏠 Staycations",
    "❄ Winter sports"
  ],
  Pets: [
    "🐸 Amphibian", "🕊 Birds", "🐈 Cats", "🐕 Dogs", "🐠 Fish", "🐹 Hamster",
    "🦎 Lizards", "🐾 Other", "🚫 Pet-free", "🦎 Reptile", "🐍 Snakes",
    "🐢 Turtles", "❤ Don't have but love", "🤔 Want a pet", "🤧 All the pets",
    "🤧 Allergic to pets"
  ],
  "Fan Favorites": [
    "📼 90s Kid", "🎭 Comic-con", "🏰 Disney", "🐉 Dungeons & Dragons", "⚡ Harry Potter", "⚾ MLB",
    "📚 Manga", "🦸 Marvel", "🏀 NBA"
  ],
  "Food and Drink": [
    "🥣 Açaí", "🍖 BBQ", "🍺 Beer", "🍛 Biryani", "🧋 Boba tea", "🥂 Brunch", "🍔 Burgers", "🍰 Cake",
    "🍸 Cocktails", "☕ Coffee", "🍺 Craft Beer", "🍴 Food tours", "🍽 Foodie", "🍸 Gin", "🍦 Ice Cream",
    "🥬 Kimchi", "🍜 Korean Food", "🍹 Mocktails", "🍜 Pho", "🍕 Pizza", "🥗 Plant-based", "🍜 Ramen",
    "🥤 Smoothies", "🌮 Street Food", "🍣 Sushi", "🍬 Sweet tooth", "🍰 Sweet treats", "🌮 Tacos",
    "🥡 Takeout", "🍵 Tea", "🌱 Vegan", "🥬 Vegetarian", "🥃 Whisky", "🍷 Wine"
  ],
  Gaming: [
    "🚀 Among Us", "🕹 Atari", "🎮 E-Sports", "🎯 Fortnite", "🎮 League of Legends", "🎮 Nintendo",
    "🎮 PlayStation", "🎮 Roblox", "🎮 Xbox"
  ],
  "Going Out": [
    "🐠 Aquarium", "🖼 Art galleries", "🍺 Bar Hopping", "🍻 Bars", "🎳 Bowling", "☕ Cafe hopping",
    "🚗 Cars", "🪩 Clubbing", "💃 Clubs", "🎵 Concerts", "👑 Drag shows",
    "🎬 Drive-in Cinema", "🔐 Escape Rooms", "🎨 Exhibition", "🎪 Festivals", "🎬 Film Festival",
    "🍻 Happy hour", "🏠 House Parties", "🎭 Improv", "🎤 Karaoke", "🏳‍🌈 LGBTQ+ nightlife",
    "🎸 Live Music", "🏍 Motorcycles", "🎬 Movies", "🏛 Museums", "🖼 Museums & galleries",
    "🎭 Musical theater", "🌙 Nightlife", "🎉 Parties", "🍺 Pub Quiz", "🍻 Pubs", "🎶 Raves",
    "🛼 Rollerskating", "💃 Salsa dancing", "💨 Shisha", "🛍 Shopping", "🎤 Stand up Comedy",
    "🎭 Theater", "🛍 Thrifting", "🎪 Town Festivities", "❓ Trivia",
    "🍷 Wine tasting"
  ],
  Music: [
    "🎸 90s Britpop", "🎵 Afro", "🎶 Alternative music", "🎵 Arab", "🎸 Blues", "🎻 Classical",
    "🤠 Country", "🎶 Desi", "🎧 EDM", "🎛 Electronic Music",
    "🪕 Folk & acoustic", "🎺 Funk", "⛪ Gospel music", "🦇 Gothic",
    "🤘 Heavy Metal", "🎤 Hip Hop", "🏠 House", "🎸 Indie",
    "🎌 J-Pop", "🎷 Jazz", "🇰🇷 K-Pop", "💃 Latin", "🎹 Metal",
    "🎭 Opera", "🎤 Pop", "🤘 Punk rock", "🎵 R&B", "🎤 Rap",
    "🎵 Reggae", "🎵 Reggaeton", "🎸 Rock", "🎶 Soul", "🎧 Techno", "🎵 Trap Music"
  ],
  "Outdoors and Adventure": [
    "🎒 Backpacking", "🏖 Beach Bars", "⛺ Camping", "🛶 Canoeing", "🛋 Couchsurfing", "🤿 Diving",
    "🎣 Fishing", "🤿 Free Diving", "🥾 Hiking", "♨ Hot Springs", "🚤 Jetskiing", "⛰ Mountains",
    "🌲 Nature", "🌳 Outdoors", "🏄 Paddle Boarding", "🪂 Paragliding", "🧺 Picnicking", "🚗 Road Trips",
    "🧗 Rock Climbing", "🚣 Rowing", "⛵ Sailing", "⛷ Skiing", "🏂 Snowboarding", "🏄 Surfing",
    "✈ Travel", "🐕 Walking My Dog", "🚶 Walking tours"
  ],
  "Values and Causes": [
    "✊ Activism", "✊🏿 Black Lives Matter", "🌍 Climate Change", "♿ Disability Rights",
    "🌱 Environmentalism", "⚖ Equality", "♀ Feminism", "🤝 Human Rights", "🤗 Inclusivity",
    "🏳‍🌈 LGBTQIA+ Rights", "🧠 Mental Health Awareness", "🗳 Politics", "🏳‍🌈 Pride",
    "📈 Social Development", "🤝 Volunteering", "🗳 Voter Rights", "☮ World Peace",
    "💪 Youth Empowerment"
  ],
  "Wellness and Lifestyle": [
    "🏃 Active Lifestyle", "✨ Astrology", "💄 Makeup", "🧘 Meditation", "🧘‍♀ Mindfulness",
    "🧖 Sauna", "💆 Self Care", "📚 Self Development", "💖 Self Love", "🧴 Skincare", "🧖‍♀ Spa",
    "🔮 Tarot", "🆕 Trying New Things", "🧘 Yoga"
  ],
  "Self-Care": [
    "🕯 Aromatherapy", "✨ Astrology", "🧊 Cold plunging", "💎 Crystals", "💬 Deep chats",
    "📔 Journaling", "🧘 Mindfulness", "🥗 Nutrition", "🏞 Retreats", "🧴 Skin care", "😴 Sleeping well",
    "🐌 Slow living", "💭 Therapy", "📵 Time offline"
  ],
};

const COMMUNITY_OPTIONS = [
  "🌿 Environmentalism",
  "✊ Social justice",
  "🏳️‍🌈 LGBTQIA+",
  "♀️ Feminism",
  "🧠 Mental health awareness",
  "✊🏾 Black community",
  "🧧 Asian community",
  "🪅 Latino/Hispanic community",
  "✡️ Jewish community",
  "☪️ Muslim community",
  "♿ Disability awareness",
  "💖 Body positivity",
  "🐾 Animal rights",
  "🌍 Climate action",
];

const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, '').trim();
const normalizeHobby = (s: string) => stripEmoji(s).toLowerCase().trim();
const getHobbyCategory = (hobby: string): string | null => {
  for (const [category, hobbies] of Object.entries(HOBBY_GROUPS)) {
    if (hobbies.includes(hobby)) {
      return category;
    }
  }
  return null;
};

const groupSelectedHobbiesByCategory = (selected: string[]): Record<string, string[]> => {
  const grouped: Record<string, string[]> = {};
  selected.forEach(hobby => {
    const category = getHobbyCategory(hobby);
    if (category) {
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(hobby);
    }
  });
  return grouped;
};
export default function InterestsAndHobbiesEdit() {
  const [selectedHobbies, setSelectedHobbies] = useState<string[]>([]);
  const [selectedCommunities, setSelectedCommunities] = useState<string[]>([]);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"hobbies" | "communities">("hobbies");
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState("");
  const animRefs = useRef<Record<string, Animated.Value>>({});
  const expandAnims = useRef<Record<string, Animated.Value>>({});

  const ensureAnim = (key: string) => {
    if (!animRefs.current[key]) animRefs.current[key] = new Animated.Value(1);
    return animRefs.current[key];
  };

  const ensureExpandAnim = (key: string) => {
    if (!expandAnims.current[key]) expandAnims.current[key] = new Animated.Value(0);
    return expandAnims.current[key];
  };

  const pulse = (key: string) => {
    const a = ensureAnim(key);
    Animated.sequence([
      Animated.timing(a, { toValue: 1.05, duration: 100, useNativeDriver: true }),
      Animated.timing(a, { toValue: 1, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => {
    loadCurrentData();
  }, []);

  const loadCurrentData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const tempKey = `temp_interests_hobbies_${user.id}`;
      const tempData = await AsyncStorage.getItem(tempKey);

      if (tempData) {
        const parsed = JSON.parse(tempData);
        setFullName(parsed.fullName || "");
        setSelectedHobbies(parsed.hobbies || []);
        setSelectedCommunities(parsed.communities || []);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profileError) throw profileError;
      setFullName(profileData?.full_name || "");

      // Load hobbies
      const { data: hobbiesData, error: hobbiesError } = await supabase
        .from("user_hobbies")
        .select("hobbies_master(label)")
        .eq("user_id", user.id);

      if (hobbiesError && hobbiesError.code !== "PGRST116") throw hobbiesError;

      if (hobbiesData) {
        const hobbyLabels = hobbiesData
          .map((h: any) => h?.hobbies_master?.label)
          .filter(Boolean) as string[];
        
        // Match with emoji versions
        const matchedHobbies: string[] = [];
        hobbyLabels.forEach(label => {
          const normalized = normalizeHobby(label);
          Object.values(HOBBY_GROUPS).flat().forEach(hobbyWithEmoji => {
            if (normalizeHobby(hobbyWithEmoji) === normalized) {
              matchedHobbies.push(hobbyWithEmoji);
            }
          });
        });
        
        setSelectedHobbies(matchedHobbies);
      }

      // Load communities
      const { data: lifestyleData, error: lifestyleError } = await supabase
        .from("lifestyle")
        .select("communities")
        .eq("user_id", user.id)
        .maybeSingle();

      if (lifestyleError && lifestyleError.code !== "PGRST116") throw lifestyleError;

      if (lifestyleData?.communities) {
        const communityList = Array.isArray(lifestyleData.communities) 
          ? lifestyleData.communities 
          : [];
        
        // Match with emoji versions
        const matchedCommunities: string[] = [];
        communityList.forEach((comm: string) => {
          const normalized = normalizeHobby(comm);
          COMMUNITY_OPTIONS.forEach(commWithEmoji => {
            if (normalizeHobby(commWithEmoji) === normalized) {
              matchedCommunities.push(commWithEmoji);
            }
          });
        });
        
        setSelectedCommunities(matchedCommunities);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      Alert.alert("Error", "Failed to load current data. Please try again.");
    }
  };

  const toggleHobby = (hobby: string) => {
    pulse(`hobby-${hobby}`);
    setSelectedHobbies(prev => {
      if (prev.includes(hobby)) {
        return prev.filter(h => h !== hobby);
      } else {
        if (prev.length >= 10) {
          Alert.alert("Limit reached", "You can select up to 10 hobbies.");
          return prev;
        }
        return [...prev, hobby];
      }
    });
  };

  const toggleCommunity = (community: string) => {
    pulse(`community-${community}`);
    setSelectedCommunities(prev => {
      if (prev.includes(community)) {
        return prev.filter(c => c !== community);
      } else {
        if (prev.length >= 4) {
          Alert.alert("Limit reached", "You can select up to 4 communities.");
          return prev;
        }
        return [...prev, community];
      }
    });
  };

  const toggleCategory = (category: string) => {
  const anim = ensureExpandAnim(category);
  const isExpanding = !expandedCategories[category];

  if (isExpanding) {
    setExpandedCategories(prev => ({ ...prev, [category]: true }));
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: false,
      friction: 8,
      tension: 100,
    }).start();
  } else {
    Animated.timing(anim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start(() => {
      setExpandedCategories(prev => ({ ...prev, [category]: false }));
    });
  }
};

  const handleSave = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        Alert.alert("Error", "Session not found. Please try again.");
        setLoading(false);
        return;
      }

      const tempKey = `temp_interests_hobbies_${user.id}`;
      await AsyncStorage.setItem(tempKey, JSON.stringify({
        hobbies: selectedHobbies,
        communities: selectedCommunities,
        fullName
      }));

      router.back();
    } catch (err) {
      console.error("Update error:", err);
      Alert.alert("Error", "Failed to save changes.");
    } finally {
      setLoading(false);
    }
  };

  const filteredHobbyGroups = () => {
    if (!searchQuery.trim()) return HOBBY_GROUPS;
    
    const query = searchQuery.toLowerCase();
    const filtered: Record<string, string[]> = {};
    
    Object.entries(HOBBY_GROUPS).forEach(([category, hobbies]) => {
      const matches = hobbies.filter(h => 
        h.toLowerCase().includes(query)
      );
      if (matches.length > 0) {
        filtered[category] = matches;
      }
    });
    
    return filtered;
  };

  const filteredCommunities = () => {
    if (!searchQuery.trim()) return COMMUNITY_OPTIONS;
    
    const query = searchQuery.toLowerCase();
    return COMMUNITY_OPTIONS.filter(c => 
      c.toLowerCase().includes(query)
    );
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <FloatingHeader 
          title="Interests & Hobbies" 
          fullName={fullName}
          onSave={handleSave}
        />

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={verticalScale(20)}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            bounces
            scrollEnabled={true}
            nestedScrollEnabled={true}
          >
            <View pointerEvents="none">
              <Text style={styles.pageTitle}>Your Interests</Text>
              <Text style={styles.pageSubtitle}>
                {activeTab === "hobbies" 
                  ? `${selectedHobbies.length}/10 hobbies selected`
                  : `${selectedCommunities.length}/4 communities selected`
                }
              </Text>
            </View>

            {/* Tab Selector */}
            <View style={styles.tabContainer}>
              <Pressable
                onPress={() => setActiveTab("hobbies")}
                style={[styles.tab, activeTab === "hobbies" && styles.tabActive]}
              >
                <LinearGradient
                  colors={
                    activeTab === "hobbies"
                      ? ["#1B44CD", "#3C6FFF"] as const
                      : ["#FFFFFF", "#F8FAFF"] as const
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabGradient}
                >
                  <MaterialCommunityIcons
                    name="palette-outline"
                    size={20}
                    color={activeTab === "hobbies" ? "#FFFFFF" : Colors.BLUE}
                  />
                  <Text style={[styles.tabText, activeTab === "hobbies" && styles.tabTextActive]}>
                    Hobbies
                  </Text>
                  {selectedHobbies.length > 0 && (
                    <View style={[styles.badge, activeTab === "hobbies" && styles.badgeActive]}>
                      <Text style={[styles.badgeText, activeTab === "hobbies" && styles.badgeTextActive]}>
                        {selectedHobbies.length}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab("communities")}
                style={[styles.tab, activeTab === "communities" && styles.tabActive]}
              >
                <LinearGradient
                  colors={
                    activeTab === "communities"
                      ? ["#1B44CD", "#3C6FFF"] as const
                      : ["#FFFFFF", "#F8FAFF"] as const
                  }
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.tabGradient}
                >
                  <Ionicons
                    name="people-outline"
                    size={20}
                    color={activeTab === "communities" ? "#FFFFFF" : Colors.BLUE}
                  />
                  <Text style={[styles.tabText, activeTab === "communities" && styles.tabTextActive]}>
                    Communities
                  </Text>
                  {selectedCommunities.length > 0 && (
                    <View style={[styles.badge, activeTab === "communities" && styles.badgeActive]}>
                      <Text style={[styles.badgeText, activeTab === "communities" && styles.badgeTextActive]}>
                        {selectedCommunities.length}
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            {/* Search Bar */}
            {/* Search Bar */}
<View style={styles.searchContainer}>
  <Ionicons name="search" size={20} color="rgba(10,14,26,0.4)" style={styles.searchIcon} />
  <TextInput
    style={styles.searchInput}
    placeholder={activeTab === "hobbies" ? "Search hobbies..." : "Search communities..."}
    placeholderTextColor="rgba(10,14,26,0.4)"
    value={searchQuery}
    onChangeText={setSearchQuery}
  />
  {searchQuery.length > 0 && (
    <Pressable onPress={() => setSearchQuery("")} style={styles.clearButton}>
      <Ionicons name="close-circle" size={20} color="rgba(10,14,26,0.4)" />
    </Pressable>
  )}
</View>

{/* Selected Hobbies Section */}
{activeTab === "hobbies" && selectedHobbies.length > 0 && (
  <View style={styles.selectedSection}>
    <LinearGradient
      colors={["#EEF4FF", "#FFFFFF"] as const}
      style={styles.selectedGradient}
    >
      <View style={styles.selectedHeader}>
        <View style={styles.selectedHeaderLeft}>
          <Ionicons name="checkmark-circle" size={20} color={Colors.BLUE} />
          <Text style={styles.selectedTitle}>Your Selected Hobbies</Text>
        </View>
        <Pressable onPress={() => setSelectedHobbies([])}>
          <Text style={styles.clearAllText}>Clear All</Text>
        </Pressable>
      </View>

      {Object.entries(groupSelectedHobbiesByCategory(selectedHobbies)).map(([category, hobbies]) => (
        <View key={category} style={styles.selectedCategoryGroup}>
          <Text style={styles.selectedCategoryLabel}>{category}</Text>
          <View style={styles.selectedChipsContainer}>
            {hobbies.map((hobby) => (
              <Pressable
                key={hobby}
                onPress={() => toggleHobby(hobby)}
                style={styles.selectedChip}
              >
                <LinearGradient
                  colors={["#1B44CD", "#3C6FFF"] as const}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.selectedChipGradient}
                >
                  <Text style={styles.selectedChipText}>{hobby}</Text>
                  <Ionicons name="close-circle" size={16} color="#FFFFFF" />
                </LinearGradient>
              </Pressable>
            ))}
          </View>
        </View>
      ))}
    </LinearGradient>
  </View>
)}
{/* Hobbies Tab Content */}
{activeTab === "hobbies" && (
              <>
                {Object.entries(filteredHobbyGroups()).map(([category, hobbies]) => {
                  const isExpanded = expandedCategories[category];
                  const expandAnim = ensureExpandAnim(category);
                  
                  const maxHeight = expandAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, 3000],
                  });

                  const opacity = expandAnim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, 0.5, 1],
                  });

                  return (
                    <View key={category} style={styles.categoryCard}>
                      <Pressable
                        onPress={() => toggleCategory(category)}
                        style={styles.categoryHeader}
                      >
                        <Text style={styles.categoryTitle}>{category}</Text>
                        <Ionicons
                          name={isExpanded ? "chevron-up" : "chevron-down"}
                          size={20}
                          color="rgba(10,14,26,0.4)"
                        />
                      </Pressable>

                      {isExpanded && (
                        <Animated.View style={[styles.chipsSection, { maxHeight, opacity }]}>
                          <View style={styles.chipsContainer}>
                            {hobbies.map((hobby) => {
                              const anim = ensureAnim(`hobby-${hobby}`);
                              const isSelected = selectedHobbies.includes(hobby);

                              return (
                                <Pressable 
                                  key={hobby} 
                                  onPress={() => toggleHobby(hobby)}
                                  delayLongPress={70}
                                >
                                  <Animated.View style={{ transform: [{ scale: anim }] }}>
                                    <LinearGradient
                                      colors={
                                        isSelected
                                          ? ["#1B44CD", "#3C6FFF"] as const
                                          : ["#FFFFFF", "#F0F3F8"] as const
                                      }
                                      start={{ x: 0, y: 0 }}
                                      end={{ x: 1, y: 1 }}
                                      style={[
                                        styles.chipButton,
                                        isSelected && styles.chipButtonSelected,
                                      ]}
                                    >
                                      <Text
                                        style={[
                                          styles.chipText,
                                          isSelected && styles.chipTextSelected,
                                        ]}
                                      >
                                        {hobby}
                                      </Text>
                                    </LinearGradient>
                                  </Animated.View>
                                </Pressable>
                              );
                            })}
                          </View>
                        </Animated.View>
                      )}
                    </View>
                  );
                })}
              </>
            )}

            {/* Communities Tab Content */}
            {activeTab === "communities" && (
              <View style={styles.communitiesContainer}>
                <View style={styles.chipsContainer}>
                  {filteredCommunities().map((community) => {
                    const anim = ensureAnim(`community-${community}`);
                    const isSelected = selectedCommunities.includes(community);

                    return (
                      <Pressable 
                        key={community} 
                        onPress={() => toggleCommunity(community)}
                        delayLongPress={70}
                      >
                        <Animated.View style={{ transform: [{ scale: anim }] }}>
                          <LinearGradient
                            colors={
                              isSelected
                                ? ["#1B44CD", "#3C6FFF"] as const
                                : ["#FFFFFF", "#F0F3F8"] as const
                            }
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                              styles.chipButton,
                              isSelected && styles.chipButtonSelected,
                            ]}
                          >
                            <Text
                              style={[
                                styles.chipText,
                                isSelected && styles.chipTextSelected,
                              ]}
                            >
                              {community}
                            </Text>
                          </LinearGradient>
                        </Animated.View>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={styles.infoNote} pointerEvents="none">
              <Ionicons 
                name="information-circle-outline" 
                size={18} 
                color="rgba(10,14,26,0.5)" 
                style={{ marginRight: scale(8) }}
              />
              <Text style={styles.infoNoteText}>
                {activeTab === "hobbies" 
                  ? "Select 4-10 hobbies to help us find compatible matches."
                  : "Choose up to 4 communities you support or identify with."
                }
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: verticalScale(100),
    paddingHorizontal: scale(20),
    paddingBottom: verticalScale(40),
  },
  pageTitle: {
    fontSize: scale(28),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    marginBottom: verticalScale(4),
  },
  pageSubtitle: {
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: Colors.BLUE,
    marginBottom: verticalScale(20),
  },
  tabContainer: {
    flexDirection: "row",
    gap: scale(12),
    marginBottom: verticalScale(16),
  },
  tab: {
    flex: 1,
    borderRadius: scale(16),
    overflow: "hidden",
  },
  tabActive: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  tabGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: verticalScale(12),
    paddingHorizontal: scale(16),
    gap: scale(6),
  },
  tabText: {
    fontSize: scale(15),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  tabTextActive: {
    color: "#FFFFFF",
  },
  badge: {
    backgroundColor: Colors.BLUE,
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: scale(6),
  },
  badgeActive: {
    backgroundColor: "#FFFFFF",
  },
  badgeText: {
    fontSize: scale(11),
    fontFamily: Fonts.bold,
    color: "#FFFFFF",
  },
  badgeTextActive: {
    color: Colors.BLUE,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    paddingVertical: verticalScale(12),
    marginBottom: verticalScale(16),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    marginRight: scale(8),
  },
  searchInput: {
    flex: 1,
    fontSize: scale(15),
    fontFamily: Fonts.primary,
    color: Colors.INK,
  },
  clearButton: {
    padding: scale(4),
  },
  categoryCard: {
    marginBottom: verticalScale(12),
    backgroundColor: "#FFFFFF",
    borderRadius: scale(16),
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: scale(16),
  },
  categoryTitle: {
    fontSize: scale(16),
    fontFamily: Fonts.bold,
    color: Colors.INK,
  },
  chipsSection: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    borderTopWidth: 1,
    borderTopColor: "rgba(27,68,205,0.08)",
    paddingTop: scale(12),
    overflow: "hidden",
  },
  communitiesContainer: {
    marginTop: verticalScale(4),
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
  },
  chipButton: {
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(16),
    borderRadius: scale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  chipButtonSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  chipText: {
    fontSize: scale(14),
    fontFamily: Fonts.bold,
    color: Colors.INK,
    textAlign: "center",
  },
  chipTextSelected: {
    color: "#FFFFFF",
  },
  infoNote: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: verticalScale(16),
    padding: scale(16),
    backgroundColor: "rgba(27,68,205,0.06)",
    borderRadius: scale(12),
  },
  infoNoteText: {
    flex: 1,
    fontSize: scale(13),
    fontFamily: Fonts.primary,
    color: "rgba(10,14,26,0.6)",
    lineHeight: verticalScale(18),
  },
  selectedSection: {
  marginBottom: verticalScale(16),
  borderRadius: scale(20),
  overflow: "hidden",
  shadowColor: Colors.BLUE,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.15,
  shadowRadius: 12,
  elevation: 6,
},
selectedGradient: {
  padding: scale(16),
},
selectedHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: verticalScale(12),
},
selectedHeaderLeft: {
  flexDirection: "row",
  alignItems: "center",
  gap: scale(8),
},
selectedTitle: {
  fontSize: scale(16),
  fontFamily: Fonts.bold,
  color: Colors.INK,
},
clearAllText: {
  fontSize: scale(14),
  fontFamily: Fonts.bold,
  color: Colors.BLUE,
},
selectedCategoryGroup: {
  marginBottom: verticalScale(12),
},
selectedCategoryLabel: {
  fontSize: scale(13),
  fontFamily: Fonts.bold,
  color: "rgba(10,14,26,0.6)",
  marginBottom: verticalScale(8),
},
selectedChipsContainer: {
  flexDirection: "row",
  flexWrap: "wrap",
  gap: scale(8),
},
selectedChip: {
  borderRadius: scale(20),
  overflow: "hidden",
},
selectedChipGradient: {
  flexDirection: "row",
  alignItems: "center",
  gap: scale(6),
  paddingVertical: verticalScale(8),
  paddingHorizontal: scale(14),
},
selectedChipText: {
  fontSize: scale(13),
  fontFamily: Fonts.bold,
  color: "#FFFFFF",
},
});