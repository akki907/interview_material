/**
 * Verifies the shadcn sidebar renders and Motion animations are present.
 * Usage: npx tsx scripts/verify-shell.mjs [baseUrl]
 */
import { chromium } from "playwright-core";

const BASE = process.argv[2] || "http://localhost:5200";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const browser = await chromium.launch({ executablePath: CHROME });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

const errors = [];
page.on("pageerror", (e) => errors.push("PAGEERROR: " + e.message));
page.on("console", (m) => {
    if (m.type() === "error") errors.push("CONSOLE: " + m.text());
});

await page.goto(BASE, { waitUntil: "networkidle" });
await page.waitForTimeout(900);

const report = await page.evaluate(() => {
    const sb = document.querySelector('[data-slot="sidebar"]');
    const trigger = document.querySelector('[data-sidebar="trigger"]');
    const inset = document.querySelector('[data-slot="sidebar-inset"]');
    const topicLinks = document.querySelectorAll(
        '[data-slot="sidebar-menu-sub-item"]',
    ).length;
    const groups = document.querySelectorAll(
        '[data-slot="sidebar-group"]',
    ).length;
    // Motion sets inline transform/opacity during and after animation.
    const animated = document.querySelectorAll(
        '[style*="opacity"], [style*="transform"]',
    ).length;
    return {
        sidebar: !!sb,
        sidebarWidth: sb ? Math.round(sb.getBoundingClientRect().width) : 0,
        trigger: !!trigger,
        inset: !!inset,
        topicLinks,
        groups,
        animated,
        mainText: (document.querySelector("main")?.innerText || "").trim()
            .length,
    };
});

console.log("sidebar rendered:      ", report.sidebar, `(width ${report.sidebarWidth}px)`);
console.log("SidebarTrigger present:", report.trigger);
console.log("SidebarInset present:  ", report.inset);
console.log("sidebar groups:        ", report.groups);
console.log("topic links:           ", report.topicLinks);
console.log("motion-animated nodes: ", report.animated);
console.log("main content chars:    ", report.mainText);

// Exercise a nav group toggle to confirm the expand animation runs.
const groupBtn = await page.$('[data-slot="sidebar-group"] button');
if (groupBtn) {
    const before = await page.$$eval(
        '[data-slot="sidebar-menu-sub"]',
        (n) => n.length,
    );
    await groupBtn.click();
    await page.waitForTimeout(450);
    const after = await page.$$eval(
        '[data-slot="sidebar-menu-sub"]',
        (n) => n.length,
    );
    console.log(`group toggle: submenus ${before} -> ${after} (animated collapse)`);
}

// Mobile: the sidebar should collapse behind the trigger.
await page.setViewportSize({ width: 420, height: 850 });
await page.waitForTimeout(500);
const mobile = await page.evaluate(() => ({
    sidebarVisible: !!document.querySelector('[data-slot="sidebar"]'),
    triggerVisible: !!document.querySelector('[data-sidebar="trigger"]'),
}));
console.log("mobile sidebar hidden: ", !mobile.sidebarVisible);
console.log("mobile trigger shown:  ", mobile.triggerVisible);

console.log("\nerrors:", errors.length ? errors.slice(0, 5).join("\n") : "(none)");
await browser.close();