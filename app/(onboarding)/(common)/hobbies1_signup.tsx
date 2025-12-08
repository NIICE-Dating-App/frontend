import { Fonts } from "@/constants/theme";
import { supabase } from "@/lib/supabase";
import { scale, verticalScale } from "@/utils/responsive";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useCallback, useRef, useState } from "react";
import {
  Alert,
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const Colors = {
  BG: "#F5F7FA",
  BLUE: "#1B44CD",
  INK: "#0A0E1A",
};

// Enable layout animation on Android
if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const MAX_HOBBIES = 10;
const MIN_HOBBIES = 4;

// ===========================
// HOBBY GROUPS WITH ICONS
// ===========================
// ===========================
// HOBBY GROUPS WITH ICONS (DUPLICATES REMOVED)
// ===========================
const HOBBY_GROUPS: Record<string, Array<{ label: string; icon: string }>> = {
  "Sports and Fitness": [
    { label: "Archery", icon: "fitness" },
    { label: "Athletics", icon: "walk" },
    { label: "Badminton", icon: "tennisball" },
    { label: "Baseball", icon: "baseball" },
    { label: "Basketball", icon: "basketball" },
    { label: "Beach sports", icon: "sunny" },
    { label: "Bodybuilding", icon: "barbell" },
    { label: "Bouldering", icon: "trail-sign" },
    { label: "Bowling", icon: "ellipse" },
    { label: "Boxing", icon: "hand-left" },
    { label: "Car Racing", icon: "car-sport" },
    { label: "Cardio", icon: "heart" },
    { label: "Cheerleading", icon: "megaphone" },
    { label: "Climbing", icon: "trending-up" },
    { label: "Crew", icon: "boat" },
    { label: "Cricket", icon: "baseball" },
    { label: "Crossfit", icon: "barbell" },
    { label: "Cycling", icon: "bicycle" },
    { label: "Equestrian", icon: "flower" },
    { label: "Fitness classes", icon: "people" },
    { label: "Football", icon: "football" },
    { label: "Functional fitness", icon: "fitness" },
    { label: "Go karting", icon: "car-sport" },
    { label: "Golf", icon: "golf" },
    { label: "Gym", icon: "barbell" },
    { label: "Gymnastics", icon: "body" },
    { label: "Handball", icon: "hand-right" },
    { label: "HIIT", icon: "flame" },
    { label: "Hockey", icon: "baseball" },
    { label: "Horse riding", icon: "flower" },
    { label: "Ice Hockey", icon: "snow" },
    { label: "Jogging", icon: "walk" },
    { label: "Kayaking", icon: "boat" },
    { label: "Lacrosse", icon: "baseball" },
    { label: "Marathon", icon: "footsteps" },
    { label: "Martial Arts", icon: "hand-left" },
    { label: "Motorbiking", icon: "bicycle" },
    { label: "Motorsports", icon: "car-sport" },
    { label: "Netball", icon: "basketball" },
    { label: "Padel", icon: "tennisball" },
    { label: "Pickleball", icon: "tennisball" },
    { label: "Pilates", icon: "body" },
    { label: "Ping pong", icon: "tennisball" },
    { label: "Pole Dancing", icon: "body" },
    { label: "Roller skating", icon: "footsteps" },
    { label: "Rugby", icon: "football" },
    { label: "Run clubs", icon: "people" },
    { label: "Running", icon: "walk" },
    { label: "Scuba diving", icon: "water" },
    { label: "Skateboarding", icon: "footsteps" },
    { label: "Skating", icon: "footsteps" },
    { label: "Soccer", icon: "football" },
    { label: "Softball", icon: "baseball" },
    { label: "Sports", icon: "fitness" },
    { label: "Sports Shooting", icon: "radio-button-on" },
    { label: "Squash", icon: "tennisball" },
    { label: "Swimming", icon: "water" },
    { label: "Table Tennis", icon: "tennisball" },
    { label: "Tennis", icon: "tennisball" },
    { label: "Track", icon: "footsteps" },
    { label: "Volleyball", icon: "basketball" },
    { label: "Walking", icon: "walk" },
    { label: "Weightlifting", icon: "barbell" },
    { label: "Working out", icon: "fitness" },
    { label: "Wrestling", icon: "body" },
    { label: "Yoga", icon: "body" },
  ],
  Creativity: [
    { label: "Acapella", icon: "musical-notes" },
    { label: "Art", icon: "color-palette" },
    { label: "Blogging", icon: "create" },
    { label: "Choir", icon: "people" },
    { label: "Content Creation", icon: "videocam" },
    { label: "Cosplay", icon: "shirt" },
    { label: "Crafts", icon: "construct" },
    { label: "Crocheting", icon: "cut" },
    { label: "Dancing", icon: "musical-note" },
    { label: "Design", icon: "color-palette" },
    { label: "DIY", icon: "hammer" },
    { label: "Drawing", icon: "create" },
    { label: "Entrepreneurship", icon: "briefcase" },
    { label: "Exchange Program", icon: "globe" },
    { label: "Fashion", icon: "shirt" },
    { label: "Freelancing", icon: "laptop" },
    { label: "Investing", icon: "trending-up" },
    { label: "Language Exchange", icon: "chatbubbles" },
    { label: "Literature", icon: "book" },
    { label: "Make-up", icon: "color-wand" },
    { label: "Making videos", icon: "videocam" },
    { label: "Memes", icon: "happy" },
    { label: "Musical Instrument", icon: "musical-notes" },
    { label: "Musical Writing", icon: "create" },
    { label: "Nail art", icon: "color-palette" },
    { label: "NFTs", icon: "cube" },
    { label: "Painting", icon: "brush" },
    { label: "Photography", icon: "camera" },
    { label: "Poetry", icon: "book" },
    { label: "Pottery", icon: "cafe" },
    { label: "Real Estate", icon: "home" },
    { label: "Singing", icon: "mic" },
    { label: "Sneakers", icon: "footsteps" },
    { label: "Tattoos", icon: "color-fill" },
    { label: "Upcycling", icon: "refresh" },
    { label: "Vintage fashion", icon: "shirt" },
    { label: "Writing", icon: "create" },
  ],
  "Film and TV": [
    { label: "Action & adventure", icon: "film" },
    { label: "Action movies", icon: "film" },
    { label: "Animated movies", icon: "color-palette" },
    { label: "Anime", icon: "film" },
    { label: "Bollywood", icon: "film" },
    { label: "Comedy", icon: "happy" },
    { label: "Cooking shows", icon: "restaurant" },
    { label: "Crime", icon: "finger-print" },
    { label: "Crime shows", icon: "finger-print" },
    { label: "Documentaries", icon: "film" },
    { label: "Drama", icon: "film" },
    { label: "Fantasy", icon: "planet" },
    { label: "Fantasy movies", icon: "planet" },
    { label: "Game shows", icon: "game-controller" },
    { label: "Horror Movies", icon: "skull" },
    { label: "Indie", icon: "film" },
    { label: "Indie films", icon: "film" },
    { label: "K-drama", icon: "film" },
    { label: "Movies", icon: "film" },
    { label: "Mystery", icon: "eye" },
    { label: "Reality TV", icon: "tv" },
    { label: "Rom-coms", icon: "heart" },
    { label: "Romance", icon: "heart" },
    { label: "Sci-Fi", icon: "rocket" },
    { label: "Sports shows", icon: "football" },
    { label: "Superhero", icon: "shield" },
    { label: "Thriller films", icon: "eye" },
    { label: "True crime", icon: "finger-print" },
  ],
  Reading: [
    { label: "Action & adventure", icon: "book" },
    { label: "Biographies", icon: "person" },
    { label: "Classics", icon: "book" },
    { label: "Comedy", icon: "happy" },
    { label: "Comic books", icon: "book" },
    { label: "Crime", icon: "finger-print" },
    { label: "Fantasy", icon: "planet" },
    { label: "History", icon: "time" },
    { label: "Horror", icon: "skull" },
    { label: "Manga", icon: "book" },
    { label: "Mystery", icon: "eye" },
    { label: "Philosophy", icon: "bulb" },
    { label: "Poetry", icon: "create" },
    { label: "Psychology", icon: "analytics" },
    { label: "Romance", icon: "heart" },
    { label: "Sci-fi", icon: "rocket" },
    { label: "Science", icon: "flask" },
    { label: "Thriller", icon: "eye" },
  ],
  "Social and Content": [
    { label: "Instagram", icon: "camera" },
    { label: "Memes", icon: "happy" },
    { label: "Metaverse", icon: "planet" },
    { label: "Netflix", icon: "tv" },
    { label: "Pinterest", icon: "images" },
    { label: "Podcasts", icon: "mic" },
    { label: "Social Media", icon: "people" },
    { label: "SoundCloud", icon: "musical-notes" },
    { label: "Spotify", icon: "musical-note" },
    { label: "TikTok", icon: "videocam" },
    { label: "Twitch", icon: "game-controller" },
    { label: "Virtual Reality", icon: "glasses" },
    { label: "Vlogging", icon: "videocam" },
    { label: "X", icon: "logo-twitter" },
    { label: "YouTube", icon: "logo-youtube" },
  ],
  "Staying In": [
    { label: "AI", icon: "hardware-chip" },
    { label: "Baking", icon: "cafe" },
    { label: "Binge-Watching TV shows", icon: "tv" },
    { label: "Board games", icon: "grid" },
    { label: "Chess", icon: "grid" },
    { label: "Cooking", icon: "restaurant" },
    { label: "Gardening", icon: "leaf" },
    { label: "Home Workout", icon: "fitness" },
    { label: "House plants", icon: "leaf" },
    { label: "Online Games", icon: "game-controller" },
    { label: "Online Shopping", icon: "cart" },
    { label: "Programming", icon: "code" },
    { label: "Reading", icon: "book" },
    { label: "Video games", icon: "game-controller" },
  ],
  Traveling: [
    { label: "Beaches", icon: "sunny" },
    { label: "Exploring new cities", icon: "map" },
    { label: "Fishing trips", icon: "water" },
    { label: "Solo trips", icon: "person" },
    { label: "Spa weekends", icon: "sparkles" },
    { label: "Staycations", icon: "home" },
  ],
  Pets: [
    { label: "Amphibian", icon: "water" },
    { label: "Birds", icon: "egg" },
    { label: "Cats", icon: "paw" },
    { label: "Dogs", icon: "paw" },
    { label: "Fish", icon: "fish" },
    { label: "Hamster", icon: "ellipse" },
    { label: "Lizards", icon: "bug" },
    { label: "Other", icon: "paw" },
    { label: "Pet-free", icon: "close-circle" },
    { label: "Reptile", icon: "bug" },
    { label: "Snakes", icon: "bug" },
    { label: "Turtles", icon: "water" },
    { label: "Don't have but love", icon: "heart-outline" },
    { label: "Want a pet", icon: "heart" },
    { label: "All the pets", icon: "paw" },
    { label: "Allergic to pets", icon: "warning" },
  ],
  "Fan Favorites": [
    { label: "90s Kid", icon: "musical-notes" },
    { label: "Comic-con", icon: "book" },
    { label: "Disney", icon: "planet" },
    { label: "Dungeons & Dragons", icon: "dice" },
    { label: "Harry Potter", icon: "flash" },
    { label: "MLB", icon: "baseball" },
    { label: "Marvel", icon: "shield" },
    { label: "NBA", icon: "basketball" },
  ],
  "Food and Drink": [
    { label: "Açaí", icon: "nutrition" },
    { label: "BBQ", icon: "flame" },
    { label: "Beer", icon: "beer" },
    { label: "Biryani", icon: "restaurant" },
    { label: "Boba tea", icon: "cafe" },
    { label: "Brunch", icon: "sunny" },
    { label: "Burgers", icon: "fast-food" },
    { label: "Cake", icon: "cafe" },
    { label: "Cocktails", icon: "wine" },
    { label: "Coffee", icon: "cafe" },
    { label: "Craft Beer", icon: "beer" },
    { label: "Food tours", icon: "restaurant" },
    { label: "Foodie", icon: "restaurant" },
    { label: "Gin", icon: "wine" },
    { label: "Ice Cream", icon: "ice-cream" },
    { label: "Kimchi", icon: "restaurant" },
    { label: "Korean Food", icon: "restaurant" },
    { label: "Mocktails", icon: "wine" },
    { label: "Pho", icon: "restaurant" },
    { label: "Pizza", icon: "pizza" },
    { label: "Plant-based", icon: "leaf" },
    { label: "Ramen", icon: "restaurant" },
    { label: "Smoothies", icon: "nutrition" },
    { label: "Street Food", icon: "fast-food" },
    { label: "Sushi", icon: "fish" },
    { label: "Sweet tooth", icon: "ice-cream" },
    { label: "Sweet treats", icon: "ice-cream" },
    { label: "Tacos", icon: "fast-food" },
    { label: "Takeout", icon: "bag" },
    { label: "Tea", icon: "cafe" },
    { label: "Vegan", icon: "leaf" },
    { label: "Vegetarian", icon: "leaf" },
    { label: "Whisky", icon: "wine" },
    { label: "Wine", icon: "wine" },
  ],
  Gaming: [
    { label: "Among Us", icon: "people" },
    { label: "Atari", icon: "game-controller" },
    { label: "E-Sports", icon: "trophy" },
    { label: "Fortnite", icon: "game-controller" },
    { label: "League of Legends", icon: "game-controller" },
    { label: "Nintendo", icon: "game-controller" },
    { label: "PlayStation", icon: "game-controller" },
    { label: "Roblox", icon: "cube" },
    { label: "Xbox", icon: "game-controller" },
  ],
  "Going Out": [
    { label: "Aquarium", icon: "fish" },
    { label: "Art galleries", icon: "color-palette" },
    { label: "Bar Hopping", icon: "beer" },
    { label: "Bars", icon: "beer" },
    { label: "Bowling", icon: "ellipse" },
    { label: "Cafe hopping", icon: "cafe" },
    { label: "Cars", icon: "car" },
    { label: "Clubbing", icon: "musical-notes" },
    { label: "Clubs", icon: "musical-note" },
    { label: "Concerts", icon: "musical-notes" },
    { label: "Drag shows", icon: "star" },
    { label: "Drive-in Cinema", icon: "car" },
    { label: "Escape Rooms", icon: "lock-closed" },
    { label: "Exhibition", icon: "images" },
    { label: "Festivals", icon: "musical-notes" },
    { label: "Film Festival", icon: "film" },
    { label: "Happy hour", icon: "time" },
    { label: "House Parties", icon: "home" },
    { label: "Improv", icon: "mic" },
    { label: "Karaoke", icon: "mic" },
    { label: "LGBTQ+ nightlife", icon: "heart" },
    { label: "Live Music", icon: "musical-notes" },
    { label: "Motorcycles", icon: "bicycle" },
    { label: "Museums", icon: "business" },
    { label: "Museums & galleries", icon: "images" },
    { label: "Musical theater", icon: "musical-notes" },
    { label: "Nightlife", icon: "moon" },
    { label: "Parties", icon: "balloon" },
    { label: "Pub Quiz", icon: "help-circle" },
    { label: "Pubs", icon: "beer" },
    { label: "Raves", icon: "musical-notes" },
    { label: "Rollerskating", icon: "footsteps" },
    { label: "Salsa dancing", icon: "musical-note" },
    { label: "Shisha", icon: "cloud" },
    { label: "Shopping", icon: "cart" },
    { label: "Stand up Comedy", icon: "mic" },
    { label: "Theater", icon: "film" },
    { label: "Thrifting", icon: "cart" },
    { label: "Town Festivities", icon: "balloon" },
    { label: "Trivia", icon: "help-circle" },
    { label: "Wine tasting", icon: "wine" },
  ],
  Music: [
    { label: "90s Britpop", icon: "musical-notes" },
    { label: "Afro", icon: "musical-note" },
    { label: "Alternative music", icon: "musical-notes" },
    { label: "Arab", icon: "musical-note" },
    { label: "Blues", icon: "musical-notes" },
    { label: "Classical", icon: "musical-notes" },
    { label: "Country", icon: "musical-note" },
    { label: "Desi", icon: "musical-notes" },
    { label: "EDM", icon: "radio" },
    { label: "Electronic Music", icon: "radio" },
    { label: "Folk & acoustic", icon: "musical-notes" },
    { label: "Funk", icon: "musical-note" },
    { label: "Gospel music", icon: "musical-notes" },
    { label: "Gothic", icon: "moon" },
    { label: "Heavy Metal", icon: "musical-notes" },
    { label: "Hip Hop", icon: "musical-note" },
    { label: "House", icon: "radio" },
    { label: "Indie", icon: "musical-notes" },
    { label: "J-Pop", icon: "musical-note" },
    { label: "Jazz", icon: "musical-notes" },
    { label: "K-Pop", icon: "musical-note" },
    { label: "Latin", icon: "musical-notes" },
    { label: "Metal", icon: "musical-note" },
    { label: "Opera", icon: "musical-notes" },
    { label: "Pop", icon: "musical-note" },
    { label: "Punk rock", icon: "musical-notes" },
    { label: "R&B", icon: "musical-note" },
    { label: "Rap", icon: "mic" },
    { label: "Reggae", icon: "musical-notes" },
    { label: "Reggaeton", icon: "musical-note" },
    { label: "Rock", icon: "musical-notes" },
    { label: "Soul", icon: "heart" },
    { label: "Techno", icon: "radio" },
    { label: "Trap Music", icon: "musical-note" },
  ],
  "Outdoors and Adventure": [
    { label: "Backpacking", icon: "bag" },
    { label: "Beach Bars", icon: "sunny" },
    { label: "Camping", icon: "bonfire" },
    { label: "Canoeing", icon: "boat" },
    { label: "Couchsurfing", icon: "home" },
    { label: "Diving", icon: "water" },
    { label: "Fishing", icon: "fish" },
    { label: "Free Diving", icon: "water" },
    { label: "Hiking", icon: "trail-sign" },
    { label: "Hot Springs", icon: "water" },
    { label: "Jetskiing", icon: "water" },
    { label: "Mountains", icon: "triangle" },
    { label: "Nature", icon: "leaf" },
    { label: "Outdoors", icon: "planet" },
    { label: "Paddle Boarding", icon: "water" },
    { label: "Paragliding", icon: "airplane" },
    { label: "Picnicking", icon: "sunny" },
    { label: "Road Trips", icon: "car" },
    { label: "Rock Climbing", icon: "trending-up" },
    { label: "Rowing", icon: "boat" },
    { label: "Sailing", icon: "boat" },
    { label: "Skiing", icon: "snow" },
    { label: "Snowboarding", icon: "snow" },
    { label: "Surfing", icon: "water" },
    { label: "Travel", icon: "airplane" },
    { label: "Walking My Dog", icon: "paw" },
    { label: "Walking tours", icon: "walk" },
  ],
  "Values and Causes": [
    { label: "Activism", icon: "megaphone" },
    { label: "Black Lives Matter", icon: "people" },
    { label: "Climate Change", icon: "earth" },
    { label: "Disability Rights", icon: "accessibility" },
    { label: "Environmentalism", icon: "leaf" },
    { label: "Equality", icon: "people" },
    { label: "Feminism", icon: "female" },
    { label: "Human Rights", icon: "people" },
    { label: "Inclusivity", icon: "people" },
    { label: "LGBTQIA+ Rights", icon: "heart" },
    { label: "Mental Health Awareness", icon: "pulse" },
    { label: "Politics", icon: "business" },
    { label: "Pride", icon: "heart" },
    { label: "Social Development", icon: "trending-up" },
    { label: "Volunteering", icon: "hand-right" },
    { label: "Voter Rights", icon: "checkbox" },
    { label: "World Peace", icon: "earth" },
    { label: "Youth Empowerment", icon: "people" },
  ],
  "Wellness and Lifestyle": [
    { label: "Active Lifestyle", icon: "walk" },
    { label: "Makeup", icon: "color-wand" },
    { label: "Sauna", icon: "water" },
    { label: "Self Care", icon: "heart" },
    { label: "Self Development", icon: "trending-up" },
    { label: "Self Love", icon: "heart" },
    { label: "Spa", icon: "sparkles" },
    { label: "Tarot", icon: "star" },
    { label: "Trying New Things", icon: "bulb" },
    { label: "Yoga", icon: "body" },
  ],
  "Self-Care": [
    { label: "Aromatherapy", icon: "flower" },
    { label: "Astrology", icon: "planet" },
    { label: "Cold plunging", icon: "snow" },
    { label: "Crystals", icon: "diamond" },
    { label: "Deep chats", icon: "chatbubbles" },
    { label: "Journaling", icon: "create" },
    { label: "Meditation", icon: "leaf" },
    { label: "Mindfulness", icon: "sparkles" },
    { label: "Nutrition", icon: "nutrition" },
    { label: "Retreats", icon: "home" },
    { label: "Skin care", icon: "water" },
    { label: "Sleeping well", icon: "moon" },
    { label: "Slow living", icon: "leaf" },
    { label: "Therapy", icon: "chatbubbles" },
    { label: "Time offline", icon: "power" },
  ],
  "Personality and Traits": [
    { label: "Self-awareness", icon: "eye" },
    { label: "Ambition", icon: "trending-up" },
    { label: "Being active", icon: "walk" },
    { label: "Being family-oriented", icon: "people" },
    { label: "Being open-minded", icon: "bulb" },
    { label: "Being romantic", icon: "heart" },
    { label: "Confidence", icon: "trophy" },
    { label: "Creativity", icon: "color-palette" },
    { label: "Empathy", icon: "heart" },
    { label: "Intelligence", icon: "bulb" },
    { label: "Positivity", icon: "sunny" },
    { label: "Sense of adventure", icon: "compass" },
    { label: "Sense of humor", icon: "happy" },
    { label: "Social awareness", icon: "people" },
  ],
};

// ===========================
// CHIP COMPONENT
// ===========================
const HobbyChip = React.memo(
  ({ 
    label, 
    icon, 
    selected, 
    onToggle 
  }: { 
    label: string; 
    icon: string; 
    selected: boolean; 
    onToggle: (l: string) => void;
  }) => {
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
        <Animated.View style={{ transform: [{ scale: anim }] }}>
          <LinearGradient
            colors={selected ? (["#1B44CD", "#3C6FFF"] as const) : (["#FFFFFF", "#F8FAFF"] as const)}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.chip, selected && styles.chipSelected]}
          >
            <Ionicons
              name={icon as any}
              size={16}
              color={selected ? "#FFFFFF" : Colors.BLUE}
              style={styles.chipIcon}
            />
            <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
          </LinearGradient>
        </Animated.View>
      </Pressable>
    );
  }
);

