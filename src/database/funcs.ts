import { Message, TextChannel, Channel } from "discord.js";
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
  if (!filterChannel(message.channel)) {
    return false;
  }
  return true;
}

export function filterChannel(channel: Channel) {
  if (!(channel instanceof TextChannel)) {
    return false;
  }
  let everyoneDenied =
    channel.permissionOverwrites
      .get(channel.guild?.roles.everyone.id ?? "")
      ?.deny.has("VIEW_CHANNEL") ?? false;
  let filterRoleAllowed =
    channel.permissionOverwrites
      .get(env.discord.filterRole)
      ?.allow.has("VIEW_CHANNEL") ?? false;
  return !everyoneDenied || filterRoleAllowed;
}
