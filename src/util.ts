const notAlphaNumericWhitespace = /[^a-z0-9\s]/g;
const whitespace = /\s+/g;

export const Util = {
  findWords(content: string): string[] {
    return content
      .toLowerCase()
      .replace(notAlphaNumericWhitespace, "")
      .replace(whitespace, " ")
      .trim()
      .split(" ")
      .filter((x) => x !== "");
  },
  padEnd(text: string, length: number, padding = " ") {
    if (text.length > length) {
      return text.slice(0, length - 1) + "…";
    } else {
      return text.padEnd(length, padding);
    }
  },
};
