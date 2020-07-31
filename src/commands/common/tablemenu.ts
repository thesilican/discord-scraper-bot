import { CommandMessage } from "its-not-commando";
import { Util } from "../../util";

const MENU_TIME = 60 * 60 * 8;
const RESULTS_PER_PAGE = 15;
const amounts: { [e: string]: number } = {
  "⏮": -50,
  "⏪": -5,
  "◀": -1,
  "▶": 1,
  "⏩": 5,
  "⏭": 50,
};

type TableMenuOptions<T> = {
  message: CommandMessage;
  items: T[];
  transform: (t: T) => string;
  title: string;
  label: string;
  curIndex: number;
};

export async function tableMenu<T>({
  message,
  items,
  transform,
  title,
  label,
  curIndex,
}: TableMenuOptions<T>) {
  function getString(items: T[]) {
    const numPages = Math.ceil(items.length / RESULTS_PER_PAGE);
    const slice = items.slice(
      page * RESULTS_PER_PAGE,
      (page + 1) * RESULTS_PER_PAGE
    );
    let text = `${title}\n`;
    text += "```glsl\n";
    text += `${label}\n\n`;
    text += slice
      .map((x, i) => {
        const index = i + 1 + page * RESULTS_PER_PAGE;
        return `${(index + "").padStart(3, " ")}. ${transform(x)}`;
      })
      .join("\n");
    text += `\n\nPage ${
      page + 1
    } of ${numPages}\n`;
    text += "```\n";
    return text;
  }

  const numPages = Math.ceil(items.length / RESULTS_PER_PAGE);
  let page = Math.floor(curIndex / RESULTS_PER_PAGE);

  const text = getString(items);
  message.edit(text);
  const menu = message.createMenu(["⏮", "⏪", "◀", "▶", "⏩", "⏭"], {
    seconds: MENU_TIME,
  });

  menu.on("reaction", async (emoji) => {
    page += amounts[emoji];
    page = Math.max(Math.min(numPages - 1, page), 0);

    const text = getString(items);
    message.edit(text);
  });
}
