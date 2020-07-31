import mongoose, { Schema, Document } from "mongoose";
import { MessageInterface } from "./message";

export interface UserInterface {
  userID: string;
  wordCount: Map<string, number>;
}

const UserSchema = new Schema<UserInterface>({
  userID: { type: String, index: { unique: true } },
  wordCount: {
    type: Map,
    of: Number,
  },
});

const User = mongoose.model<UserInterface & Document>("user", UserSchema);
export { User };
