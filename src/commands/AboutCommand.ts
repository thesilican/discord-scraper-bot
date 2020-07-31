import { Client, Command, CommandMessage } from "its-not-commando";

export default class AboutCommand extends Command {
  constructor() {
    super({
      name: "about",
      aliases: [],
      group: "stats",
      description: "Info about how this bot works",
    });
  }
  async run(msg: CommandMessage, args: string[], client: Client) {
    const msgText =
      "This bot keeps a record of all messages that have been sent in this server. " +
      "Messages are broken down into individual words. All symbols are ignored " +
      "and words are split using spaces. For example, the sentence `it's a lovely " +
      "day today`, would be split into the words `its`, `a`, `lovely`, `day`, `today`. " +
      "Sometimes this has strange side effects: For example, you might find `httpswwwgooglecom` " +
      "as a word you have said, but that's only because you were trying to type the url `https://" +
      "www.google.com`";
    msg.say(msgText);
  }
}
