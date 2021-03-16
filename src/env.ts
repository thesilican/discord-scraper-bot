import dotenv from "dotenv";
dotenv.config();

function getEnv(name: string) {
  const val = process.env[name];
  if (!val) {
    throw new Error("Missing env variable: " + name);
  }
  return val;
}

function getDefaultEnv(name: string, defaultVal: string) {
  return process.env[name] || defaultVal;
}

const env = {
  discord: {
    owner: getEnv("OWNER"),
    guild: getEnv("GUILD"),
    token: getEnv("TOKEN"),
    filterRole: getDefaultEnv("FILTER_ROLE", ""),
  },
  mongodb: {
    host: getEnv("MONGODB_HOST"),
    database: getDefaultEnv("MONGODB_DATABASE", "discord-scraper-bot"),
  },
};

export default env;
