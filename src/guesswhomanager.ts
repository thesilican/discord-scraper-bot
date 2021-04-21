import { Interaction } from "@thesilican/slash-commando";
import { Message, TextChannel, MessageEmbed } from "discord.js";
import { Database, MessageSchema } from "./database";
import { shuffle, sleep } from "./util";

const guessEmbedTemplate = `
{contents}
- ???
`;
const guessTextTemplate = `
**Who said this?**
1. \`{opt1}\` 2. \`{opt2}\` 3. \`{opt3}\` 4. \`{opt4}\`
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

const NUM_OPTIONS = 4;

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

    // Get a message
    const messageMap = new Map<string, MessageSchema>();
    let escape = 0;
    while (messageMap.size < NUM_OPTIONS && escape < 100) {
      const message = await database.getMessageRandom();
      if (message) {
        messageMap.set(message.user, message);
      }
      escape++;
    }
    if (escape === 100) {
      this.inGame = false;
      return await int.say("Something went wrong... Please try again");
    }
    const answer = Math.floor(Math.random() * NUM_OPTIONS);
    const messages = Array.from(messageMap);
    shuffle(messages);

    // Fetch message, format contents
    const correctMessageDoc = messages[answer][1];
    try {
      await int.guild.members.fetch(messages[answer][0]);
    } catch {}
    const correctUsername = int.guild.members.resolve(messages[answer][0])
      ?.displayName;
    const channel = int.guild.channels.resolve(correctMessageDoc.channel);
    if (!channel || !(channel instanceof TextChannel)) {
      this.inGame = false;
      return int.say("Unable to resolve channel");
    }
    await channel.messages.fetch({ around: correctMessageDoc._id });
    const message = channel.messages.resolve(correctMessageDoc._id);
    if (!message) {
      this.inGame = false;
      return int.say("Unable to resolve message");
    }
    const date = message.createdAt.toDateString();
    const link = `https://discord.com/channels/${int.guild.id}/${channel.id}/${message.id}`;
    const contents =
      "> \n" +
      message.cleanContent
        .split("\n")
        .map((x) => `> ${x}`)
        .join("\n") +
      "\n> ";

    let embed1Text = guessEmbedTemplate.replace("{contents}", contents);
    let msg1Text = guessTextTemplate;
    for (let i = 0; i < NUM_OPTIONS; i++) {
      try {
        await int.guild.members.fetch(messages[i][0]);
      } catch {}
      const username = int.guild.members.resolve(messages[i][0])?.displayName;
      msg1Text = msg1Text.replace(`{opt${i + 1}}`, `${username}`);
    }
    // First embed message
    const embed1 = new MessageEmbed()
      .setDescription(embed1Text)
      .setFooter(guessEmbedFooterTemplate);
    const msg1 = await int.say(msg1Text, embed1);

    await sleep(12000);

    // Second message (answer)
    this.inGame = false;
    let score = [];
    for (const [id, guess] of this.guesses) {
      const name = int.guild.members.resolve(id)?.displayName;
      const res = await database.getGuessWhoLeaderboard(id);
      const isCorrect = guess === answer + 1;
      const correctAmount = (res?.correct ?? 0) + (isCorrect ? 1 : 0);
      const totalAmount = (res?.total ?? 0) + 1;
      const col =
        `⠀${name} ${isCorrect ? "✅" : "❌"}` +
        ` (${correctAmount}/${totalAmount})`;
      score.push(col);
      await database.updateGuessWhoLeaderboard(id, correctAmount, totalAmount);
    }
    this.guesses.clear();
    let embed2Text = answerEmbedTemplate
      .replace("{name}", `${correctUsername}`)
      .replace("{date}", date)
      .replace("{link}", link)
      .replace("{score}", score.join("\n"));
    try {
      // @ts-ignore
      const res = await int.client.api.channels[msg1.channel.id].messages.post({
        data: {
          content: "",
          embed: {
            description: embed2Text,
          },
          message_reference: {
            message_id: msg1.id,
            channel_id: msg1.channel.id,
            guild_id: msg1.guild!.id,
          },
        },
      });
    } catch (err) {}
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
