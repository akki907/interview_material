// src/components.ts — Reusable UI components
import { Store } from "./store";
import { h, toast } from "./utils";
export { diagram } from "./mermaid";

/** Extra card options: `id` scopes the bookmark, `bookmark: false` hides it. */
interface CardExtra {
    id?: string;
    bookmark?: boolean;
}

/** Strip emoji/punctuation and normalize to a url-safe anchor slug. */
function slugify(text: string): string {
    return (
        text
            .replace(
                /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu,
                "",
            )
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 48) || "section"
    );
}

const usedSlugs = new Set<string>();

/** Slugify and disambiguate collisions so repeated titles get distinct anchors. */
function uniqueSlug(title: string): string {
    const base = slugify(title);
    let slug = base;
    let n = 2;
    while (usedSlugs.has(slug)) slug = `${base}-${n++}`;
    usedSlugs.add(slug);
    return slug;
}

/** Reset the slug registry; called by the router before each page render. */
export function resetCardSlugs(): void {
    usedSlugs.clear();
}

// ── content-enrichment components ────────────────────────────────────

/**
 * Highlight box for the single most important idea on a page. `tone` picks
 * the pastel section token; `title` is optional.
 */
export function callout(
    tone: "info" | "good" | "warn" | "c0" | "c1" | "c2" | "c3" | "c4" | "c5",
    bodyHtml: string,
    title = "",
): HTMLElement {
    const box = h("div", { className: "callout callout-" + tone });
    if (title) box.appendChild(h("div", { className: "callout-title" }, title));
    // Author-authored markup, rendered through the same trusted path as
    // `card()`'s HTML body — never user input.
    box.appendChild(
        h("div", { className: "callout-body", innerHTML: bodyHtml }),
    );
    return box;
}

/**
 * A row of quick-reference stat chips — complexity, thresholds, headline
 * numbers. Rendered as text, so any string value is safe to pass.
 */
export function statChips(
    items: Array<[label: string, value: string, tone?: string]>,
): HTMLElement {
    const wrap = h("div", { className: "stat-chips" });
    items.forEach(([label, value, tone]) => {
        const chip = h("div", {
            className: "stat-chip" + (tone ? " chip-" + tone : ""),
        });
        chip.appendChild(h("div", { className: "chip-value" }, value));
        chip.appendChild(h("div", { className: "chip-label" }, label));
        wrap.appendChild(chip);
    });
    return wrap;
}

/** Two-column definition list for "term -> meaning" reference material. */
export function defList(pairs: Array<[string, string]>): HTMLElement {
    const dl = h("dl", { className: "def-list" });
    pairs.forEach(([term, def]) => {
        dl.appendChild(h("dt", {}, term));
        dl.appendChild(h("dd", {}, def));
    });
    return dl;
}

/** Comparison table with a highlighted column index, for "vs" sections. */
export function compareTable(
    headers: string[],
    rows: string[][],
    highlightCol = -1,
): HTMLElement {
    const thead = h("thead");
    const hr = h("tr");
    headers.forEach((x, i) => {
        hr.appendChild(
            h("th", { className: i === highlightCol ? "hl" : "" }, x),
        );
    });
    thead.appendChild(hr);

    const tbody = h("tbody");
    rows.forEach((r) => {
        const tr = h("tr");
        r.forEach((c, i) =>
            tr.appendChild(
                h("td", { className: i === highlightCol ? "hl" : "" }, c),
            ),
        );
        tbody.appendChild(tr);
    });

    const table = h("table", { className: "complexity-table compare-table" });
    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
}

/** Difficulty pips — ★/☆ count, used by the interview Q&A banks. */
export function difficulty(level: 1 | 2 | 3 | 4 | 5): HTMLElement {
    const wrap = h("span", {
        className: "difficulty",
        "aria-label": `Difficulty ${level} of 5`,
    });
    wrap.textContent = "★".repeat(level) + "☆".repeat(5 - level);
    return wrap;
}

