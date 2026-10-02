// src/content/react-architecture.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-architecture",
    title: "React Architecture",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html: `
<p>Architecture in React is mostly about <em>where code runs</em> and <em>who owns state</em>.
Composition (children, slots, compound components) replaces inheritance. Custom hooks replace
HOCs and render props for shared behavior. Server Components (RSC) move data fetching and
heavy dependencies to the server so the client bundle only contains interactive leaves.</p>`,
        },
        {
            kind: "card",
            title: "🧱 A typical app, layered",
            html: `
<p>Keep the arrows one-way. Feature modules import from UI primitives, not the other way
around. Server components import clients; clients never import servers.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TB
    RSC["Server Components<br/>fetch data, render static UI"] --> CC["Client Components<br/>hooks, events, local state"]
    ACT["Server Actions<br/>mutations with revalidation"] --> RSC
    CC --> HOOK["Custom hooks<br/>one concern each"]
    CC --> UI["Presentational primitives"]
`,
            caption:
                "RSC is the default; Client Components are the opt-in islands of interactivity",
        },
        {
            kind: "table",
            title: "⚡ Patterns",
            headers: ["Pattern", "What it solves", "When it hurts"],
            rows: [
                [
                    "Compound components",
                    "<code>Select.Item</code> shares implicit state via context",
                    "Overkill for a one-off button",
                ],
                [
                    "Custom hooks",
                    "Reuse behavior without wrapping the tree",
                    "A 200-line hook that is secretly a module",
                ],
                [
                    "Headless + styled",
                    "Logic in a hook or headless lib, look in your design system",
                    "Re-styling a coupled component from a UI kit",
                ],
                [
                    "Feature folders",
                    "Colocate route, components, tests, API for one domain",
                    "Circular imports when features reach into each other",
                ],
                [
                    "HOC / render props",
                    "Legacy sharing of behavior",
                    "Wrapper hell; prefer hooks",
                ],
            ],
        },
        {
            kind: "card",
            title: "🌐 Server Components vs Client Components",
            html: `
<p>RSC cannot use hooks or browser APIs. They can <code>await</code> a database directly and
send serialized UI to the client. A file with <code>'use client'</code> is a boundary: that
module and its imports become part of the bundle. Push the boundary down so a leaf button
is client, not the whole page.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    Page["app/invoices/page.tsx<br/>Server Component"] --> Table["InvoiceTable RSC<br/>await db.invoices()"]
    Table --> Row["InvoiceRow RSC"]
    Row --> Btn["PayButton<br/>use client"]
    Btn --> Hook["useTransition + server action"]
`,
            caption:
                "Only PayButton ships JS; the table HTML arrives already rendered",
        },
        {
            kind: "code",
            title: "💻 Compound component sketch",
            language: "javascript",
            code: `const TabsContext = createContext(null);

export function Tabs({ children, defaultValue }) {
    const [value, setValue] = useState(defaultValue);
    return (
        <TabsContext.Provider value={{ value, setValue }}>
            {children}
        </TabsContext.Provider>
    );
}
Tabs.List = function List({ children }) {
    return <div role="tablist">{children}</div>;
};
Tabs.Tab = function Tab({ id, children }) {
    const { value, setValue } = useContext(TabsContext);
    return (
        <button role="tab" aria-selected={value === id} onClick={() => setValue(id)}>
            {children}
        </button>
    );
};`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Container vs presentational — still relevant?",
                    a: "<p><b>A:</b> The names faded; the split did not. Data and effects in a small parent (or a server component); dumb UI as children. Custom hooks ate the old container classes.</p>",
                },
                {
                    q: "How do you keep a feature from importing the world?",
                    a: "<p><b>A:</b> Public API per feature folder (<code>index.ts</code> that exports only the page and types). Cross-feature talk goes through the URL, a query cache, or a thin shared package — not deep imports.</p>",
                },
            ],
        },
    ],
});
