/**
 * Verifies the Two Sum step visualizer in Chrome.
 * Usage: npx tsx scripts/verify-interactive.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:5299";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 1200 } });

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
});

let failures = 0;
function check(label, cond, extra = "") {
    process.stdout.write(
        `${cond ? "✓" : "✗"} ${label}${extra ? " — " + extra : ""}\n`,
    );
    if (!cond) failures++;
}

/** Every control lives inside the visualizer card, so scope all queries to it. */
const viz = () =>
    page
        .locator('[data-slot="card"]')
        .filter({ hasText: "Two Sum, step by step" });
const status = () => viz().locator('[role="status"][aria-live="polite"]').first();
const btn = (name) => viz().getByRole("button", { name, exact: true });
const tab = (name) => page.getByRole("tab", { name, exact: true });

async function runToEnd(narrate) {
    for (let guard = 0; guard < 60; guard++) {
        const next = btn("Next step");
        if (await next.isDisabled()) break;
        await next.click();
        await page.waitForTimeout(50);
    }
    return narrate.innerText();
}

await page.goto(`${BASE}/topic/dsa-hashmaps`, { waitUntil: "networkidle" });
await viz().waitFor({ timeout: 15000 });
await page.waitForTimeout(800);

check("visualizer panel renders", await viz().isVisible());

const order = await page.evaluate(() => {
    const txt = document.querySelector("main")?.innerText || "";
    return {
        lookup: txt.indexOf("Lookup path"),
        vis: txt.indexOf("Two Sum, step by step"),
        code: txt.indexOf("Code Example"),
    };
});
check(
    "panel sits between the diagram and the Code Example",
    order.lookup < order.vis && order.vis < order.code,
    JSON.stringify(order),
);

const figures = await page.locator("main figure").count();
const broken = await page.locator("text=Diagram could not be rendered").count();
check("topic still renders its 2 diagrams", figures >= 2 && broken === 0, `${figures} figures, ${broken} broken`);

// ── Try it ──────────────────────────────────────────────────────
check("aria-live region present", (await status().count()) > 0);
check(
    "three tabs render",
    (await page.getByRole("tab").count()) === 3,
    `${await page.getByRole("tab").count()} tabs`,
);

await btn("Reset").click();
await page.getByRole("button", { name: /^Number 2 at index 0$/ }).click();
await page.getByRole("button", { name: /^Number 7 at index 1$/ }).click();
await page.waitForTimeout(150);
check(
    "try-it reports the running sum and verdict",
    (await status().innerText()).includes("2 + 7 = 9"),
);

await page.getByRole("button", { name: /^Number 11 at index 2$/ }).click();
await page.waitForTimeout(150);
check(
    "tapping a selected cell deselects it",
    !(await status().innerText()).includes("11"),
);

await btn("Show the answer").click();
await page.waitForTimeout(200);
const answerText = await viz().innerText();
check(
    "show the answer reveals the pair",
    answerText.includes("indices [0, 1]"),
    answerText.split("\n").find((l) => l.includes("add up to")) || "",
);

// ── Brute force ─────────────────────────────────────────────────
await tab("Brute force").click();
await page.waitForTimeout(300);
const bruteStatus = status();
const firstBrute = await bruteStatus.innerText();
// The default input answers on the very first pair, so use a preset where the
// double loop has real work to do before it hits.
await btn("1, 5, 8, 3, 9, 4 → 12").click();
await page.waitForTimeout(300);
const bruteLast = await runToEnd(bruteStatus);
check(
    "brute force walks many pairs and ends on the answer",
    bruteLast.includes("[2, 5]") && firstBrute !== bruteLast,
    bruteLast.slice(0, 90),
);

await btn("Reset").click();
await page.waitForTimeout(150);
check("brute force reset restores step 1", (await bruteStatus.innerText()).includes("indices 0 and 1"));

check("back is disabled at step 1", await btn("Back").isDisabled());

// ── Hash map ────────────────────────────────────────────────────
// The brute-force section left the six-number preset loaded; go back to the
// topic's default example.
await btn("2, 7, 11, 15 → 9").click();
await tab("Hash map").click();
await page.waitForTimeout(300);
const hashStatus = status();
check(
    "hash map renders the live value → index map",
    (await viz().locator("span", { hasText: "→" }).count()) >= 1,
);

const hashLast = await runToEnd(hashStatus);
check("hash map ends with the pair [0, 1]", hashLast.includes("[0, 1]"), hashLast.slice(0, 110));
check("next step is disabled at the end", await btn("Next step").isDisabled());

await btn("Reset").click();
await page.waitForTimeout(120);
const before = await hashStatus.innerText();
await btn("Auto-play").click();
await page.waitForTimeout(2200);
const after = await hashStatus.innerText();
check("auto-play advances", before !== after, after.slice(0, 70));
check(
    "auto-play self-stops at the end",
    (await btn("Pause").count()) === 0 && (await btn("Auto-play").count()) === 1,
);

