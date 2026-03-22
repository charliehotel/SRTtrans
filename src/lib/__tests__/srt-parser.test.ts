import { describe, it, expect } from "vitest";
import { parseSRT, stringifySRT } from "../srt-parser";

describe("parseSRT", () => {
  it("should parse a basic SRT string", () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,000 --> 00:00:08,000
Goodbye, world!
`;
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      id: 1,
      startTime: "00:00:01,000",
      endTime: "00:00:04,000",
      text: "Hello, world!",
    });
    expect(entries[1]).toEqual({
      id: 2,
      startTime: "00:00:05,000",
      endTime: "00:00:08,000",
      text: "Goodbye, world!",
    });
  });

  it("should handle Windows-style line endings (\\r\\n)", () => {
    const srt = "1\r\n00:00:01,000 --> 00:00:04,000\r\nHello\r\n\r\n2\r\n00:00:05,000 --> 00:00:08,000\r\nWorld\r\n";
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("Hello");
    expect(entries[1].text).toBe("World");
  });

  it("should parse multiline subtitles", () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
Line one
Line two
Line three

2
00:00:05,000 --> 00:00:08,000
Single line
`;
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("Line one\nLine two\nLine three");
    expect(entries[1].text).toBe("Single line");
  });

  it("should handle HTML tags in text", () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000
<i>Italicized text</i>

2
00:00:05,000 --> 00:00:08,000
<b>Bold</b> and <i>italic</i>
`;
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(2);
    expect(entries[0].text).toBe("<i>Italicized text</i>");
    expect(entries[1].text).toBe("<b>Bold</b> and <i>italic</i>");
  });

  it("should return empty array for empty input", () => {
    expect(parseSRT("")).toHaveLength(0);
    expect(parseSRT("   \n\n  ")).toHaveLength(0);
  });

  it("should skip malformed blocks (no timestamp)", () => {
    const srt = `1
This is not a timestamp
Hello

2
00:00:05,000 --> 00:00:08,000
Valid entry
`;
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("Valid entry");
  });

  it("should skip blocks with empty text", () => {
    const srt = `1
00:00:01,000 --> 00:00:04,000


2
00:00:05,000 --> 00:00:08,000
Has text
`;
    const entries = parseSRT(srt);
    expect(entries).toHaveLength(1);
    expect(entries[0].text).toBe("Has text");
  });
});

describe("stringifySRT", () => {
  it("should convert entries back to SRT format with sequential IDs", () => {
    const entries = [
      { id: 0, startTime: "00:00:00,000", endTime: "00:00:05,000", text: "Info line" },
      { id: 42, startTime: "00:00:01,000", endTime: "00:00:04,000", text: "Hello" },
      { id: 99, startTime: "00:00:05,000", endTime: "00:00:08,000", text: "World" },
    ];
    const result = stringifySRT(entries);

    // IDs should be 1, 2, 3 regardless of original IDs
    expect(result).toContain("1\n00:00:00,000 --> 00:00:05,000\nInfo line");
    expect(result).toContain("2\n00:00:01,000 --> 00:00:04,000\nHello");
    expect(result).toContain("3\n00:00:05,000 --> 00:00:08,000\nWorld");
  });

  it("should preserve multiline text", () => {
    const entries = [
      { id: 1, startTime: "00:00:01,000", endTime: "00:00:04,000", text: "Line one\nLine two" },
    ];
    const result = stringifySRT(entries);
    expect(result).toContain("Line one\nLine two");
  });

  it("should roundtrip parse and stringify", () => {
    const original = `1
00:00:01,000 --> 00:00:04,000
Hello, world!

2
00:00:05,000 --> 00:00:08,000
Second line
Third line
`;
    const entries = parseSRT(original);
    const result = stringifySRT(entries);
    const reparsed = parseSRT(result);

    expect(reparsed).toHaveLength(2);
    expect(reparsed[0].text).toBe("Hello, world!");
    expect(reparsed[1].text).toBe("Second line\nThird line");
  });
});
