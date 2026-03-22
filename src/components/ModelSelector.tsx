"use client";

import React from "react";
import { OllamaModel } from "@/lib/types";

interface ModelSelectorProps {
  currentModel: string;
  installedModels: OllamaModel[];
  onModelChange: (model: string) => void;
}

export default function ModelSelector({ currentModel, installedModels, onModelChange }: ModelSelectorProps) {
  return (
    <div className="flex justify-center mb-8">
      <div className="relative inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300 hover:bg-slate-700 transition-colors cursor-pointer group">
        <span className="w-2 h-2 rounded-full bg-green-500"></span>
        Current Model:
        <select
          value={currentModel}
          onChange={(e) => onModelChange(e.target.value)}
          className="appearance-none bg-transparent font-semibold text-indigo-300 outline-none cursor-pointer pr-4 ml-1"
        >
          <option value={currentModel} className="text-black">
            {currentModel || "Default (Server)"}
          </option>
          {installedModels
            .filter((m) => m.name !== currentModel)
            .map((model) => (
              <option key={model.name} value={model.name} className="text-black">
                {model.name}
              </option>
            ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center px-1 text-slate-400 group-hover:text-white">
          <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
