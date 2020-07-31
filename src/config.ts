import fs from "fs";
import path from "path";

let auth: any = {};

try {
  const file = fs.readFileSync(path.join(__dirname, "auth.json"));
  auth = JSON.parse(file.toString("utf-8"));
} catch (error) {
  console.log("Error reading auth.json");
}

export const DISCORD_TOKEN: string =
  process.env.DISCORD_TOKEN ?? auth?.token ?? "";
export const DISCORD_SERVER_ID: string =
  process.env.DISCORD_SERVER_ID ?? auth?.serverID ?? "";
export const MONGODB_URL =
  process.env.MONGODB_URL || "mongodb://localhost/testing1";
