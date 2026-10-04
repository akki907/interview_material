// src/content/react-state.ts
import { registerContent } from "./registry";

registerContent({
    id: "react-state",
    title: "State Management",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html: `
<p>State should live in the lowest common ancestor of the components that read or write it.
That is "lifting state up". Context is not a state manager — it is a way to skip prop drilling
for a value that already lives somewhere. Libraries (Zustand, Redux, Jotai, TanStack Query)
earn their keep when updates are frequent, the tree is wide, or the source of truth is the
server.</p>
<p><b>Server state vs client state.</b> A list of todos from the API is server state: cache it
(TanStack Query). "Is the modal open?" is client state: <code>useState</code>. Mixing them
in Redux is how stores become a second, stale database.</p>`,
        },
        {
            kind: "card",
            title: "Where does this value live?",
            html: `
<p>Walk the decision tree out loud in an interview. Most teams over-reach for a global store
because they are tired of drilling, not because the data is actually global.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    Q["Who needs this value?"] --> One["One component"]
    Q --> Few["A subtree"]
    Q --> Many["Distant, unrelated trees"]
    Q --> Server["Comes from the network"]
    One --> US["useState or useReducer"]
    Few --> Lift["Lift to the parent<br/>pass props"]
    Lift --> Ctx{"Drilling through 4+ layers<br/>that do not care?"}
    Ctx -->|"no"| Props["Keep props"]
    Ctx -->|"yes"| Context["Context for that subtree"]
    Many --> Lib["Zustand / Redux / Jotai<br/>subscribe narrowly"]
    Server --> TQ["TanStack Query / SWR<br/>cache, revalidate, mutate"]
`,
            caption:
                "Start local. Promote only when the readers are actually far apart",
        },
        {
            kind: "card",
            title: "Patterns",
            html: `
<ul style="padding-left:20px;line-height:1.9;">
<li><b>Lifting state.</b> Two children need the same value → parent owns it, children get
<code>value</code> + <code>onChange</code>.</li>
<li><b>Derived state.</b> <code>const total = items.reduce(...)</code> during render. Do not
store totals in state unless computing them is measurably expensive.</li>
<li><b>Optimistic updates.</b> Write the cache immediately, roll back on error. Query libraries
do this; a homemade Redux slice usually forgets the rollback path.</li>
<li><b>URL as state.</b> Filters, selected tab, pagination belong in search params so refresh
and share work. <code>useSearchParams</code> is a store.</li>
<li><b>Colocate reducers.</b> A form with five dependent fields is <code>useReducer</code>, not
five <code>useState</code>s that fight in effects.</li>
</ul>`,
        },
        {
            kind: "card",
            title: "Context without accidental broadcasts",
            html: `
<p>A context consumer re-renders when the provider's <code>value</code> identity changes.
Putting <code>value={{ user, setUser }}</code> inline creates a new object every render and
defeats memoization of every consumer. Split "rarely changing" from "high-frequency" values,
or use a store that lets components subscribe to a selector.</p>`,
        },
        {
            kind: "diagram",
            source: `
flowchart TD
    P["Provider value equals new object every render"] --> All["Every useContext subscriber re-renders"]
    S["Zustand selector: useStore(s => s.user.id)"] --> One["Only components whose selected slice changed"]
    Split["Split UserContext and ThemeContext"] --> Fine["Theme toggle does not re-render the inbox"]
`,
            caption:
                "Context is a broadcast bus. Selectors and split providers turn it back into a scalpel",
        },
        {
            kind: "code",
            title: "Example",
            language: "javascript",
            code: `// Zustand: subscribe to a slice, not the whole store
const useCart = create((set) => ({
    items: [],
    add: (item) => set((s) => ({ items: [...s.items, item] })),
}));
function Badge() {
    const count = useCart((s) => s.items.length);
    return <span>{count}</span>;
}

// Context done safely: memoize the value
function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const value = useMemo(() => ({ user, setUser }), [user]);
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}`,
        },
        {
            kind: "qa",
            items: [
                {
                    q: "Redux or Zustand in 2026?",
                    a: "<p><b>A:</b> Zustand for most client trees: less boilerplate, selector subscriptions. Redux Toolkit still wins when you need time-travel, middleware, or a large existing ecosystem. Neither should cache server data that TanStack Query already handles.</p>",
                },
                {
                    q: "Is Context slow?",
                    a: '<p><b>A:</b> Context itself is cheap. Re-rendering every consumer on every provider update is not. The fix is split contexts, memoized values, or a store with selectors — not "never use Context".</p>',
                },
                {
                    q: "How do you keep form state from exploding?",
                    a: "<p><b>A:</b> Uncontrolled inputs plus <code>FormData</code> for simple forms. <code>useReducer</code> or a form library when fields depend on each other. Do not put keystrokes into a global store.</p>",
                },
            ],
        },
    ],
});
