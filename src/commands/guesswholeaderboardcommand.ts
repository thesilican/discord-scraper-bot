import { Interaction } from "@thesilican/slash-commando";
import { GuessWhoLeaderboardSchema } from "../database";
import { createTable, TableHeader } from "../pagination";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

const TOTAL_CORRECT = "total-correct";
const TOTAL_ATTEMPTS = "total-attempts";
const PROPORTIONAL = "proportional";

const template = `
**❓ | Guess Who leaderboard**
-----------------------------------------------
\`\`\`markdown
RANK  NAME            CORR% CORR/TOTAL 
{table}

Page {p} of {t}
\`\`\`
`;

export class GuessWhoLeaderboardCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "guess-who-leaderboard",
      description: "Leaderboard for /guess-who",
      arguments: [
        {
          name: "sort-by",
          description:
            "The order you would like to sort the leaderboard. Default is sort by percentage",
          type: "string",
          required: false,
          choices: [
            { name: "Percentage", value: PROPORTIONAL },
            { name: "Total Correct", value: TOTAL_CORRECT },
            { name: "Total Attempts", value: TOTAL_ATTEMPTS },
          ],
        },
      ],
      ...options,
    });
  }
  async run(int: Interaction) {
    const users: GuessWhoLeaderboardSchema[] = [];
    for await (const doc of this.database.getGuessWhoLeaderboardCursor()) {
      if (doc.total > 0) {
        users.push(doc);
      }
      try {
        await int.guild.members.fetch(doc._id);
      } catch {}
    }

    if (int.args[0] === undefined || int.args[0] === PROPORTIONAL) {
      users.sort((a, b) => b.correct / b.total - a.correct / a.total);
    } else if (int.args[0] === TOTAL_CORRECT) {
      users.sort((a, b) => b.correct - a.correct);
    } else if (int.args[0] === TOTAL_ATTEMPTS) {
      users.sort((a, b) => b.total - a.total);
    }

    const header: TableHeader[] = [
      {
        type: "ranking",
        width: 4,
        column:
          int.args[0] === undefined || int.args[0] === PROPORTIONAL
            ? 4
            : undefined,
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
        width: 3,
        fixed: 0,
        align: "right",
      },
      {
        type: "literal",
        content: "%",
      },
      {
        type: "number",
        width: 4,
        fixed: 0,
        align: "right",
      },
      {
        type: "literal",
        content: " / ",
      },
      {
        type: "number",
        width: 4,
        fixed: 0,
        align: "left",
      },
    ];
    const data = users.map((x) => {
      const username = int.guild.members.resolve(x._id)?.displayName;
      const percentage = 100 * (x.correct / x.total);
      return [
        null,
        null,
        `${username}`,
        null,
        percentage,
        null,
        x.correct,
        null,
        x.total,
      ];
    });
    const pages = createTable({
      header,
      data,
      perPage: 20,
    }).map((t, i, arr) =>
      template
        .replace("{table}", t)
        .replace("{p}", (i + 1).toString())
        .replace("{t}", arr.length.toString())
    );
    this.pagination.createPagination(await int.say("\u2800"), pages);
  }
}
