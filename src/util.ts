import { GuildChannel, TextChannel } from "discord.js";

export function isTextChannel(channel: GuildChannel): channel is TextChannel {
  return channel.type === "text";
}

export function normString(text: string): string {
  return text
    .normalize()
    .toLowerCase()
    .replace(/[^a-z\s]/g, "");
}
