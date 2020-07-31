import { Client, Command, CommandMessage, Validator } from "its-not-commando";
import Discord from "discord.js";
import { Message, MessageInterface, DatabaseFuncs, User } from "../database";
import { promisify } from "util";
import { Util } from "../util";
import mongoose from "mongoose";
import { DISCORD_SERVER_ID } from "../config";
const sleep = promisify(setTimeout);

type ChannelRemaining = {
  channel: Discord.TextChannel;
  before?: string;
};

const LIMIT = 100;
async function scrape(guild: Discord.Guild, msg: CommandMessage) {
  const channels: ChannelRemaining[] = guild.channels.cache
    .array()
    .filter((c) => c instanceof Discord.TextChannel)
    .map((c) => ({
      channel: c as Discord.TextChannel,
      before: (c as Discord.TextChannel).lastMessageID ?? undefined,
    }));
  const numChannels = channels.length;
  console.log(
    "Scraping",
    numChannels,
    "channels:\n",
    channels.map((c) => c.channel.name).join(", ")
  );
  let round = 0;
  let numMessages = 0;
  while (channels.length > 0) {
    round++;
    const statusText =
      "Round " + round + " with " + channels.length + " channels";
    console.log(statusText);
    msg.say(statusText);
    const promises: Promise<Discord.Collection<string, Discord.Message>>[] = [];
    for (const channel of channels) {
      promises.push(
        channel.channel.messages.fetch({
          limit: LIMIT,
          before: channel.before,
        })
      );
    }
    const results = await Promise.all(promises);
    for (const res of results) {
      for (const msg of res.array()) {
        await DatabaseFuncs.addMessage({
          messageID: msg.id,
          channelID: msg.channel.id,
          userID: msg.author.id,
          username: msg.author.username ?? "DeletedUser",
          content: msg.content,
          contentWords: Util.findWords(msg.content),
        });
        numMessages++;
      }
    }
    for (let i = results.length - 1; i >= 0; i--) {
      if (results[i].size !== LIMIT) {
        channels.splice(i, 1);
      } else {
        channels[i].before = results[i].last()?.id;
      }
    }
  }
  console.log(
    "Successfully scraped",
    numMessages,
    "messages from",
    numChannels,
    "channels"
  );
  msg.say(
    "Successfully scraped " +
      numMessages +
      " messages from " +
      numChannels +
      " channels "
  );
}

export default class ScrapeCommand extends Command {
  constructor() {
    super({
      name: "scrape",
      aliases: [],
      description: "Scrape the entire discord",
      ownerOnly: true,
      arguments: [
        {
          name: "confirm",
          optional: true,
          defaultValue: "no",
        },
        {
          name: "clear-cache",
          validator: Validator.Boolean,
          optional: true,
          defaultValue: "true",
        },
      ],
    });
  }
  public async run(msg: CommandMessage, args: string[], client: Client) {
    const guild = client.guilds.resolve(DISCORD_SERVER_ID);
    if (args[0] !== "yes") {
      msg.say("You must confirm using `b.scrape yes`");
      return;
    }
    const clearCache = args[1];
    if (clearCache) {
      msg.say("Clearing databases...");
      await Promise.all([Message.collection.drop(), User.collection.drop()]);
    }
    if (!guild) {
      msg.say("Could not find guild with id " + args[0]);
      return;
    }
    msg.say("Starting to scrape " + guild.name + "...");
    await scrape(guild, msg);
  }
}
