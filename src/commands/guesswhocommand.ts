import { Interaction } from "@thesilican/slash-commando";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

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
