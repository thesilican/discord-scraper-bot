import mongoose, { Schema, Document } from "mongoose";

export interface MessageInterface {
  messageID: string;
  userID: string;
  username: string;
  channelID: string;
  content: string;
  contentWords: string[];
}

const MessageSchema = new Schema<MessageInterface>({
  messageID: { type: String, index: { unique: true } },
  userID: { type: String, index: { unique: false } },
  username: { type: String },
  channelID: { type: String },
  content: { type: String },
  contentWords: { type: [String] },
});

const Message = mongoose.model<MessageInterface & Document>(
  "message",
  MessageSchema
);
export { Message };
