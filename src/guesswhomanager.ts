import { Interaction } from "@thesilican/slash-commando";
import { Message, MessageEmbed, TextChannel } from "discord.js";
import { Cursor, FilterQuery } from "mongodb";
import { Database, MessageSchema } from "./database";
import { chunk, shuffle, sleep } from "./util";

const guessEmbedTemplate = `
{contents}
- ???
`;
const guessTextTemplate = `
**Who said this?**
{options}
`;
const guessEmbedFooterTemplate = `
Type 1, 2, 3, or 4 to guess
Answer will show in 12 seconds
`;
const answerEmbedTemplate = `
**Answer:**
> {name} ([{date}]({link}))
**Score:**
{score}
`;

const MAX_NUM_OPTIONS = 4;
const MIN_MESSAGE_LEN = 15;

export class GuessWhoManager {
  inGame: boolean;
  guesses: Map<string, number>;
  constructor() {
    this.inGame = false;
    this.guesses = new Map();
  }
  async runGame(int: Interaction, database: Database) {
    if (this.inGame) {
      const msg = await int.say(
        "Please wait until the current /guess-who is over"
      );
      await sleep(5000);
      return await msg.delete();
    }
    this.inGame = true;
    this.guesses.clear();
    // Set a guess, to prevent cheesing
    this.guesses.set(int.member.id, -1);

    // Get a message
    const getUsername = (id: string) =>
      int.guild.members.resolve(id)?.displayName ?? "unknown";
    const [messages, answer] = await this.getRandomMessages(int, database);

    // Fetch info for correct message
    const correctDoc = messages[answer];
    if (!correctDoc) {
      this.inGame = false;
      return await int.say("There was a problem: Error reading answer doc");
    }
    const correctChannel = int.guild.channels.resolve(correctDoc.channel);
    if (correctChannel === null || !(correctChannel instanceof TextChannel)) {
      this.inGame = false;
      return await int.say("There was a problem: Error resolving channel");
    }
    await correctChannel.messages.fetch({ around: correctDoc._id, limit: 5 });
    const correctMessage = correctChannel.messages.resolve(correctDoc._id);
    if (correctMessage === null) {
      this.inGame = false;
      return await int.say("There was a problem: Error resolving message");
    }
    const correctName = correctMessage.member!.displayName;
    const correctDate = correctMessage.createdAt.toDateString();
    const correctLink = `https://discord.com/channels/${int.guild.id}/${correctChannel.id}/${correctMessage.id}`;

    // Send first message
    const questionEmbed = new MessageEmbed()
      .setDescription(
        guessEmbedTemplate.replace(
          "{contents}",
          "> \n" +
            correctMessage.cleanContent
              .split("\n")
              .map((x) => `> ${x}`)
              .join("\n") +
            "\n> "
        )
      )
      .setFooter(guessEmbedFooterTemplate);
    const questionText = guessTextTemplate.replace(
      "{options}",
      chunk(4, messages)
        .map((chunk, i) =>
          chunk
            .map((x, j) => `${i * 4 + j + 1}. \`${getUsername(x.user)}\``)
            .join(" ")
        )
        .join("\n")
    );
    const questionMsg = await int.say(questionText, questionEmbed);

    await sleep(12000);

    // Calculate score text
    this.inGame = false;
    const scoreTextArr = [];
    for (const [id, guess] of this.guesses) {
      const name = getUsername(id);
      const isCorrect = guess === answer + 1;

      const res = await database.getGuessWhoLeaderboard(id);
      const newCorrect = (res?.correct ?? 0) + (isCorrect ? 1 : 0);
      const newTotal = (res?.total ?? 0) + 1;
      const newStreak = isCorrect ? (res?.streak ?? 0) + 1 : 0;
      const newMaxStreak = Math.max(res?.maxStreak ?? 0, newStreak);

      const emoji = isCorrect ? "✅" : "❌";
      const streak = newStreak === 0 ? "" : `(${newStreak} streak)`;
      scoreTextArr.push(`- ${name} ${emoji} ${streak}`);
      await database.updateGuessWhoLeaderboard({
        _id: id,
        correct: newCorrect,
        total: newTotal,
        streak: newStreak,
        maxStreak: newMaxStreak,
      });
    }
    this.guesses.clear();

    // Send final message
    let answerEmbedText = answerEmbedTemplate
      .replace("{name}", correctName)
      .replace("{date}", correctDate)
      .replace("{link}", correctLink)
      .replace("{score}", scoreTextArr.join("\n"));
    try {
      // @ts-ignore
      await int.client.api.channels[questionMsg.channel.id].messages.post({
        data: {
          content: "",
          embed: {
            description: answerEmbedText,
          },
          message_reference: {
            message_id: questionMsg.id,
            channel_id: questionMsg.channel.id,
            guild_id: questionMsg.guild!.id,
          },
        },
      });
    } catch (err) {
      console.error(err);
      await int.say("There was an error sending the message");
    }
  }

  async getRandomMessages(int: Interaction, database: Database) {
    // Seperate one for users and messages
    // In case an invalid user is found
    const foundUsers = new Set<string>();
    const messageMap = new Map<string, MessageSchema>();
    while (messageMap.size !== MAX_NUM_OPTIONS) {
      // Custom scraper function
      const filter: FilterQuery<MessageSchema> = {
        user: {
          $nin: Array.from(foundUsers),
        },
        content: {
          // Any string at least MIN_MESSAGE_LEN length
          $regex: `^[\\s\\S]{${MIN_MESSAGE_LEN},}$`,
        },
      };
      const count = await database.messages.countDocuments(filter);
      // Escape if there aren't enough people
      if (count === 0) {
        break;
      }
      const cursor: Cursor<MessageSchema> = database.messages.find(filter);
      const randIndex = Math.floor(Math.random() * count);
      let resultMessage: MessageSchema | null = null;
      let i = 0;
      for await (const doc of cursor) {
        if (i === randIndex) {
          resultMessage = doc;
          break;
        }
        i++;
      }
      if (resultMessage === null) {
        // This should really never happen, because count > 0
        break;
      }
      // Sanity check
      foundUsers.add(resultMessage.user);
      try {
        await int.guild.members.fetch(resultMessage.user);
      } catch {}
      if (int.guild.members.resolve(resultMessage.user) === null) {
        continue;
      }
      messageMap.set(resultMessage.user, resultMessage);
    }
    const messages = Array.from(messageMap.values());
    shuffle(messages);
    const answer = Math.floor(Math.random() * messages.length);
    return [messages, answer] as const;
  }

  handleMessage(message: Message) {
    if (!this.inGame) return;
    if (message.author.bot) return;
    const match = message.content.trim().match(/^\d$/);
    if (!match) return;
    const num = parseInt(match[0], 10);
    if (isNaN(num)) return;
    this.guesses.set(message.author.id, num);
  }
}
