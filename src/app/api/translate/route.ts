import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CONFIG_PATH = path.join(process.cwd(), "config.json");
const BATCH_SEPARATOR = "|||";
const REQUEST_TIMEOUT_MS = 180_000;

interface ServerConfig {
  apiUrl: string;
  apiKey: string;
  aiModel: string;
}

function readConfig(): ServerConfig {
  const defaults: ServerConfig = {
    apiUrl: process.env.OLLAMA_URL || "http://127.0.0.1:11434/v1",
    apiKey: process.env.OPENAI_API_KEY || "ollama",
    aiModel: process.env.AI_MODEL || "qwen2.5:7b",
  };
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const raw = fs.readFileSync(CONFIG_PATH, "utf-8");
      const parsed = JSON.parse(raw);
      return { ...defaults, ...parsed };
    }
  } catch {
    // fallback
  }
  return defaults;
}

function buildSystemPrompt(targetLanguage: string, isBatch: boolean): string {
  const baseRules = `You are a strict subtitle translation machine. Your ONLY task is to translate the text provided by the user into **${targetLanguage.toUpperCase()}**.
CRITICAL RULES:
1. The output MUST be in ${targetLanguage}. If the target is Korean, you MUST output ONLY Korean characters (Hangul) and basic punctuation. ABSOLUTELY DO NOT mix in Chinese characters (Hanja/Pinyin), Japanese, or any other foreign language words.
2. Output ONLY the raw translated text. Do NOT provide dictionary definitions, word-by-word breakdowns, or multiple options (e.g., no brackets with alternative words).
3. NO conversational filler (e.g. "Here is the translation", "Sure", "번역:", "다음 내용이 있습니다.").
4. NO wrapping quotes unless the original text had them.
5. Keep the exact same line breaks.
6. Provide a NATURAL, conversational translation suitable for movie/TV subtitles. Do NOT use literal machine-like translations.
7. If the target is Korean, ensure perfect spacing (띄어쓰기) and natural sentence endings. Never put a space before sentence-ending particles like "요" or "다" (e.g., write "당연하죠!", NOT "당연하게도 요!").`;

  if (isBatch) {
    return `${baseRules}
8. IMPORTANT: The user will provide MULTIPLE subtitle lines separated by the delimiter "${BATCH_SEPARATOR}". You MUST translate each line individually and return EXACTLY the same number of lines separated by "${BATCH_SEPARATOR}". Do NOT merge, reorder, or skip lines. Do NOT add extra "${BATCH_SEPARATOR}" delimiters.`;
  }

  return baseRules;
}

function isKoreanTarget(targetLanguage: string): boolean {
  const normalized = targetLanguage.trim().toLowerCase();
  return normalized === "korean" || normalized === "ko" || normalized === "한국어";
}

function normalizeForComparison(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "");
}

function isLikelyUntranslated(original: string, translated: string, targetLanguage: string): boolean {
  if (!isKoreanTarget(targetLanguage)) return false;

  const trimmed = translated.trim();
  if (!trimmed) return true;

  const hasHangul = /[가-힣]/.test(trimmed);
  const hasLatin = /[A-Za-z]/.test(trimmed);
  if (!hasHangul && hasLatin) return true;

  return normalizeForComparison(original) === normalizeForComparison(trimmed);
}

async function requestCompletion(
  openai: OpenAI,
  targetLanguage: string,
  model: string,
  texts: string[],
  isBatch: boolean,
  strictRetry = false
) {
  const retryNote = strictRetry
    ? `\n\nIMPORTANT FAILURE RECOVERY: Your previous answer left some lines untranslated. This time every output line must be fully translated into ${targetLanguage}. If the source line is English, the output line must not remain English.`
    : "";

  const userContent = isBatch
    ? `Translate the following texts into ${targetLanguage}:\n\n${texts.join(` ${BATCH_SEPARATOR} `)}${retryNote}`
    : `Translate the following text into ${targetLanguage}:\n\n${texts[0]}${retryNote}`;

  return openai.chat.completions.create({
    messages: [
      { role: "system", content: buildSystemPrompt(targetLanguage, isBatch) },
      { role: "user", content: userContent },
    ],
    model,
    temperature: 0.0,
  });
}

