import { CommandClient } from "@thesilican/slash-commando";
import { LeaderboardCommand } from "./commands/leaderboardcommand";
import { MyStatsCommand } from "./commands/mystatscommand";
import { RandomMessageCommand } from "./commands/randommessagecommand";
import { ScrapeCommand } from "./commands/scrapecommand";
import { Database } from "./database";
import env from "./env";

async function main() {
  const database = await Database.build();

  const client = new CommandClient({
    owner: env.discord.owner,
    guild: env.discord.guild,
    token: env.discord.token,
  });
  client.registry.registerCommands([
    new LeaderboardCommand(database),
    new MyStatsCommand(database),
    new RandomMessageCommand(database),
    new ScrapeCommand(database),
  ]);
  // Commands to add:
  // - /leaderboard <word> (word usage leaderboard)
  // - /my-stats <user> (user word usage count)
  // - /random <user> (find a random message from that user)
  client.start();
  client.on("message", (msg) => {
    database.addMessage(msg);
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
