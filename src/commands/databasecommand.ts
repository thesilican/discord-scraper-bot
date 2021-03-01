import { Command, CommandOptions } from "@thesilican/slash-commando";
import { Database } from "../database";

type DatabaseCommandOptions = CommandOptions & {
  database: Database;
};

export abstract class DatabaseCommand extends Command {
  database: Database;
  constructor(options: DatabaseCommandOptions) {
    super(options);
    this.database = options.database;
  }
}
