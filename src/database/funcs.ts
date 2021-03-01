import { Message } from "discord.js";
import { normString } from "../util";

export function extractWords(text: string) {
  const words = new Map<string, number>();
  normString(text)
    .split(/\s+/)
    .filter((x) => x.length > 0)
    .forEach((x) => words.set(x, (words.get(x) ?? 0) + 1));
  return words;
}

export function filterMessages(message: Message) {
  if (message.author.bot) {
    return false;
  }
  if (message.type !== "DEFAULT") {
    return false;
  }
  return true;
}