// ===========================
// MAIN COMPONENT
// ===========================
export default function Hobbies1Signup() {
  const [selected, setSelected] = useState<string[]>([]);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const expandAnims = useRef<Record<string, Animated.Value>>({});

  const ensureExpandAnim = (key: string) => {
    if (!expandAnims.current[key]) expandAnims.current[key] = new Animated.Value(0);
    return expandAnims.current[key];
  };

  const toggleOption = useCallback((opt: string) => {
    setSelected((prev) => {
      const has = prev.includes(opt);
      if (has) return prev.filter((x) => x !== opt);
      if (prev.length >= MAX_HOBBIES) {
        Alert.alert("Limit reached", `You can select up to ${MAX_HOBBIES} hobbies.`);
        return prev;
      }
      return [...prev, opt];
    });
  }, []);

  const toggleCategory = (cat: string) => {
    const anim = ensureExpandAnim(cat);
    const isExpanding = !expanded[cat];

    if (isExpanding) {
      setExpanded((prev) => ({ ...prev, [cat]: true }));
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
        setExpanded((prev) => ({ ...prev, [cat]: false }));
      });
    }
  };

  const handleNext = useCallback(async () => {
  if (selected.length < MIN_HOBBIES) {
    Alert.alert("Incomplete", `Please select at least ${MIN_HOBBIES} hobbies.`);
    return;
  }
  if (selected.length > MAX_HOBBIES) {
    Alert.alert("Limit reached", `You can select up to ${MAX_HOBBIES} hobbies.`);
    return;
  }

  try {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) throw new Error("Session not found");

    // Helper to strip emojis from start of string
    const stripEmoji = (s: string) => s.replace(/^[^\w\s]+\s*/, '').trim();
    
    // Normalize: strip emoji, lowercase, trim spaces
    const normalize = (s: string) => stripEmoji(s).replace(/\s+/g, " ").trim().toLowerCase();
    
    const cleaned = Array.from(new Set(selected.map(normalize)));

    // Fetch the master IDs
    const { data: masters, error: selectError } = await supabase
      .from("hobbies_master")
      .select("id,label");
    if (selectError) throw selectError;

    // Build a label->id map (strip emojis from DB labels too)
    const map: Record<string, number> = {};
    (masters ?? []).forEach((m) => {
      const key = normalize(m.label); // NOW stripping emojis from DB labels
      if (!(key in map)) map[key] = m.id;
    });

    // Find which cleaned labels exist
    const found = cleaned
      .map((c) => ({ c, id: map[c] }))
      .filter((x) => !!x.id) as { c: string; id: number }[];
    const missing = cleaned.filter((c) => !map[c]);

    if (missing.length > 0) {
      console.warn("Missing hobbies:", missing);
      Alert.alert(
        "Some hobbies aren't available",
        `These were skipped:\n\n${missing.join(", ")}\n\nThe rest were saved successfully.`
      );
    }

    if (found.length === 0) {
      throw new Error("No valid hobbies found to save.");
    }

    // Clear old entries
    const { error: delErr } = await supabase
      .from("user_hobbies")
      .delete()
      .eq("user_id", session.user.id);
    if (delErr) throw delErr;

    // Insert new ones
    const rows = found.map((f) => ({ user_id: session.user.id, hobby_id: f.id }));
    const { error: insErr } = await supabase.from("user_hobbies").insert(rows);
    if (insErr) throw insErr;

    router.push("/(onboarding)/(common)/lifestyle2_signup");
  } catch (e: any) {
    Alert.alert("Error", e.message ?? "Something went wrong");
  } finally {
    setLoading(false);
  }
}, [selected]);
  // ===========================
  // RENDER
  // ===========================
  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button */}
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <View style={styles.backButtonCircle}>
          <Ionicons name="arrow-back" size={24} color={Colors.INK} />
        </View>
      </TouchableOpacity>

      {/* Progress Bar */}
      <View style={styles.progressWrapper}>
        <View style={styles.progressTrack}>
          <View style={styles.progressFill} />
        </View>
      </View>

      {/* Content */}
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.title}>Pick the things you are into</Text>
        <Text style={styles.subtitle}>
          Select {MIN_HOBBIES}-{MAX_HOBBIES} hobbies that best represent your interests.
        </Text>

        {/* Selection Counter */}
        <View style={styles.counterContainer}>
          <View style={styles.counterBadge}>
            <Text style={styles.counterText}>
              {selected.length} / {MAX_HOBBIES}
            </Text>
          </View>
          <Text style={styles.counterLabel}>selected</Text>
        </View>

        {Object.entries(HOBBY_GROUPS).map(([category, hobbies]) => {
          const isExpanded = expanded[category];
          const visibleItems = isExpanded ? hobbies : hobbies.slice(0, 5);
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
            <View key={category} style={styles.categorySection}>
              <Pressable onPress={() => toggleCategory(category)} style={styles.categoryHeader}>
                <Text style={styles.categoryTitle}>{category}</Text>
                <Ionicons
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={Colors.INK}
                />
              </Pressable>

              {expanded[category] && (
                <Animated.View style={[styles.wrapContainer, { maxHeight, opacity }]}>
                  {visibleItems.map((h) => (
                    <HobbyChip 
                      key={h.label} 
                      label={h.label} 
                      icon={h.icon}
                      selected={selected.includes(h.label)} 
                      onToggle={toggleOption} 
                    />
                  ))}
                </Animated.View>
              )}

              {!expanded[category] && (
                <View style={styles.wrapContainer}>
                  {visibleItems.map((h) => (
                    <HobbyChip 
                      key={h.label} 
                      label={h.label} 
                      icon={h.icon}
                      selected={selected.includes(h.label)} 
                      onToggle={toggleOption} 
                    />
                  ))}
                </View>
              )}
            </View>
          );
        })}

        {/* Info Note */}
        <View style={styles.infoNote}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color="rgba(10,14,26,0.5)"
            style={{ marginRight: scale(8) }}
          />
          <Text style={styles.infoNoteText}>
            Choose hobbies that truly represent you — this helps us find better matches!
          </Text>
        </View>

        <View style={{ height: verticalScale(40) }} />
      </ScrollView>

      {/* Next Button */}
      <TouchableOpacity
        onPress={handleNext}
        disabled={loading || selected.length === 0}
        style={[styles.nextButton, selected.length === 0 && { opacity: 0.5 }]}
        activeOpacity={0.8}
      >
        <Ionicons name="arrow-forward" size={28} color="#FFFFFF" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

