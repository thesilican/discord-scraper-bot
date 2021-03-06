import { Interaction } from "@thesilican/slash-commando";
import { GuildMember, MessageEmbed, TextChannel } from "discord.js";
import {
  ScraperBotCommand,
  ScraperBotCommandOptions,
} from "./scraperbotcommand";

const template = `
{contents}
- {author}, [{date}]({link})
`;

export class RandomMessageCommand extends ScraperBotCommand {
  constructor(options: ScraperBotCommandOptions) {
    super({
      name: "random",
      description: "Find a random message that you've said before",
      arguments: [
        {
          name: "user",
          description:
            "The user you would like to see word statistics about. Default is yourself",
          type: "user",
          required: false,
        },
        {
          name: "channel",
          description:
            "Searches messages from a specific channel only. If omitted, all channels will be searched",
          type: "channel",
          required: false,
        },
      ],
      ...options,
    });
  }

  async run(int: Interaction) {
    let queryUser: GuildMember;
    if (int.args[0]) {
      const res = int.guild.members.resolve(int.args[0]);
      if (res === null) {
        return int.say("Unknown member");
      }
      queryUser = res;
    } else {
      queryUser = int.member;
    }
    let queryChannel: TextChannel | undefined = undefined;
    if (int.args[1]) {
      const channel = int.guild.channels.resolve(int.args[1]);
      if (channel !== null && channel instanceof TextChannel) {
        queryChannel = channel;
      }
    }

    const messageDoc = await this.database.getMessageRandom(
      queryUser.id,
      queryChannel?.id
    );
    if (messageDoc === null) {
      if (queryUser.user.bot) {
        return int.say("Stats are not tracked for bots");
      } else {
        return int.say("Unable to find a message");
      }
    }

    const channel = int.guild.channels.resolve(messageDoc.channel);
    if (!channel || !(channel instanceof TextChannel)) {
      return int.say("Unable to resolve channel");
    }
    await channel.messages.fetch({ around: messageDoc._id });
    const message = channel.messages.resolve(messageDoc._id);
    if (!message) {
      return int.say("Unable to resolve message");
    }

    const contents =
      "> \n" +
      message.cleanContent
        .split("\n")
        .map((x) => `> ${x}`)
        .join("\n") +
      "\n> ";
    const date = message.createdAt.toDateString();
    const link = `https://discord.com/channels/${int.guild.id}/${channel.id}/${message.id}`;
    const embed = new MessageEmbed().setDescription(
      template
        .replace("{contents}", contents)
        .replace("{author}", message.author.username)
        .replace("{link}", link)
        .replace("{date}", date)
    );
    int.say("", embed);
  }
}