await btn("Reset").click();
await btn("Next step").click();
await page.waitForTimeout(150);
const step2 = await hashStatus.innerText();
await btn("Back").click();
await page.waitForTimeout(150);
check("back returns to the previous step", (await hashStatus.innerText()) !== step2);

// ── Presets & edge cases ────────────────────────────────────────
async function presetRun(preset, tabName) {
    await btn(preset).click();
    await page.waitForTimeout(250);
    await tab(tabName).click();
    await page.waitForTimeout(250);
    return runToEnd(status());
}

const dup = await presetRun("3, 3 → 6", "Hash map");
check("duplicate 3,3 → 6 returns [0, 1] (no self-pair)", dup.includes("[0, 1]"), dup.slice(0, 110));

const dupBrute = await presetRun("3, 3 → 6", "Brute force");
check("duplicate 3,3 → 6 also works brute force", dupBrute.includes("[0, 1]"));

const noSol = await presetRun("1, 5, 8 → 99", "Hash map").catch(async () => {
    // "1, 5, 8 → 99" is not a preset button; set the fields directly.
    await page.getByLabel("Numbers").fill("1, 5, 8");
    await page.getByLabel("Target").fill("99");
    await page.waitForTimeout(250);
    await tab("Hash map").click();
    await page.waitForTimeout(250);
    return runToEnd(status());
});
check("no-solution run says no pair exists", /no pair/i.test(noSol), noSol.slice(0, 120));

const multi = await presetRun("1, 5, 8, 3, 9, 4 → 12", "Hash map");
check("six-number preset solves", multi.includes("[") && /Return/.test(multi), multi.slice(0, 110));

// ── Validation ──────────────────────────────────────────────────
await page.getByLabel("Numbers").fill("7");
await page.waitForTimeout(250);
check(
    "single number shows inline validation, no stepper",
    (await viz().locator("text=Enter at least two numbers").count()) > 0 &&
        (await btn("Next step").count()) === 0,
);

await page.getByLabel("Numbers").fill("2, 7, 11, 15");
await page.getByLabel("Target").fill("");
await page.waitForTimeout(250);
check(
    "empty target shows inline validation",
    (await viz().locator("text=Enter a numeric target").count()) > 0,
);

await page.getByLabel("Target").fill("9");
await page.waitForTimeout(250);
check(
    "recovers once the inputs are valid again",
    (await viz().locator("text=Enter a").count()) === 0 &&
        (await page.getByRole("tab").count()) === 3,
);

// ── Theme toggle ────────────────────────────────────────────────
for (const want of ["dark", "light"]) {
    const toggle = page.getByRole("button", { name: "Toggle dark mode" });
    if ((await page.evaluate(() => document.documentElement.getAttribute("data-theme"))) !== want) {
        await toggle.click();
        await page.waitForTimeout(400);
    }
    const probe = await page.evaluate(() => {
        const el = document.querySelector(
            '[data-slot="card"] p[role="status"][aria-live="polite"]',
        );
        const card = el?.closest('[data-slot="card"]');
        const cs = el ? getComputedStyle(el) : null;
        const cardCs = card ? getComputedStyle(card) : null;
        return {
            theme: document.documentElement.getAttribute("data-theme"),
            color: cs?.color,
            cardBg: cardCs?.backgroundColor,
        };
    });
    check(
        `${want} theme: panel present and legible`,
        probe.theme === want && probe.color && probe.color !== probe.cardBg,
        JSON.stringify(probe),
    );
}

// ── Every topic in the sidebar still renders ────────────────────
await page.goto(`${BASE}/topic/dsa-hashmaps`, { waitUntil: "networkidle" });
const hrefs = await page
    .locator('[data-slot="sidebar-menu-sub-item"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute("href")));
const bad = [];
for (const href of hrefs.filter(Boolean)) {
    errors.length = 0;
    await page.goto(BASE + href, { waitUntil: "networkidle" });
    await page.waitForTimeout(200);
    const chars = await page.evaluate(
        () => (document.querySelector("main")?.innerText || "").trim().length,
    );
    if (chars < 100 || errors.length > 0) bad.push(`${href} (${chars} chars)`);
}
check(`all ${hrefs.length} sidebar topics render cleanly`, bad.length === 0, bad.join("; "));

process.stdout.write(
    errors.length
        ? `\n✗ ${errors.length} console/page errors:\n` + errors.slice(0, 10).join("\n") + "\n"
        : "\n✓ no console or page errors\n",
);

await browser.close();
if (failures) {
    process.stdout.write(`✗ ${failures} checks failed\n`);
    process.exitCode = 1;
} else {
    process.stdout.write("✓ interactive visualizer verified\n");
}