import { Interaction } from "@thesilican/slash-commando";
import { TextChannel } from "discord.js";
import { Database } from "../database";
import env from "../env";
import { filterChannel, scrapeChannel } from "../util";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

export class ScrapeCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "scrape",
      description:
        "(OWNER ONLY!) Run a full scrape of the server, or of a particular channel",
      arguments: [
        {
          name: "channel",
          description: "Which channel to scrape",
          type: "channel",
          required: false,
        },
        {
          name: "keep-database",
          description: "Whether or not to keep database records when scraping",
          type: "boolean",
          required: false,
        },
      ],
      ...options,
    });
  }

  async run(int: Interaction) {
    if (int.member.id !== env.discord.owner) {
      return int.say("Only the bot owner may use this command");
    }

    let channels: TextChannel[];
    if (int.args[0]) {
      const channel = int.guild.channels.resolve(int.args[0]);
      if (!channel || !(channel instanceof TextChannel)) {
        return int.say("That is not a valid text channel");
      }
      channels = [channel];
    } else {
      channels = int.guild.channels.cache
        .array()
        .filter((x): x is TextChannel => x instanceof TextChannel)
        .filter(filterChannel)
        .sort((a, b) => a.rawPosition - b.rawPosition);
    }

    if (!int.args[1]) {
      await this.database.deleteMessage("all");
    }
    try {
      await scrape(int, channels, this.database);
    } catch (err) {
      await int.say("An error occured while scraping...");
      console.error(err);
    }
  }
}

async function scrape(
  int: Interaction,
  channels: TextChannel[],
  database: Database
) {
  const msgText =
    `Scraping ${channels.length} channels: ` +
    channels.map((x) => `<#${x.id}>`).join(" ");
  await int.say(msgText);

  let total = 0;
  for (const channel of channels) {
    const scrapeMsg = await int.say(`Scraping <#${channel.id}>...`);
    let round = 0;
    let totalChannel = 0;
    for await (const messages of scrapeChannel(channel)) {
      await database.createMessage(messages.array());
      total += messages.size;
      totalChannel += messages.size;
      round++;
      if (round % 10 === 0) {
        await scrapeMsg.edit(
          `Scraping <#${channel.id}>... (${totalChannel} messages)`
        );
      }
    }
    await scrapeMsg.edit(
      `Finished scraping <#${channel.id}> (${totalChannel} messages)`
    );
  }
  return await int.say(
    `Succesfully scraped ${total} messages from \`${int.guild.name}\``
  );
}
