import { Interaction } from "@thesilican/slash-commando";
import { Collection, Message, TextChannel } from "discord.js";
import { Database } from "../database";
import env from "../env";
import { isTextChannel } from "../util";
import { DatabaseCommand } from "./databasecommand";

export class ScrapeCommand extends DatabaseCommand {
  constructor(database: Database) {
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
      ],
      database,
    });
  }

  async run(int: Interaction) {
    if (int.member.id !== env.discord.owner) {
      return int.say("Only the bot owner may use this command");
    }

    let channels: TextChannel[];
    if (int.args[0]) {
      const channel = int.guild.channels.resolve(int.args[0]);
      if (!channel || !isTextChannel(channel)) {
        return int.say("That is not a valid text channel");
      }
      channels = [channel];
    } else {
      channels = int.guild.channels.cache
        .array()
        .filter(isTextChannel)
        .sort((a, b) => a.rawPosition - b.rawPosition);
    }

    await this.database.clear();
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

  // Lock in the first message to prevent duplicate messages being added
  const LIMIT = 100;
  let total = 0;
  const lastMessages = new Map<string, Message | undefined>();
  for (const channel of channels) {
    const last = (await channel.messages.fetch()).sort().last();
    lastMessages.set(channel.id, last);
    if (last !== undefined) {
      await database.addMessage(last);
      total++;
    }
  }

  for (const channel of channels) {
    const scrapeMsg = await int.say(`Scraping <#${channel.id}>...`);

    let lastMessage = lastMessages.get(channel.id);

    let lastFetched = LIMIT;
    let totalFetched = 1;
    let round = 0;

    while (lastMessage !== undefined && lastFetched === LIMIT) {
      const res: Collection<string, Message> = await channel.messages.fetch({
        limit: LIMIT,
        before: lastMessage.id,
      });
      await database.addMessage(res.array());

      lastMessage = res.sort().first();
      lastFetched = res.size;
      totalFetched += res.size;
      total += res.size;
      round++;
      if (round % 10 === 0) {
        await scrapeMsg.edit(
          `Scraping <#${channel.id}>... (${round * LIMIT} messages)`
        );
      }
    }
    await scrapeMsg.edit(
      `Finished scraping <#${channel.id}> (${totalFetched} messages)`
    );
  }
  return await int.say(
    `Succesfully scraped ${total} messages from \`${int.guild.name}\``
  );
}
