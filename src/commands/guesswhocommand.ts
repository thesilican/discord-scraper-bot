import { Interaction } from "@thesilican/slash-commando";
import { MessageEmbed, TextChannel } from "discord.js";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

const template = `
{contents}
- ||{author} [{date}]({link})||
`;

export class GuessWhoCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "guess-who",
      description: "Like /random, but try to guess who said it",
      ...options,
    });
  }

  async run(int: Interaction) {
    await this.guessWhoManager.runGame(int, this.database);
  }
}
