import { Interaction } from "@thesilican/slash-commando";
import { createTable, TableHeader } from "../pagination";
import { extractWords } from "../util";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

const NUM_MESSAGES = "num-messages";
const NUM_WORDS = "num-words";
const NUM_UNIQUE_WORDS = "num-unique-words";

const template = `
**📨 | {server} message leaderboard**
-----------------------------------------------
Total messages sent: \`{totalMsgs}\` Total words said: \`{totalWords}\`
\`\`\`markdown
RANK  NAME           # MSGS  # WORDS # UNIQUE WORDS
{table}

Page {p} of {t}
\`\`\`
`;

export class TopCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "top",
      description: "See who's sent the most messages",
      arguments: [
        {
          name: "sort-by",
          description: "The order to sort results by. Default is 'Messages'",
          choices: [
            { name: "Messages", value: NUM_MESSAGES },
            { name: "Words", value: NUM_WORDS },
            { name: "Unique Words", value: NUM_UNIQUE_WORDS },
          ],
          required: false,
        },
        {
          name: "channel",
          description:
            "Checks messages from a specific channel only. If omitted, all channels will be searched",
          type: "channel",
          required: false,
        },
      ],
      ...options,
    });
  }

  async run(int: Interaction) {
    const usersMap = new Map<
      string,
      [msgCount: number, wordCount: number, uniqueWordCount: number]
    >();
    let totalMsgs = 0;
    let totalWords = 0;

    const channel = int.guild.channels.resolve(int.args[1]);
    const channelName = channel?.name;
    for await (const message of this.database.getMessages()) {
      if (channel?.id && message.channel !== channel.id) {
        continue;
      }
      if (!usersMap.has(message.user)) {
        usersMap.set(message.user, [0, 0, 0]);
      }
      const user = usersMap.get(message.user)!;
      user[0]++;
      totalMsgs++;
      const words = extractWords(message.content);
      for (const [, count] of words) {
        user[1] += count;
        totalWords += count;
        user[2]++;
      }
    }

    // Fetch usernames
    const usernames = new Map<string, string>();
    for (const [userID] of usersMap) {
      const user = await int.client.users.fetch(userID);
      if (!user) {
        usernames.set(userID, "Unknown User");
      } else {
        usernames.set(userID, user.username);
      }
    }

    const users: [
      username: string,
      msgCount: number,
      wordCount: number,
      uniqueWordCount: number
    ][] = Array.from(usersMap).map((x) => [
      usernames.get(x[0])!,
      x[1][0],
      x[1][1],
      x[1][2],
    ]);

    users.sort((a, b) => a[0].localeCompare(b[0]));
    if (int.args[0] === undefined || int.args[0] === NUM_MESSAGES) {
      users.sort((a, b) => b[1] - a[1]);
    } else if (int.args[0] === NUM_WORDS) {
      users.sort((a, b) => b[2] - a[2]);
    } else if (int.args[0] === NUM_UNIQUE_WORDS) {
      users.sort((a, b) => b[3] - a[3]);
    }

    const data = users.map((x) => [
      null,
      null,
      x[0],
      null,
      x[1],
      null,
      x[2],
      null,
      x[3],
    ]);
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
        width: 6,
        fixed: 0,
        align: "left",
      },
      {
        type: "literal",
        content: "- ",
      },
      {
        type: "number",
        width: 6,
        fixed: 0,
        align: "left",
      },
      {
        type: "literal",
        content: "- ",
      },
      {
        type: "number",
        width: 6,
        fixed: 0,
        align: "left",
      },
    ];

    const pages = createTable({ header, data, perPage: 20 }).map((t, i, arr) =>
      template
        .replace("{table}", t)
        .replace("{server}", channelName ? `#${channelName}` : int.guild.name)
        .replace("{totalMsgs}", totalMsgs.toFixed(0))
        .replace("{totalWords}", totalWords.toFixed(0))
        .replace("{p}", (i + 1).toFixed(0))
        .replace("{t}", arr.length.toFixed(0))
    );
    this.pagination.createPagination(await int.say("\u2800"), pages);
  }
}
