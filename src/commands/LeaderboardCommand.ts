import { Client, Command, CommandMessage } from "its-not-commando";
import { User } from "../database";
import { Util } from "../util";
import { tableMenu } from "./common/tablemenu";

export default class LeaderboardCommand extends Command {
  constructor() {
    super({
      name: "leaderboard",
      aliases: ["lb"],
      group: "stats",
      description: "See who has said a particular word the most",
      dmAllowed: false,
      arguments: [
        {
          name: "word",
          optional: true,
          defaultValue: "bruh",
        },
      ],
    });
  }
  async run(msg: CommandMessage, args: string[], client: Client) {
    const word = Util.findWords(args[0]).join("");
    const message = await msg.say("Loading...");
    const res = await User.find();
    const wordList = res.map((r) => {
      const user = client.users.resolve(r.userID);
      const count = r.wordCount.get(word);
      return [user?.username ?? "DeletedUser", count ?? 0] as [string, number];
    });
    wordList.sort((a, b) => b[1] - a[1]);

    tableMenu({
      message: message,
      items: wordList,
      label: "Word: " + word,
      title: ":capital_abcd: | **Word Leaderboard**",
      transform: (x) => `${Util.padEnd(x[0], 15)} - ${x[1]}`,
      curIndex: 0,
    });
  }
}
