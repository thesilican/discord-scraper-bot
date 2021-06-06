import { Command, Interaction } from "@thesilican/slash-commando";

const SCHOOL_END = new Date("2021-06-25T15:00:00-04:00");

export class CountdownCommand extends Command {
  constructor() {
    super({
      name: "countdown",
      description: "Number of days until school ends",
    });
  }
  async run(int: Interaction) {
    const elapsed = SCHOOL_END.getTime() - new Date().getTime();
    if (elapsed < 0) {
      return int.say("🦀🦀🦀 School is gone 🦀🦀🦀");
    }
    const days = Math.ceil(elapsed / (1000 * 60 * 60 * 24)).toString();
    const weeks = (elapsed / (1000 * 60 * 60 * 24 * 7)).toFixed(1);
    // Sketchy
    const date = SCHOOL_END.toDateString().match(/\w+ (\w+ \w+) \w+/)![1];
    return int.say(
      `There are **${days} days** (${weeks} weeks) of school left (until ${date})`
    );
  }
}
