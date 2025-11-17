// UI Components Export Index
// Import all components from this single file

// Core UI Components
export { EmptyState } from "./emptystate";
export { FloatingHeader } from "./floatingheader";
export { InfoRow } from "./inforow";
export { LifestyleItem } from "./lifestyleitem";
export { PromptCard } from "./promptcard";
export type { PromptAnswer } from "./promptcard";
export { SectionCard } from "./sectioncard";
export { TagChip } from "./tagchip";

// Photo Components
export { MainPhotoSlot } from "./mainphotoslot_";
export type { Slot } from "./mainphotoslot_";
export { PhotoSlot } from "./photoslot";

// Modal Components
export { HeightPickerModal } from "./heightpickermodal";
export { ImageSourceSheet } from "./imagesourcesheet";
export { ModalHandle } from "./modalhandle";
export { PhotoActionsSheet } from "./photoactionssheet";

// Button Components
export { CircularIconButton } from "./circulariconbutton";
export { GradientButton } from "./gradientbutton";

// Animation Components
export { AnimatedPressable } from "./animatedpressable";
export { FadeInView } from "./fadeinview";

// Theme and Utilities
export * from "./profileeditutils";
export * from "./theme";

// Re-export commonly used types
import type { Slot } from "./mainphotoslot_";
export interface SlotsState {
  main: Slot;
  extra: [Slot, Slot, Slot];
}