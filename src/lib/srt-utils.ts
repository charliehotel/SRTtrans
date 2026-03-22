/**
 * HTML 태그를 제거하고, 태그 정보를 저장합니다.
 * 번역 전에 태그를 제거하여 LLM이 깨끗한 텍스트만 번역하게 합니다.
 */
export interface TagInfo {
  original: string;
  stripped: string;
  tags: { start: number; end: number; tag: string }[];
}

/**
 * 자막 텍스트에서 HTML 태그를 추출/제거합니다.
 * <i>, <b>, <u>, <font ...>, </font> 등 일반적인 자막 태그를 처리합니다.
 */
export function stripHtmlTags(text: string): TagInfo {
  const tags: TagInfo["tags"] = [];
  const tagRegex = /<\/?[a-zA-Z][^>]*>/g;

  let match: RegExpExecArray | null;
  let offset = 0;

  // 태그 위치 기록
  while ((match = tagRegex.exec(text)) !== null) {
    tags.push({
      start: match.index - offset,
      end: match.index - offset,
      tag: match[0],
    });
    offset += match[0].length;
  }

  const stripped = text.replace(tagRegex, "");

  return { original: text, stripped, tags };
}

/**
 * 번역된 텍스트에 원본 태그를 복원합니다.
 * 원본 텍스트 전체를 감싸는 태그(예: <i>전체 문장</i>)는 번역 결과에도 동일하게 적용합니다.
 * 부분적 태그는 전체를 감싸는 방식으로 안전하게 복원합니다.
 */
export function restoreHtmlTags(tagInfo: TagInfo, translatedText: string): string {
  if (tagInfo.tags.length === 0) return translatedText;

  // 간단한 전략: 원본이 <tag>...전체...</tag> 로 감싸진 경우 번역에도 동일하게 감쌈
  const fullWrapMatch = tagInfo.original.match(/^<([a-zA-Z]+)[^>]*>([\s\S]*?)<\/\1>$/);
  if (fullWrapMatch) {
    const openTag = tagInfo.original.match(/^(<[^>]+>)/)?.[1] || "";
    const closeTag = tagInfo.original.match(/(<\/[^>]+>)$/)?.[1] || "";
    return `${openTag}${translatedText}${closeTag}`;
  }

  // 그 외 복잡한 태그 조합: 열린 태그/닫힌 태그를 짝지어서 앞뒤에 삽입
  const openTags = tagInfo.tags.filter((t) => !t.tag.startsWith("</"));
  const closeTags = tagInfo.tags.filter((t) => t.tag.startsWith("</"));

  if (openTags.length > 0 && closeTags.length > 0) {
    // 열린 태그는 원래 순서대로, 닫힌 태그는 역순으로 배치 (올바른 중첩)
    const opens = openTags.map((t) => t.tag).join("");
    const closes = closeTags.reverse().map((t) => t.tag).join("");
    return `${opens}${translatedText}${closes}`;
  }

  return translatedText;
}
