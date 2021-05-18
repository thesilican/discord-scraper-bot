import { Command, Interaction } from "@thesilican/slash-commando";

const SCHOOL_END = new Date("2021-06-28T15:00:00-04:00").getTime();

export class CountdownCommand extends Command {
  constructor() {
    super({
      name: "countdown",
      description: "Number of days until school ends",
    });
  }
  async run(int: Interaction) {
    const now = new Date().getTime();
    const elapsed = SCHOOL_END - now;
    if (elapsed < 0) {
      return int.say("🦀🦀🦀 School is gone 🦀🦀🦀");
    }
    const days = Math.ceil(elapsed / (1000 * 60 * 60 * 24)).toString();
    const weeks = (elapsed / (1000 * 60 * 60 * 24 * 7)).toFixed(1);
    return int.say(
      `There are **${days} days** (${weeks} weeks) of school left`
    );
  }
}
