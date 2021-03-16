import { Message } from "discord.js";
import {
  Collection,
  Cursor,
  Db,
  FilterQuery,
  MongoClient,
  MongoError,
} from "mongodb";
import env from "../env";
import { extractWords, filterMessage, MessageSchema } from "./funcs";

export type DatabaseOptions = {
  client: MongoClient;
  db: Db;
  messages: Collection;
};

export class Database {
  client: MongoClient;
  db: Db;
  messages: Collection;
  constructor(options: DatabaseOptions) {
    this.client = options.client;
    this.db = options.db;
    this.messages = options.messages;
  }

  async addMessage(messages: Message | Message[]) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    messages = messages.filter(filterMessage);
    if (messages.length === 0) {
      return;
    }

    const messageDocs = messages.map((m) => ({
      _id: m.id,
      content: m.cleanContent,
      user: m.author.id,
      channel: m.channel.id,
    }));
    try {
      await this.messages.insertMany(messageDocs, { ordered: false });
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // ignore duplicate key errors
      } else {
        console.error("Error writing message documents:", err);
      }
    }
  }
  async updateMessage(messages: Message | Message[]) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    messages = messages.filter(filterMessage);
    // Do them individually
    for (const message of messages) {
      await this.messages.findOneAndUpdate(
        { _id: message.id },
        { $set: { content: message.content } }
      );
    }
  }
  async removeMessageByID(id: string | string[]) {
    if (!Array.isArray(id)) {
      id = [id];
    }
    await this.messages.deleteMany({ _id: { $in: id } });
  }
  async removeMessageByChannelID(channelID: string | string[]) {
    if (!Array.isArray(channelID)) {
      channelID = [channelID];
    }
    await this.messages.deleteMany({ channel: { $in: channelID } });
  }
  async removeAll() {
    await this.messages.deleteMany({});
  }

  getMessages() {
    return this.messages.find({}) as Cursor<MessageSchema>;
  }
  async getUserWords(userID: string): Promise<Map<string, number>> {
    const cursor: Cursor<MessageSchema> = this.messages.find({ user: userID });
    const words = new Map<string, number>();
    for await (const message of cursor) {
      for (const [word, count] of extractWords(message.content)) {
        const newCount = (words.get(word) ?? 0) + count;
        words.set(word, newCount);
      }
    }
    return words;
  }
  async getUserMessageRandom(userID: string, channelID?: string) {
    let query: FilterQuery<any>;
    if (channelID === undefined) {
      query = { user: userID };
    } else {
      query = { user: userID, channel: channelID };
    }

    const count = await this.messages.countDocuments(query);
    if (count === 0) return null;
    const cursor = this.messages.find(query);
    const index = Math.floor(count * Math.random());

    let i = 0;
    for await (const doc of cursor) {
      if (i === index) {
        return doc as MessageSchema;
      }
      i++;
    }
    return null;
  }
  async getWords() {
    const cursor: Cursor<MessageSchema> = this.messages
      .find({})
      .project({ content: 1 });
    const words = new Map<string, number>();
    for await (const message of cursor) {
      for (const [word, count] of extractWords(message.content)) {
        const newCount = (words.get(word) ?? 0) + count;
        words.set(word, newCount);
      }
    }
    return words;
  }
  async getWordsByChannel(channelID: string) {
    const cursor: Cursor<MessageSchema> = this.messages
      .find({
        channel: channelID,
      })
      .project({ content: 1 });
    const words = new Map<string, number>();
    for await (const message of cursor) {
      for (const [word, count] of extractWords(message.content)) {
        const newCount = (words.get(word) ?? 0) + count;
        words.set(word, newCount);
      }
    }
    return words;
  }
  async getUsersByWord(word: string) {
    const users = new Map<string, number>();
    const cursor: Cursor<MessageSchema> = this.messages
      .find({})
      .project({ user: 1, content: 1 });
    for await (const message of cursor) {
      const user = message.user;
      const words = extractWords(message.content);
      const count = words.get(word)!;
      if (count) {
        const newCount = (users.get(user) ?? 0) + count;
        users.set(user, newCount);
      }
    }
    return users;
  }
  async getMessageCount() {
    return await this.messages.countDocuments({});
  }
  async getMessageCountByChannel(channelID: string) {
    return await this.messages.countDocuments({ channel: channelID });
  }
  async getMessageCountByUser(userID: string): Promise<number> {
    return await this.messages.countDocuments({ user: userID });
  }

  async close() {
    console.log("Closing MongoDB connection...");
    await this.client.close();
  }

  static async build() {
    const URI = `mongodb://${env.mongodb.host}`;
    const client = new MongoClient(URI, { useUnifiedTopology: true });
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(env.mongodb.database);
    const messages = db.collection("messages");
    await messages.createIndex({ user: 1 });
    await messages.createIndex({ channel: 1 });

    return new Database({ client, db, messages });
  }
}
