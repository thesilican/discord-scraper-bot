import dotenv from "dotenv";
dotenv.config();

function getEnv(name: string) {
  const val = process.env[name];
  if (!val) throw new Error("Missing env variable: " + name);
  return val;
}

const env = {
  discord: {
    owner: getEnv("OWNER"),
    guild: getEnv("GUILD"),
    token: getEnv("TOKEN"),
    filterRole: getEnv("FILTER_ROLE"),
  },
  mongodb: {
    host: getEnv("MONGODB_HOST"),
    database: getEnv("MONGODB_DATABASE"),
  },
};

export default env;