/** Lay out cards in a responsive column layout instead of one long stack. */
export function cardGrid(cards: HTMLElement[], cols: 2 | 3 = 2): HTMLElement {
    const wrap = h("div", { className: "card-grid grid-" + cols });
    cards.forEach((c) => wrap.appendChild(c));
    return wrap;
}

/** One stage of a `pipelineStages` diagram. */
export interface PipelineStage {
    name: string;
    desc: string;
}

// ── content helpers ───────────────────────────────────────────────────
// Table card built from a header row plus body rows (cells are raw HTML).
export function tableCard(
    title: string,
    headers: string[],
    rows: string[][],
): HTMLElement {
    const head = headers.map((x) => `<th>${x}</th>`).join("");
    const body = rows
        .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
        .join("");
    return card(
        title,
        `<table class="complexity-table"><tr>${head}</tr>${body}</table>`,
    );
}

// Card of collapsible question / answer pairs; the first one starts open.
// Answers are raw HTML, so one answer can hold a list or a small table.
export function qaCard(pairs: Array<[string, string]>): HTMLElement {
    const wrap = h("div");
    pairs.forEach(([q, a], i) => {
        const body = /<[a-z]/i.test(a) ? a : `<p>${a}</p>`;
        wrap.appendChild(collapsible(`Q${i + 1}. ${q}`, body, i === 0));
    });
    return card("🎤 Interview Q&A", wrap);
}

export function progressBar(
    label: string,
    pct: number,
    cls: string,
): HTMLElement {
    const wrap = h("div");
    const row = h("div", {
        style: "display:flex;justify-content:space-between;margin-bottom:4px;",
    });
    row.appendChild(h("span", { style: "font-size:0.85rem;" }, label));
    row.appendChild(
        h(
            "span",
            { style: "font-size:0.8rem;color:var(--text-muted);" },
            pct + "%",
        ),
    );
    wrap.appendChild(row);
    const bar = h("div", { className: "progress-bar" });
    bar.appendChild(
        h("div", {
            className: "progress-fill " + cls,
            style: "width:" + pct + "%",
        }),
    );
    wrap.appendChild(bar);
    return wrap;
}

export function card(
    title: string,
    body: string | Node,
    extra: CardExtra = {},
): HTMLElement {
    const c = h("div", { className: "card" });
    if (title) {
        const hdr = h("div", { className: "card-header" });
        const heading = h("h3", {}, title);
        // Anchor id lets the page TOC deep-link to this section. Slugified from
        // the title, deduped when two cards share a name.
        heading.id = "sec-" + uniqueSlug(title);
        hdr.appendChild(heading);
        if (extra.bookmark !== false) {
            const bm = h("span", { className: "bookmark-btn" });
            const bookmarkId = extra.id || title;
            bm.textContent = Store.isBookmarked(bookmarkId) ? "★" : "☆";
            bm.classList.toggle("bookmarked", Store.isBookmarked(bookmarkId));
            bm.addEventListener("click", () => {
                const on = Store.toggleBookmark(bookmarkId);
                bm.textContent = on ? "★" : "☆";
                bm.classList.toggle("bookmarked", on);
                toast(on ? "Bookmarked" : "Unbookmarked", "info");
            });
            hdr.appendChild(bm);
        }
        c.appendChild(hdr);
    }
    if (body)
        c.appendChild(
            typeof body === "string" ? h("div", { innerHTML: body }) : body,
        );
    return c;
}

export function collapsible(
    title: string,
    bodyHtml: string,
    startOpen = false,
): HTMLElement {
    const c = h("div", {
        className: "collapsible" + (startOpen ? " open" : ""),
    });
    const hdr = h("div", {
        className: "collapsible-header",
        onClick: () => toggleCollapsible(c),
    });
    hdr.appendChild(h("h4", {}, title));
    hdr.appendChild(h("span", { className: "collapsible-arrow" }, "▶"));
    c.appendChild(hdr);
    const body = h("div", { className: "collapsible-body" });
    body.appendChild(
        h("div", { className: "collapsible-body-inner", innerHTML: bodyHtml }),
    );
    c.appendChild(body);
    return c;
}

