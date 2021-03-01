import { Interaction } from "@thesilican/slash-commando";
import { Database } from "../database";
import { createPagination, createTable, TableHeader } from "../pagination";
import { normString } from "../util";
import { DatabaseCommand } from "./databasecommand";

const template = `
**🏆 | Word leaderboard**
-----------------------------------------------
Word: \`{word}\` Total count: \`{total}\`
\`\`\`markdown
RANK  NAME             COUNT
{table}

Page {p} of {t}
\`\`\`
`.trim();

export class LeaderboardCommand extends DatabaseCommand {
  constructor(database: Database) {
    super({
      name: "leaderboard",
      description: "See who's said 'bruh' the most (or another word)",
      arguments: [
        {
          name: "word",
          description:
            "The word to check the leaderboard for. Default is 'bruh'",
          required: false,
        },
      ],
      database,
    });
  }

  async run(int: Interaction) {
    const word = normString(int.args[0] ?? "bruh");
    const query = await this.database.getUsersWord(word);

    const users: [user: string, count: number][] = [];
    for (const user of query) {
      if (user.words[word] !== undefined) {
        let username: string;
        try {
          const member = await int.guild.members.fetch(user._id);
          username = member.user.username;
        } catch {
          username = "Unknown User";
        }
        users.push([username, user.words[word]]);
      }
    }
    users.sort((a, b) => b[1] - a[1]);
    const totalWords = users.reduce((a, v) => a + v[1], 0);

    if (users.length === 0) {
      return int.say(`It appears that noone has ever said \`${word}\``);
    }

    const data = users.map((x) => [null, null, x[0], null, x[1]]);
    const header: TableHeader[] = [
      {
        type: "ranking",
        width: 4,
        column: 4,
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
        .replace(/{word}/g, word)
        .replace("{total}", totalWords.toString())
        .replace("{p}", (i + 1).toString())
        .replace("{t}", tablePages.length.toString())
    );
    createPagination(await int.say("."), pages);
  }
}
