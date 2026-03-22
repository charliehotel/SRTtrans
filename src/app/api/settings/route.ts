import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "config.json");

interface ServerConfig {
  apiUrl: string;
  apiKey: string;
  aiModel: string;
  concurrentRequests: number;
  batchSize: number;
}

/**
 * config.json을 읽고, 없으면 .env.local 기본값으로 자동 생성합니다.
 */
function readConfig(): ServerConfig {
  const defaults: ServerConfig = {
    apiUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434/v1",
    apiKey: process.env.OPENAI_API_KEY || "ollama",
    aiModel: process.env.AI_MODEL || "qwen2.5:7b",
    concurrentRequests: 1,
    batchSize: 5,
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch (e) {
    console.error("Failed to read config.json, using defaults:", e);
  }

  // 파일이 없으면 기본값으로 생성
  writeConfig(defaults);
  return defaults;
}

function writeConfig(config: ServerConfig): void {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
  } catch (e) {
    console.error("Failed to write config.json:", e);
    throw e;
  }
}

/**
 * GET /api/settings — 서버 설정 파일 읽기
 */
export async function GET() {
  try {
    const config = readConfig();
    return NextResponse.json(config);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to read settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/settings — 서버 설정 파일에 쓰기 (부분 업데이트 지원)
 */
export async function PUT(req: NextRequest) {
  try {
    const updates = await req.json();
    const current = readConfig();

    // 부분 업데이트: 전달된 필드만 덮어쓰기
    const merged: ServerConfig = {
      apiUrl: updates.apiUrl ?? current.apiUrl,
      apiKey: updates.apiKey ?? current.apiKey,
      aiModel: updates.aiModel ?? current.aiModel,
      concurrentRequests: updates.concurrentRequests ?? current.concurrentRequests,
      batchSize: updates.batchSize ?? current.batchSize,
    };

    writeConfig(merged);
    return NextResponse.json(merged);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to save settings" },
      { status: 500 }
    );
  }
}
