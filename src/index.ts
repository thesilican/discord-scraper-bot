import { Client } from "its-not-commando";
import AboutCommand from "./commands/AboutCommand";
import LeaderboardCommand from "./commands/LeaderboardCommand";
import MyWordsCommand from "./commands/MyWordsCommand";
import ScrapeCommand from "./commands/ScrapeCommand";
import { DISCORD_TOKEN, DISCORD_SERVER_ID } from "./config";
import "./database/index";
import { DatabaseFuncs } from "./database/index";
import { Util } from "./util";

const client = new Client({
  owner: "294169610679484417",
  prefix: "b.",
  token: DISCORD_TOKEN,
});
client.registry.registerGroups([
  {
    name: "stats",
    description: "Server statistic commands",
  },
]);
client.registry.registerCommands([
  AboutCommand,
  ScrapeCommand,
  LeaderboardCommand,
  MyWordsCommand,
]);
client.start();
client.on("message", (m) => {
  if (m.guild?.id !== DISCORD_SERVER_ID) return;
  DatabaseFuncs.addMessage({
    messageID: m.id,
    channelID: m.channel.id,
    content: m.content,
    contentWords: Util.findWords(m.content),
    userID: m.author.id,
    username: m.author.username,
  });
});
