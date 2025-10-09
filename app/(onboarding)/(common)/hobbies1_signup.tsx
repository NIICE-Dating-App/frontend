import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { moderateScale, scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

// Enable layout animation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const BG = "#EAF1F8";
const INK = "#000910";
const BLUE = "#1B44CD";
const INK_SOFT = "#1B2B44";

const HOBBY_GROUPS: Record<string, string[]> = {
    "Sports and Fitness": [
      "🏹 Archery", "🏃 Athletics", "🏸 Badminton", "⚾ Baseball", "🏀 Basketball", "🏖 Beach sports",
      "💪 Bodybuilding", "🧗 Bouldering", "🎳 Bowling", "🥊 Boxing", "🏎 Car Racing", "❤ Cardio",
      "📣 Cheerleading", "🧗‍♀ Climbing", "🚣 Crew", "🏏 Cricket", "🏋 Crossfit", "🚴 Cycling",
      "🐴 Equestrian", "🤸 Fitness classes", "⚽ Football", "🏃‍♂ Functional fitness", "🏁 Go karting",
      "⛳ Golf", "💪 Gym", "🤸‍♀ Gymnastics", "🤾 Handball", "🔥 HIIT", "🥾 Hiking", "🏒 Hockey",
      "🐎 Horse riding", "🏒 Ice Hockey", "🏃‍♀ Jogging", "🛶 Kayaking", "🥍 Lacrosse", "🏃 Marathon",
      "🥋 Martial Arts", "🧘 Meditation", "🏍 Motorbiking", "🏎 Motor Sports", "🏁 Motorsports",
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
      "🎬 Action & adventure", "🎥 Action movies", "🎞 Animated", "🎨 Animated movies", "🎌 Anime",
      "🎬 Bollywood", "😂 Comedy", "👨‍🍳 Cooking shows", "🔪 Crime", "🕵 Crime shows", "📺 Documentaries",
      "🎭 Drama", "📺 Drama shows", "🐉 Fantasy", "🧙 Fantasy movies", "🎮 Game shows", "👻 Horror",
      "😱 Horror Movies", "🎬 Indie", "🎞 Indie films", "🇰🇷 K-drama", "📺 K-drama shows", "🎬 Movies",
      "🔍 Mystery", "📺 Reality shows", "🎥 Reality TV", "💕 Rom-com", "💑 Rom-coms", "💖 Romance",
      "🚀 Sci-fi", "🛸 Sci-Fi", "⚽ Sports shows", "🦸 Superhero", "😨 Thriller", "🎬 Thriller films",
      "🔍 True crime"
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
      "🤖 AI", "🧁 Baking", "📺 Binge-Watching TV shows", "🎲 Board Games", "🎯 Board games", "♟ Chess",
      "🍳 Cooking", "🌱 Gardening", "🏋 Home Workout", "🪴 House plants", "🎮 Online Games",
      "🛒 Online Shopping", "🎙 Podcasts", "💻 Programming", "📖 Reading", "❓ Trivia", "🎮 Video games"
    ],
  
    Traveling: [
      "🎒 Backpacking", "🏖 Beaches", "⛺ Camping", "🏙 Exploring new cities", "🎣 Fishing trips",
      "🥾 Hiking trips", "🚗 Road trips", "🧳 Solo trips", "🧖 Spa weekends", "🏠 Staycations",
      "❄ Winter sports"
    ],
  
    Pets: [
      "🐸 Amphibian", "🐦 Bird", "🕊 Birds", "🐱 Cat", "🐈 Cats", "🐶 Dog", "🐕 Dogs", "🐠 Fish", "🐹 Hamster",
      "🦎 Lizards", "🐾 Other", "🚫 Pet-free", "🐰 Rabbit", "🐇 Rabbits", "🦎 Reptile", "🐍 Snakes",
      "🐢 Turtle", "🐢 Turtles", "❤ Don't have but love", "🤔 Want a pet", "🤧 All the pets",
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
      "🍵 Cafe-hopping", "🚗 Cars", "🪩 Clubbing", "💃 Clubs", "🎵 Concerts", "👑 Drag shows",
      "🎬 Drive-in Cinema", "🔐 Escape Rooms", "🎨 Exhibition", "🎪 Festivals", "🎬 Film Festival",
      "🍻 Happy hour", "🏠 House Parties", "🎭 Improv", "🎤 Karaoke", "🏳‍🌈 LGBTQ+ nightlife",
      "🎸 Live Music", "🏍 Motorcycles", "🎬 Movies", "🏛 Museums", "🖼 Museums & galleries",
      "🎭 Musical theater", "🌙 Nightlife", "🎉 Parties", "🍺 Pub Quiz", "🍻 Pubs", "🎶 Raves",
      "🛼 Rollerskating", "💃 Salsa dancing", "💨 Shisha", "🛍 Shopping", "🎤 Stand up",
      "😂 Stand up Comedy", "🎭 Theater", "🛍 Thrifting", "🎪 Town Festivities", "❓ Trivia",
      "🍷 Wine tasting"
    ],
  
    Music: [
      "🎸 90s Britpop", "🎵 Afro", "🎶 Alternative music", "🎵 Arab", "🎸 Blues", "🎻 Classical",
      "🤠 Country", "🎵 Country Music", "🎶 Desi", "🎧 EDM", "🎹 Electronic", "🎛 Electronic Music",
      "🪕 Folk & acoustic", "🎵 Folk music", "🎺 Funk", "🎶 Funk music", "⛪ Gospel music", "🦇 Gothic",
      "🎤 Grime", "🤘 Heavy Metal", "🎤 Hip Hop", "🎧 Hip hop", "🏠 House", "🎵 House music", "🎸 Indie",
      "🎶 Indie music", "🎌 J-Pop", "🎷 Jazz", "🇰🇷 K-Pop", "💃 Latin", "🎺 Latin music", "🎹 Metal",
      "🎵 Music", "🎸 Music bands", "🎭 Opera", "🎤 Pop", "🎵 Pop music", "🎸 Punk", "🤘 Punk rock",
      "🎵 R&B", "🎤 Rap", "🎶 Rap music", "🎵 Reggae", "🎵 Reggaeton", "🎸 Rock", "🎵 Rock music",
      "🎶 Soul", "🎵 Soul music", "🎧 Techno", "🎵 Trap Music"
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
  
    "Personality and Traits": [
      "🪞 Self-awareness", "🚀 Ambition", "🏃 Being active", "❤ Being family-oriented",
      "🧠 Being open-minded", "💕 Being romantic", "😎 Confidence", "🎨 Creativity", "💚 Empathy",
      "🧠 Intelligence", "☀ Positivity", "🗺 Sense of adventure", "😄 Sense of humor", "👥 Social awareness"
    ],
  };
  

  const HobbyChip = React.memo(
    ({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: (l: string) => void }) => {
      const anim = useRef(new Animated.Value(1)).current;
      const handlePress = useCallback(() => {
        Animated.sequence([
          Animated.timing(anim, { toValue: 1.06, duration: 95, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 1, duration: 90, useNativeDriver: true }),
        ]).start();
        onToggle(label);
      }, [anim, label, onToggle]);
  
      return (
        <Pressable onPress={handlePress} hitSlop={6} style={({ pressed }) => [pressed && { opacity: 0.9 }]}>
          <Animated.View
            style={[
              { transform: [{ scale: anim }] },
              styles.shadowWrapper,
              Platform.OS === "ios" && { shadowOpacity: selected ? 0.35 : 0.15 },
            ]}
            renderToHardwareTextureAndroid
            shouldRasterizeIOS
          >
            <LinearGradient
              colors={selected ? ["#1B44CD", "#3C6FFF", "#7AA9FF"] : ["#F8FAFF", "#EBF1FF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[styles.chip, selected && styles.chipSelected]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
            </LinearGradient>
          </Animated.View>
        </Pressable>
      );
    }
  );
  
  export default function Hobbies1Signup() {
    const [selected, setSelected] = useState<string[]>([]);
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    const [loading, setLoading] = useState(false);
    const insets = useSafeAreaInsets();
  
    const toggleOption = useCallback((opt: string) => {
      setSelected((prev) => {
        const has = prev.includes(opt);
        if (has) return prev.filter((x) => x !== opt);
        if (prev.length >= 10) {
          Alert.alert("Limit reached", "You can select up to 10 hobbies.");
          return prev;
        }
        return [...prev, opt];
      });
    }, []);
  
    const toggleCategory = (cat: string) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpanded((prev) => ({ ...prev, [cat]: !prev[cat] }));
    };
  
    const handleNext = useCallback(async () => {
      if (selected.length < 4) {
        Alert.alert("Incomplete", "Please select at least 4 hobbies.");
        return;
      }
      if (selected.length > 10) {
        Alert.alert("Limit reached", "You can select up to 10 hobbies.");
        return;
      }
    
      try {
        setLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) throw new Error("Session not found");
    
        // 🧹 Normalize & deduplicate
        const normalizeLabel = (label: string) =>
          label
            .replace(
              /([\u2700-\u27BF]|[\uE000-\uF8FF]|[\uD83C-\uDBFF\uDC00-\uDFFF]|\u24C2|\uD83D[\uDC00-\uDE4F])/g,
              ""
            )
            .trim()
            .toLowerCase();
    
        const cleaned = Array.from(new Set(selected.map(normalizeLabel)));
    
        // 🧠 Step 1: Ensure hobbies_master entries exist
        const { error: upsertError } = await supabase
          .from("hobbies_master")
          .upsert(cleaned.map((label) => ({ label })), { onConflict: "label" });
        if (upsertError) throw upsertError;
    
        // 🧠 Step 2: Get IDs
        const { data: masters, error: selectError } = await supabase
          .from("hobbies_master")
          .select("id, label")
          .in("label", cleaned);
        if (selectError) throw selectError;
    
        const inserts = masters?.map((m) => ({
          user_id: session.user.id,
          hobby_id: m.id,
        })) ?? [];
    
        // 🧹 Step 3: Delete existing before inserting
        const { error: deleteError } = await supabase
          .from("user_hobbies")
          .delete()
          .eq("user_id", session.user.id);
        if (deleteError) throw deleteError;
    
        // 🧩 Step 4: Insert new hobbies cleanly
        const { error: insertError } = await supabase
          .from("user_hobbies")
          .insert(inserts);
        if (insertError) throw insertError;
    
        // 🧭 Step 5: Fetch all user modes safely
        const { data: modes, error: modeError } = await supabase
        .from("user_modes")
        .select("mode, updated_at")
        .eq("user_id", session.user.id)
        .order("updated_at", { ascending: false });

        if (modeError) throw modeError;

        // 🧠 Pick most recent mode (or default)
        const mode = modes?.[0]?.mode ?? "dating";

        // 🧭 Step 6: Route dynamically
        if (mode === "dating" || mode === "date") {
        router.push("/(onboarding)/(date)/value_signup");
        } else if (mode === "friend") {
        router.push("/(onboarding)/(friend)/value_friend_signup");
        } else {
        router.push("/in_progress");
        }

    
      } catch (e: any) {
        Alert.alert("Error", e.message);
      } finally {
        setLoading(false);
      }
    }, [selected]);
    
  
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <StatusBar barStyle="dark-content" />
        <Pressable style={[styles.backButton, { top: verticalScale(10) + insets.top }]} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={moderateScale(26)} color="#FFFFFF" />
        </Pressable>
  
        <View style={[styles.progressWrapper, { marginTop: verticalScale(44) + insets.top }]}>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: "22%" }]} />
          </View>
        </View>
  
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + verticalScale(110) }]}
        >
          <Text style={styles.title}>Pick the things you are into</Text>
  
          {Object.entries(HOBBY_GROUPS).map(([category, hobbies]) => {
            const isExpanded = expanded[category];
            const previewCount = 5;
            const visibleItems = isExpanded ? hobbies : hobbies.slice(0, previewCount);
  
            return (
              <View key={category} style={{ marginBottom: verticalScale(18) }}>
                <Pressable onPress={() => toggleCategory(category)} style={styles.categoryHeader}>
                  <Text style={styles.category}>{category}</Text>
                  <Ionicons
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={moderateScale(20)}
                    color={INK_SOFT}
                  />
                </Pressable>
  
                <Animated.View>
                  <View style={styles.wrapContainer}>
                    {visibleItems.map((h) => (
                      <HobbyChip
                        key={h}
                        label={h}
                        selected={selected.includes(h)}
                        onToggle={toggleOption}
                      />
                    ))}
                  </View>

                </Animated.View>
              </View>
            );
          })}
        </ScrollView>
  
        <Pressable
          onPress={handleNext}
          disabled={loading}
          style={[
            styles.nextButton,
            {
              bottom: insets.bottom + verticalScale(30),
              opacity: selected.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-forward" size={moderateScale(30)} color="#FFFFFF" />
        </Pressable>
      </SafeAreaView>
    );
  }
  
  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BG },
    backButton: {
      position: "absolute",
      left: scale(24),
      width: scale(56),
      height: verticalScale(56),
      borderRadius: scale(28),
      backgroundColor: INK,
      alignItems: "center",
      justifyContent: "center",
      zIndex: 10,
    },
    progressWrapper: { paddingHorizontal: scale(24) },
    progressTrack: {
      height: verticalScale(6),
      backgroundColor: "#C8CDD2",
      borderRadius: scale(3),
    },
    progressFill: {
      height: verticalScale(6),
      backgroundColor: BLUE,
      borderRadius: scale(3),
    },
    scrollContent: { paddingHorizontal: scale(24), paddingTop: verticalScale(28) },
    title: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(30),
      lineHeight: verticalScale(42),
      color: INK,
      marginBottom: verticalScale(18),
    },
    categoryHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: verticalScale(8),
    },
    category: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(18),
      color: "#1B2B44",
    },
    moreHint: {
      fontFamily: Fonts.primary,
      fontSize: moderateScale(13),
      color: "#63708A",
      marginTop: verticalScale(6),
    },
    wrapContainer: { flexDirection: "row", flexWrap: "wrap", gap: scale(10) },
    shadowWrapper: {
      shadowColor: "#1B44CD",
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 3 },
      borderRadius: scale(30),
    },
    chip: {
        paddingVertical: verticalScale(10),
        paddingHorizontal: scale(20),
        minWidth: scale(100),
        borderRadius: scale(30),
      alignItems: "center",
      justifyContent: "center",
    },
    chipSelected: { transform: [{ scale: 1.02 }] },
    chipText: {
      fontFamily: Fonts.bold,
      fontSize: moderateScale(16),
      color: "#1B2B44",
      textAlign: "center",
    },
    chipTextSelected: { color: "#FFFFFF" },
    nextButton: {
      position: "absolute",
      right: scale(24),
      width: scale(70),
      height: verticalScale(70),
      borderRadius: scale(35),
      backgroundColor: INK,
      alignItems: "center",
      justifyContent: "center",
      shadowColor: "#000",
      shadowOpacity: 0.25,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 5 },
    },
  });
