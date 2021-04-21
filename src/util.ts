import { Channel, Collection, Message, TextChannel } from "discord.js";
import env from "./env";

export function normString(text: string): string {
  return text
    .normalize()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "");
}

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
      .get(channel.guild.roles.everyone.id ?? "")
      ?.deny.has("VIEW_CHANNEL") ?? false;
  let filterRoleAllowed =
    channel.permissionOverwrites
      .get(env.discord.filterRole)
      ?.allow.has("VIEW_CHANNEL") ?? false;
  return !everyoneDenied || filterRoleAllowed;
}

export async function* scrapeChannel(channel: TextChannel, limit = 100) {
  if (limit <= 0 || limit > 100) {
    throw new Error("limit must be between 0-100");
  }
  let res: Collection<string, Message>;
  let before: string | undefined;
  do {
    res = await channel.messages.fetch({ limit, before });
    if (res.size === 0) {
      break;
    }
    before = res.sort().first()?.id;
    yield res;
  } while (res.size === limit);
}

export function sleep(ms?: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

export function shuffle<T>(arr: T[]) {
  for (let i = arr.length - 1; i >= 1; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}
