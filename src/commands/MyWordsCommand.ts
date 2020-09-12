import { Client, Command, CommandMessage, Validator } from "its-not-commando";
import { User, Message } from "../database";
import { tableMenu } from "./common/tablemenu";
import { Util } from "../util";

export default class MyWordsCommand extends Command {
  constructor() {
    super({
      name: "mywords",
      aliases: ["me"],
      group: "stats",
      description: "View a list of your top words",
      arguments: [
        {
          name: "user",
          validator: Validator.User,
          optional: true,
        },
        {
          name: "word",
          optional: true,
        },
      ],
      rateLimit: {
        seconds: 20,
        max: 3,
      },
    });
  }
  async run(msg: CommandMessage, args: string[], client: Client) {
    const discordUser = client.users.resolve(args[0]) ?? msg.author;
    const word =
      args[1] !== undefined ? Util.findWords(args[1]).join("") : null;
    const message = await msg.say("Loading...");
    const user = await User.findOne({ userID: discordUser.id });
    if (!user) {
      message.edit("Unable to find " + discordUser.username + " in database");
      return;
    }
    const numMessages = (await Message.find({ userID: discordUser.id })).length;

    const wordList = Array.from(user.wordCount.entries());
    wordList.sort((a, b) => b[1] - a[1]);
    const index = wordList.findIndex((x) => x[0] === word);
    const totalSum = wordList.reduce((a, v) => a + v[1], 0);

    tableMenu({
      message: message,
      curIndex: index !== -1 ? index : 0,
      items: wordList,
      label: `Total words: ${totalSum} Total messages: ${numMessages}`,
      title: `:capital_abcd: | **${discordUser.username}'s top words**`,
      transform: (x) => `${Util.padEnd(x[0], 20)} - ${x[1]}`,
    });
  }
}
