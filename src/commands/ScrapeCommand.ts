import Discord from "discord.js";
import { Client, Command, CommandMessage, Validator } from "its-not-commando";
import { DISCORD_SERVER_ID } from "../config";
import { DatabaseFuncs, Message, User } from "../database";
import { Util } from "../util";

type ChannelRemaining = {
  channel: Discord.TextChannel;
  before?: string;
};

const LIMIT = 100;
async function scrape(
  guild: Discord.Guild,
  msg: CommandMessage,
  channelIDs?: string[]
) {
  let round: number,
    msgText: string,
    numMessages: number,
    totalMessages: number;

  // Get a list of channels
  let channels: ChannelRemaining[] = [];
  if (channelIDs) {
    channels = channelIDs
      .map((c) => guild.channels.resolve(c))
      .filter((c) => c instanceof Discord.TextChannel)
      .map((c) => ({
        channel: c as Discord.TextChannel,
        before: undefined,
      }));
  } else {
    channels = guild.channels.cache
      .array()
      .filter((c) => c instanceof Discord.TextChannel)
      .map((c) => ({
        channel: c as Discord.TextChannel,
        before: undefined,
      }));
  }
  channels.sort((a, b) => a.channel.position - b.channel.position);

  msgText = `Scraping ${channels.length} channels: ${channels
    .map((c) => c.channel.name)
    .join(", ")}`;

  console.log(msgText);
  await msg.say(msgText);

  // Scrape each channel
  totalMessages = 0;
  const numChannels = channels.length;
  for (let i = 0; i < numChannels; i++) {
    const channel = channels[i];
    msgText = `${i + 1}/${numChannels} Scraping #${channel.channel.name} (${
      channel.channel.id
    })`;
    console.log(msgText);
    await msg.say(`**${msgText}**`);
    round = 0;

    // Scrape messages from channel
    do {
      round++;
      numMessages = 0;
      const res = await channel.channel.messages.fetch({
        limit: LIMIT,
        before: channel.before,
      });
      for (const m of res.array()) {
        await DatabaseFuncs.addMessage({
          messageID: m.id,
          channelID: m.channel.id,
          userID: m.author.id,
          username: m.author.username ?? "DeletedUser",
          content: m.content,
          contentWords: Util.findWords(m.content),
        });
        numMessages++;
        totalMessages++;
      }
      channel.before = res.last()?.id;
      msgText = `Round ${round}: ${numMessages} messages`;
      console.log(msgText);
      if (round % 10 === 1 || numMessages !== LIMIT) {
        await msg.say(msgText);
      }
    } while (numMessages === LIMIT);
  }
  msgText =
    "Successfully scraped " +
    totalMessages +
    " messages from " +
    numChannels +
    " channels ";
  console.log(msgText);
  await msg.say(msgText);
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
          name: "channels-or-confirm",
          optional: true,
          multi: true,
        },
      ],
    });
  }
  public async run(msg: CommandMessage, args: string[], client: Client) {
    const guild = client.guilds.resolve(DISCORD_SERVER_ID);
    if (!guild) {
      msg.say("Could not find guild with id " + args[0]);
      return;
    }
    let channels: string[] | undefined;
    let yes = false;
    if (args[0] === "yes") {
      msg.say("Clearing databases...");
      await Promise.all([Message.collection.drop(), User.collection.drop()]);
      yes = true;
    } else {
      channels = args[1]?.split(" ");
    }
    if (!channels && !yes) {
      msg.say(
        "You must use `b.scrape yes` or `b.scrape 123124 123125424 123124`..."
      );
      return;
    }
    msg.say("Starting to scrape " + guild.name + "...");
    try {
      await scrape(guild, msg, channels);
    } catch (error) {
      msg.say(error + "");
    }
  }
}
