import { Command, Interaction } from "@thesilican/slash-commando";

const replies = [
  "What's up, {user}",
  "Hwapinngggggg",
  "Hwapinngggggg",
  "Hwapinngggggg",
  "Yes?",
  "Don't worry I'm still alive",
  "Pong!",
  "Pong!",
  "Pong!",
  "Why must you disturb me",
];

export class PingCommand extends Command {
  constructor() {
    super({
      name: "ping",
      description: "Check if the bot is online",
    });
  }

  async run(int: Interaction) {
    const index = Math.floor(Math.random() * replies.length);
    const msgText = replies[index].replace("{user}", int.member.user.username);
    int.say(msgText);
  }
}
