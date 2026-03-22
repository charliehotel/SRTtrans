"use client";

import React, { useState } from "react";
import { Settings, X } from "lucide-react";
import { AppSettings } from "@/lib/types";
import { DEFAULT_BATCH_SIZE } from "@/lib/constants";

interface SettingsModalProps {
  settings: AppSettings;
  onSave: (settings: AppSettings) => void;
  onClose: () => void;
}

export default function SettingsModal({ settings, onSave, onClose }: SettingsModalProps) {
  const [draft, setDraft] = useState<AppSettings>({ ...settings });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-600 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5" /> Settings
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-400 mb-4">
            설정은 서버에 영구 저장됩니다. 다른 브라우저에서도 동일한 설정이 적용됩니다.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">API Base URL</label>
            <input
              type="text"
              placeholder="e.g. http://127.0.0.1:11434/v1"
              value={draft.apiUrl}
              onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">API Key</label>
            <input
              type="password"
              placeholder="sk-... (or 'ollama')"
              value={draft.apiKey}
              onChange={(e) => setDraft({ ...draft, apiKey: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Model Name</label>
            <input
              type="text"
              placeholder="e.g. aya:8b or gpt-4"
              value={draft.aiModel}
              onChange={(e) => setDraft({ ...draft, aiModel: e.target.value })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Concurrent Requests (병렬 처리 수)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={draft.concurrentRequests}
              onChange={(e) => setDraft({ ...draft, concurrentRequests: parseInt(e.target.value) || 1 })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            />
            <div className="mt-2 p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg">
              <p className="text-[11px] text-amber-200 leading-relaxed">
                <span className="font-bold text-amber-400">⚠️ 주의:</span> 로컬 AI(Ollama) 사용 시 값을 2 이상으로 올리면 메모리 부족으로 컴퓨터가 멈추거나 번역이 실패할 수 있습니다. <span className="font-semibold text-white">(권장값: 1)</span><br />
                OpenAI API 사용 시에는 3~10을 권장합니다. (너무 높으면 API 한도 초과 오류 발생)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Batch Size (배치 크기)</label>
            <input
              type="number"
              min="1"
              max="20"
              value={draft.batchSize}
              onChange={(e) => setDraft({ ...draft, batchSize: parseInt(e.target.value) || DEFAULT_BATCH_SIZE })}
              className="w-full bg-slate-900 border border-slate-600 rounded-lg p-2.5 text-sm text-slate-200 focus:border-indigo-500 outline-none"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              한 번의 API 호출에 묶어서 보내는 자막 줄 수입니다. `1`이면 줄마다 바로 응답이 보여서 모니터링이 가장 직관적이고, 값을 올리면 더 빠를 수 있지만 같은 배치의 응답이 한꺼번에 도착합니다.
            </p>
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-700">
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
