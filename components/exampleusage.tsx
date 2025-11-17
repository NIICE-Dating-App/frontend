// Example usage of the fixed components
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';

// Import all components from the index file
import {
    CircularIconButton,
    FadeInView,
    FloatingHeader,
    GradientButton,
    HeightPickerModal,
    InfoRow,
    MainPhotoSlot,
    PromptCard,
    SectionCard,
    TagChip,
    type PromptAnswer,
    type SlotsState
} from './index';

export const ExampleUsage: React.FC = () => {
  const [heightModalVisible, setHeightModalVisible] = useState(false);
  const [height, setHeight] = useState<number | null>(170);
  
  // Example slots state with proper typing
  const [slots, setSlots] = useState<SlotsState>({
    main: {},
    extra: [{}, {}, {}],
  });

  // Example prompt data
  const prompts: PromptAnswer[] = [
    { title: "My biggest passion", answer: "Traveling and exploring new cultures" },
    { title: "Perfect weekend", answer: "Hiking in the mountains with friends" },
  ];

  const tags = ["Adventurous", "Creative", "Foodie", "Music Lover"];

  return (
    <View style={{ flex: 1 }}>
      <FloatingHeader
        title="Edit Profile"
        fullName="John Doe"
        onSave={() => console.log('Save')}
        onBack={() => console.log('Back')}
      />
      
      <ScrollView>
        {/* Section with proper gradient colors */}
        <SectionCard
          title="About Me"
          icon={<Ionicons name="person" size={20} color="#1B44CD" />}
          action={() => console.log('Edit section')}
        >
          <InfoRow
            label="Height"
            value={height ? `${height} cm` : "Add height"}
            onPress={() => setHeightModalVisible(true)}
            showArrow
          />
        </SectionCard>

        {/* Tags with proper styling */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 20 }}>
          {tags.map((tag) => (
            <TagChip key={tag} label={tag} />
          ))}
        </View>

        {/* Prompts with fade animation */}
        <View style={{ padding: 20 }}>
          {prompts.map((prompt, index) => (
            <FadeInView key={index} delay={index * 100}>
              <PromptCard prompt={prompt} index={index} />
            </FadeInView>
          ))}
        </View>

        {/* Buttons with proper gradient colors */}
        <View style={{ padding: 20, gap: 12 }}>
          <GradientButton
            text="Save Changes"
            onPress={() => console.log('Save')}
            // Now properly typed as tuple
            colors={["#1B44CD", "#2E54E8"] as const}
          />
          
          <CircularIconButton
            icon={<Ionicons name="camera" size={20} color="#FFF" />}
            onPress={() => console.log('Camera')}
            useGradient
            // Now properly typed as tuple
            gradientColors={["#1B44CD", "#2E54E8"] as const}
          />
        </View>

        {/* Photo slots */}
        <View style={{ padding: 20 }}>
          <MainPhotoSlot
            slot={slots.main}
            onPress={() => console.log('Main photo')}
            onLongPress={() => console.log('Main photo long press')}
          />
        </View>
      </ScrollView>

      {/* Modal with proper gradient colors */}
      <HeightPickerModal
        visible={heightModalVisible}
        onClose={() => setHeightModalVisible(false)}
        onSave={(h) => {
          setHeight(h);
          setHeightModalVisible(false);
        }}
        initialHeight={height}
      />
    </View>
  );
};