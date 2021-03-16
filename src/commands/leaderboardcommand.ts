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
`;

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
    const query = await this.database.getUsersByWord(word);

    const usernames = new Map<string, string>();
    for (const [userID] of query) {
      const user = await int.client.users.fetch(userID);
      if (!user) {
        usernames.set(userID, "Unknown User");
      } else {
        usernames.set(userID, user.username);
      }
    }

    const data = Array.from(query).map(
      (x) =>
        [null, null, usernames.get(x[0]), null, x[1]] as [
          null,
          null,
          string,
          null,
          number
        ]
    );
    data.sort((a, b) => b[4] - a[4]);
    const totalWords = data.reduce((a, v) => a + v[4], 0);
    if (data.length === 0) {
      return int.say(`It appears that noone has ever said \`${word}\``);
    }

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
    createPagination(await int.say("\u2800"), pages);
  }
}
