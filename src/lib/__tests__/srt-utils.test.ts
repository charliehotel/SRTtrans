import { describe, it, expect } from "vitest";
import { stripHtmlTags, restoreHtmlTags } from "../srt-utils";

describe("stripHtmlTags", () => {
  it("should strip simple tags", () => {
    const result = stripHtmlTags("<i>Hello</i>");
    expect(result.stripped).toBe("Hello");
    expect(result.tags).toHaveLength(2);
  });

  it("should strip nested tags", () => {
    const result = stripHtmlTags("<b><i>Bold italic</i></b>");
    expect(result.stripped).toBe("Bold italic");
  });

  it("should strip font tags", () => {
    const result = stripHtmlTags('<font color="#ff0000">Red text</font>');
    expect(result.stripped).toBe("Red text");
  });

  it("should return original for text without tags", () => {
    const result = stripHtmlTags("No tags here");
    expect(result.stripped).toBe("No tags here");
    expect(result.tags).toHaveLength(0);
  });

  it("should handle empty string", () => {
    const result = stripHtmlTags("");
    expect(result.stripped).toBe("");
    expect(result.tags).toHaveLength(0);
  });
});

describe("restoreHtmlTags", () => {
  it("should restore wrapping tags", () => {
    const tagInfo = stripHtmlTags("<i>Hello world</i>");
    const restored = restoreHtmlTags(tagInfo, "안녕하세요");
    expect(restored).toBe("<i>안녕하세요</i>");
  });

  it("should restore bold tags", () => {
    const tagInfo = stripHtmlTags("<b>Important</b>");
    const restored = restoreHtmlTags(tagInfo, "중요");
    expect(restored).toBe("<b>중요</b>");
  });

  it("should return as-is when no tags", () => {
    const tagInfo = stripHtmlTags("No tags");
    const restored = restoreHtmlTags(tagInfo, "태그 없음");
    expect(restored).toBe("태그 없음");
  });

  it("should handle mixed open/close tags", () => {
    const tagInfo = stripHtmlTags("<b>Text</b> <i>more</i>");
    // Non-wrapped case: open tags forward, close tags reversed for correct nesting
    const restored = restoreHtmlTags(tagInfo, "번역된 텍스트");
    expect(restored).toContain("<b>");
    expect(restored).toContain("<i>");
    expect(restored).toContain("번역된 텍스트");
    // Close tags should be in reverse order: </i></b>
    expect(restored).toMatch(/번역된 텍스트<\/i><\/b>$/);
  });
});
