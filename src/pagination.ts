import { Message, MessageReaction, User } from "discord.js";

export type TableHeader =
  | { type: "ranking"; column?: number; width: number }
  | { type: "literal"; content: string }
  | { type: "string"; width: number; align?: "left" | "right" }
  | { type: "number"; width: number; fixed?: number; align?: "left" | "right" };

export type TableOptions = {
  header: TableHeader[];
  data: (string | number | null)[][];
  perPage: number;
};

function padString(text: string, width: number, left = true, padChar = " ") {
  if (text.length > width) {
    return text.slice(0, width - 1) + "…";
  } else {
    return left ? text.padEnd(width, padChar) : text.padStart(width, padChar);
  }
}
function padNumber(
  num: number,
  width: number,
  fixed = 0,
  left = false,
  padChar = " "
) {
  let text = num.toFixed(fixed);
  if (text.length > width) {
    text = text.slice(width);
    if (text[text.length - 1] === ".") {
      text = left ? text.slice(0, -1) + padChar : padChar + text.slice(0, -1);
    }
    return text;
  } else {
    return left ? text.padEnd(width, padChar) : text.padStart(width, padChar);
  }
}

export function createTable(options: TableOptions) {
  let lastRank = 0;
  let lastRankValue: number | null = null;
  const numPages = Math.ceil(options.data.length / options.perPage);
  const pages: string[] = [];
  for (let pageNum = 0; pageNum < numPages; pageNum++) {
    const page: string[] = [];
    for (let pageCol = 0; pageCol < options.perPage; pageCol++) {
      let index = pageCol + pageNum * options.perPage;
      if (index >= options.data.length) break;

      let row = "";
      for (let h = 0; h < options.header.length; h++) {
        const head = options.header[h];
        if (head.type === "ranking") {
          let rank: number;
          if (head.column === undefined) {
            rank = index + 1;
          } else {
            const val = options.data[index][head.column];
            if (typeof val !== "number") {
              throw new Error("Invalid data value");
            }
            if (val !== lastRankValue) {
              lastRank = index + 1;
              lastRankValue = val;
            }
            rank = lastRank;
          }
          row += padNumber(rank, head.width);
        } else if (head.type === "literal") {
          row += head.content;
        } else if (head.type === "number") {
          const val = options.data[index][h];
          if (typeof val !== "number") {
            throw new Error("Invalid data value");
          }
          row += padNumber(
            val,
            head.width,
            head.fixed,
            head.align && head.align === "left"
          );
        } else if (head.type === "string") {
          const val = options.data[index][h];
          if (typeof val !== "string") {
            throw new Error("Invalid data value");
          }
          row += padString(
            val,
            head.width,
            head.align && head.align === "left"
          );
        } else {
          throw new Error("Unknown header type");
        }
      }
      page.push(row);
    }
    pages.push(page.join("\n"));
  }
  return pages;
}

const PAGINATION_TIME = 7 * 24 * 60 * 60 * 1000;
const MAX_CONCURRENT_PAGINATION = 10;
const paginationQueue: (() => void)[] = [];

const REACTION_MAP = new Map<string, number>([
  ["⏮", -30],
  ["⏪", -5],
  ["◀", -1],
  ["▶", 1],
  ["⏩", 5],
  ["⏭", 30],
]);

export async function createPagination(msg: Message, pages: string[]) {
  let pageNum = 0;
  const maxPage = pages.length - 1;
  await msg.edit(pages[0]);
  for (const [emoji, count] of REACTION_MAP) {
    if (pages.length > Math.abs(count)) {
      await msg.react(emoji);
    }
  }
  const collector = msg.createReactionCollector(() => true, {
    time: PAGINATION_TIME,
  });
  const onReaction = async (reaction: MessageReaction, user: User) => {
    const emoji = reaction.emoji.toString();
    const amount = REACTION_MAP.get(emoji);
    if (amount !== undefined) {
      let newPageNum = Math.min(Math.max(pageNum + amount, 0), maxPage);
      if (newPageNum !== pageNum) {
        pageNum = newPageNum;
        await msg.edit(pages[pageNum]);
      }
    }
    await reaction.users.remove(user);
  };
  const onEnd = () => {
    collector.removeListener("collect", onReaction);
    collector.removeListener("end", onEnd);
    const index = paginationQueue.indexOf(onEnd);
    if (index !== -1) {
      paginationQueue.splice(index, 1);
    }
  };
  collector.addListener("collect", onReaction);
  collector.addListener("end", onEnd);

  if (paginationQueue.length >= MAX_CONCURRENT_PAGINATION) {
    const first = paginationQueue.splice(0, 1)[0];
    first();
  }
  paginationQueue.push(onEnd);
}
