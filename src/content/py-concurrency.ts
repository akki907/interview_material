// src/content/py-concurrency.ts
import { registerContent } from "./registry";

registerContent({
    id: "py-concurrency",
    title: "Concurrency",
    intro: "Threading for I/O-bound, multiprocessing for CPU-bound, asyncio for high-concurrency I/O.",
    blocks: [
        {
            kind: "card",
            title: "Mental Model",
            html:
                "<p>Threading for I/O-bound, multiprocessing for CPU-bound, asyncio for high-concurrency I/O.</p>" +
                "<p><b>The invariant that decides the tool:</b> concurrency buys you <em>overlap of waiting</em>, " +
                "parallelism buys you <em>simultaneous execution</em>, and in CPython only separate processes (or a " +
                "free-threaded build) give you the latter for Python bytecode. So the first question is never " +
                '"which library" — it is "is this work waiting on something, or computing?"</p>' +
                "<p>The second question: " +
                '"how much of it?" A handful of blocking sockets justifies a thread pool; a hundred thousand ' +
                "justifies an event loop, because a thread costs ~8 MB of stack (virtual) and an OS scheduling " +
                "entity.</p>",
        },
        {
            kind: "card",
            title: "Choose the tool",
            html:
                "<p>Follow the branches: the first question is whether the work spends its time waiting or " +
                "computing, the second is how many concurrent operations there are.</p>",
        },
        {
            kind: "diagram",
            caption: "The decision path: CPU-bound, then scale",
            source: `flowchart TD
    Q1{"Is the work CPU-bound<br/>compute, compress, parse,<br/>inference?"}
    Q1 -->|"yes"| POOL["ProcessPoolExecutor<br/>or native library<br/>true parallelism, IPC cost"]
    Q1 -->|"no"| Q2{"How many concurrent<br/>operations?"}
    Q2 -->|"tens"| THREADS["ThreadPoolExecutor<br/>simple, works with sync code"]
    Q2 -->|"thousands"| ASYNCIO["asyncio + TaskGroup<br/>one thread, bounded by semaphore"]
    Q2 -->|"1-4 cores, pure Python"| SUBPROC["subprocess / ProcessPool<br/>embarrassingly parallel jobs"]
    ASYNCIO --> MIX["Mixed workload:<br/>asyncio for I/O,<br/>to_thread or process pool for CPU"]
    THREADS --> MIX
    POOL --> MIX`,
        },
        {
            kind: "table",
            title: "When to use what",
            headers: ["Task Type", "Tool"],
            rows: [
                ["I/O-bound", "asyncio / threads"],
                ["CPU-bound", "multiprocessing"],
                ["High concurrency", "asyncio"],
            ],
        },
        {
            kind: "card",
            title: "Full comparison",
            html: `<table class="complexity-table">
<tr><th>Dimension</th><th>threading</th><th>multiprocessing</th><th>asyncio</th></tr>
<tr><td>Execution model</td><td>N threads, 1 process, 1 interpreter</td><td>N processes, N interpreters</td><td>N tasks, 1 thread</td></tr>
<tr><td>True parallelism in CPython</td><td>No — the GIL serialises bytecode</td><td>Yes — separate processes</td><td>No — one thread</td></tr>
<tr><td>CPU-bound speedup</td><td>~1x (often slower)</td><td>~N cores</td><td>~1x, and it starves the loop</td></tr>
<tr><td>I/O concurrency ceiling</td><td>Hundreds (context-switch + stack cost)</td><td>Hundreds (context-switch + IPC)</td><td>Tens of thousands (one thread)</td></tr>
<tr><td>Memory per unit</td><td>~8 MB stack + thread state</td><td>~30 MB interpreter (fork: COW helps)</td><td>~1-2 KB task + coroutine frame</td></tr>
<tr><td>Shared state</td><td>Easy (shared memory, needs a lock)</td><td>None — must pickle or use shared memory</td><td>Easy (one thread) but blocks the loop</td></tr>
<tr><td>Failure isolation</td><td>None — a segfault kills the process</td><td>Full — a worker can die alone</td><td>Full — a task can be cancelled</td></tr>
<tr><td>Cancellation</td><td>Cooperative only (a running thread ignores <code>Event</code>)</td><td>Terminate the process</td><td>Native: <code>cancel()</code> at the next await</td></tr>
<tr><td>Debuggability</td><td>Simple</td><td>Hard: pickling, fork safety, interleaving</td><td>Simple, but stack traces stop at await</td></tr>
<tr><td>Best for</td><td>Legacy sync libraries, blocking SDKs, modest fan-out</td><td>CPU-heavy batches, image/video, ML inference, crawls with parsing</td><td>Web servers, API fan-out, streams, DB pools</td></tr>
</table>
<p style="margin-top:10px;">Rule of thumb: <b>default to asyncio</b> for network I/O,
<b>reach for processes</b> when a profiler says the CPU is busy, and reach for <code>numpy</code>/a
native library before either — the fastest "concurrency" fix for pure-Python maths is to stop doing it in
Python.</p>`,
        },
        {
            kind: "code",
            title: "Worked example — one program, three regimes",
            language: "python",
            code: `import asyncio, time
from concurrent.futures import ThreadPoolExecutor, ProcessPoolExecutor

def cpu_work(n):                      # burns GIL cycles
    return sum(i * i for i in range(n))

def io_work(url):                     # releases the GIL while waiting
    time.sleep(0.5)                   # stand-in for a socket read
    return url

async def amain(urls):
    sem = asyncio.Semaphore(20)        # bound the fan-out
    async def one(u):
        async with sem:
            return io_work(u)          # blocking -> use to_thread in real code
    async with asyncio.TaskGroup() as tg:
        for u in urls:
            tg.create_task(one(u))

# CPU-bound, 4 jobs -> 4 processes: ~4x faster
with ProcessPoolExecutor(max_workers=4) as ex:
    ex.map(cpu_work, [10**7] * 4)

# blocking I/O, 100 jobs -> threads (or asyncio; threads keep sync code unchanged)
with ThreadPoolExecutor(max_workers=16) as ex:
    list(ex.map(io_work, urls))        # 100 jobs / 16 workers x 0.5s ~ 3.2s`,
        },
        {
            kind: "card",
            title: "Real-world context",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Web servers:</b> uvicorn (asyncio) for I/O, gunicorn with " +
                "<code>UvicornWorker</code> to get multiple processes, or uWSGI/gunicorn sync workers for " +
                "threaded traffic. Celery uses prefork processes; RQ and Dramatiq use threads/processes for " +
                "I/O.</li>" +
                "<li><b>Data:</b> <code>pandas</code> releases the GIL inside its C loops, so threads give " +
                "little; <code>ProcessPoolExecutor</code> plus <code>multiprocessing.shared_memory</code> avoids " +
                "copying big frames. Joblib and Dask wrap the same idea.</li>" +
                "<li><b>ML inference:</b> batching inside one process beats more Python threads, because the heavy " +
                "math is in BLAS/CUDA, not Python.</li>" +
                "<li><b>Microservices:</b> one event loop per container, scaled horizontally — that is what the " +
                "asyncio model is optimised for.</li>" +
                "<li><b>Mixed workloads:</b> keep asyncio for the request path and offload CPU blocks with " +
                "<code>await asyncio.to_thread(...)</code> or " +
                "<code>run_in_executor(ProcessPoolExecutor(), ...)</code>.</li>" +
                "</ul>",
        },
        {
            kind: "card",
            title: "Pitfalls & gotchas",
            html:
                '<ul style="padding-left:20px;line-height:1.9;">' +
                "<li><b>Threads for CPU work.</b> Context switching makes it slower than serial execution. Always " +
                "benchmark before " +
                '"optimising" this way.</li>' +
                "<li><b><code>fork()</code> + threads + open sockets.</b> Forking a multi-threaded process can " +
                "deadlock in the child if a lock was held at fork time. Prefer <code>spawn</code> start method on " +
                "macOS/Windows and in any pre-forked worker pool.</li>" +
                "<li><b>Passing huge objects to a process pool.</b> Arguments are pickled — a 200 MB numpy array " +
                "costs more than the computation. Use shared memory or a file path.</li>" +
                "<li><b>Threads do not make sync I/O parallel in async code.</b> Blocking a thread inside a " +
                "coroutine still blocks the loop.</li>" +
                "<li><b>Unbounded <code>ThreadPoolExecutor</code> defaults.</b> Python caps threads at " +
                "<code>min(32, cpu+4)</code> by default; a " +
                '"fixed" pool that grows is the usual culprit behind a fan-out that never finishes.</li>' +
                "<li><b>Data races look like they work.</b> <code>x += 1</code> on a shared counter from N threads " +
                "is not atomic in general; the GIL makes CPython's bytecode-level ops safer than in C, but the race " +
                "window around releasing the GIL is still real. Use <code>queue.Queue</code> or a lock.</li>" +
                "</ul>",
        },
        // The legacy card was an empty wrapper around the collapsible answers below.
        { kind: "card", title: "Interview Q&A" },
        {
            kind: "collapsible",
            title: "You have a slow function. How do you parallelise it in Python?",
            html:
                "<p><b>A:</b> first find out <em>where</em> the time goes. Network wait → asyncio (or a thread " +
                "pool if the client is sync-only). Pure-Python CPU → <code>ProcessPoolExecutor</code>. Already in " +
                "NumPy/SciPy → probably already threaded; use more processes or bigger batches. And first consider " +
                "whether the algorithm can be improved, because no pool fixes an O(n²) loop.</p>",
        },
        {
            kind: "collapsible",
            title: "When is multiprocessing overkill?",
            html:
                "<p><b>A:</b> when the work is I/O-bound (use asyncio), when it is already parallelised inside a " +
                "native library, when the payload is so large that pickling dominates, and when the tasks are tiny " +
                "— process start-up plus IPC exceeds the work itself. If tasks are milliseconds long, batching them " +
                "inside one process usually wins.</p>",
        },
        {
            kind: "collapsible",
            title: 'How would you run 10,000 URLs "concurrently"?',
            html:
                "<p><b>A:</b> with an event loop and bounded concurrency: <code>httpx.AsyncClient</code> + " +
                "<code>Semaphore(50)</code> + <code>asyncio.TaskGroup</code>, a per-request timeout, and retries " +
                "with exponential backoff. Threads would work but cost far more memory. Whatever the tool, cap the " +
                "fan-out — unbounded concurrency just moves the failure to the far end.</p>",
        },
        {
            kind: "collapsible",
            title: "Do threads share state safely?",
            html:
                "<p><b>A:</b> they share the heap, so yes with synchronisation and no without. " +
                "<code>queue.Queue</code>, locks, and immutability are the practical tools; and the GIL removes " +
                "data races on individual bytecode instructions but gives no atomicity across multi-instruction " +
                "sequences, nor protection in free-threaded builds.</p>",
        },
    ],
});
