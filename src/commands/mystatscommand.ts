import { Interaction } from "@thesilican/slash-commando";
import { User } from "discord.js";
import { createTable, TableHeader } from "../pagination";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

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

export class MyStatsCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
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
      ...options,
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

    const data = Array.from(user.entries()).map(
      (x) =>
        [null, null, x[0], null, x[1]] as [null, null, string, null, number]
    );

    if (int.args[0] === undefined || int.args[0] === FREQUENCY) {
      data.sort((a, b) => a[2].localeCompare(b[2]));
      data.sort((a, b) => b[4] - a[4]);
    } else if (int.args[0] === FREQUENCY_REVERSE) {
      data.sort((a, b) => a[2].localeCompare(b[2]));
      data.sort((a, b) => a[4] - b[4]);
    } else if (int.args[0] === ALPHABETICAL) {
      data.sort((a, b) => a[2].localeCompare(b[2]));
    } else if (int.args[0] === ALPHABETICAL_REVERSE) {
      data.sort((a, b) => b[2].localeCompare(a[2]));
    }
    const totalWords = data.reduce((a, v) => a + v[4], 0);

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
    this.pagination.createPagination(await int.say("\u2800"), pages);
  }
}
