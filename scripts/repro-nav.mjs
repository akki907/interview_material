/**
 * Captures the uncaught error behind the blank-page-on-navigation report.
 * Usage: npx tsx scripts/repro-nav.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:5200";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage();

const seen = [];
page.on("console", (m) => {
    if (m.type() === "error") seen.push("CONSOLE: " + m.text());
});
page.on("pageerror", (e) => seen.push("PAGEERROR: " + (e.stack || e.message)));

async function state() {
    const s = await page.evaluate(() => {
        const main = document.querySelector("main");
        return {
            hasMain: !!main,
            text: (main?.innerText || "").trim().length,
            rootChildren:
                document.getElementById("root")?.childElementCount ?? 0,
        };
    });
    return s;
}

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const hrefs = await page.$$eval(
    '[data-slot="sidebar"] a[href^="/topic/"]',
    (as) => as.map((a) => a.getAttribute("href")),
);

for (const href of hrefs) {
    seen.length = 0;
    try {
        await page.click(`[data-slot="sidebar"] a[href="${href}"]`, {
            timeout: 4000,
        });
    } catch {
        console.log(`!! sidebar link gone, cannot click ${href}`);
        break;
    }
    await page.waitForTimeout(600);
    const s = await state(href);
    const ok = s.text > 40 && s.hasMain;
    console.log(
        `${ok ? "OK   " : "FAIL "} ${href.padEnd(26)} main=${s.hasMain} text=${String(s.text).padStart(5)} rootKids=${s.rootChildren}`,
    );
    if (!ok) {
        console.log("\n>>> FIRST FAILING ROUTE:", href);
        console.log(
            ">>> captured errors:\n" +
                (seen.join("\n\n") || "  (none captured)"),
        );
        break;
    }
}

await browser.close();
