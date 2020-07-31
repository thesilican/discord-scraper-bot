import mongoose from "mongoose";
import { Message, MessageInterface } from "./message";
import { User } from "./user";
import { MONGODB_URL } from "../config";

mongoose
  .connect(MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to mongodb");
  })
  .catch((error) => {
    console.log("Error connecting to " + URL + ": ", error);
    process.exit(1);
  });

export * from "./message";
export * from "./user";

export const DatabaseFuncs = {
  async addMessage(msg: MessageInterface) {
    let [message, user] = await Promise.all([
      Message.findOne({ messageID: msg.messageID }),
      User.findOne({ userID: msg.userID }),
    ]);
    if (message) return false;
    message = new Message(msg);
    if (user === null) {
      user = new User({
        userID: msg.userID,
        wordCount: new Map(),
      });
    }
    for (const word of msg.contentWords) {
      const amount = (user.wordCount.get(word) ?? 0) + 1;
      user.wordCount.set(word, amount);
    }
    await Promise.all([message.save(), user.save()]);
    return true;
  },
};
