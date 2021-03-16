import { Interaction } from "@thesilican/slash-commando";
import { TextChannel } from "discord.js";
import { Database } from "../database";
import { createPagination, createTable, TableHeader } from "../pagination";
import { DatabaseCommand } from "./databasecommand";

const ALPHABETICAL = "alphabetical";
const FREQUENCY = "frequency";

const template = `
**🔠 | {server} word statistics**
-----------------------------------------------
Total words: \`{words}\` Total Messages: \`{messages}\`
\`\`\`markdown
RANK  WORD             FREQUENCY
{table}

Page {p} of {t}
\`\`\`
`;

export class WordStatsCommand extends DatabaseCommand {
  constructor(database: Database) {
    super({
      name: "wordstats",
      description: "Check the server word usage stats",
      arguments: [
        {
          name: "sort-by",
          description:
            "The order you would like to sort your words. Default is sort by frequency",
          type: "string",
          required: false,
          choices: [
            { name: "Frequency", value: FREQUENCY },
            { name: "Alphabetical (A-Z)", value: ALPHABETICAL },
          ],
        },
        {
          name: "channel",
          description:
            "Checks messages from a specific channel only. If omitted, all channels will be searched",
          type: "channel",
          required: false,
        },
      ],
      database,
    });
  }

  async run(int: Interaction) {
    let query: Map<string, number>;
    let totalMessages: number;
    let channelName: string | null = null;
    if (int.args[1]) {
      let channel = int.guild.channels.resolve(int.args[1]);
      if (!channel) {
        return int.say("Unable to resolve channel: " + int.args[1]);
      }
      if (!(channel instanceof TextChannel)) {
        return int.say("Channel " + channel.name + " is not a text channel");
      }
      channelName = channel.name;
      query = await this.database.getWordsByChannel(int.args[1]);
      totalMessages = await this.database.getMessageCountByChannel(int.args[1]);
    } else {
      query = await this.database.getWords();
      totalMessages = await this.database.getMessageCount();
    }
    const data = Array.from(query.entries()).map(
      (x) =>
        [null, null, x[0], null, x[1]] as [null, null, string, null, number]
    );
    const totalWords = data.reduce((a, v) => a + v[4], 0);
    if (int.args[0] === undefined || int.args[0] === FREQUENCY) {
      data.sort((a, b) => a[2].localeCompare(b[2]));
      data.sort((a, b) => b[4] - a[4]);
    } else if (int.args[0] === ALPHABETICAL) {
      data.sort((a, b) => a[2].localeCompare(b[2]));
    }

    const header: TableHeader[] = [
      {
        type: "ranking",
        width: 4,
      },
      {
        type: "literal",
        content: ". ",
      },
      {
        type: "string",
        width: 15,
      },
      {
        type: "literal",
        content: "- ",
      },
      {
        type: "number",
        width: 4,
        fixed: 0,
        align: "left",
      },
    ];

    const pages = createTable({
      header,
      data,
      perPage: 20,
    }).map((t, i, arr) =>
      template
        .replace("{table}", t)
        .replace("{server}", channelName ? `#${channelName}` : int.guild.name)
        .replace("{words}", totalWords.toString())
        .replace("{messages}", totalMessages.toString())
        .replace("{p}", (i + 1).toString())
        .replace("{t}", arr.length.toString())
    );

    createPagination(await int.say("\u2800"), pages);
  }
}
