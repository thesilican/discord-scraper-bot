import { CommandClient } from "@thesilican/slash-commando";
import { ExportCommand } from "./commands/exportcommand";
import { GuessWhoCommand } from "./commands/guesswhocommand";
import { LeaderboardCommand } from "./commands/leaderboardcommand";
import { MyStatsCommand } from "./commands/mystatscommand";
import { PingCommand } from "./commands/pingcommand";
import { RandomMessageCommand } from "./commands/randommessagecommand";
import { ScrapeCommand } from "./commands/scrapecommand";
import { TopCommand } from "./commands/topcommand";
import { WordStatsCommand } from "./commands/wordstatscommand";
import { Database } from "./database";
import env from "./env";
import { PaginationHandler } from "./pagination";
import { handleProxyReaction, proxyMessage } from "./proxy";
import { filterChannel } from "./util";

async function main() {
  const database = await Database.build();
  const pagination = new PaginationHandler({ maxConcurrentPagination: 2 });

  const client = new CommandClient({
    owner: env.discord.owner,
    guild: env.discord.guild,
    token: env.discord.token,
    partials: ["MESSAGE", "REACTION"],
  });
  const commandOptions = {
    database,
    pagination,
  };
  client.registry.registerCommands([
    new LeaderboardCommand(commandOptions),
    new TopCommand(commandOptions),
    new MyStatsCommand(commandOptions),
    new WordStatsCommand(commandOptions),
    new RandomMessageCommand(commandOptions),
    new ScrapeCommand(commandOptions),
    new ExportCommand(commandOptions),
    new GuessWhoCommand(commandOptions),
    new PingCommand(),
  ]);
  await client.start();
  client.on("message", (msg) => {
    database.addMessage(msg);
    if (env.discord.proxyMessages === "yes") {
      proxyMessage(msg);
    }
  });
  client.on("messageDelete", (msg) => {
    database.removeMessageByID(msg.id);
  });
  client.on("messageDeleteBulk", (msgs) => {
    database.removeMessageByID(msgs.map((x) => x.id));
  });
  client.on("messageUpdate", async (_, msg) => {
    msg = await msg.fetch();
    await database.updateMessage(msg);
  });
  client.on("channelUpdate", async (_, channel) => {
    if (!filterChannel(channel)) {
      database.removeMessageByChannelID(channel.id);
    }
  });
  client.on("channelDelete", (channel) => {
    database.removeMessageByChannelID(channel.id);
  });
  client.on("messageReactionAdd", (reaction, user) => {
    // For privacy reasons, let messages be deleted
    // Even when proxy is off
    handleProxyReaction(reaction, user);
    pagination.handleReaction(reaction, user);
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
