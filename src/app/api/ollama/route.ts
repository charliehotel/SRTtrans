import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const action = url.searchParams.get("action");
  // OLLAMA_URL이 "http://.../v1" 형태로 설정되어 있을 경우 "/v1"을 제거하여 네이티브 API 주소로 변환합니다.
  let baseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  if (baseUrl.endsWith("/v1")) {
    baseUrl = baseUrl.slice(0, -3);
  }

  if (action === "check") {
    try {
      const res = await fetch(`${baseUrl}/api/tags`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Ollama not responding: ${res.status} ${res.statusText}`);
      const data = await res.json();
      return NextResponse.json({ running: true, models: data.models });
    } catch (e: any) {
      console.error("Ollama Check Error:", e.message);
      return NextResponse.json({ running: false, models: [], debugError: e.message });
    }
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const { model } = await req.json();
  let baseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  if (baseUrl.endsWith("/v1")) {
    baseUrl = baseUrl.slice(0, -3);
  }

  try {
    // stream: true로 설정하여 Ollama로부터 다운로드 진행률을 청크(chunk) 단위로 받습니다.
    const res = await fetch(`${baseUrl}/api/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model, stream: true }),
      signal: req.signal, // 클라이언트에서 요청 취소 시 Ollama 서버 측 다운로드도 중단되도록 시그널 전달
    });
    
    if (!res.ok) throw new Error("Failed to pull model from Ollama.");
    if (!res.body) throw new Error("No response body from Ollama.");

    // Ollama의 스트림을 그대로 클라이언트에게 전달합니다 (Server-Sent Events / NDJSON)
    return new NextResponse(res.body, {
      headers: {
        "Content-Type": "application/x-ndjson",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      },
    });
  } catch (e: any) {
    console.error("Ollama Pull Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const { model } = await req.json();
  let baseUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  if (baseUrl.endsWith("/v1")) {
    baseUrl = baseUrl.slice(0, -3);
  }

  try {
    const res = await fetch(`${baseUrl}/api/delete`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: model }),
    });
    
    if (!res.ok) throw new Error("Failed to delete model.");
    
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error("Ollama Delete Error:", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
