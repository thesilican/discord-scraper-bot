import { Message } from "discord.js";
import {
  Collection,
  Cursor,
  Db,
  FilterQuery,
  MongoClient,
  MongoError,
  UpdateQuery,
} from "mongodb";
import env from "./env";
import { extractWords, filterMessage } from "./util";

export type MessageSchema = {
  _id: string;
  content: string;
  user: string;
  channel: string;
};

export type GuessWhoLeaderboardSchema = {
  _id: string;
  correct: number;
  total: number;
};

export type DatabaseOptions = {
  client: MongoClient;
  db: Db;
  messages: Collection;
  guessWhoLeaderboard: Collection;
};

export class Database {
  client: MongoClient;
  db: Db;
  messages: Collection;
  guessWhoLeaderboard: Collection;
  constructor(options: DatabaseOptions) {
    this.client = options.client;
    this.db = options.db;
    this.messages = options.messages;
    this.guessWhoLeaderboard = options.guessWhoLeaderboard;
  }

  async createMessage(messages: Message | Message[]) {
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
  async deleteMessage(by: "id" | "channel" | "all", ids?: string | string[]) {
    if (ids !== undefined && !Array.isArray(ids)) {
      ids = [ids];
    }
    if (by === "id") {
      await this.messages.deleteMany({ _id: { $in: ids } });
    } else if (by === "channel") {
      await this.messages.deleteMany({ channel: { $in: ids } });
    } else if (by === "all") {
      await this.messages.deleteMany({});
    }
  }
  getMessageCursor() {
    return this.messages.find({}) as Cursor<MessageSchema>;
  }
  async getMessageCount(userID?: string, channelID?: string) {
    const filter: FilterQuery<MessageSchema> = {};
    if (userID !== undefined) {
      filter.user = userID;
    }
    if (channelID !== undefined) {
      filter.channel = channelID;
    }
    return await this.messages.countDocuments(filter);
  }
  async getMessageRandom(userID?: string, channelID?: string) {
    let query: FilterQuery<MessageSchema> = {};
    if (userID !== undefined) {
      query.user = userID;
    }
    if (channelID !== undefined) {
      query.channel = channelID;
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
  async getMessageWords(userID?: string, channelID?: string) {
    const filter: FilterQuery<MessageSchema> = {};
    if (userID !== undefined) {
      filter.user = userID;
    }
    if (channelID !== undefined) {
      filter.channel = channelID;
    }

    const cursor: Cursor<MessageSchema> = this.messages
      .find(filter)
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
  async getMessageUserByWord(word: string) {
    const users = new Map<string, number>();
    const cursor: Cursor<MessageSchema> = this.messages
      .find({})
      .project({ user: 1, content: 1 });
    for await (const message of cursor) {
      const user = message.user;
      const count = extractWords(message.content).get(word);
      if (count) {
        const newCount = (users.get(user) ?? 0) + count;
        users.set(user, newCount);
      }
    }
    return users;
  }

  async updateGuessWhoLeaderboard(
    userID: string,
    correct: number,
    total: number
  ) {
    const query: FilterQuery<GuessWhoLeaderboardSchema> = {
      _id: userID,
    };
    const update: UpdateQuery<GuessWhoLeaderboardSchema> = {
      $set: {
        correct,
        total,
      },
    };
    const options = {
      upsert: true,
    };
    await this.guessWhoLeaderboard.updateOne(query, update, options);
  }
  getGuessWhoLeaderboardCursor() {
    return this.guessWhoLeaderboard.find(
      {}
    ) as Cursor<GuessWhoLeaderboardSchema>;
  }
  async getGuessWhoLeaderboard(userID: string) {
    const query: FilterQuery<GuessWhoLeaderboardSchema> = {
      _id: userID,
    };
    const res = await this.guessWhoLeaderboard.findOne(query);
    return res as GuessWhoLeaderboardSchema | null;
  }

  async close() {
    console.log("Closing MongoDB connection...");
    await this.client.close();
  }

  static async build() {
    const URI = `mongodb://${env.mongodb.host}`;
    const client = new MongoClient(URI, {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    });
    await client.connect();
    console.log("Connected to MongoDB");

    const db = client.db(env.mongodb.database);
    const messages = db.collection("messages");
    await messages.createIndex({ user: 1 });
    await messages.createIndex({ channel: 1 });
    const guessWhoLeaderboard = db.collection("guessWhoLeaderboard");

    return new Database({ client, db, messages, guessWhoLeaderboard });
  }
}
