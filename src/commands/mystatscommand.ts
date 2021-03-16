import { Interaction } from "@thesilican/slash-commando";
import { User } from "discord.js";
import { Database } from "../database";
import { createPagination, createTable, TableHeader } from "../pagination";
import { DatabaseCommand } from "./databasecommand";

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
`;

export class MyStatsCommand extends DatabaseCommand {
  constructor(database: Database) {
    super({
      name: "mystats",
      description: "Check your word usage stats",
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
          name: "user",
          description:
            "The user you would like to see word statistics about. Default is yourself",
          type: "user",
          required: false,
        },
      ],
      database,
    });
  }

  async run(int: Interaction) {
    let discordUser: User;
    if (int.args[1]) {
      const res = int.client.users.resolve(int.args[1]);
      if (res === null) {
        return int.say("Unknown user");
      }
      discordUser = res;
    } else {
      discordUser = int.member.user;
    }

    const user = await this.database.getUserWords(discordUser.id);
    const totalMessages = await this.database.getMessageCountByUser(
      discordUser.id
    );
    if (totalMessages === 0) {
      if (discordUser.bot) {
        return int.say(`Stats are not tracked for bots`);
      } else {
        return int.say(
          `No words were found for that user (perhaps they haven't said anything yet?)`
        );
      }
    }

    const words: [word: string, frequency: number][] = Array.from(
      user.entries()
    );
    if (int.args[0] === undefined || int.args[0] === FREQUENCY) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
      words.sort((a, b) => b[1] - a[1]);
    } else if (int.args[0] === FREQUENCY_REVERSE) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
      words.sort((a, b) => a[1] - b[1]);
    } else if (int.args[0] === ALPHABETICAL) {
      words.sort((a, b) => a[0].localeCompare(b[0]));
    } else if (int.args[0] === ALPHABETICAL_REVERSE) {
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
    const pages = createTable({
      header,
      data,
      perPage: 20,
    }).map((t, i, arr) =>
      template
        .replace("{table}", t)
        .replace("{name}", discordUser.username)
        .replace("{words}", totalWords.toString())
        .replace("{messages}", totalMessages.toString())
        .replace("{p}", (i + 1).toString())
        .replace("{t}", arr.length.toString())
    );
    createPagination(await int.say("\u2800"), pages);
  }
}