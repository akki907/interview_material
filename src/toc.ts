// src/toc.ts — per-page table of contents with scroll-spy + reading progress
import { h } from "./utils";

const TOC_MIN_ENTRIES = 4;

let observer: IntersectionObserver | null = null;
let scrollHandler: (() => void) | null = null;
let tocEl: HTMLElement | null = null;

/** Label cleanup: emoji-only headings collapse to the next real word. */
function tocLabel(text: string): string {
    const stripped = text
        .replace(
            /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{2B00}-\u{2BFF}]/gu,
            "",
        )
        .trim();
    return stripped || text;
}

export function destroyToc(): void {
    observer?.disconnect();
    observer = null;
    if (scrollHandler && tocEl) {
        tocEl
            .closest(".main-content")
            ?.removeEventListener("scroll", scrollHandler);
    }
    scrollHandler = null;
    tocEl?.remove();
    tocEl = null;
}

/**
 * Build a TOC from the anchors that `card()` stamped on every heading.
 * Renders nothing when the page has too few sections to be worth indexing.
 */
export function buildToc(root: HTMLElement): void {
    destroyToc();

    const headings = Array.from(
        root.querySelectorAll<HTMLElement>(".card-header h3[id]"),
    );
    if (headings.length < TOC_MIN_ENTRIES) return;

    const nav = h("nav", {
        className: "page-toc",
        "aria-label": "Page sections",
    });
    nav.appendChild(h("div", { className: "page-toc-title" }, "On this page"));
    const list = h("ul", { className: "page-toc-list" });

    const links = new Map<string, HTMLAnchorElement>();
    for (const heading of headings) {
        const li = h("li");
        const a = h(
            "a",
            { className: "page-toc-link", href: "#" + heading.id },
            tocLabel(heading.textContent || ""),
        );
        a.addEventListener("click", (e) => {
            e.preventDefault();
            heading.scrollIntoView({ behavior: "smooth", block: "start" });
            // Keep the address bar clean rather than pushing a #fragment.
            history.replaceState(null, "", location.pathname + location.search);
        });
        links.set(heading.id, a);
        li.appendChild(a);
        list.appendChild(li);
    }
    nav.appendChild(list);

    const main = root.closest(".main-content");
    main?.insertBefore(nav, root);

    // Scroll-spy: the topmost heading intersecting the viewport wins.
    observer = new IntersectionObserver(
        (entries) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                for (const a of links.values()) a.classList.remove("active");
                links
                    .get((entry.target as HTMLElement).id)
                    ?.classList.add("active");
            }
        },
        { root: main, rootMargin: "-80px 0px -70% 0px", threshold: 0 },
    );
    for (const heading of headings) observer.observe(heading);

    // Reading progress rail.
    const fill = document.getElementById("reading-progress-fill");
    if (fill && main) {
        scrollHandler = () => {
            const max = main.scrollHeight - main.clientHeight;
            const pct =
                max <= 0
                    ? 0
                    : Math.min(100, Math.round((main.scrollTop / max) * 100));
            fill.style.width = pct + "%";
        };
        main.addEventListener("scroll", scrollHandler, { passive: true });
        scrollHandler();
    }
}
