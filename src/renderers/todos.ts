// src/renderers/todos.ts — Study Todos & Checklist renderer
import { h, toast, escHtml } from '../utils';
import { Store, TodoItem, TodoCategory, TodoPriority } from '../store';
import { NAV } from '../data';

const CATEGORY_META: Record<TodoCategory, { label: string; icon: string; cls: string }> = {
    dsa: { label: 'DSA', icon: '🧠', cls: 'c1' },
    react: { label: 'React', icon: '⚛️', cls: 'c4' },
    python: { label: 'Python', icon: '🐍', cls: 'c5' },
    ai: { label: 'AI Engineering', icon: '🤖', cls: 'c2' },
    systemDesign: { label: 'System Design', icon: '🏗️', cls: 'c0' },
    general: { label: 'General', icon: '🎯', cls: 'c3' },
};

const PRIORITY_META: Record<TodoPriority, { label: string; icon: string; cls: string }> = {
    high: { label: 'High', icon: '🔥', cls: 'priority-high' },
    medium: { label: 'Medium', icon: '⚡', cls: 'priority-medium' },
    low: { label: 'Low', icon: '☕', cls: 'priority-low' },
};

export function renderTodos(container: HTMLElement): void {
    const section = h('div', { className: 'page-enter todos-view' });

    // Local view state
    let filterStatus: 'all' | 'active' | 'completed' = 'all';
    let filterCategory: 'all' | TodoCategory = 'all';
    let filterPriority: 'all' | TodoPriority = 'all';
    let searchQuery = '';
    let isAddFormOpen = false;
    let editingTodoId: string | null = null;

    // Build selectable topics list from NAV
    const topicOptions: Array<{ id: string; label: string }> = [];
    NAV.forEach(group => {
        if (group.children) {
            group.children.forEach(child => {
                topicOptions.push({
                    id: child.id,
                    label: `${group.label.split(' ')[0]} ${child.label}`,
                });
            });
        } else if (group.id !== 'todos' && group.id !== 'dashboard') {
            topicOptions.push({ id: group.id, label: group.label });
        }
    });

    // ── Header ───────────────────────────────────────────────
    const header = h('div', { className: 'todos-header' });
    header.innerHTML = `
        <div class="todos-title-wrap">
            <h2>✅ Study Plan & Action Items</h2>
            <p class="todos-subtitle">Track your targeted interview preparation milestones across algorithms, system design, and AI engineering.</p>
        </div>
    `;
    section.appendChild(header);

    // ── Metrics Bar ──────────────────────────────────────────
    const metricsBar = h('div', { className: 'todos-metrics-bar' });
    section.appendChild(metricsBar);

    // ── Quick Controls & Filters ─────────────────────────────
    const controlsWrap = h('div', { className: 'todos-controls-wrap' });
    section.appendChild(controlsWrap);

    // ── Add / Edit Form Card (collapsible) ─────────────────────
    const formCard = h('div', { className: 'card todos-form-card hidden' });
    section.appendChild(formCard);

    // ── Todo Items Container ─────────────────────────────────
    const listContainer = h('div', { className: 'todos-list-container' });
    section.appendChild(listContainer);

    function updateMetrics(todos: TodoItem[]): void {
        const total = todos.length;
        const completed = todos.filter(t => t.completed).length;
        const active = total - completed;
        const highPriorityActive = todos.filter(t => !t.completed && t.priority === 'high').length;
        const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

        metricsBar.innerHTML = `
            <div class="stat-card">
                <div class="stat-value" style="color:var(--accent)">${total}</div>
                <div class="stat-label">Total Goals</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--green)">${completed}</div>
                <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--orange)">${active}</div>
                <div class="stat-label">Active Tasks</div>
            </div>
            <div class="stat-card">
                <div class="stat-value" style="color:var(--orange)">${highPriorityActive} 🔥</div>
                <div class="stat-label">High Priority</div>
            </div>
            <div class="todo-progress-summary">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
                    <span style="font-weight:600;font-size:0.85rem;">Study Readiness</span>
                    <span style="font-size:0.85rem;font-weight:600;color:var(--green);">${pct}%</span>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill dsa" style="width:${pct}%;background:var(--green);"></div>
                </div>
            </div>
        `;
    }

    function renderControls(todos: TodoItem[]): void {
        controlsWrap.innerHTML = '';

        const total = todos.length;
        const active = todos.filter(t => !t.completed).length;
        const completed = total - active;

        // Top row: Add button + Search input + Bulk action button
        const topRow = h('div', { className: 'todos-top-row' });

        const addBtn = h('button', {
            className: 'btn btn-primary',
            innerHTML: isAddFormOpen ? '✕ Close Form' : '➕ Add Study Goal',
            onClick: () => {
                isAddFormOpen = !isAddFormOpen;
                editingTodoId = null;
                renderForm();
                renderControls(Store.getTodos());
            },
        });
        topRow.appendChild(addBtn);

        const searchBox = h('div', { className: 'todos-search-box' });
        searchBox.innerHTML = `
            <input type="text" class="todos-search-input" placeholder="Search study tasks..." value="${escHtml(searchQuery)}" />
        `;
        const searchInput = searchBox.querySelector('input')!;
        searchInput.addEventListener('input', () => {
            searchQuery = searchInput.value;
            renderList();
        });
        topRow.appendChild(searchBox);

        const actionsDropdownWrap = h('div', { className: 'todos-actions-wrap' });
        const bulkBtn = h('button', {
            className: 'btn btn-secondary',
            textContent: '⚡ Quick Presets & Actions ▾',
            onClick: () => {
                const menu = actionsDropdownWrap.querySelector('.todos-dropdown-menu');
                menu?.classList.toggle('hidden');
            },
        });
        actionsDropdownWrap.appendChild(bulkBtn);

        const dropdownMenu = h('div', { className: 'todos-dropdown-menu hidden card' });
        dropdownMenu.innerHTML = `
            <button class="dropdown-item" id="act-mark-all">✓ Mark all complete</button>
            <button class="dropdown-item" id="act-clear-done">🗑️ Clear completed</button>
            <button class="dropdown-item" id="act-add-preset-rag">➕ Add RAG Production Checklist</button>
            <button class="dropdown-item" id="act-add-preset-dsa">➕ Add Blind 75 Hot List</button>
            <button class="dropdown-item" id="act-reset-defaults">↺ Reset to recommended tasks</button>
        `;

        dropdownMenu.querySelector('#act-mark-all')!.addEventListener('click', () => {
            const all = Store.getTodos();
            all.forEach(t => { t.completed = true; });
            Store.saveTodos(all);
            toast('All tasks marked complete!', 'success');
            refresh();
        });

        dropdownMenu.querySelector('#act-clear-done')!.addEventListener('click', () => {
            const removed = Store.clearCompletedTodos();
            toast(`Cleared ${removed} completed task(s)`, 'info');
            refresh();
        });

        dropdownMenu.querySelector('#act-add-preset-rag')!.addEventListener('click', () => {
            Store.addTodo({
                title: 'Evaluate RAG retrieval with RAGAS (faithfulness, answer relevance)',
                category: 'ai',
                priority: 'high',
                completed: false,
                linkedTopicId: 'ai-rag-eval',
                notes: 'Test grounding score with synthetic test dataset.',
            });
            Store.addTodo({
                title: 'Review Agent Memory patterns: working memory vs episodic vector memory',
                category: 'ai',
                priority: 'medium',
                completed: false,
                linkedTopicId: 'ai-agent-memory',
                notes: 'Understand short-term context window compaction vs long-term storage.',
            });
            toast('Added RAG & Agent study tasks!', 'success');
            refresh();
        });

        dropdownMenu.querySelector('#act-add-preset-dsa')!.addEventListener('click', () => {
            Store.addTodo({
                title: 'Solve Two Pointers: Trapping Rain Water',
                category: 'dsa',
                priority: 'high',
                completed: false,
                linkedTopicId: 'dsa-two-pointers',
                notes: 'Maintain left_max and right_max in O(1) space.',
            });
            Store.addTodo({
                title: 'Implement Monotonic Stack for Daily Temperatures',
                category: 'dsa',
                priority: 'medium',
                completed: false,
                linkedTopicId: 'dsa-stack',
                notes: 'Store indices of descending temperatures.',
            });
            toast('Added DSA interview sprint tasks!', 'success');
            refresh();
        });

        dropdownMenu.querySelector('#act-reset-defaults')!.addEventListener('click', () => {
            if (confirm('Reset todos to the curated default interview tasks?')) {
                Store.resetTodos();
                toast('Reset to default study plan', 'info');
                refresh();
            }
        });

        actionsDropdownWrap.appendChild(dropdownMenu);
        topRow.appendChild(actionsDropdownWrap);
        controlsWrap.appendChild(topRow);

        // Filter pills row
        const filterRow = h('div', { className: 'todos-filters-row' });

        // Status Tabs
        const statusTabs = h('div', { className: 'todos-status-tabs' });
        const statuses: Array<{ key: 'all' | 'active' | 'completed'; label: string; count: number }> = [
            { key: 'all', label: 'All', count: total },
            { key: 'active', label: 'Active', count: active },
            { key: 'completed', label: 'Done', count: completed },
        ];
        statuses.forEach(s => {
            const btn = h('button', {
                className: `tab ${filterStatus === s.key ? 'active' : ''}`,
                textContent: `${s.label} (${s.count})`,
                onClick: () => {
                    filterStatus = s.key;
                    renderControls(Store.getTodos());
                    renderList();
                },
            });
            statusTabs.appendChild(btn);
        });
        filterRow.appendChild(statusTabs);

        // Category filter chips
        const catSelect = h('select', {
            className: 'todos-select',
            onChange: (e) => {
                filterCategory = (e.target as HTMLSelectElement).value as 'all' | TodoCategory;
                renderList();
            },
        });
        catSelect.innerHTML = `
            <option value="all" ${filterCategory === 'all' ? 'selected' : ''}>All Categories</option>
            <option value="dsa" ${filterCategory === 'dsa' ? 'selected' : ''}>🧠 DSA</option>
            <option value="react" ${filterCategory === 'react' ? 'selected' : ''}>⚛️ React</option>
            <option value="python" ${filterCategory === 'python' ? 'selected' : ''}>🐍 Python</option>
            <option value="ai" ${filterCategory === 'ai' ? 'selected' : ''}>🤖 AI Engineering</option>
            <option value="systemDesign" ${filterCategory === 'systemDesign' ? 'selected' : ''}>🏗️ System Design</option>
            <option value="general" ${filterCategory === 'general' ? 'selected' : ''}>🎯 General</option>
        `;
        filterRow.appendChild(catSelect);

        // Priority filter
        const prioSelect = h('select', {
            className: 'todos-select',
            onChange: (e) => {
                filterPriority = (e.target as HTMLSelectElement).value as 'all' | TodoPriority;
                renderList();
            },
        });
        prioSelect.innerHTML = `
            <option value="all" ${filterPriority === 'all' ? 'selected' : ''}>All Priorities</option>
            <option value="high" ${filterPriority === 'high' ? 'selected' : ''}>🔥 High Priority</option>
            <option value="medium" ${filterPriority === 'medium' ? 'selected' : ''}>⚡ Medium Priority</option>
            <option value="low" ${filterPriority === 'low' ? 'selected' : ''}>☕ Low Priority</option>
        `;
        filterRow.appendChild(prioSelect);

        controlsWrap.appendChild(filterRow);
    }

    function renderForm(): void {
        if (!isAddFormOpen) {
            formCard.classList.add('hidden');
            formCard.innerHTML = '';
            return;
        }

        formCard.classList.remove('hidden');
        const editingTodo = editingTodoId ? Store.getTodos().find(t => t.id === editingTodoId) : null;

        const isEditing = !!editingTodo;
        const initialTitle = editingTodo ? editingTodo.title : '';
        const initialCat = editingTodo ? editingTodo.category : 'dsa';
        const initialPrio = editingTodo ? editingTodo.priority : 'high';
        const initialTopic = editingTodo ? (editingTodo.linkedTopicId || '') : '';
        const initialDue = editingTodo ? (editingTodo.dueDate || '') : '';
        const initialNotes = editingTodo ? (editingTodo.notes || '') : '';

        formCard.innerHTML = `
            <div class="card-header">
                <h3>${isEditing ? '✏️ Edit Study Task' : '➕ New Study Task'}</h3>
                <button class="icon-btn" id="close-form-btn">✕</button>
            </div>
            <form id="todo-form" class="todos-form-body">
                <div class="form-group">
                    <label>Task Title *</label>
                    <input type="text" id="todo-title-input" class="todos-input" required
                           placeholder="e.g., Implement LRU Cache with O(1) get and put"
                           value="${escHtml(initialTitle)}" />
                </div>
                <div class="form-row-grid">
                    <div class="form-group">
                        <label>Category</label>
                        <select id="todo-cat-input" class="todos-select">
                            <option value="dsa" ${initialCat === 'dsa' ? 'selected' : ''}>🧠 DSA</option>
                            <option value="react" ${initialCat === 'react' ? 'selected' : ''}>⚛️ React</option>
                            <option value="python" ${initialCat === 'python' ? 'selected' : ''}>🐍 Python</option>
                            <option value="ai" ${initialCat === 'ai' ? 'selected' : ''}>🤖 AI Engineering</option>
                            <option value="systemDesign" ${initialCat === 'systemDesign' ? 'selected' : ''}>🏗️ System Design</option>
                            <option value="general" ${initialCat === 'general' ? 'selected' : ''}>🎯 General</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="todo-prio-input" class="todos-select">
                            <option value="high" ${initialPrio === 'high' ? 'selected' : ''}>🔥 High</option>
                            <option value="medium" ${initialPrio === 'medium' ? 'selected' : ''}>⚡ Medium</option>
                            <option value="low" ${initialPrio === 'low' ? 'selected' : ''}>☕ Low</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Target Date</label>
                        <input type="date" id="todo-due-input" class="todos-input" value="${escHtml(initialDue)}" />
                    </div>
                </div>
                <div class="form-group">
                    <label>Link to Topic (Optional — enables 1-click jump to study material)</label>
                    <select id="todo-topic-input" class="todos-select">
                        <option value="">-- None (General task) --</option>
                        ${topicOptions.map(t => `<option value="${t.id}" ${initialTopic === t.id ? 'selected' : ''}>${escHtml(t.label)}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Strategy / Notes (Optional)</label>
                    <textarea id="todo-notes-input" class="todos-textarea" rows="2"
                              placeholder="Key edge cases, interview traps, complexity goals...">${escHtml(initialNotes)}</textarea>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">${isEditing ? 'Save Changes' : 'Create Task'}</button>
                    <button type="button" class="btn btn-ghost" id="cancel-form-btn">Cancel</button>
                </div>
            </form>
        `;

        formCard.querySelector('#close-form-btn')!.addEventListener('click', () => {
            isAddFormOpen = false;
            editingTodoId = null;
            renderForm();
            renderControls(Store.getTodos());
        });

        formCard.querySelector('#cancel-form-btn')!.addEventListener('click', () => {
            isAddFormOpen = false;
            editingTodoId = null;
            renderForm();
            renderControls(Store.getTodos());
        });

        const form = formCard.querySelector('#todo-form') as HTMLFormElement;
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const title = (formCard.querySelector('#todo-title-input') as HTMLInputElement).value.trim();
            if (!title) return;

            const category = (formCard.querySelector('#todo-cat-input') as HTMLSelectElement).value as TodoCategory;
            const priority = (formCard.querySelector('#todo-prio-input') as HTMLSelectElement).value as TodoPriority;
            const dueDate = (formCard.querySelector('#todo-due-input') as HTMLInputElement).value || undefined;
            const linkedTopicId = (formCard.querySelector('#todo-topic-input') as HTMLSelectElement).value || undefined;
            const notes = (formCard.querySelector('#todo-notes-input') as HTMLTextAreaElement).value.trim() || undefined;

            if (isEditing && editingTodoId) {
                Store.updateTodo(editingTodoId, { title, category, priority, dueDate, linkedTopicId, notes });
                toast('Task updated successfully', 'success');
            } else {
                Store.addTodo({
                    title,
                    category,
                    priority,
                    dueDate,
                    linkedTopicId,
                    notes,
                    completed: false,
                });
                toast('Study goal added!', 'success');
            }

            isAddFormOpen = false;
            editingTodoId = null;
            refresh();
        });

        // Focus title input
        setTimeout(() => {
            (formCard.querySelector('#todo-title-input') as HTMLInputElement)?.focus();
        }, 50);
    }

    function renderList(): void {
        listContainer.innerHTML = '';
        const allTodos = Store.getTodos();

        // Filter
        const filtered = allTodos.filter(t => {
            if (filterStatus === 'active' && t.completed) return false;
            if (filterStatus === 'completed' && !t.completed) return false;
            if (filterCategory !== 'all' && t.category !== filterCategory) return false;
            if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
            if (searchQuery) {
                const q = searchQuery.toLowerCase();
                const matchTitle = t.title.toLowerCase().includes(q);
                const matchNotes = t.notes ? t.notes.toLowerCase().includes(q) : false;
                if (!matchTitle && !matchNotes) return false;
            }
            return true;
        });

        if (filtered.length === 0) {
            const empty = h('div', { className: 'card todos-empty-card' });
            if (allTodos.length === 0) {
                empty.innerHTML = `
                    <div class="empty-icon">🎉</div>
                    <h3>No tasks yet!</h3>
                    <p style="color:var(--text-muted);margin:8px 0 16px;">Add study goals or load our recommended interview prep checklist.</p>
                    <button class="btn btn-primary" id="btn-load-defaults">Load Recommended Checklist</button>
                `;
                empty.querySelector('#btn-load-defaults')!.addEventListener('click', () => {
                    Store.resetTodos();
                    toast('Loaded recommended checklist!', 'success');
                    refresh();
                });
            } else {
                empty.innerHTML = `
                    <div class="empty-icon">🔍</div>
                    <h3>No matching tasks found</h3>
                    <p style="color:var(--text-muted);margin:8px 0 16px;">Try adjusting your status, category, or search filters.</p>
                    <button class="btn btn-secondary" id="btn-reset-filters">Clear Filters</button>
                `;
                empty.querySelector('#btn-reset-filters')!.addEventListener('click', () => {
                    filterStatus = 'all';
                    filterCategory = 'all';
                    filterPriority = 'all';
                    searchQuery = '';
                    refresh();
                });
            }
            listContainer.appendChild(empty);
            return;
        }

        filtered.forEach(todo => {
            const cat = CATEGORY_META[todo.category] || CATEGORY_META.general;
            const prio = PRIORITY_META[todo.priority] || PRIORITY_META.medium;

            const item = h('div', {
                className: `todo-item-card card ${todo.completed ? 'completed' : ''}`,
            });

            // Checkbox
            const checkbox = h('button', {
                className: `todo-check-btn ${todo.completed ? 'checked' : ''}`,
                title: todo.completed ? 'Mark incomplete' : 'Mark complete',
                innerHTML: todo.completed ? '✓' : '',
                onClick: (e) => {
                    e.stopPropagation();
                    const state = Store.toggleTodo(todo.id);
                    toast(state ? 'Completed: ' + todo.title : 'Re-opened: ' + todo.title, 'info');
                    refresh();
                },
            });

            // Main body
            const body = h('div', { className: 'todo-main-body' });

            const metaRow = h('div', { className: 'todo-meta-row' });
            metaRow.innerHTML = `
                <span class="tag ${cat.cls}">${cat.icon} ${cat.label}</span>
                <span class="tag ${prio.cls}">${prio.icon} ${prio.label}</span>
                ${todo.dueDate ? `<span class="tag tag-due">📅 ${todo.dueDate}</span>` : ''}
            `;
            body.appendChild(metaRow);

            const titleEl = h('div', {
                className: `todo-title ${todo.completed ? 'strike' : ''}`,
                textContent: todo.title,
            });
            body.appendChild(titleEl);

            if (todo.notes) {
                const notesEl = h('div', {
                    className: 'todo-notes',
                    innerHTML: `<strong>Note:</strong> ${escHtml(todo.notes)}`,
                });
                body.appendChild(notesEl);
            }

            // Action row
            const actions = h('div', { className: 'todo-actions-row' });

            if (todo.linkedTopicId) {
                const linkBtn = h('button', {
                    className: 'btn btn-sm btn-link-topic',
                    innerHTML: '📖 Study Topic →',
                    onClick: (e) => {
                        e.stopPropagation();
                        window.navigateTo(todo.linkedTopicId!);
                    },
                });
                actions.appendChild(linkBtn);
            }

            const editBtn = h('button', {
                className: 'icon-btn todo-action-btn',
                title: 'Edit Task',
                textContent: '✏️',
                onClick: (e) => {
                    e.stopPropagation();
                    editingTodoId = todo.id;
                    isAddFormOpen = true;
                    renderForm();
                    formCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                },
            });
            actions.appendChild(editBtn);

            const deleteBtn = h('button', {
                className: 'icon-btn todo-action-btn',
                title: 'Delete Task',
                textContent: '🗑️',
                onClick: (e) => {
                    e.stopPropagation();
                    Store.deleteTodo(todo.id);
                    toast('Task removed', 'info');
                    refresh();
                },
            });
            actions.appendChild(deleteBtn);

            item.appendChild(checkbox);
            item.appendChild(body);
            item.appendChild(actions);

            listContainer.appendChild(item);
        });
    }

    function refresh(): void {
        const todos = Store.getTodos();
        updateMetrics(todos);
        renderControls(todos);
        renderForm();
        renderList();
    }

    // Initial render
    refresh();

    // Listen for storage changes from other components (e.g. Dashboard)
    const onTodosChanged = () => refresh();
    document.addEventListener('todos-changed', onTodosChanged);

    container.appendChild(section);
}
