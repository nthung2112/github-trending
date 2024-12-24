import fs from "fs";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

const collectDocs = async (): Promise<{ ok: boolean; error?: Error }> => {
  try {
    const today = new Date();
    const lastMonth = new Date(today.setMonth(today.getMonth() - 1));
    const docName = `${lastMonth.getFullYear()}/${(lastMonth.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    const regType = `${lastMonth.getFullYear()}-${(lastMonth.getMonth() + 1)
      .toString()
      .padStart(2, "0")}`;
    const docPath = process.cwd();

    const mdFiles = await listDir(docPath, ".md");
    const mdNewFiles = mdFiles.filter((file) => new RegExp(regType).test(file));

    fs.mkdirSync(docName, { recursive: true });

    mdNewFiles.forEach((file) => {
      fs.renameSync(file, path.join(docName, file));
    });

    return { ok: true };
  } catch (error) {
    return { ok: false, error };
  }
};

const listDir = async (dirPath: string, suffix: string): Promise<string[]> => {
  const files = fs.readdirSync(dirPath);
  return files.filter((file) => file.toUpperCase().endsWith(suffix.toUpperCase()));
};

const writeMarkdown = (fileName: string, content: string): void => {
  fs.writeFileSync(`${fileName}.md`, content);
};

const scrape = async (language: string): Promise<string> => {
  try {
    const response = await axios.get(`https://github.com/trending?l=${language}`);
    const $ = cheerio.load(response.data);

    let result = `\n#### ${language}\n`;
    $(".Box-row").each((i, element) => {
      const title = $(element).find("h2 a").attr("href")?.substring(1).trim() || "";
      const description = $(element).find("p.col-9").text().trim();
      const repoUrl = `https://github.com${$(element).find("h2 a").attr("href")}`;
      const stars = $(element).find(`a:has(svg[aria-label="star"])`).text().trim() || "0";
      const forks = $(element).find(`a:has(svg[aria-label="fork"])`).text().trim() || "0";

      result += `${i + 1}. [${title} (${stars}s/${forks}f)](${repoUrl}) : ${description}\n`;
    });

    return result;
  } catch (error) {
    console.error(`Failed to scrape ${language}:`, error);
    return `\n#### ${language}\nFailed to fetch data.\n`;
  }
};

const gitCommand = async (args: string[]): Promise<void> => {
  const { exec } = require("child_process");
  exec(`git ${args.join(" ")}`, (error: Error, stdout: string, stderr: string) => {
    if (error) {
      console.error(`Git command failed: ${stderr}`);
      return;
    }
    console.log(stdout);
  });
};

const main = async (): Promise<void> => {
  const tempDate = new Date().toISOString().split("T")[0];
  let message = "";

  if (new Date().getDate() === 10) {
    const { ok, error } = await collectDocs();
    message += ok ? "Collected the *.md files: OK!\n" : `collectDocs() failed: ${error?.message}\n`;
  }

  const targets = [
    "TypeScript",
    "JavaScript",
    "HTML",
    "CSS",
    "Python",
    "Go",
    "Rust",
    "Ruby",
    "Java",
    "Kotlin",
    "Swift",
    // "Makefile",
    // "C++",
    // "C",
    // "Shell",
    // "Objective-C",
    // "Jupyter-Notebook",
    // "Vue",
    // "TeX",
    // "Markdown",
  ];

  let content = `### ${tempDate}\n`;

  for (const target of targets) {
    console.log(`${target} is being processed.`);
    content += await scrape(target);
  }

  writeMarkdown(tempDate, content);
  message += `${tempDate}.md is completed.\n`;

  let readme = `# Daily Github Trending\n\nWe scrape the GitHub trending page of these languages: ${targets.join(
    ", "
  )}.\n\n`;
  readme += `[${tempDate}.md](https://github.com/nthung2112/github-trending/blob/main/${tempDate}.md)\n\n`;
  readme += `Last Updated: ${new Date().toISOString()}`;
  writeMarkdown("README", readme);

  console.log("README.md is updated.");

  // await gitCommand(["pull", "origin", "main"]);
  // await gitCommand(["add", "."]);
  // await gitCommand(["commit", "-am", new Date().toISOString()]);
  // await gitCommand(["push", "origin", "main"]);
};

main().catch(console.error);
