// Chromium for QA: uses the sandbox's preinstalled browser when present, else Playwright's own.
import { existsSync } from "node:fs";
import { chromium } from "playwright";

export function launch() {
  const local = "/opt/pw-browsers/chromium";
  return chromium.launch(existsSync(local) && !process.env.CI ? { executablePath: local } : {});
}
