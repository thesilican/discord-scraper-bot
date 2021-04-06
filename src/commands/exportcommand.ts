import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";
import { Interaction } from "@thesilican/slash-commando";
import env from "../env";
import { extractWords } from "../util";
import { MessageAttachment } from "discord.js";
import zlib from "zlib";

export class ExportCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "export",
      description: "(OWNER ONLY!) Create a JSON dump of all the messages",
      ...options,
    });
  }
  async run(int: Interaction) {
    if (int.member.id !== env.discord.owner) {
      return int.say("Only the owner may use this command");
    }
    const data: any[] = [];
    const cursor = this.database.getMessages();
    for await (const message of cursor) {
      const words: { [word: string]: number } = {};
      const wordsMap = Array.from(extractWords(message.content).entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .sort((a, b) => b[1] - a[1]);
      for (const [word, count] of wordsMap) {
        words[word] = count;
      }
      data.push({
        id: message._id,
        content: message.content,
        user: message.user,
        channel: message.channel,
        words,
      });
    }
    data.sort((a, b) => a.id.localeCompare(b.id));

    const buffer = Buffer.from(JSON.stringify({ data }));
    const deflated = await new Promise<Buffer>((res, rej) => {
      zlib.gzip(buffer, (err, data) => {
        if (err) rej(err);
        res(data);
      });
    });
    const date = new Date().toISOString().match(/^(\d\d\d\d-\d\d-\d\d)/)![1];
    const filename = `message-dump-${date}.json.gz`;
    const attachment = new MessageAttachment(deflated, filename);

    await int.say("Sent export to DM");
    const dmChannel = await int.member.user.createDM();
    const msg = await dmChannel.send("", { files: [attachment] });
    await msg.react("✔");
    await msg.awaitReactions(() => true, { max: 1, time: 5 * 60 * 1000 });
    await msg.delete();
  }
}
