export interface VoiceOption {
  id: string;
  name: string;
  burmeseName: string;
  gender: 'Male' | 'Female' | 'male' | 'female';
  style: string;
  language: 'mm' | 'en';
  pitch?: number;
}

export const SHARED_VOICES: VoiceOption[] = [
  { id: 'mm_thiha', name: 'Thiha', burmeseName: 'သီဟ', gender: 'Male', style: 'Deep · Cinematic Narrative', language: 'mm', pitch: -5.0 },
  { id: 'mm_nilar', name: 'Nilar', burmeseName: 'နီလာ', gender: 'Female', style: 'Warm · Expressive', language: 'mm', pitch: 1.0 },
  { id: 'mm_aung_kyaw', name: 'Aung Kyaw', burmeseName: 'အောင်ကျော်', gender: 'Male', style: 'Action · Dynamic', language: 'mm', pitch: -4.0 },
  { id: 'mm_hsu_myat', name: 'Hsu Myat', burmeseName: 'ဆုမြတ်', gender: 'Female', style: 'Smooth · Storyteller', language: 'mm', pitch: 0.0 },
  { id: 'mm_min_khant', name: 'Min Khant', burmeseName: 'မင်းခန့်', gender: 'Male', style: 'Calm · Documentary', language: 'mm', pitch: -2.5 },
  { id: 'mm_may_thu', name: 'May Thu', burmeseName: 'မေသူ', gender: 'Female', style: 'Gentle · Emotional', language: 'mm', pitch: 2.0 },
  { id: 'en_female_emma', name: 'Emma', burmeseName: 'Emma', gender: 'Female', style: 'Clear · Professional', language: 'en', pitch: 0.0 },
  { id: 'en_male_james', name: 'James', burmeseName: 'James', gender: 'Male', style: 'Cinematic · Deep', language: 'en', pitch: -3.0 },
  { id: 'en_female_lily', name: 'Lily', burmeseName: 'Lily', gender: 'Female', style: 'Soft · Friendly', language: 'en', pitch: 1.0 },
  { id: 'en_male_david', name: 'David', burmeseName: 'David', gender: 'Male', style: 'Energetic · Modern', language: 'en', pitch: -1.0 },
];
