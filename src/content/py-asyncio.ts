// src/content/py-asyncio.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-asyncio",
    title: "AsyncIO",
    intro: "Single-threaded concurrency via event loop. Coroutines yield control with await.",
    blocks: [
        {
            kind: "card",
            title: "🧠 Mental Model",
            html:
                "<p>Single-threaded concurrency via event loop. Coroutines yield control with await.</p>" +
                "<p><b>The invariant that makes asyncio correct:</b> a coroutine runs to completion only between " +
                "<code>await</code> points. At an <code>await</code> the interpreter suspends the frame, registers " +
                "a callback for the future it is waiting on, and hands the thread back to the loop — so N tasks " +
                "are served by <em>one</em> thread and progress requires that the awaited operation be genuinely " +
                "asynchronous.</p>" +
                "<p>If an <code>await</code> expression blocks the thread (a <code>time.sleep</code>, a synchronous DB " +
                "driver, a big pure-Python loop), every other task stalls with it. That single sentence explains " +
                "almost every asyncio bug.</p>",
        },
        {
            kind: "card",
            title: "🔄 How the event loop schedules tasks",
            html:
                "<p>Read the diagram top to bottom: one <code>Task</code> blocks at <code>await</code>, its " +
                "continuation is parked, and the loop serves the next ready task until a selector reports I/O " +
                "completion. Concurrency is an illusion of interleaving, not parallelism.</p>",
        },
        {
            kind: "diagram",
            caption:
                "One thread, many tasks: suspend at await, resume from the selector",
            source: `sequenceDiagram
    autonumber
    participant T as Task A
    participant L as EventLoop
    participant Q as Ready queue
    participant S as Selector (epoll / kqueue)
    participant T2 as Task B
    T->>L: task starts running
    L->>Q: move remaining tasks to ready queue
    L->>T: resume Task A on next iteration
    T->>S: await socket.read() - registers callback, suspends
    T-->>L: frame parked, control returns to loop
    L->>T2: resume Task B
    T2->>S: await socket.write()
    S-->>L: socket A readable
    L->>T: schedule Task A continuation in ready queue
    L->>T: Task A resumes after the await point`,
        },
        {
            kind: "card",
            title: "🎬 Event Loop",
            // The legacy page injected this static markup from a setTimeout into a
            // viz-area div; it is inlined verbatim as the card body.
            html: `            <div style="display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;">
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task A</div>
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task B</div>
                <div style="padding:12px 20px;background:var(--accent);border-radius:8px;color:white;font-weight:600;">Task C</div>
                <span style="color:var(--text-muted);">↓</span>
                <div style="padding:12px 24px;background:var(--bg-tertiary);border:1px solid var(--accent);border-radius:8px;color:var(--accent-light);font-weight:600;">Event Loop</div>
            </div>
            <p style="text-align:center;margin-top:12px;font-size:0.85rem;color:var(--text-muted);">Each task suspends at <code>await</code> and yields the single thread back to the loop</p>
        `,
        },
        {
            kind: "card",
            title: "🔬 What `await` actually does",
            html: `<table class="complexity-table">
<tr><th>Expression</th><th>What is awaited</th><th>Who resumes it</th></tr>
<tr><td><code>await sleep(1)</code></td><td>TimerHandle</td><td>The loop's <code>_run_once</code> when the monotonic clock passes the deadline</td></tr>
<tr><td><code>await queue.get()</code></td><td>Queue getter future</td><td>The producer's <code>put_nowait</code></td></tr>
<tr><td><code>await lock.acquire()</code></td><td>Lock acquire future</td><td>The first releaser, or the next FIFO waiter</td></tr>
<tr><td><code>await task</code></td><td>The child task</td><td>That task's completion callback</td></tr>
<tr><td><code>await future</code></td><td>Plain future</td><td>Whoever calls <code>set_result</code> / <code>set_exception</code></td></tr>
<tr><td><code>await gather(...)</code></td><td>Future wrapping all children</td><td>When the last child finishes; cancels siblings on error</td></tr>
</table>
<p style="margin-top:10px;"><b>Blocking <code>await</code></b> suspends <em>the current task</em>, not
the thread. That is why <code>asyncio.sleep</code> is mandatory and <code>time.sleep</code> is a bug:
with ten tasks doing <code>time.sleep(1)</code> the run takes ten seconds, not one.</p>`,
        },
        {
            kind: "code",
            title: "💻 Example",
            language: "python",
            code: `import asyncio

async def fetch(url):
    await asyncio.sleep(1)  # Simulate I/O
    return f"Data from {url}"

async def main():
    results = await asyncio.gather(
        fetch("api/1"), fetch("api/2")
    )`,
        },
        {
            kind: "card",
            title: "🧱 Concurrent primitives (3.11+)",
            html: `<p><b>TaskGroup</b> is the structured-concurrency answer. It owns its children: it starts them together,
waits for all of them, and on any exception it cancels the survivors and raises an
<code>ExceptionGroup</code>. No leaked tasks, no forgotten <code>await</code>.</p>
<pre><code class="language-python">async def main():
    async with asyncio.TaskGroup() as tg:          # 3.11+
        for user_id in ids:
            tg.create_task(process(user_id))       # children cancelled if one raises

# child failures are collected, never swallowed silently
try:
    async with asyncio.TaskGroup() as tg:
        tg.create_task(flaky_a())
        tg.create_task(flaky_b())
except* TimeoutError as eg:
    ...   # except* splits an ExceptionGroup by type (3.11+)

# 3.8-3.10 equivalent, correct but noisier
tasks = [asyncio.create_task(w(i)) for i in range(100)]
try:
    results = await asyncio.gather(*tasks, return_exceptions=True)
finally:
    for t in tasks:
        t.cancel()
    await asyncio.gather(*tasks, return_exceptions=True)</code></pre>
<table class="complexity-table">
<tr><th>Primitive</th><th>Blocks?</th><th>Typical use</th><th>Gotcha</th></tr>
<tr><td><code>asyncio.sleep</code></td><td>No</td><td>Simulated latency, retry backoff</td><td>Never <code>time.sleep</code></td></tr>
<tr><td><code>Semaphore(n)</code></td><td>Yes, when n in flight</td><td>Cap concurrency against a rate-limited API</td><td>The <code>async with</code> must wrap the actual await</td></tr>
<tr><td><code>Queue</code></td><td>Yes when empty</td><td>Producer/consumer pipelines</td><td>Unbounded queue hides back-pressure</td></tr>
<tr><td><code>Lock</code></td><td>Yes</td><td>Mutual exclusion, e.g. one in-flight refresh</td><td>Re-entering deadlocks (no owner tracking)</td></tr>
<tr><td><code>Event</code></td><td>Yes</td><td>One-shot "shutdown" signal</td><td>Must <code>clear()</code> if reusable</td></tr>
<tr><td><code>Condition</code></td><td>Yes</td><td>Wait for a predicate to become true</td><td>Use <code>wait_for</code>, not bare <code>wait</code></td></tr>
<tr><td><code>gather</code></td><td>Yes</td><td>Fire-and-await a fixed set</td><td>Order preserved, exceptions raised eagerly</td></tr>
<tr><td><code>TaskGroup</code></td><td>Yes</td><td>Structured concurrency (preferred)</td><td>Child exceptions are grouped</td></tr>
<tr><td><code>shield</code></td><td>No</td><td>Protect an inner operation from outer cancel</td><td>The outer <code>await</code> still raises <code>CancelledError</code></td></tr>
<tr><td><code>as_completed</code></td><td>Iterator</td><td>Stream results as they land</td><td>Must consume inside the task group</td></tr>
</table>`,
        },
        // The legacy card was an empty wrapper around the diagram below.
        {
            kind: "card",
            title: "🧭 Bounded concurrency, cancellation and timeouts",
        },
        {
            kind: "diagram",
            caption:
                "Semaphore caps in-flight work; TaskGroup makes cancellation structural",
            source: `flowchart TD
    START["1000 user ids to fetch"] --> SEM["async with Semaphore(20)<br/>only 20 requests in flight"]
    SEM --> CREATE["TaskGroup creates 1000 tasks<br/>each starts and immediately queues"]
    CREATE -->|"task acquires"| RUN["perform request"]
    RUN -->|"done"| DONE["release semaphore<br/>task exits scope"]
    CREATE -->|"some task raises"| CANCEL["TaskGroup cancels<br/>every unfinished sibling"]
    CANCEL --> EG["raise ExceptionGroup"]
    START -.->|"try / async with asyncio.timeout(5)"| TO["TimeoutError<br/>cancel + wait_for cleanup"]
    RUN -.-> TO`,
        },
        {
            kind: "card",
            title: "✂️ Cancellation & timeouts",
            html: `<p>Cancellation in asyncio is <b>cooperative</b>: <code>task.cancel()</code> raises
<code>asyncio.CancelledError</code> at the task's next suspension point. The task then has a chance to
clean up — which is why <code>finally</code> blocks and <code>async with</code> exits matter.</p>
<pre><code class="language-python">async def resilient():
    try:
        async with asyncio.timeout(5):        # 3.11+
            await slow_work()
    except TimeoutError:
        ...                                     # cancelled, no orphan task
    except asyncio.CancelledError:
        await cleanup()                         # re-raise afterwards!
        raise

t = asyncio.create_task(resilient())
t.cancel()
await t                                     # always await a cancelled task
# asyncio.wait_for(coro, 5) does both for you (prefer asyncio.timeout inside a TaskGroup)</code></pre>
<ul style="padding-left:20px;line-height:1.9;">
<li>Since 3.8 <code>CancelledError</code> inherits from <code>BaseException</code>, not
<code>Exception</code> — so a bare <code>except Exception</code> will <em>not</em> swallow it. That is
deliberate and saves you from swallowing cancellation.</li>
<li>Never <code>await</code> inside a <code>finally</code> that runs during cancellation without a
<code>shield</code> or <code>wait_for</code> guard — a second cancellation can interrupt the cleanup.</li>
<li>Unawaited coroutines emit "coroutine was never awaited" warnings at GC time. The usual sources are a
bare <code>create_task</code> call with no reference kept (the task can be GC'd mid-flight), and
<code>lru_cache</code> on an <code>async def</code>.</li>
</ul>`,
        },
        {
            kind: "card",
            title: "⏱️ Complexity & scheduling",
            html: `<table class="complexity-table">
<tr><th>Aspect</th><th>Bound</th><th>Notes</th></tr>
<tr><td>Cost of one <code>await</code></td><td>~1 µs of loop work</td><td>Cheap. Awaiting a million tasks is fine; awaiting in a hot numeric loop is not.</td></tr>
<tr><td>Scheduling fairness</td><td>O(1) per task per loop iteration</td><td><code>_run_once</code> pops a bounded batch of ready callbacks each tick.</td></tr>
<tr><td>Selector cost</td><td>O(1) per <code>epoll_wait</code></td><td>One syscall per loop iteration regardless of how many sockets are registered.</td></tr>
<tr><td>Task memory</td><td>~1-2 KB per task + frame</td><td>10k tasks is fine; 10M tasks is not — shard across processes instead.</td></tr>
<tr><td>Context switch</td><td>No OS context switch</td><td>Everything happens on one core, so total throughput equals the slowest blocking call.</td></tr>
</table>
<p style="margin-top:10px;"><code>uvloop</code> (used by Uvicorn when installed) is the same API with a
faster C loop — typically 2-4x. <code>asyncio.run()</code> is the one-call entry point for scripts;
it creates a fresh loop, runs the main coroutine, and cancels leftover tasks at exit.</p>`,
        },
        {
            kind: "card",
            title: "⚠️ Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Blocking the loop.</b> <code>time.sleep</code>, <code>requests</code>, sync DB drivers, " +
                "<code>json.dumps</code> on a huge payload, or a CPU-bound function inside a coroutine — all " +
                "serialise every other task. Fix: <code>asyncio.to_thread</code> for the short blocking calls, a " +
                "real async driver for the rest, a process pool for real CPU work.</li>" +
                "<li><b>Creating a task in a loop without keeping a reference</b> — the task may be garbage " +
                "collected mid-execution. Use a set or a <code>TaskGroup</code>.</li>" +
                "<li><b>Fire-and-forget with no error handling.</b> An exception in a background task is stored on " +
                "the task and only surfaces when someone awaits it. Log it, or use " +
                "<code>task.add_done_callback</code>.</li>" +
                "<li><b>Assuming the loop is thread-safe.</b> <code>asyncio.get_event_loop()</code> from a worker " +
                "thread does not do what you think; use <code>asyncio.run_coroutine_threadsafe</code>.</li>" +
                "<li><b><code>async for</code> over a sync iterable</b> blocks — <code>async for</code> requires an " +
                "object with <code>__aiter__</code>.</li>" +
                "<li><b>Mixing <code>run_until_complete</code> inside a running loop</b> raises immediately. In " +
                "Jupyter/Notebook use <code>await</code> at top level.</li>" +
                "<li><b>Semaphore created in the wrong scope</b> — a semaphore bound to one loop cannot be awaited " +
                "from another (e.g. created at import time and used per-request).</li>" +
                "<li><b>Subclassing <code>asyncio.Task</code></b> for timeouts or to track all tasks — fragile " +
                "across versions; prefer <code>TaskGroup</code> / <code>asyncio.timeout</code>.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "🎤 Interview Q&A" },
        {
            kind: "collapsible",
            title: "Explain the event loop as if I have never used async.",
            html:
                "<p><b>A:</b> it is a while-loop that (1) runs every coroutine that is ready to make progress, (2) " +
                "asks the OS selector which registered file descriptors are ready, (3) wakes the coroutines that " +
                "were waiting on those descriptors, (4) runs the expired timers, and repeats. Concurrency comes " +
                "from suspending at <code>await</code>, not from threads. There is exactly one thread running " +
                "Python bytecode, so the loop is safe without locks but is only fast if nothing blocks it.</p>",
        },
        {
            kind: "collapsible",
            title: "`await` is not blocking — so why did my requests all serialise?",
            html:
                "<p><b>A:</b> because something in the chain was blocking. Most often a synchronous HTTP client or " +
                "DB driver called inside an <code>async def</code>. <code>await</code> only yields if the awaited " +
                "object implements the async protocol; awaiting a synchronous call (even wrapped in a coroutine) " +
                "runs it to completion on the loop thread. Diagnose with <code>py-spy dump --pid</code> and look for " +
                "the same frame repeated across tasks.</p>",
        },
        {
            kind: "collapsible",
            title: "When is `asyncio.gather` the wrong tool?",
            html:
                "<p><b>A:</b> in three cases: when a child fails (the default raises on the first exception and " +
                "leaves the rest running — use <code>TaskGroup</code>); when you want streaming results as they " +
                "complete (use <code>as_completed</code>); and when the tasks must be cancellable as a unit with a " +
                "timeout (use <code>asyncio.timeout</code>). In 3.11+ <code>TaskGroup</code> is the default " +
                "answer.</p>",
        },
        {
            kind: "collapsible",
            title: "How does `asyncio.to_thread` relate to the GIL?",
            html:
                "<p><b>A:</b> it hands the blocking call to the default <code>ThreadPoolExecutor</code> (since " +
                "3.9), so the loop keeps serving other tasks while the OS thread works. It only helps for " +
                "<em>blocking</em> work — for CPU-bound work the thread still holds the GIL and steals a " +
                "timeslice from the loop, so use a process pool (<code>ProcessPoolExecutor</code> / " +
                "<code>run_in_executor</code> with it).</p>",
        },
        {
            kind: "collapsible",
            title: "How do you backpressure a fan-out of 10,000 requests?",
            html:
                "<p><b>A:</b> bound the in-flight set with a <code>Semaphore</code> and/or page the work in " +
                "batches, so memory and the remote API both stay bounded. Combine with " +
                "<code>asyncio.timeout</code> per task and a <code>TaskGroup</code> for structured cleanup; return " +
                "<code>return_exceptions=True</code> (or catch per task) so one failure does not abort the whole " +
                "batch.</p>",
        },
        {
            kind: "card",
            title: "🔥 Real-world usage",
            html:
                "Uvicorn/FastAPI, aiohttp, <code>asyncpg</code>, SQLAlchemy <code>create_async_engine</code>, " +
                "Redis (<code>redis.asyncio</code>), <code>httpx</code>, Kafka clients, and every SDK that ships an " +
                "<code>async</code> variant. LangChain and most LLM providers are async-first, which is why agent " +
                "loops are written as coroutines rather than callback chains.",
        },
        {
            kind: "card",
            title: "🗣️ What to say out loud",
            html:
                "Draw the loop: ready queue, selector, timers, resume. Then the single killer sentence — " +
                "<i>await suspends a task, not a thread; anything that blocks the thread blocks every task</i>. " +
                "Finish with TaskGroup as the modern structured-concurrency answer; that single sentence about " +
                "blocking is what the interviewer is listening for.",
        },
    ],
});