function postProcess(text: string, targetLanguage: string): string {
  let result = text;

  // 사후 처리: 불필요한 잡담, 설명, 사전식 풀이 등을 최대한 걸러냄
  result = result.replace(/^(영어로 서브타이틀을 번역해 드리겠습니다:|Here is the translation:|Sure, I can help with that:|Here are the translations:|번역문:|번역:|다음 내용이 있습니다\.|다음 텍스트에 대한 번역입니다:|Translation:)\s*/i, "");

  // "번역:" 또는 "Translation:" 이후의 텍스트만 취하기
  const match = result.match(/(?:번역:|Translation:)\s*(.+)$/i);
  if (match && match[1]) {
    result = match[1].trim();
  }

  // 앞뒤에 불필요하게 붙은 겹따옴표 제거
  result = result.replace(/^["']([\s\S]*?)["']$/, "$1").trim();

  // 한국어 띄어쓰기 교정
  if (targetLanguage.toLowerCase() === "korean" || targetLanguage.toLowerCase() === "ko") {
    // 종결어미/조사 앞 띄어쓰기 제거
    result = result.replace(/([가-힣])\s+(요|다|까|까\?|요\?|요!|다!|야|을|를|이|가|은|는|도|에|에게|에서|로|으로|과|와)\b/gm, "$1$2");
    // 어간+어미 분리 현상 교정
    result = result.replace(/([가-힣])\s+([어아지네고][\.?\!]*)$/gm, "$1$2");
    // 중간에 끊어진 어미 교정
    result = result.replace(/([가-힣])\s+(다\s*야|다\s*고)/gm, "$1$2");
    // 영단어 뒤 조사 붙이기
    result = result.replace(/([A-Za-z])\s+(하다|하는|할|해요|합니다)/gm, "$1$2");
  }

  // 모델이 임의로 두 줄 바꿈을 넣은 경우 한 줄 바꿈으로 강제 변환
  result = result.replace(/\n{2,}/g, "\n");

  return result;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { targetLanguage, customUrl, customApiKey, customModel } = body;

    // 단일 또는 배치 입력 지원
    const texts: string[] = body.texts || (body.text ? [body.text] : []);
    const isBatch = texts.length > 1;

    if (texts.length === 0 || !targetLanguage) {
      return NextResponse.json(
        { error: "text(s) and targetLanguage are required." },
        { status: 400 }
      );
    }

    // config.json에서 기본값 읽기, 클라이언트 값이 있으면 우선 사용
    const config = readConfig();
    const baseURL = customUrl || config.apiUrl;
    const apiKey = customApiKey || config.apiKey;
    const model = customModel || config.aiModel;

    const openai = new OpenAI({ baseURL, apiKey, timeout: REQUEST_TIMEOUT_MS, maxRetries: 0 });

    let completion = await requestCompletion(openai, targetLanguage, model, texts, isBatch);
    let rawResponse = completion.choices[0]?.message?.content || "";
    let usedModel = completion.model || model;

    if (isBatch) {
      // 배치 응답 파싱: 구분자로 분리
      let translatedParts = rawResponse.split(BATCH_SEPARATOR).map((s) => s.trim());

      // LLM이 잘못된 개수를 반환한 경우 fallback
      if (translatedParts.length !== texts.length) {
        // 줄바꿈으로 분리 시도
        const byNewline = rawResponse.split("\n").filter((s) => s.trim() !== "");
        if (byNewline.length === texts.length) {
          translatedParts = byNewline.map((s) => s.trim());
        } else {
          // 마지막 수단: 전체를 하나의 번역으로, 나머지는 원본 유지
          translatedParts = texts.map((original, i) =>
            i === 0 ? postProcess(rawResponse, targetLanguage) : original
          );
        }
      }

      let translatedTexts = translatedParts.map((t) => postProcess(t, targetLanguage));

      if (translatedTexts.some((translated, i) => isLikelyUntranslated(texts[i], translated, targetLanguage))) {
        completion = await requestCompletion(openai, targetLanguage, model, texts, isBatch, true);
        rawResponse = completion.choices[0]?.message?.content || "";
        usedModel = completion.model || usedModel;

        let retriedParts = rawResponse.split(BATCH_SEPARATOR).map((s) => s.trim());
        if (retriedParts.length !== texts.length) {
          const byNewline = rawResponse.split("\n").filter((s) => s.trim() !== "");
          if (byNewline.length === texts.length) {
            retriedParts = byNewline.map((s) => s.trim());
          }
        }
        if (retriedParts.length === texts.length) {
          translatedTexts = retriedParts.map((t) => postProcess(t, targetLanguage));
        }
      }

      return NextResponse.json({ translatedTexts, usedModel });
    } else {
      // 단일 번역 (하위 호환)
      let translatedText = postProcess(rawResponse, targetLanguage);
      if (isLikelyUntranslated(texts[0], translatedText, targetLanguage)) {
        completion = await requestCompletion(openai, targetLanguage, model, texts, isBatch, true);
        rawResponse = completion.choices[0]?.message?.content || "";
        usedModel = completion.model || usedModel;
        translatedText = postProcess(rawResponse, targetLanguage);
      }
      return NextResponse.json({ translatedText, usedModel });
    }
  } catch (error: any) {
    console.error("Translation API Error:", error);

    if (error.message?.includes("fetch failed") || error.message?.includes("ECONNREFUSED")) {
      return NextResponse.json(
        { error: "Ollama가 실행 중이지 않거나 연결할 수 없습니다. 터미널에서 'ollama serve' 또는 앱을 실행해주세요." },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || "Failed to translate text." },
      { status: 500 }
    );
  }
}
