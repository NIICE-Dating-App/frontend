# UI Components Library

This collection contains all UI components extracted from the Profile Edit screen. Each component is self-contained and reusable.

## Installation

Place all these files in your `components` folder. You can import them individually or use the index file:

```tsx
// Import individually
import { SectionCard } from '@/components/SectionCard';

// Or import multiple from index
import { 
  SectionCard, 
  InfoRow, 
  TagChip, 
  GradientButton 
} from '@/components';
```

## Components Overview

### Layout Components

- **SectionCard** - Card container with header, icon, and optional action
- **FloatingHeader** - Fixed header with blur effect, back button, and save action
- **InfoRow** - Row for displaying label/value pairs with optional navigation

### Photo Components

- **MainPhotoSlot** - Circular main photo upload/display component
- **PhotoSlot** - Rectangular photo slot for additional photos
- **ImageSourceSheet** - Bottom sheet for selecting photo source (Library/Camera)
- **PhotoActionsSheet** - Bottom sheet with photo actions (Set as Main, Change, Remove)

### Display Components

- **TagChip** - Small badge/chip for displaying tags
- **PromptCard** - Card for displaying Q&A prompts with fade animation
- **LifestyleItem** - Grid item for lifestyle attributes with icon
- **EmptyState** - Placeholder for empty content areas

### Modal Components

- **HeightPickerModal** - Scrollable modal for height selection
- **ModalHandle** - Drag handle for modal sheets

### Button Components

- **GradientButton** - Button with gradient background
- **CircularIconButton** - Round icon button with optional gradient
- **AnimatedPressable** - Pressable wrapper with scale animation

### Animation Components

- **FadeInView** - View that fades in with configurable delay
- **AnimatedPressable** - Pressable with built-in scale animations

### Utilities

- **ProfileEditUtils** - Helper functions for text formatting and data manipulation
- **Theme** - Color constants, gradients, shadows, and animation configs

## Usage Examples

### SectionCard
```tsx
<SectionCard 
  title="My Section"
  icon={<Ionicons name="star" size={20} color="#1B44CD" />}
  action={() => navigation.push('edit')}
>
  <Text>Section content goes here</Text>
</SectionCard>
```

### InfoRow
```tsx
<InfoRow
  label="Height"
  value={height ? `${height} cm` : "Add height"}
  onPress={() => setModalVisible(true)}
  showArrow
/>
```

### TagChip
```tsx
<View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
  {tags.map((tag) => (
    <TagChip key={tag} label={tag} />
  ))}
</View>
```

### GradientButton
```tsx
<GradientButton
  text="Save Changes"
  onPress={handleSave}
  colors={["#1B44CD", "#2E54E8"]}
/>
```

### MainPhotoSlot
```tsx
<MainPhotoSlot
  slot={photoData}
  onPress={handlePhotoPress}
  onLongPress={handleLongPress}
  isUploading={isUploading}
/>
```

### HeightPickerModal
```tsx
<HeightPickerModal
  visible={modalVisible}
  onClose={() => setModalVisible(false)}
  onSave={(height) => handleHeightSave(height)}
  initialHeight={170}
/>
```

### FadeInView
```tsx
<FadeInView duration={400} delay={100}>
  <Text>This content will fade in</Text>
</FadeInView>
```

## Dependencies

These components require the following packages:
- `react-native`
- `expo-blur`
- `expo-linear-gradient`
- `expo-router`
- `@expo/vector-icons`
- `react-native-safe-area-context`

## Theme Customization

All colors and styles are centralized in the Theme.ts file. Modify the constants there to change the app's appearance:

```tsx
import { Colors, Gradients, Shadows } from '@/components/Theme';

// Use theme colors
backgroundColor: Colors.BLUE
// Use gradients
colors: Gradients.primary
// Apply shadows
...Shadows.medium
```

## Notes

- All components use responsive scaling via `scale()` and `verticalScale()` functions
- Components assume `Fonts` constants are available from `@/constants/theme`
- Most components include built-in animations for better UX
- Components are TypeScript-ready with proper type definitions



# TypeScript Fixes Applied to UI Components

## Issues Fixed:

### 1. LinearGradient `colors` Type Error
**Problem**: LinearGradient expects a readonly tuple type `[ColorValue, ColorValue, ...ColorValue[]]` but was receiving `string[]`.

**Solution**: 
- Changed all `string[]` type declarations to `readonly [string, string, ...string[]]` for gradient color props
- Added `as const` assertion to all inline gradient color arrays
- Updated Theme.ts to use tuple types with `as const` for all gradient definitions

**Files Updated**:
- CircularIconButton.tsx
- FloatingHeader.tsx
- GradientButton.tsx
- HeightPickerModal.tsx
- SectionCard.tsx
- MainPhotoSlot.tsx
- PhotoSlot.tsx
- PromptCard.tsx
- EmptyState.tsx
- Theme.ts

**Example Fix**:
```typescript
// Before:
colors={["#1B44CD", "#2E54E8"]}

// After:
colors={["#1B44CD", "#2E54E8"] as const}
```

### 2. File Casing Issue
**Problem**: Import statements had inconsistent casing (EmptyState vs Emptystate)

**Solution**: 
- Ensured all imports and filenames use consistent casing
- All component files use PascalCase naming (e.g., EmptyState.tsx)

### 3. Missing Slot Type Import
**Problem**: `SlotsState` interface referenced `Slot` type without importing it

**Solution**: 
- Added import statement for the Slot type before using it in the interface
```typescript
import type { Slot } from "./MainPhotoSlot";
export interface SlotsState {
  main: Slot;
  extra: [Slot, Slot, Slot];
}
```

## Usage Notes:

All components are now TypeScript compliant and should work without errors. When using the components:

1. **For Gradient Colors**: Always use tuple types or arrays with `as const` assertion
2. **For Imports**: Use the exact casing as the filename
3. **For Types**: Ensure all types are properly imported before use

## Component Import Example:
```typescript
import { 
  SectionCard, 
  InfoRow, 
  TagChip, 
  GradientButton,
  type Slot,
  type SlotsState 
} from '@/components';
```

All components are now ready for use in your React Native TypeScript project!