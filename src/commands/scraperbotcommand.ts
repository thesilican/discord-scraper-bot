import { Command, CommandOptions } from "@thesilican/slash-commando";
import { Database } from "../database";
import { GuessWhoManager } from "../guesswhomanager";
import { PaginationHandler } from "../pagination";

export type ScraperBotCommandOptions = {
  database: Database;
  pagination: PaginationHandler;
  guessWhoManager: GuessWhoManager;
};

export type ScraperBotCommandCombinedOptions = CommandOptions &
  ScraperBotCommandOptions;

export abstract class ScraperBotCommand extends Command {
  database: Database;
  pagination: PaginationHandler;
  guessWhoManager: GuessWhoManager;
  constructor(options: ScraperBotCommandCombinedOptions) {
    super(options);
    this.database = options.database;
    this.pagination = options.pagination;
    this.guessWhoManager = options.guessWhoManager;
  }
}
