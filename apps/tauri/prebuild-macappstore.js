import { readFileSync, writeFileSync } from "fs";
import dotenv from "dotenv";

dotenv.config({ path: ".env.macdmg" });

const entitlements = readFileSync("./src-tauri/Entitlements.appstore.plist.template", "utf8");

writeFileSync(
  "./src-tauri/Entitlements.plist",
  entitlements.replaceAll("{{APPLE_TEAM_ID}}", process.env.APPLE_TEAM_ID),
);
