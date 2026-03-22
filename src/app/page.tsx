"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { parseSRT, stringifySRT, SubtitleEntry } from "@/lib/srt-parser";
import { stripHtmlTags, restoreHtmlTags } from "@/lib/srt-utils";
import { AppSettings, SubtitleMonitorItem, OllamaModel } from "@/lib/types";
import {
  TRANSLATION_REQUEST_TIMEOUT_MS,
  MAX_TRANSLATION_RETRIES,
  MAX_VISIBLE_SUBTITLE_MONITOR_ITEMS,
  DEFAULT_SETTINGS,
  languageCodeMap,
  knownModelsLanguages,
} from "@/lib/constants";

import FileUploader from "@/components/FileUploader";
import SettingsModal from "@/components/SettingsModal";
import SetupGuideModal from "@/components/SetupGuideModal";
import TranslationProgress from "@/components/TranslationProgress";
import ModelSelector from "@/components/ModelSelector";

import { Settings, Info, Pause, Play, Square, CheckCircle2 } from "lucide-react";

export default function Home() {
  const [files, setFiles] = useState<File[]>([]);
  const [targetLanguage, setTargetLanguage] = useState("Korean");
  const [isCustomLanguageMode, setIsCustomLanguageMode] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  const isCancelledRef = useRef(false);

  // Progress
  const [overallProgress, setOverallProgress] = useState({ current: 0, total: 0 });
  const [fileProgress, setFileProgress] = useState(0);
  const [currentTranslatingFile, setCurrentTranslatingFile] = useState("");
  const [currentSubtitleProgress, setCurrentSubtitleProgress] = useState<{ current: number; total: number } | null>(null);
  const [subtitleMonitorItems, setSubtitleMonitorItems] = useState<SubtitleMonitorItem[]>([]);
  const [failedCount, setFailedCount] = useState(0);

  const [error, setError] = useState<string | null>(null);

  // Settings & Setup
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSetupOpen, setIsSetupOpen] = useState(false);
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // ─── 서버에서 설정 로드 ───
  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (e) {
      console.error("Failed to load server settings:", e);
    } finally {
      setSettingsLoaded(true);
    }
  }, []);

  const saveSettings = useCallback(async (newSettings: AppSettings) => {
    setSettings(newSettings);
    setIsSettingsOpen(false);
    try {
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSettings),
      });
    } catch (e) {
      console.error("Failed to save settings to server:", e);
    }
  }, []);

  const fetchInstalledModels = useCallback(async () => {
    try {
      const res = await fetch("/api/ollama?action=check");
      const data = await res.json();
      if (data.running && data.models) {
        setInstalledModels(data.models);
      }
    } catch (e) {
      console.error("Failed to fetch models:", e);
    }
  }, []);

  useEffect(() => {
    loadSettings();
    fetchInstalledModels();
  }, [loadSettings, fetchInstalledModels]);

  const handleDeleteModel = async (modelName: string) => {
    if (!confirm(`정말 ${modelName} 모델을 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch("/api/ollama", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelName }),
      });
      if (!res.ok) throw new Error("삭제 실패");
      await fetchInstalledModels();
    } catch (err: any) {
      alert(`오류: ${err.message}`);
    }
  };

  const handleModelChange = (model: string) => {
    saveSettings({ ...settings, aiModel: model });
  };

  const handleSetDefaultModel = (model: string) => {
    saveSettings({ ...settings, aiModel: model });
  };

  // ─── Subtitle Monitor ───
  const upsertSubtitleMonitorItem = (nextItem: SubtitleMonitorItem) => {
    setSubtitleMonitorItems((prev) => {
      const next = [...prev.filter((item) => item.index !== nextItem.index), nextItem];
      const translatingItems = next
        .filter((item) => item.status === "translating")
        .sort((a, b) => b.index - a.index);
      const completedItems = next
        .filter((item) => item.status !== "translating")
        .sort((a, b) => b.index - a.index);

      if (completedItems.length === 0) {
        return translatingItems.slice(0, MAX_VISIBLE_SUBTITLE_MONITOR_ITEMS);
      }

      const activeLimit = Math.max(1, Math.floor(MAX_VISIBLE_SUBTITLE_MONITOR_ITEMS / 2));
      const completedLimit = MAX_VISIBLE_SUBTITLE_MONITOR_ITEMS - activeLimit;

      return [
        ...translatingItems.slice(0, activeLimit),
        ...completedItems.slice(0, completedLimit),
      ];
    });
  };

  // ─── Translation ───
  const translateBatch = async (
    texts: string[],
    lang: string,
    retries = MAX_TRANSLATION_RETRIES
  ): Promise<{ texts: string[]; model: string }> => {
    for (let attempt = 1; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), TRANSLATION_REQUEST_TIMEOUT_MS);

      try {
        const isSingle = texts.length === 1;
        const res = await fetch("/api/translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            ...(isSingle ? { text: texts[0] } : { texts }),
            targetLanguage: lang,
            customUrl: settings.apiUrl,
            customApiKey: settings.apiKey,
            customModel: settings.aiModel,
          }),
        });

        if (!res.ok) {
          const contentType = res.headers.get("content-type");
          if (contentType?.includes("application/json")) {
            const errorData = await res.json();
            throw new Error(errorData.error || `Server error: ${res.status}`);
          }
          throw new Error(`Server returned an invalid response (${res.status}).`);
        }

        const data = await res.json();

        if (isSingle) {
          return { texts: [data.translatedText], model: data.usedModel };
        }
        return { texts: data.translatedTexts, model: data.usedModel };
      } catch (err: any) {
        const normalizedError =
          err?.name === "AbortError"
            ? new Error(`번역 요청이 ${TRANSLATION_REQUEST_TIMEOUT_MS / 1000}초를 초과했습니다.`)
            : err;
        console.error(`Translation attempt ${attempt} failed:`, normalizedError);
        if (attempt === retries) throw normalizedError;
        await new Promise((r) => setTimeout(r, 2000));
      } finally {
        window.clearTimeout(timeoutId);
      }
    }
    throw new Error("Translation failed after multiple retries");
  };

  // ─── Language ───
  const getAvailableLanguages = () => {
    return knownModelsLanguages[settings.aiModel] || [];
  };

  const availableLanguages = getAvailableLanguages();
  const isUnknownModel = availableLanguages.length === 0;

  useEffect(() => {
    if (isUnknownModel || isCustomLanguageMode) return;
    if (!availableLanguages.includes(targetLanguage)) {
      setTargetLanguage(availableLanguages[0]);
    }
  }, [availableLanguages, isCustomLanguageMode, isUnknownModel, targetLanguage]);

  const getNewFileName = (originalName: string, targetLang: string) => {
    const langCode = languageCodeMap[targetLang] || "ko";
    let baseName = originalName.replace(/\.srt$/i, "");
    baseName = baseName.replace(/[.\-_](en|ko|ja|es|fr|de|english|korean|japanese|spanish|french|german)$/i, "");
    return `${baseName}.${langCode}.srt`;
  };

  // ─── Process Single File ───
  const processSingleFile = async (file: File) => {
    setCurrentTranslatingFile(file.name);
    setFileProgress(0);
    setSubtitleMonitorItems([]);
    setFailedCount(0);

    const fileContent = await file.text();
    const entries = parseSRT(fileContent);

    if (entries.length === 0) {
      throw new Error(`Could not parse subtitles from ${file.name}`);
    }

    let completedCount = 0;
    let localFailedCount = 0;
    let aiModelUsed = settings.aiModel || "Default AI Model";
    const concurrency = Number(settings.concurrentRequests) || 1;
    const batchSize = Number(settings.batchSize) || 5;
    const translatedEntries: SubtitleEntry[] = new Array(entries.length);

    let currentIndex = 0;

    const workers = Array(concurrency)
      .fill(0)
      .map(async () => {
        while (currentIndex < entries.length) {
          if (isCancelledRef.current) break;

          while (isPausedRef.current) {
            if (isCancelledRef.current) break;
            await new Promise((r) => setTimeout(r, 500));
          }
          if (isCancelledRef.current) break;

          // 배치 크기만큼 자막 가져오기
          const batchStartIdx = currentIndex;
          const batchEndIdx = Math.min(currentIndex + batchSize, entries.length);
          currentIndex = batchEndIdx;

          const batchEntries = entries.slice(batchStartIdx, batchEndIdx);
          const nonEmptyIndices: number[] = [];
          const textsToTranslate: string[] = [];

          for (let i = 0; i < batchEntries.length; i++) {
            const globalIdx = batchStartIdx + i;
            const entry = batchEntries[i];

            if (!entry.text.trim()) {
              translatedEntries[globalIdx] = entry;
              completedCount++;
              setFileProgress(Math.round((completedCount / entries.length) * 100));
            } else {
              nonEmptyIndices.push(globalIdx);
              // HTML 태그 제거 후 번역
              const tagInfo = stripHtmlTags(entry.text);
              textsToTranslate.push(tagInfo.stripped);

              upsertSubtitleMonitorItem({
                index: globalIdx,
                entry,
                translatedText: null,
                status: "translating",
              });
            }
          }

          if (textsToTranslate.length === 0) continue;

          setCurrentSubtitleProgress({
            current: Math.min(batchEndIdx, entries.length),
            total: entries.length,
          });

          try {
            const result = await translateBatch(textsToTranslate, targetLanguage);
            if (completedCount === 0 || aiModelUsed === (settings.aiModel || "Default AI Model")) {
              aiModelUsed = result.model;
            }

            for (let i = 0; i < nonEmptyIndices.length; i++) {
              const globalIdx = nonEmptyIndices[i];
              const entry = entries[globalIdx];
              const tagInfo = stripHtmlTags(entry.text);
              const translatedText =
                i < result.texts.length
                  ? restoreHtmlTags(tagInfo, result.texts[i])
                  : entry.text;

              translatedEntries[globalIdx] = { ...entry, text: translatedText };
              upsertSubtitleMonitorItem({
                index: globalIdx,
                entry,
                translatedText,
                status: "done",
              });

              completedCount++;
              setFileProgress(Math.round((completedCount / entries.length) * 100));
            }
          } catch (err: any) {
            // Fail-safe: 실패한 항목은 원본 텍스트 유지, 번역 속행
            for (let i = 0; i < nonEmptyIndices.length; i++) {
              const globalIdx = nonEmptyIndices[i];
              const entry = entries[globalIdx];

              if (!translatedEntries[globalIdx]) {
                translatedEntries[globalIdx] = entry; // 원본 유지
                localFailedCount++;
                upsertSubtitleMonitorItem({
                  index: globalIdx,
                  entry,
                  translatedText: err?.message || "번역 실패",
                  status: "error",
                });
              }
              completedCount++;
              setFileProgress(Math.round((completedCount / entries.length) * 100));
            }
            setFailedCount(localFailedCount);
            console.error(`Batch translation error at entries ${batchStartIdx}-${batchEndIdx}:`, err);
          }
        }
      });

    await Promise.all(workers);

    if (isCancelledRef.current) {
      throw new Error("Translation was cancelled by the user.");
    }

    // 안내문 삽입
    translatedEntries.unshift({
      id: 0,
      startTime: "00:00:00,000",
      endTime: "00:00:05,000",
      text: `본 자막은 기계 번역되었습니다. (사용 모델: ${aiModelUsed})`,
    });

    setFileProgress(100);
    const newSrtContent = stringifySRT(translatedEntries);
    const blob = new Blob([newSrtContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);

    const newFileName = getNewFileName(file.name, targetLanguage);
    const a = document.createElement("a");
    a.href = url;
    a.download = newFileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ─── Controls ───
  const handlePauseToggle = () => {
    const newState = !isPaused;
    setIsPaused(newState);
    isPausedRef.current = newState;
  };

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
  };

  const handleTranslateAll = async () => {
    if (files.length === 0) return;

    isCancelledRef.current = false;
    isPausedRef.current = false;
    setIsPaused(false);
    setIsTranslating(true);
    setError(null);
    setOverallProgress({ current: 0, total: files.length });

    try {
      for (let i = 0; i < files.length; i++) {
        if (isCancelledRef.current) break;
        await processSingleFile(files[i]);
        if (isCancelledRef.current) break;
        setOverallProgress({ current: i + 1, total: files.length });
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (isCancelledRef.current) {
        setError("Translation was cancelled by the user.");
      } else {
        setFiles([]);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred during batch translation.");
    } finally {
      setIsTranslating(false);
      setIsPaused(false);
      isPausedRef.current = false;
      isCancelledRef.current = false;
      setCurrentTranslatingFile("");
      setCurrentSubtitleProgress(null);
      setSubtitleMonitorItems([]);
    }
  };

  // ─── Render ───
  if (!settingsLoaded) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center">
        <div className="text-slate-400 text-sm">Loading settings...</div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen flex-col items-center p-4 lg:p-24 pb-20">
      {/* Header Buttons */}
      <div className="z-10 w-full max-w-3xl flex justify-end mb-4 gap-2">
        <button
          onClick={() => setIsSetupOpen(true)}
          className="px-3 py-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors flex items-center gap-2 text-sm font-medium"
        >
          <Info className="w-4 h-4" /> Setup Guide
        </button>
        <button
          onClick={() => setIsSettingsOpen(true)}
          className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      <div className="z-10 w-full max-w-3xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-indigo-400 mb-2 text-center">SRT Translator</h1>
        <p className="text-slate-400 text-center mb-2">
          Batch translate your subtitle files while keeping timestamps intact.
        </p>

        <ModelSelector
          currentModel={settings.aiModel}
          installedModels={installedModels}
          onModelChange={handleModelChange}
        />

        <div className="bg-slate-800 p-6 lg:p-8 rounded-2xl shadow-xl border border-slate-700">
          <FileUploader
            files={files}
            isTranslating={isTranslating}
            onFilesChange={setFiles}
            onError={setError}
          />

          {error && (
            <div className="mt-4 p-3 bg-red-900/30 border border-red-800 text-red-300 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Controls */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-400 mb-2">
                Target Language
                {isUnknownModel && (
                  <span className="ml-2 text-[10px] text-yellow-500 font-normal">
                    * Unknown model: please type the language manually.
                  </span>
                )}
              </label>

              {!isUnknownModel && !isCustomLanguageMode ? (
                <select
                  value={targetLanguage}
                  onChange={(e) => {
                    if (e.target.value === "custom") {
                      setIsCustomLanguageMode(true);
                      setTargetLanguage("");
                      return;
                    }
                    setIsCustomLanguageMode(false);
                    setTargetLanguage(e.target.value);
                  }}
                  disabled={isTranslating}
                  className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                >
                  {availableLanguages.map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                  <option value="custom" className="text-slate-400 font-bold">--- 다른 언어 직접 입력 ---</option>
                </select>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="e.g. Arabic, Tagalog, Polish..."
                    value={targetLanguage}
                    onChange={(e) => setTargetLanguage(e.target.value)}
                    disabled={isTranslating}
                    className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-slate-200 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                    autoFocus
                  />
                  {!isUnknownModel && (
                    <button
                      onClick={() => {
                        setIsCustomLanguageMode(false);
                        setTargetLanguage(availableLanguages[0]);
                      }}
                      className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm transition-colors whitespace-nowrap"
                    >
                      목록으로
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="flex items-end gap-2">
              {!isTranslating ? (
                <button
                  onClick={handleTranslateAll}
                  disabled={files.length === 0}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-semibold py-3 px-8 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  Translate {files.length > 0 ? files.length : ""} Files
                </button>
              ) : (
                <>
                  <button
                    onClick={handlePauseToggle}
                    className={`w-full sm:w-auto font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                      isPaused
                        ? "bg-amber-600 hover:bg-amber-500 text-white"
                        : "bg-slate-700 hover:bg-slate-600 text-white"
                    }`}
                  >
                    {isPaused ? <><Play className="w-5 h-5" /> Resume</> : <><Pause className="w-5 h-5" /> Pause</>}
                  </button>
                  <button
                    onClick={handleCancel}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Square className="w-5 h-5 fill-current" /> Cancel
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Progress */}
          {isTranslating && (
            <TranslationProgress
              overallProgress={overallProgress}
              fileProgress={fileProgress}
              currentTranslatingFile={currentTranslatingFile}
              currentSubtitleProgress={currentSubtitleProgress}
              subtitleMonitorItems={subtitleMonitorItems}
              failedCount={failedCount}
            />
          )}

          {/* Success Message */}
          {!isTranslating &&
            overallProgress.total > 0 &&
            overallProgress.current === overallProgress.total &&
            files.length === 0 && (
              <div className="mt-6 p-4 bg-green-900/20 border border-green-800/50 rounded-xl flex items-center gap-3 text-green-400">
                <CheckCircle2 className="w-6 h-6 shrink-0" />
                <span className="font-medium text-sm">
                  All {overallProgress.total} files successfully translated and downloaded!
                </span>
              </div>
            )}
        </div>
      </div>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal settings={settings} onSave={saveSettings} onClose={() => setIsSettingsOpen(false)} />
      )}

      {isSetupOpen && (
        <SetupGuideModal
          installedModels={installedModels}
          onClose={() => setIsSetupOpen(false)}
          onRefreshModels={fetchInstalledModels}
          onDeleteModel={handleDeleteModel}
          onSetDefaultModel={handleSetDefaultModel}
        />
      )}
    </main>
  );
}
