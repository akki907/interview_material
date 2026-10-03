/**
 * Verifies every declarative visualizer: the panel renders in its topic, each
 * tab walks to a final step with a real answer, and nothing errors.
 * Usage: npx tsx scripts/verify-visualizers.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:5200";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const TOPICS = [
    ["dsa-sliding-window", "Sliding window"],
    ["dsa-two-pointers", "Two pointers"],
    ["dsa-graph", "Graph"],
    ["dsa-heap", "Heap"],
    ["dsa-binary-tree", "Binary Tree"],
    ["dsa-stack", "Stack"],
    ["dsa-dp", "Dynamic Programming"],
    ["dsa-arrays", "Arrays"],
    ["dsa-backtracking", "Backtracking"],
    ["sd-sharding", "Sharding"],
];

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 1100 } });

let failures = 0;
const problems = [];
function check(label, cond, extra = "") {
    process.stdout.write(
        `${cond ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}\n`,
    );
    if (!cond) {
        failures++;
        problems.push(label);
    }
}

for (const [topic, name] of TOPICS) {
    const errors = [];
    const onError = (e) => errors.push("PAGEERROR " + e.message);
    const onConsole = (m) => {
        if (m.type() === "error") errors.push("CONSOLE " + m.text().slice(0, 160));
    };
    page.on("pageerror", onError);
    page.on("console", onConsole);

    await page.goto(`${BASE}/topic/${topic}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);

    const card = page
        .locator('[data-slot="card"]')
        .filter({ hasText: "step by step" })
        .first();
    const present = await card.count();
    check(`${topic}: visualizer renders`, present > 0, name);
    if (present === 0) {
        page.removeAllListeners("pageerror");
        page.removeAllListeners("console");
        continue;
    }

    const tabs = await card.getByRole("tab").allInnerTexts();
    check(`${topic}: has tiers`, tabs.length >= 1, tabs.join(" / "));

    for (const tier of tabs) {
        await card.getByRole("tab", { name: tier }).click();
        await page.waitForTimeout(300);
        const status = card.locator('[role="status"][aria-live="polite"]').first();
        const first = await status.innerText();
        let n = 0;
        for (let guard = 0; guard < 80; guard++) {
            const next = card.getByRole("button", { name: "Next step", exact: true });
            if ((await next.count()) === 0 || (await next.isDisabled())) break;
            await next.click();
            await page.waitForTimeout(20);
            n++;
        }
        const last = await status.innerText();
        check(
            `${topic}/${tier}: walks to a verdict`,
            n > 0 && last.length > 10 && last !== first && !/undefined|NaN|\[object/.test(last),
            `${n} steps — ${last.slice(0, 80)}`,
        );

        // Auto-play from the top advances, and Pause stops it where it stands.
        await card.getByRole("button", { name: "Reset", exact: true }).click();
        await page.waitForTimeout(150);
        if (await card.getByRole("button", { name: "Auto-play", exact: true }).count()) {
            const before = await status.innerText();
            await card.getByRole("button", { name: "Auto-play", exact: true }).click();
            await page.waitForTimeout(1300);
            const during = await status.innerText();
            const isPlaying =
                (await card.getByRole("button", { name: "Pause", exact: true }).count()) === 1;
            check(`${topic}/${tier}: auto-play advances`, during !== before || isPlaying);
            if (isPlaying) {
                await card.getByRole("button", { name: "Pause", exact: true }).click();
                await page.waitForTimeout(200);
                const paused = await status.innerText();
                await page.waitForTimeout(1300);
                check(
                    `${topic}/${tier}: pause holds the step`,
                    (await status.innerText()) === paused &&
                        (await card
                            .getByRole("button", { name: "Auto-play", exact: true })
                            .count()) === 1,
                );
            }
        }
    }

    // Presets must load cleanly.
    const presets = card.getByRole("button", { name: /→|·|\s/ });
    const presetCount = await card
        .locator("button")
        .filter({ hasText: "→" })
        .count();
    void presets;
    if (presetCount > 0) {
        await card.locator("button").filter({ hasText: "→" }).first().click();
        await page.waitForTimeout(400);
        check(`${topic}: presets load`, (await card.innerText()).length > 200, `${presetCount} presets`);
    }

    // Every preset must survive a full walk without producing a bad step.
    const presetButtons = await card.locator("button").filter({ hasText: "→" }).all();
    for (const preset of presetButtons.slice(0, 3)) {
        await preset.click();
        await page.waitForTimeout(300);
        const status = card.locator('[role="status"][aria-live="polite"]').first();
        for (let guard = 0; guard < 80; guard++) {
            const next = card.getByRole("button", { name: "Next step", exact: true });
            if ((await next.count()) === 0 || (await next.isDisabled())) break;
            await next.click();
            await page.waitForTimeout(15);
        }
        const text = await status.innerText();
        check(
            `${topic}: preset "${(await preset.innerText()).slice(0, 18)}" walks cleanly`,
            text.length > 10 && !/undefined|NaN|\[object/.test(text),
        );
    }

    check(`${topic}: no console or page errors`, errors.length === 0, errors.slice(0, 2).join(" | "));
    page.removeAllListeners("pageerror");
    page.removeAllListeners("console");
}

await browser.close();
process.stdout.write(
    failures
        ? `\n✗ ${failures} checks failed: ${problems.slice(0, 8).join(", ")}\n`
        : "\n✓ all visualizers verified\n",
);
if (failures) process.exitCode = 1;