export interface SubtitleEntry {
  id: number;
  startTime: string;
  endTime: string;
  text: string;
}

/**
 * SRT 문자열을 SubtitleEntry 배열로 파싱합니다.
 * 멀티라인 자막, Windows/Mac/Linux 줄바꿈 모두 지원합니다.
 */
export function parseSRT(srtContent: string): SubtitleEntry[] {
  const entries: SubtitleEntry[] = [];

  // 줄바꿈 통일 후 블록 단위로 분리
  const normalized = srtContent.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks = normalized.split(/\n\n+/).filter((b) => b.trim() !== "");

  for (const block of blocks) {
    const lines = block.split("\n");
    if (lines.length < 3) continue;

    // 첫 줄: 자막 번호
    const id = parseInt(lines[0].trim(), 10);
    if (isNaN(id)) continue;

    // 둘째 줄: 타임스탬프
    const timeMatch = lines[1].match(
      /(\d{2}:\d{2}:\d{2},\d{3})\s*-->\s*(\d{2}:\d{2}:\d{2},\d{3})/
    );
    if (!timeMatch) continue;

    // 셋째 줄 이후: 자막 텍스트 (멀티라인 지원)
    const text = lines.slice(2).join("\n").trim();
    if (text === "") continue;

    entries.push({
      id,
      startTime: timeMatch[1],
      endTime: timeMatch[2],
      text,
    });
  }

  return entries;
}

/**
 * SubtitleEntry 배열을 SRT 문자열 포맷으로 변환합니다.
 * ID를 1부터 순차적으로 재번호 매깁니다.
 */
export function stringifySRT(entries: SubtitleEntry[]): string {
  return entries
    .map((entry, idx) => {
      const id = idx + 1; // 1부터 순차 재번호
      return `${id}\n${entry.startTime} --> ${entry.endTime}\n${entry.text}\n`;
    })
    .join("\n");
}
