// src/content/py-gil.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-gil",
    title: "GIL (Global Interpreter Lock)",
    intro: "The GIL prevents true parallel execution of Python bytecode across threads.",
    blocks: [
        {
            kind: "card",
            title: "GIL Visualization",
            // The legacy page injected this static markup from a setTimeout into a
            // viz-area div; it is inlined verbatim as the card body.
            html: `            <div style="display:flex;align-items:center;gap:16px;justify-content:center;flex-wrap:wrap;">
                <div style="padding:12px 20px;background:var(--blue);border-radius:8px;color:white;font-weight:600;">Thread A</div>
                <div style="font-size:1.5rem;color:var(--text-muted);">⇄</div>
                <div style="padding:12px 24px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Python Interpreter</div>
                <div style="font-size:1.5rem;color:var(--text-muted);">⇄</div>
                <div style="padding:12px 20px;background:var(--green);border-radius:8px;color:white;font-weight:600;">Thread B</div>
            </div>
            <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:var(--text-muted);">Only ONE thread holds the GIL at a time — they take turns at the eval breaker and around every blocking syscall</p>
        `,
        },
        {
            kind: "card",
            title: "Key Insight",
            html:
                "<p>The GIL prevents true parallel execution of Python bytecode across threads. For CPU-bound " +
                "work, use multiprocessing instead.</p>" +
                "<p><b>The invariant that defines it:</b> at any instant at most one thread in an interpreter " +
                "executes Python bytecode, and bytecode can only advance while holding the GIL. Everything else — " +
                "refcount updates, C extensions, blocking syscalls, and explicit release calls — is where threads " +
                "get a chance to swap in.</p>",
        },
        {
            kind: "card",
            title: "Inside the eval loop",
            html:
                "<p>CPython runs bytecode in a loop that does three things in order: execute instructions, " +
                "maintain the reference count, and periodically check the <em>eval breaker</em> to drop the GIL. " +
                "That third step is why threads make progress even without any I/O.</p>",
        },
        {
            kind: "diagram",
            caption:
                "Refcount on every instruction, GIL drop on the eval breaker or an I/O release",
            source: `flowchart TD
    FETCH["Fetch and decode next bytecode instruction"] --> EXEC["Execute it in the current thread"]
    EXEC --> REF["Update reference counts<br/>objects hitting zero are freed immediately"]
    REF --> BREAK{"Eval breaker tripped?<br/>interval or pending call"}
    BREAK -->|"no"| FETCH
    BREAK -->|"yes, waiting threads exist"| DROP["Release the GIL<br/>wait on the OS condition variable"]
    DROP --> SWITCH["Another waiting thread acquires<br/>the GIL and runs"]
    SWITCH --> FETCH
    BREAK -->|"yes, but nobody is waiting"| FETCH
    EXEC -.->|"C extension, e.g. socket recv or file IO"| IO["GIL released around the blocking call"]
    IO --> BREAK`,
        },
        {
            kind: "card",
            title: "Why threads still help",
            html:
                "<p>The GIL is not " +
                '"one thread at a time forever". It is dropped often:</p>' +
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li>Every <b>N bytecodes</b> (a few hundred) CPython checks the eval breaker and yields to waiting " +
                "threads.</li>" +
                "<li>Every <b>syscall</b> that blocks (<code>socket.recv</code>, file reads, <code>os.read</code>) " +
                "releases the GIL, which is precisely why I/O-bound threading works at all.</li>" +
                "<li>Many C extensions release it explicitly — <code>hashlib</code>, <code>zlib</code>, " +
                "<code>json</code>, NumPy's big loops, and NumPy releases it around <code>@</code> matmul.</li>" +
                "<li>Calls that can trigger Python code (<code>Py_BEGIN_ALLOW_THREADS</code> sites) release it " +
                "too.</li>" +
                "</ul>" +
                '<p style="margin-top:10px;">So the honest statement is: <b>threads overlap I/O and drop-in C ' +
                "code; they overlap pure-Python CPU work not at all</b> — and with the default 5 ms switch interval " +
                "they may even be slower than serial code due to context-switch churn. That is also why GIL " +
                "contention inflates tail latency (p99) long before it hurts average throughput: the whole queue " +
                "waits on the lock.</p>",
        },
        // The legacy card was an empty wrapper around the diagram below.
        { kind: "card", title: "Two threads, one GIL" },
        {
            kind: "diagram",
            caption:
                "One thread at a time, but they take turns — so the work is serialised, not parallel",
            source: `sequenceDiagram
    participant OS as OS scheduler
    participant T1 as Thread A
    participant T2 as Thread B
    participant G as GIL mutex
    OS->>T1: dispatch, acquires the GIL
    T1->>T1: executes Python bytecode
    T1->>G: eval breaker - releases the GIL
    OS->>T2: dispatch, acquires the GIL
    T2->>T2: executes Python bytecode, A is idle
    T2->>G: releases the GIL for I/O or breaker
    OS->>T1: dispatch, acquires the GIL again`,
        },
        {
            kind: "card",
            title: "Getting real parallelism",
            html: `<table class="complexity-table">
<tr><th>Approach</th><th>How it beats the GIL</th><th>Cost / caveat</th></tr>
<tr><td><code>multiprocessing</code></td><td>Separate processes, separate interpreters, separate GILs</td><td>IPC cost; pickling; no shared memory by default</td></tr>
<tr><td>Native extension (C/Cython/Rust)</td><td>Heavy loops run in C without needing bytecode</td><td>Build tooling, GIL release discipline</td></tr>
<tr><td>NumPy / vectorised libraries</td><td>Bulk work in C, and the GIL is released inside the loops</td><td>Constant-factor wins, not algorithmic ones</td></tr>
<tr><td>Subprocess / serverless</td><td>Different OS processes entirely</td><td>Serialisation and cold starts</td></tr>
<tr><td><b>Free-threaded CPython (3.13t / 3.14)</b></td><td><b>No GIL at all</b> — opt-in build, threads run bytecode in parallel</td><td>Single-threaded overhead of roughly 5-10% from finer-grained locking; some extensions are not yet thread-safe</td></tr>
</table>
<pre><code class="language-python"># Free-threaded build:  python3.13t
# or, on a build compiled with --disable-gil:  PYTHON_GIL_DISABLED=1 python3.13
# python3.13t -c "import sysconfig; print(sysconfig.get_config_var('Py_GIL_DISABLED'))"  -> 1
# Reason at runtime:
import sysconfig
free_threaded = bool(sysconfig.get_config_var("Py_GIL_DISABLED"))
print("free-threaded:", free_threaded)     # False on a normal 3.13 build</code></pre>
<p style="margin-top:10px;">3.12 also introduced a <em>per-interpreter</em> GIL: each sub-interpreter
gets its own lock, so they no longer serialise against the main interpreter. That is a different feature
free-threading, and conflating the two is the most common mistake in this topic.</p>`,
        },
        {
            kind: "card",
            title: "Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                '<li><b>"The GIL makes Python threads useless" is wrong.</b> Threads are excellent for I/O and for C ' +
                "extensions that release the lock; they are useless only for pure-Python CPU work.</li>" +
                "<li><b>Assuming <code>time.sleep</code> releases the GIL.</b> It does — <code>sleep</code> is a " +
                'syscall — which is exactly why a "threaded" CPU benchmark with sleeps looks parallel and a real ' +
                "one does not.</li>" +
                "<li><b>Compile-time constant folding hides GIL costs.</b> <code>for i in range(n): pass</code> " +
                "may be optimised to nothing; the loop must contain real work to measure contention.</li>" +
                "<li><b>The switch interval is tunable.</b> <code>sys.setswitchinterval(0.0005)</code> trades " +
                "throughput for tail latency in mixed workloads — measure, and only for a measured problem.</li>" +
                "<li><b>Free-threaded builds are opt-in and slower single-threaded.</b> Never promise " +
                '"3.13 has no GIL" — say "3.13 ships an experimental free-threaded build; the default build still ' +
                'has the GIL".</li>' +
                "<li><b>Do not measure GIL contention without pinning cores.</b> A test that lands two threads on " +
                "one core measures the OS scheduler, not the GIL.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Interview Q&A" },
        {
            kind: "collapsible",
            title: "What exactly does the GIL protect, and what does it not?",
            html:
                "<p><b>A:</b> it protects CPython's internal data structures — the reference counts, the object " +
                "heap and the interpreter's own mutable state — from concurrent bytecode execution. It does not " +
                "protect shared resources in your own objects from a <em>sequence</em> of operations, it does not " +
                "protect C extensions that release it, and it says nothing about multiprocessing or " +
                "subprocesses.</p>",
        },
        {
            kind: "collapsible",
            title: "Why does CPython still use a GIL?",
            html:
                "<p><b>A:</b> it makes reference counting and container mutation safe without per-object locks, " +
                "which keeps single-threaded code fast and keeps C extensions simple to write. The cost is that " +
                "bytecode execution is serialised. PEP 703 (3.13) attacks that with a biased-refcount, " +
                "deferred-reference-count design plus immortal objects and per-object locking so that free-threaded " +
                "builds pay a small single-threaded cost instead of a large complexity cost.</p>",
        },
        {
            kind: "collapsible",
            title: "I profiled and the GIL is 60% of my CPU time. Now what?",
            html:
                "<p><b>A:</b> three options in order of cost: (1) reduce the total Python-level work — " +
                "algorithmic change, vectorise with NumPy, cache; (2) move the hot loop into a C/Cython extension " +
                "that releases the GIL, or into a separate process; (3) if and only if you can control the runtime, " +
                "try a free-threaded 3.13+ build and measure both the parallel speedup and the single-threaded " +
                "regression. Retuning <code>sys.setswitchinterval</code> is a stopgap, not a fix.</p>",
        },
        {
            kind: "collapsible",
            title: "Does the GIL exist in Jython or IronPython?",
            html:
                "<p><b>A:</b> no — they run on the JVM and .NET, which are genuinely parallel, and they cannot run " +
                "C extensions. That is why the GIL is a CPython implementation detail rather than a language " +
                'guarantee, and why "Python is single-threaded" is a wrong sentence to say in an interview.</p>',
        },
    ],
});