// ===========================
// STYLES
// ===========================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.BG,
  },

  backButton: {
    position: "absolute",
    top: verticalScale(16),
    left: scale(20),
    zIndex: 10,
    paddingTop: verticalScale(60),
  },
  backButtonCircle: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  progressWrapper: {
    marginTop: verticalScale(80),
    paddingHorizontal: scale(20),
  },
  progressTrack: {
    height: verticalScale(8),
    backgroundColor: "rgba(27,68,205,0.15)",
    borderRadius: scale(4),
    overflow: "hidden",
  },
  progressFill: {
    height: verticalScale(8),
    width: "52.92%", // EXACT SAME PERCENTAGE - DO NOT CHANGE
    backgroundColor: Colors.BLUE,
    borderRadius: scale(4),
  },

  scrollContent: {
    paddingHorizontal: scale(20),
    paddingTop: verticalScale(24),
    paddingBottom: verticalScale(120),
  },

  title: {
    fontFamily: Fonts.bold,
    fontSize: scale(24),
    lineHeight: verticalScale(32),
    color: Colors.INK,
    marginBottom: verticalScale(6),
    paddingTop: verticalScale(4),
  },
  subtitle: {
    fontFamily: Fonts.primary,
    fontSize: scale(15),
    color: "rgba(10,14,26,0.6)",
    marginBottom: verticalScale(16),
    lineHeight: verticalScale(22),
  },

  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: verticalScale(20),
    gap: scale(8),
  },
  counterBadge: {
    backgroundColor: Colors.BLUE,
    paddingVertical: verticalScale(6),
    paddingHorizontal: scale(12),
    borderRadius: scale(20),
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  counterText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
    color: "#FFFFFF",
  },
  counterLabel: {
    fontFamily: Fonts.primary,
    fontSize: scale(14),
    color: "rgba(10,14,26,0.6)",
  },

  categorySection: {
    marginBottom: verticalScale(20),
  },
  categoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: verticalScale(12),
  },
  categoryTitle: {
    fontFamily: Fonts.bold,
    fontSize: scale(18),
    color: Colors.INK,
  },

  wrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: scale(8),
    overflow: "hidden",
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: verticalScale(10),
    paddingHorizontal: scale(14),
    borderRadius: scale(24),
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  chipSelected: {
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  chipIcon: {
    marginRight: scale(6),
  },
  chipText: {
    fontFamily: Fonts.bold,
    fontSize: scale(14),
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
    paddingTop: verticalScale(0.5),
  },

  nextButton: {
    position: "absolute",
    bottom: verticalScale(40),
    right: scale(20),
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: Colors.BLUE,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: Colors.BLUE,
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
});