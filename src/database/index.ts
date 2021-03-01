import { Message } from "discord.js";
import { Collection, Db, MongoClient, MongoError } from "mongodb";
import env from "../env";
import { extractWords, filterMessages } from "./funcs";

type DatabaseOptions = {
  client: MongoClient;
  db: Db;
  messages: Collection;
  users: Collection;
};

type MessageSchema = {
  _id: string;
  content: string;
  user: string;
  channel: string;
};

type UserSchema = {
  _id: string;
  words: { [word: string]: number };
};

export class Database {
  client: MongoClient;
  db: Db;
  messages: Collection;
  users: Collection;
  constructor(options: DatabaseOptions) {
    this.client = options.client;
    this.db = options.db;
    this.messages = options.messages;
    this.users = options.users;
  }

  async addMessage(messages: Message | Message[]) {
    if (!Array.isArray(messages)) {
      messages = [messages];
    }
    messages = messages.filter(filterMessages);
    if (messages.length === 0) {
      return;
    }

    const messageDocuments = messages.map((m) => ({
      _id: m.id,
      content: m.cleanContent,
      user: m.author.id,
      channel: m.channel.id,
    }));
    try {
      await this.messages.insertMany(messageDocuments, { ordered: false });
    } catch (err) {
      if (err instanceof MongoError && err.code === 11000) {
        // ignore duplicate key errors
      } else {
        throw err;
      }
    }

    const users = new Map<string, Map<string, number>>();
    for (const message of messages) {
      const words = extractWords(message.content);
      if (words.size === 0) continue;

      if (!users.has(message.author.id)) {
        users.set(message.author.id, new Map());
      }
      const map = users.get(message.author.id)!;
      for (const [word, count] of words) {
        map.set(word, (map.get(word) ?? 0) + count);
      }
    }

    for (const [userID, words] of users) {
      const query = { _id: userID };
      const update = { $inc: {} as any };
      for (const [word, count] of words.entries()) {
        update.$inc[`words.${word}`] = count;
      }
      await this.users.findOneAndUpdate(query, update, {
        upsert: true,
      });
    }
  }

  async getUserStats(userID: string): Promise<UserSchema | null> {
    return (await this.users.findOne({
      _id: userID,
    })) as UserSchema | null;
  }
  async getUserMessagesCount(userID: string): Promise<number> {
    return await this.messages.countDocuments({ user: userID });
  }
  async getUserMessageRandom(userID: string, channelID?: string) {
    let query: { [key: string]: string };
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
  async getUsersWord(word: string) {
    const res = await this.users
      .find({})
      .project({ [`words.${word}`]: 1 })
      .toArray();
    return res as UserSchema[];
  }

  async clear() {
    await this.users.deleteMany({});
    await this.messages.deleteMany({});
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
    const users = db.collection("users");
    await messages.createIndex({ user: 1 });

    return new Database({ client, db, users, messages });
  }
}
