import { cp, mkdir, rm } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
for (const name of readdirSync("src").filter((n) => n.endsWith(".js")))
  execFileSync(process.execPath, ["--check", "src/" + name]);
await rm("dist", { recursive: true, force: true });
await mkdir("dist");
await cp("src", "dist/src", { recursive: true });
await cp("index.html", "dist/index.html");
