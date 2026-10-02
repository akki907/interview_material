// src/nav.ts — Navigation building and handling
import { NAV } from "./data";
import { RENDERERS } from "./renderers/index";
import { Store } from "./store";
import { topicToolbar, resetCardSlugs } from "./components";
import { renderMermaid } from "./mermaid";
import { buildToc, destroyToc } from "./toc";
import { h } from "./utils";

function findNavChild(id: string): string | null {
    for (const group of NAV) {
        if (group.children?.some((c) => c.id === id)) return id;
    }
    return null;
}

export function syncNavChecked(topicId: string): void {
    const el = document.querySelector(`.nav-sub[data-id="${topicId}"]`);
    if (el) el.classList.toggle("checked", Store.isChecked(topicId));
}

export function buildNav(): void {
    const nav = document.getElementById("sidebar-nav")!;
    const frag = document.createDocumentFragment();
    NAV.forEach((group) => {
        if (group.children) {
            const wrapper = h("div", { className: "nav-group" });
            const header = h("div", {
                className: "nav-item nav-group-header",
                "data-group": group.id,
            });
            header.appendChild(
                h("span", {}, group.label.split(" ").slice(1).join(" ")),
            );
            header.appendChild(h("span", { className: "nav-arrow" }, "▸"));
            wrapper.appendChild(header);

            const children = h("div", {
                className: "nav-children expanded",
                "data-children": group.id,
            });
            group.children.forEach((child) => {
                const checked = Store.isChecked(child.id);
                children.appendChild(
                    h(
                        "div",
                        {
                            className: "nav-sub" + (checked ? " checked" : ""),
                            "data-id": child.id,
                        },
                        child.label,
                    ),
                );
            });
            wrapper.appendChild(children);
            frag.appendChild(wrapper);
        } else {
            frag.appendChild(
                h(
                    "div",
                    { className: "nav-item", "data-id": group.id },
                    group.label,
                ),
            );
        }
    });
    nav.replaceChildren(frag);

    nav.querySelectorAll<HTMLElement>(".nav-item, .nav-sub").forEach((el) => {
        el.addEventListener("click", () => {
            const id = el.dataset.id;
            if (id) navigateTo(id);
            const group = el.closest(".nav-group");
            if (group) {
                const children = group.querySelector(".nav-children")!;
                children.classList.toggle("collapsed");
                const arrow = group.querySelector<HTMLElement>(".nav-arrow");
                if (arrow)
                    arrow.style.transform = children.classList.contains(
                        "collapsed",
                    )
                        ? "rotate(-90deg)"
                        : "";
            }
        });
    });
}

export function navigateTo(id: string): void {
    destroyToc();
    resetCardSlugs();
    document
        .querySelectorAll(".nav-item, .nav-sub")
        .forEach((el) => el.classList.remove("active"));
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) el.classList.add("active");

    if (el && el.classList.contains("nav-sub")) {
        el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    const content = document.getElementById("content")!;
    content.innerHTML = '<div class="fade-in">Loading...</div>';

    setTimeout(() => {
        const renderer = RENDERERS[id];
        if (renderer) {
            content.innerHTML = "";
            renderer(content);
            if (findNavChild(id)) {
                const page = content.querySelector(".page-enter");
                if (page) page.insertBefore(topicToolbar(id), page.firstChild);
            }
            buildToc(content);
        } else {
            content.innerHTML =
                '<div class="card"><h2>Page not found</h2><p>The requested topic does not exist yet.</p></div>';
        }
        window.hljs?.highlightAll();
        renderMermaid(content);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, 50);
}

document.addEventListener("topic-check-changed", (e) => {
    syncNavChecked((e as CustomEvent<{ topicId: string }>).detail.topicId);
});
