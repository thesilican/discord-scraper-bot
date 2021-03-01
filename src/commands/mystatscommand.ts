import { GuildMember } from "discord.js";
import { DatabaseCommand } from "./databasecommand";
import { Interaction } from "@thesilican/slash-commando";
import { createPagination, createTable, TableHeader } from "../pagination";
import { Database } from "../database";

const FREQUENCY = "frequency";
const FREQUENCY_REVERSE = "frequency-reverse";
const ALPHABETICAL = "alphabetical";
const ALPHABETICAL_REVERSE = "alphabetical-reverse";

const template = `
**🔠 | {name}'s word statistics**
-----------------------------------------------
Total words: \`{words}\` Total Messages: \`{messages}\`
\`\`\`markdown
RANK  WORD             FREQUENCY
{table}

Page {p} of {t}
\`\`\`
`.trim();

export class MyStatsCommand extends DatabaseCommand {
  constructor(database: Database) {
    super({
      name: "mystats",
      description: "Check your word usage stats",
      arguments: [
        {
          name: "user",
          description:
            "The user you would like to see word statistics about. Default is yourself",
          type: "user",
          required: false,
        },
        {
          name: "sort-order",
          description:
            "The order you would like to sort your words. Default is sort by frequency (descending)",
          type: "string",
          required: false,
          choices: [
            { name: "Frequency (Descending)", value: FREQUENCY },
            { name: "Frequency (Ascending)", value: FREQUENCY_REVERSE },
            { name: "Alphabetical (A-Z)", value: ALPHABETICAL },
          ],
        },
      ],
      database,
    });
  }

  async run(int: Interaction) {
    let member: GuildMember;
    if (int.args[0]) {
      const res = int.guild.members.resolve(int.args[0]);
      if (res === null) {
        return int.say("Unknown member");
      }
      member = res;
    } else {
      member = int.member;
    }

    const stats = await this.database.getUserStats(member.id);
    const totalMessages = await this.database.getUserMessagesCount(member.id);
    if (stats === null) {
      if (member.user.bot) {
        return int.say(`Stats are not tracked for bots`);
      } else {
        return int.say(
          `No words were found for that user (perhaps they haven't said anything yet?)`
        );
      }
    }

    const words: [word: string, frequency: number][] = [];
    for (const word of Object.keys(stats.words)) {
      words.push([word, stats.words[word]]);
    }
    if (int.args[1] === undefined || int.args[1] === FREQUENCY) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
      words.sort((a, b) => b[1] - a[1]);
    } else if (int.args[1] === FREQUENCY_REVERSE) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
      words.sort((a, b) => a[1] - b[1]);
    } else if (int.args[1] === ALPHABETICAL) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (int.args[1] === ALPHABETICAL_REVERSE) {
      words.sort((a, b) => b[0].localeCompare(a[0]));
    }
    const totalWords = words.reduce((a, v) => a + v[1], 0);

    const data = words.map((x) => [null, null, x[0], null, x[1]]);

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
    const tablePages = createTable({
      header,
      data,
      perPage: 20,
    });

    const pages = tablePages.map((t, i) =>
      template
        .replace("{table}", t)
        .replace("{name}", member.user.username)
        .replace("{words}", totalWords.toString())
        .replace("{messages}", totalMessages.toString())
        .replace("{p}", (i + 1).toString())
        .replace("{t}", tablePages.length.toString())
    );
    createPagination(await int.say("."), pages);
  }
}