export function toggleCollapsible(c: HTMLElement): void {
    c.classList.toggle("open");
}

export function tabs(tabsArr: string[], contentsArr: string[]): HTMLElement {
    const wrap = h("div");
    const tabRow = h("div", { className: "tabs" });
    tabsArr.forEach((t, i) => {
        const btn = h("button", {
            className: "tab" + (i === 0 ? " active" : ""),
            textContent: t,
        });
        btn.addEventListener("click", () => {
            tabRow
                .querySelectorAll(".tab")
                .forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            wrap.querySelectorAll(".tab-content").forEach((tc) =>
                tc.classList.remove("active"),
            );
            wrap.querySelectorAll(".tab-content")[i]!.classList.add("active");
        });
        tabRow.appendChild(btn);
    });
    wrap.appendChild(tabRow);
    contentsArr.forEach((content, i) => {
        // Tab panels carry renderer-authored markup (lists, tables, code
        // blocks), so they are parsed rather than set as text — same trusted
        // path `card()` uses for its HTML body.
        wrap.appendChild(
            h("div", {
                className: "tab-content" + (i === 0 ? " active" : ""),
                innerHTML: content,
            }),
        );
    });
    return wrap;
}

export function stepControls(
    total: number,
    onStep: (step: number) => void,
): { wrap: HTMLElement; update: () => void } {
    const wrap = h("div", { className: "step-controls" });
    wrap.appendChild(
        h("button", {
            className: "step-btn",
            textContent: "⏮",
            disabled: true,
            id: "step-first",
        }),
    );
    wrap.appendChild(
        h("button", {
            className: "step-btn",
            textContent: "◀",
            disabled: true,
            id: "step-prev",
        }),
    );
    const info = h("span", {
        className: "step-info",
        textContent: "Step 1 / " + total,
    });
    wrap.appendChild(info);
    wrap.appendChild(
        h("button", {
            className: "step-btn",
            textContent: "▶",
            id: "step-next",
        }),
    );
    wrap.appendChild(
        h("button", {
            className: "step-btn",
            textContent: "⏭",
            id: "step-last",
        }),
    );

    let current = 1;
    const update = () => {
        info.textContent = "Step " + current + " / " + total;
        wrap.querySelector<HTMLButtonElement>("#step-first")!.disabled =
            current === 1;
        wrap.querySelector<HTMLButtonElement>("#step-prev")!.disabled =
            current === 1;
        wrap.querySelector<HTMLButtonElement>("#step-next")!.disabled =
            current === total;
        wrap.querySelector<HTMLButtonElement>("#step-last")!.disabled =
            current === total;
        if (onStep) onStep(current);
    };
    wrap.querySelector<HTMLButtonElement>("#step-first")!.addEventListener(
        "click",
        () => {
            current = 1;
            update();
        },
    );
    wrap.querySelector<HTMLButtonElement>("#step-prev")!.addEventListener(
        "click",
        () => {
            current = Math.max(1, current - 1);
            update();
        },
    );
    wrap.querySelector<HTMLButtonElement>("#step-next")!.addEventListener(
        "click",
        () => {
            current = Math.min(total, current + 1);
            update();
        },
    );
    wrap.querySelector<HTMLButtonElement>("#step-last")!.addEventListener(
        "click",
        () => {
            current = total;
            update();
        },
    );

    return { wrap, update };
}

