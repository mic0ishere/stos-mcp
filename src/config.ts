import { readFile } from "fs/promises";
import { join } from "path";

const configPath = join(process.cwd(), "config.json");
const configContent = await readFile(configPath, "utf-8").catch((err) => "{}");
const STOS_CONFIG = JSON.parse(configContent);

const KEYS = ["STOS_LOGIN", "STOS_PASSWORD", "STOS_PID", "STOS_CID"];

for (const key of KEYS) {
  if (STOS_CONFIG[key]) continue;

  if (process.env[key]) {
    STOS_CONFIG[key] = process.env[key];
  } else {
    console.error(
      `Missing required configuration key: ${key}. Please ensure it is set in config.json.`,
    );
    process.exit(1);
  }
}

export default STOS_CONFIG;
