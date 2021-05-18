import { CommandClient } from "@thesilican/slash-commando";
import { CountdownCommand } from "./commands/countdowncommand";
import { ExportCommand } from "./commands/exportcommand";
import { GuessWhoCommand } from "./commands/guesswhocommand";
import { GuessWhoLeaderboardCommand } from "./commands/guesswholeaderboardcommand";
import { LeaderboardCommand } from "./commands/leaderboardcommand";
import { MyStatsCommand } from "./commands/mystatscommand";
import { PingCommand } from "./commands/pingcommand";
import { RandomMessageCommand } from "./commands/randommessagecommand";
import { ScrapeCommand } from "./commands/scrapecommand";
import { TopCommand } from "./commands/topcommand";
import { WordStatsCommand } from "./commands/wordstatscommand";
import { Database } from "./database";
import env from "./env";
import { GuessWhoManager } from "./guesswhomanager";
import { PaginationHandler } from "./pagination";
import { filterChannel } from "./util";

async function main() {
  const client = new CommandClient({
    owner: env.discord.owner,
    guild: env.discord.guild,
    token: env.discord.token,
    partials: ["MESSAGE", "REACTION"],
  });

  const database = await Database.build();
  const pagination = new PaginationHandler({ maxConcurrentPagination: 2 });
  const guessWhoManager = new GuessWhoManager();
  const commandOptions = {
    database,
    pagination,
    guessWhoManager,
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
    new GuessWhoLeaderboardCommand(commandOptions),
    new PingCommand(),
    new CountdownCommand(),
  ]);
  await client.start();
  client.on("message", (msg) => {
    database.createMessage(msg);
    guessWhoManager.handleMessage(msg);
  });
  client.on("messageDelete", (msg) => {
    database.deleteMessage("id", msg.id);
  });
  client.on("messageDeleteBulk", (msgs) => {
    database.deleteMessage(
      "id",
      msgs.map((x) => x.id)
    );
  });
  client.on("messageUpdate", async (_, msg) => {
    msg = await msg.fetch();
    await database.updateMessage(msg);
  });
  client.on("channelUpdate", async (_, channel) => {
    if (!filterChannel(channel)) {
      database.deleteMessage("channel", channel.id);
    }
  });
  client.on("channelDelete", (channel) => {
    database.deleteMessage("channel", channel.id);
  });
  client.on("messageReactionAdd", (reaction, user) => {
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
