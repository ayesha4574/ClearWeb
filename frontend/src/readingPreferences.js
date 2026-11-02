/**
 * readingPreferences.js
 * Default settings and configuration constants for Stage 5 Reading Customization.
 */

export const DEFAULT_PREFERENCES = {
  theme: 'light', // 'light' | 'sepia' | 'dark' | 'high-contrast'
  fontSize: 'medium', // 'small' | 'medium' | 'large' | 'xlarge'
  lineHeight: 'relaxed', // 'normal' | 'relaxed' | 'loose'
  fontFamily: 'sans', // 'sans' | 'serif' | 'mono' | 'dyslexic'
  contentWidth: 'medium', // 'narrow' | 'medium' | 'wide'
  bionicReading: false, // boolean
}

export const THEME_OPTIONS = [
  { id: 'light', label: 'Light', preview: 'bg-white text-slate-900 border-slate-300' },
  { id: 'sepia', label: 'Sepia', preview: 'bg-[#fbf6ea] text-stone-900 border-[#e7dbca]' },
  { id: 'dark', label: 'Dark', preview: 'bg-[#111827] text-gray-100 border-gray-700' },
  { id: 'high-contrast', label: 'High Contrast', preview: 'bg-black text-[#ffff00] border-[#ffff00]' },
]

export const FONT_SIZE_OPTIONS = [
  { id: 'small', label: 'Small', sample: '16px' },
  { id: 'medium', label: 'Medium', sample: '18px (Default)' },
  { id: 'large', label: 'Large', sample: '20px' },
  { id: 'xlarge', label: 'X-Large', sample: '24px' },
]

export const LINE_HEIGHT_OPTIONS = [
  { id: 'normal', label: 'Normal', sample: '1.5×' },
  { id: 'relaxed', label: 'Relaxed', sample: '1.75× (Default)' },
  { id: 'loose', label: 'Loose', sample: '2.0×' },
]

export const FONT_FAMILY_OPTIONS = [
  { id: 'sans', label: 'Sans-Serif', description: 'Clean modern' },
  { id: 'serif', label: 'Serif', description: 'Classic editorial' },
  { id: 'mono', label: 'Mono', description: 'Fixed-width' },
  { id: 'dyslexic', label: 'Dyslexia Friendly', description: 'Extra spaced' },
]

export const WIDTH_OPTIONS = [
  { id: 'narrow', label: 'Narrow', sample: '~60 characters' },
  { id: 'medium', label: 'Standard', sample: '~72 characters' },
  { id: 'wide', label: 'Wide', sample: '~90 characters' },
]
