"use client";

import React, { useRef, useState } from "react";
import { Info, X, ExternalLink, Download, Loader2, CheckCircle2, Square, Trash2 } from "lucide-react";
import { OllamaModel } from "@/lib/types";
import { RECOMMENDED_MODELS } from "@/lib/constants";

interface SetupGuideModalProps {
  installedModels: OllamaModel[];
  onClose: () => void;
  onRefreshModels: () => Promise<void>;
  onDeleteModel: (name: string) => Promise<void>;
  onSetDefaultModel: (model: string) => void;
}

export default function SetupGuideModal({
  installedModels,
  onClose,
  onRefreshModels,
  onDeleteModel,
  onSetDefaultModel,
}: SetupGuideModalProps) {
  const [modelToDownload, setModelToDownload] = useState("qwen2.5:7b");
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleDownload = async () => {
    setIsDownloading(true);
    setDownloadProgress(0);
    abortRef.current = new AbortController();

    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model: modelToDownload }),
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("다운로드 요청에 실패했습니다.");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("응답 스트림을 읽을 수 없습니다.");

      const decoder = new TextDecoder("utf-8");

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.total && data.completed) {
              setDownloadProgress(Math.round((data.completed / data.total) * 100));
            }
          } catch {
            // 파싱 에러 무시
          }
        }
      }

      alert(`${modelToDownload} 모델 다운로드가 완료되었습니다!`);
      await onRefreshModels();

      if (confirm("이 모델을 기본 번역 모델로 설정하시겠습니까?")) {
        onSetDefaultModel(modelToDownload);
      }
    } catch (err: any) {
      if (err.name === "AbortError" || err.message?.includes("aborted")) {
        alert("다운로드가 취소되었습니다.");
      } else {
        alert(`오류: ${err.message}`);
      }
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
      abortRef.current = null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-800 w-full max-w-xl rounded-2xl shadow-2xl border border-slate-600 overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-700">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Info className="w-5 h-5 text-indigo-400" /> 처음 사용자 가이드 (AI 설정)
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
          {/* Step 1 */}
          <div className="space-y-2">
            <h3 className="text-md font-bold text-slate-200">1. 로컬 AI(Ollama) 설치하기</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              무료로 번역기를 사용하려면 내 컴퓨터에서 AI를 돌려주는 프로그램인 <b>Ollama</b>가 필요합니다.
            </p>
            <a
              href="https://ollama.com/download"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium mt-2"
            >
              Ollama 공식 홈페이지 가기 <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Step 2 */}
          <div className="space-y-2">
            <h3 className="text-md font-bold text-slate-200">2. 번역용 AI 모델 다운로드</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Ollama 설치가 끝났다면 번역을 수행할 AI 두뇌(모델)를 다운로드해야 합니다.
              한국어 처리 능력이 가장 뛰어나고 속도가 빠른 <b>qwen2.5:7b</b> 모델을 추천합니다.
            </p>

            <div className="bg-slate-900 p-4 rounded-lg border border-slate-700 mt-3">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                <select
                  value={modelToDownload}
                  onChange={(e) => setModelToDownload(e.target.value)}
                  className="w-full sm:w-1/2 bg-slate-800 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 outline-none"
                >
                  {RECOMMENDED_MODELS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>

                <div className="flex gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleDownload}
                    disabled={isDownloading || installedModels.some((m) => m.name === modelToDownload)}
                    className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 ${
                      installedModels.some((m) => m.name === modelToDownload)
                        ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                        : "bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-50"
                    }`}
                  >
                    {installedModels.some((m) => m.name === modelToDownload) ? (
                      <><CheckCircle2 className="w-4 h-4" /> 이미 설치됨</>
                    ) : isDownloading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {downloadProgress !== null ? `다운로드 중... ${downloadProgress}%` : "요청 중..."}
                      </>
                    ) : (
                      <><Download className="w-4 h-4" /> 클릭해서 자동 다운로드</>
                    )}
                  </button>

                  {isDownloading && (
                    <button
                      onClick={() => abortRef.current?.abort()}
                      className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                    >
                      <Square className="w-4 h-4 fill-current" /> 취소
                    </button>
                  )}
                </div>
              </div>
              <code className="block text-sm text-green-400 font-mono select-all bg-black/30 p-2 rounded">
                ollama pull {modelToDownload}
              </code>
            </div>
            <p className="text-xs text-yellow-500 mt-2">
              * 주의: 버튼을 누르기 전에 반드시 Ollama 프로그램이 켜져 있어야 합니다.
            </p>
          </div>

          {/* Step 3 */}
          <div className="space-y-2 border-t border-slate-700 pt-6">
            <h3 className="text-md font-bold text-slate-200 flex items-center justify-between">
              <span>3. 내 컴퓨터에 설치된 모델 관리</span>
              <button
                onClick={onRefreshModels}
                className="text-xs font-normal bg-slate-700 hover:bg-slate-600 px-2 py-1 rounded text-slate-300"
              >
                새로고침
              </button>
            </h3>
            {installedModels.length > 0 ? (
              <ul className="space-y-2 mt-3">
                {installedModels.map((model) => (
                  <li key={model.name} className="flex justify-between items-center bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                    <div>
                      <span className="text-slate-200 font-medium text-sm">{model.name}</span>
                      <span className="text-slate-500 text-xs ml-3">
                        {(model.size / 1024 / 1024 / 1024).toFixed(1)} GB
                      </span>
                    </div>
                    <button
                      onClick={() => onDeleteModel(model.name)}
                      className="text-slate-500 hover:text-red-400 p-1.5 rounded bg-slate-800 hover:bg-red-900/30 transition-colors"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500 bg-slate-900/50 p-4 rounded-lg text-center border border-slate-700">
                설치된 모델이 없습니다.
              </p>
            )}
          </div>
        </div>

        <div className="p-4 bg-slate-900/50 border-t border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
}
