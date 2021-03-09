import { Message, TextChannel } from "discord.js";
import { normString } from "../util";
import env from "../env";

export type MessageSchema = {
  _id: string;
  content: string;
  user: string;
  channel: string;
};

export function extractWords(text: string) {
  const words = new Map<string, number>();
  normString(text)
    .split(/\s+/)
    .filter((x) => x.length > 0)
    .forEach((x) => words.set(x, (words.get(x) ?? 0) + 1));
  return words;
}

export function filterMessage(message: Message) {
  if (message.author.bot) {
    return false;
  }
  if (message.type !== "DEFAULT") {
    return false;
  }
  if (!(message.channel instanceof TextChannel)) {
    return false;
  }
  let everyone = message.channel.permissionOverwrites.get(
    message.guild?.roles.everyone.id ?? ""
  );
  let filterRole = message.channel.permissionOverwrites.get(
    env.discord.filterRole
  );
  // Either @everyone is NOT denied or filter role is allowed
  if (
    !everyone?.deny.has("VIEW_CHANNEL") ||
    filterRole?.allow.has("VIEW_CHANNEL")
  ) {
    return true;
  }
  return false;
}
