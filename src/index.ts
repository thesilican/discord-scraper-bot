import { CommandClient } from "@thesilican/slash-commando";
import { LeaderboardCommand } from "./commands/leaderboardcommand";
import { MyStatsCommand } from "./commands/mystatscommand";
import { PingCommand } from "./commands/pingcommand";
import { RandomMessageCommand } from "./commands/randommessagecommand";
import { ScrapeCommand } from "./commands/scrapecommand";
import { TopCommand } from "./commands/topcommand";
import { WordStatsCommand } from "./commands/wordstatscommand";
import { Database } from "./database";
import { filterChannel } from "./database/funcs";
import env from "./env";

async function main() {
  const database = await Database.build();

  const client = new CommandClient({
    owner: env.discord.owner,
    guild: env.discord.guild,
    token: env.discord.token,
    partials: ["MESSAGE", "CHANNEL"],
  });
  client.registry.registerCommands([
    new LeaderboardCommand(database),
    new TopCommand(database),
    new MyStatsCommand(database),
    new WordStatsCommand(database),
    new RandomMessageCommand(database),
    new ScrapeCommand(database),
    new PingCommand(),
  ]);
  await client.start();
  client.on("message", (msg) => {
    database.addMessage(msg);
  });
  client.on("messageDelete", (msg) => {
    database.removeMessageByID(msg.id);
  });
  client.on("messageDeleteBulk", (msgs) => {
    database.removeMessageByID(msgs.map((x) => x.id));
  });
  client.on("messageUpdate", async (msg) => {
    msg = await msg.fetch();
    await database.updateMessage(msg);
  });
  client.on("channelUpdate", (channel) => {
    // Remove messages that loose visibility
    if (!filterChannel(channel)) {
      database.removeMessageByChannelID(channel.id);
    }
  });
  client.on("channelDelete", (channel) => {
    database.removeMessageByChannelID(channel.id);
  });

  let exited = false;
  async function handleExit() {
    if (exited) return;
    exited = true;
    await client.stop();
    await database.close();
    console.log("Gracefully exited");
  }
  process.on("SIGINT", handleExit);
  process.on("SIGTERM", handleExit);
  process.on("exit", handleExit);
}
main();
