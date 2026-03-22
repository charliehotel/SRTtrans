export const TRANSLATION_REQUEST_TIMEOUT_MS = 95_000;
export const MAX_TRANSLATION_RETRIES = 3;
export const MAX_VISIBLE_SUBTITLE_MONITOR_ITEMS = 6;
export const DEFAULT_BATCH_SIZE = 5;

export const DEFAULT_SETTINGS = {
  apiUrl: "",
  apiKey: "",
  aiModel: "",
  concurrentRequests: 1,
  batchSize: DEFAULT_BATCH_SIZE,
};

export const languageCodeMap: Record<string, string> = {
  "Korean": "ko", "English": "en", "Japanese": "ja",
  "Chinese (Simplified)": "zh-cn", "Chinese (Traditional)": "zh-tw",
  "Spanish": "es", "French": "fr", "German": "de",
  "Italian": "it", "Russian": "ru", "Portuguese": "pt",
  "Arabic": "ar", "Thai": "th", "Vietnamese": "vi",
  "Dutch": "nl", "Indonesian": "id",
};

export const knownModelsLanguages: Record<string, string[]> = {
  "qwen2.5:7b": [
    "Korean", "English", "Japanese", "Chinese (Simplified)", "Chinese (Traditional)",
    "Spanish", "French", "German", "Italian", "Russian",
    "Portuguese", "Arabic", "Thai", "Vietnamese", "Dutch", "Indonesian",
  ],
  "aya:8b": [
    "Korean", "English", "Japanese", "Chinese (Simplified)", "Chinese (Traditional)",
    "Spanish", "French", "German", "Italian", "Russian",
    "Portuguese", "Arabic", "Dutch", "Indonesian",
  ],
  "llama3:8b": ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Dutch"],
  "gemma2:9b": ["English", "Spanish", "French", "German", "Italian", "Portuguese", "Korean", "Japanese"],
};

export const RECOMMENDED_MODELS = [
  { value: "qwen2.5:7b", label: "qwen2.5:7b (한국어 1위 추천 - 4.7GB)" },
  { value: "aya:8b", label: "aya:8b (다국어 번역 특화 - 4.8GB)" },
  { value: "llama3:8b", label: "llama3:8b (안정적 - 4.7GB)" },
  { value: "gemma2:9b", label: "gemma2:9b (구글 최신 모델 - 5.5GB)" },
];
