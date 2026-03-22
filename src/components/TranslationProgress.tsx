"use client";

import React from "react";
import { CheckCircle2, X, Loader2 } from "lucide-react";
import { SubtitleMonitorItem } from "@/lib/types";

interface TranslationProgressProps {
  overallProgress: { current: number; total: number };
  fileProgress: number;
  currentTranslatingFile: string;
  currentSubtitleProgress: { current: number; total: number } | null;
  subtitleMonitorItems: SubtitleMonitorItem[];
  failedCount: number;
}

export default function TranslationProgress({
  overallProgress,
  fileProgress,
  currentTranslatingFile,
  currentSubtitleProgress,
  subtitleMonitorItems,
  failedCount,
}: TranslationProgressProps) {
  const activeItems = subtitleMonitorItems.filter((item) => item.status === "translating");
  const recentItems = subtitleMonitorItems.filter((item) => item.status !== "translating");

  const renderMonitorItem = ({ index, entry, translatedText, status }: SubtitleMonitorItem) => (
    <div key={`${index}-${entry.id}`} className="rounded-md bg-slate-900/70 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-slate-500">{entry.id}</div>
        <div
          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
            status === "done"
              ? "bg-emerald-900/50 text-emerald-300"
              : status === "error"
              ? "bg-red-900/50 text-red-300"
              : "bg-amber-900/50 text-amber-300"
          }`}
        >
          {status === "done" ? (
            <><CheckCircle2 className="h-3 w-3" /> Received</>
          ) : status === "error" ? (
            <><X className="h-3 w-3" /> Error</>
          ) : (
            <><Loader2 className="h-3 w-3 animate-spin" /> Waiting</>
          )}
        </div>
      </div>
      <div className="mt-1 text-xs font-mono text-slate-400">
        {entry.startTime} --&gt; {entry.endTime}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Original
          </div>
          <div className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-200">
            {entry.text}
          </div>
        </div>
        <div className="rounded-md border border-slate-800 bg-slate-950/80 p-3">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            Response
          </div>
          <div
            className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${
              status === "error" ? "text-red-300" : "text-slate-200"
            }`}
          >
            {translatedText || "응답 대기 중..."}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mt-8 p-4 bg-slate-900/50 rounded-xl border border-slate-700">
      {/* Overall Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-slate-400 mb-1">
          <span>Overall Progress ({overallProgress.current}/{overallProgress.total})</span>
          {failedCount > 0 && (
            <span className="text-amber-400">{failedCount} lines failed (원본 유지)</span>
          )}
        </div>
        <div className="w-full bg-slate-800 rounded-full h-1.5">
          <div
            className="bg-indigo-400 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${overallProgress.total > 0 ? (overallProgress.current / overallProgress.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* File Progress */}
      <div>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-300 truncate pr-4">
            Translating: <span className="text-indigo-300">{currentTranslatingFile}</span>
            {currentSubtitleProgress && (
              <span className="ml-2 text-slate-400">
                ({currentSubtitleProgress.current}/{currentSubtitleProgress.total} lines)
              </span>
            )}
          </span>
          <span className="text-indigo-400 font-mono shrink-0">{fileProgress}%</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2.5">
          <div
            className="bg-indigo-600 h-2.5 rounded-full transition-all duration-300"
            style={{ width: `${fileProgress}%` }}
          />
        </div>
      </div>

      {/* Live Subtitle Monitor */}
      {subtitleMonitorItems.length > 0 && (
        <div className="mt-4 rounded-lg border border-slate-700 bg-slate-950/60 p-3">
          <div className="mb-2 text-xs font-medium text-slate-400">
            Live Subtitle Monitor ({subtitleMonitorItems.length})
          </div>
          {activeItems.length > 0 && (
            <div>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                In Flight
              </div>
              <div className="space-y-3">
                {activeItems.map(renderMonitorItem)}
              </div>
            </div>
          )}
          {recentItems.length > 0 && (
            <div className={activeItems.length > 0 ? "mt-4" : ""}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-emerald-300">
                Recent Responses
              </div>
              <div className="space-y-3">
                {recentItems.map(renderMonitorItem)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
