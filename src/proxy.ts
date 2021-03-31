import { Message, MessageReaction, User, PartialUser } from "discord.js";
import env from "./env";

export async function proxyMessage(message: Message) {
  if (message.type !== "DEFAULT") {
    return;
  }
  if (message.attachments.size !== 0) {
    return;
  }
  if (message.embeds.length !== 0) {
    return;
  }
  if (message.author.bot) {
    return;
  }
  if (message.guild?.id !== env.discord.guild) {
    return;
  }
  if (!message.deletable) {
    return;
  }
  const content = message.content;
  const username = message.member!.displayName;
  const channel = message.channel;
  try {
    await message.delete();
    await channel.send(`**<${username}>** ${content}`);
  } catch {}
}

export async function handleProxyReaction(
  reaction: MessageReaction,
  user: User | PartialUser
) {
  if (reaction.emoji.toString() !== "❌") {
    return;
  }
  user = await user.fetch();
  const message = await reaction.message.fetch();
  const member = message.guild?.members.resolve(user);
  if (!member) return;
  const username = member.displayName;
  if (
    message.content.startsWith(`**<${username}>**`) &&
    message.author.id === message.client.user?.id
  ) {
    try {
      await message.delete();
    } catch {}
  }
}
