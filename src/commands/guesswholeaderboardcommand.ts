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
const BEST_STREAK = "streak-best";
const CURRENT_STREAK = "streak-current";

const template = `
**❓ | Guess Who Leaderboard**
-----------------------------------------------
Order: \`{sort-order}\`
\`\`\`markdown
RANK  NAME             CURR/LONG CORR/TOTAL CORR%
{table}

CURR/LONG - Current/Longest Streak
CORR/TOTAL - Correct/Total Attempts
CORR% - % Correct Attempts
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
            "The order you would like to sort the leaderboard. Default is sort by longest streak",
          type: "string",
          required: false,
          choices: [
            { name: "Longest Streak", value: BEST_STREAK },
            { name: "Current Streak", value: CURRENT_STREAK },
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

    // By default, sort by total attempts
    let sortOrderText = "undefined";
    users.sort((a, b) => b.total - a.total);
    if (int.args[0] === undefined || int.args[0] === BEST_STREAK) {
      sortOrderText = "Longest Streak";
      users.sort((a, b) => b.correct / b.total - a.correct / a.total);
      users.sort((a, b) => b.maxStreak - a.maxStreak);
    } else if (int.args[0] === CURRENT_STREAK) {
      sortOrderText = "Current Streak";
      users.sort((a, b) => b.correct / b.total - a.correct / a.total);
      users.sort((a, b) => b.streak - a.streak);
    } else if (int.args[0] === PROPORTIONAL) {
      sortOrderText = "% Correct";
      users.sort((a, b) => b.correct / b.total - a.correct / a.total);
    } else if (int.args[0] === TOTAL_CORRECT) {
      sortOrderText = "Total Correct";
      users.sort((a, b) => b.correct - a.correct);
    } else if (int.args[0] === TOTAL_ATTEMPTS) {
      sortOrderText = "Total Attempts";
    }

    const header: TableHeader[] = [
      { type: "ranking", width: 4 },
      { type: "literal", content: ". " },
      { type: "string", width: 15 },
      { type: "literal", content: "- " },
      { type: "number", width: 3, fixed: 0, align: "right" },
      { type: "literal", content: " / " },
      { type: "number", width: 3, fixed: 0, align: "left" },
      { type: "literal", content: " " },
      { type: "number", width: 3, fixed: 0, align: "right" },
      { type: "literal", content: " / " },
      { type: "number", width: 3, fixed: 0, align: "left" },
      { type: "literal", content: "   " },
      { type: "number", width: 3, fixed: 0, align: "right" },
      { type: "literal", content: "%" },
    ];
    const data = users.map((x) => {
      const username = int.guild.members.resolve(x._id)?.displayName;
      const percentage = 100 * (x.correct / x.total);
      return [
        null,
        null,
        `${username}`,
        null,
        x.streak,
        null,
        x.maxStreak,
        null,
        x.correct,
        null,
        x.total,
        null,
        percentage,
      ];
    });
    const pages = createTable({
      header,
      data,
      perPage: 20,
    }).map((t, i, arr) =>
      template
        .replace("{table}", t)
        .replace("{sort-order}", sortOrderText)
        .replace("{p}", (i + 1).toString())
        .replace("{t}", arr.length.toString())
    );
    this.pagination.createPagination(await int.say("\u2800"), pages);
  }
}
