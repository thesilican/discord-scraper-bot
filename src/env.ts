import dotenv from "dotenv";
dotenv.config();

const missing = () => {
  throw new Error("Missing env variable");
};

const env = {
  discord: {
    owner: process.env.OWNER ?? missing(),
    guild: process.env.GUILD ?? missing(),
    token: process.env.TOKEN ?? missing(),
    filterRole: process.env.FILTER_ROLE ?? missing(),
  },
  mongodb: {
    host: process.env.MONGODB_HOST ?? missing(),
    database: process.env.MONGODB_DATABASE ?? missing(),
  },
};

export default env;
