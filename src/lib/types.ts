import { SubtitleEntry } from "./srt-parser";

export interface AppSettings {
  apiUrl: string;
  apiKey: string;
  aiModel: string;
  concurrentRequests: number;
  batchSize: number;
}

export interface SubtitleMonitorItem {
  index: number;
  entry: SubtitleEntry;
  translatedText: string | null;
  status: "translating" | "done" | "error";
}

export interface OllamaModel {
  name: string;
  size: number;
  digest?: string;
  modified_at?: string;
}