export function codeRunner(
    lang: string,
    code: string,
    onRun?: (code: string) => string,
): HTMLElement {
    const wrap = h("div", { className: "playground" });
    const header = h("div", { className: "playground-header" });
    header.appendChild(h("span", { className: "playground-lang" }, lang));
    wrap.appendChild(header);

    // `textContent` on a <textarea> sets its default value without parsing
    // markup, so the snippet needs no HTML escaping.
    const codeWrap = h("div", { className: "code-wrap" });
    const ta = h("textarea", { textContent: code });
    codeWrap.appendChild(ta);
    codeWrap.appendChild(
        h("button", {
            className: "copy-btn btn btn-sm",
            style: "position:absolute;top:8px;right:8px;",
            textContent: "Copy",
        }),
    );
    wrap.appendChild(codeWrap);

    const footer = h("div", { className: "playground-footer" });
    const runBtn = h("button", {
        className: "btn btn-primary",
        id: "run-btn",
        textContent: "▶ Run",
    });
    footer.appendChild(runBtn);
    wrap.appendChild(footer);

    wrap.appendChild(
        h("div", {
            className: "playground-output",
            id: "pg-output",
            textContent: "Ready...",
        }),
    );

    const out = wrap.querySelector("#pg-output") as HTMLElement;
    runBtn.addEventListener("click", () => {
        out.textContent = "Executing...";
        setTimeout(() => {
            if (onRun) {
                try {
                    out.textContent = onRun(ta.value);
                } catch (e) {
                    out.textContent =
                        "Error: " +
                        (e instanceof Error ? e.message : String(e));
                }
            } else {
                out.textContent =
                    "(Simulated execution — no backend available)";
            }
        }, 600);
    });
    (wrap.querySelector(".copy-btn") as HTMLElement).addEventListener(
        "click",
        () => {
            navigator.clipboard.writeText(ta.value);
            toast("Copied!", "success");
        },
    );
    return wrap;
}

export function pipelineStages(
    stages: PipelineStage[],
    onStageClick: (index: number, stage: PipelineStage) => void,
): HTMLElement {
    const wrap = h("div", { className: "pipeline" });
    stages.forEach((s, i) => {
        const detail = h("div");
        detail.appendChild(h("div", { className: "stage-label" }, s.name));
        detail.appendChild(h("div", { className: "stage-desc" }, s.desc));
        const body = h("div");
        body.appendChild(h("span", { className: "stage-num" }, String(i + 1)));
        body.appendChild(detail);
        wrap.appendChild(
            h(
                "div",
                {
                    className: "pipeline-stage",
                    onClick: () => onStageClick(i, s),
                },
                body,
            ),
        );
        if (i < stages.length - 1) {
            wrap.appendChild(
                h("div", { className: "pipeline-connector animated" }),
            );
        }
    });
    return wrap;
}

export function lifecycleSteps(steps: string[]): HTMLElement {
    const wrap = h("div", { className: "lifecycle-dots" });
    steps.forEach((s, i) => {
        const step = h("div", { className: "lifecycle-step", textContent: s });
        wrap.appendChild(step);
        if (i < steps.length - 1) {
            wrap.appendChild(h("span", { className: "lifecycle-arrow" }, "→"));
        }
    });
    return wrap;
}

export function topicToolbar(topicId: string): HTMLElement {
    const wrap = h("div", { className: "topic-toolbar" });
    const btn = h("button", { className: "btn btn-sm" });

    const updateBtn = () => {
        const done = Store.isChecked(topicId);
        btn.textContent = done ? "✓ Completed" : "Mark complete";
        btn.classList.toggle("btn-primary", done);
    };

    btn.addEventListener("click", () => {
        Store.toggleCheck(topicId);
        updateBtn();
        document.dispatchEvent(
            new CustomEvent("topic-check-changed", { detail: { topicId } }),
        );
        toast(
            Store.isChecked(topicId)
                ? "Topic marked complete"
                : "Topic marked incomplete",
            "info",
        );
    });

    updateBtn();
    wrap.appendChild(btn);
    return wrap;
}
