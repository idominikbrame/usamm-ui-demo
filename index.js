function getFutureDateISO(daysAhead = 1) {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const getTodayISO = () => getFutureDateISO(0);

function getTaskSection(task) {
    if (!task.dueDate) return "today";
    const today = getTodayISO();
    return task.dueDate < today ? "past-due" : task.dueDate === today ? "today" : "upcoming";
}

function formatDateBadge(dateStr) {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    return parts.length === 3 && parts[0].length === 4 ? `${parts[2]}-${parts[1]}-${parts[0].slice(2)}` : dateStr;
}

const LIST_COLORS = [
    "#ff6b6b", "#66d9e8", "#ffd43b", "#b197fc", "#69db7c", "#ff922b", "#f06595", "#4dabf7", "#38d9a9", "#a9e34b", "#845ef7",
    "#fa5252", "#15aabf", "#fab005", "#9775fa", "#40c057", "#fd7e14", "#e64980", "#228be6", "#12b886", "#82c91e", "#7048e8",
    "#c92a2a", "#0b7285", "#e67700", "#5f3dc4", "#2b8a3e", "#d9480f", "#a61e4d", "#1864ab", "#087f5b", "#5c940d", "#495057"
];
const availableTagColors = ["tag-teal", "tag-pink"];

let lists = [
    { name: "Personal", color: "color-red" },
    { name: "Work", color: "color-cyan" },
    { name: "Projects", color: "color-yellow" }
];
let tags = [
    { name: "Priority", colorClass: "tag-teal" },
    { name: "Design", colorClass: "tag-pink" }
];

const makeTask = (id, title, category, dueDate = "", list = "", listColor = "", taskTags = [], subtasks = [], description = "", extra = {}) => ({
    id, title, description, category, completed: false, dueDate, list, listColor,
    tags: taskTags, subtasks: subtasks.map((text) => ({ text, completed: false })), ...extra
});

let tasks = [
    makeTask(1, "Review sprint velocity metrics", "today", "", "", "", ["Priority"], [], "Compare completed story points against the current release burndown."),
    makeTask(2, "Draft API integration spec", "today", "", "", "", ["Design"], [], "Document authentication endpoints and payload schemas for v2."),
    makeTask(3, "Update design system tokens", "today", getTodayISO(), "Personal", "color-red", ["Priority"], ["Audit contrast ratios"], "Sync typography scale and elevation variables with engineering.", { detailDueDate: getTodayISO() }),
    makeTask(4, "Prepare stakeholder demo deck", "today", "", "Projects", "color-yellow", [], ["Record feature walkthrough", "Gather latency benchmarks", "Finalize Q&A slides"], "", { metaOrder: ["list", "subtasks"] }),
    makeTask(5, "Verify staging deployment", "today"),
    makeTask(101, "Finalize Q2 marketing roadmap", "upcoming", getFutureDateISO(5), "Work", "color-cyan", ["Priority"], ["Draft slide deck", "Confirm budget with finance"], "Align campaign goals with the product launch schedule."),
    makeTask(102, "Schedule annual dentist appointment", "upcoming", getFutureDateISO(7), "Personal", "color-red"),
    makeTask(103, "Update portfolio case studies", "upcoming", getFutureDateISO(2), "Work", "color-cyan", ["Design"], ["Export high-res mockups"]),
    makeTask(104, "Book flights for design conference", "upcoming", getFutureDateISO(10), "Work", "color-cyan"),
    makeTask(105, "Renew home insurance policy", "upcoming", getFutureDateISO(14), "Personal", "color-red"),
    makeTask(106, "Prepare onboarding guide for new hires", "upcoming", getFutureDateISO(3), "Work", "color-cyan", [], ["Update tool access checklist", "Record welcome walkthrough"]),
    makeTask(107, "Review quarterly analytics report", "upcoming", getFutureDateISO(4), "Work", "color-cyan", ["Priority"]),
    makeTask(108, "Audit website accessibility", "upcoming", getFutureDateISO(6), "Work", "color-cyan"),
    makeTask(109, "Order new ergonomic keyboard", "upcoming", getFutureDateISO(8), "Projects", "color-yellow"),
    makeTask(110, "Send client appreciation gifts", "upcoming", getFutureDateISO(9), "Projects", "color-yellow", ["Design"]),
    makeTask(111, "Organize cloud backup folders", "upcoming", getFutureDateISO(11)),
    makeTask(112, "Plan weekend hiking trip", "upcoming", getFutureDateISO(12)),
    makeTask(201, "Submit Q3 expense receipts", "past-due", getFutureDateISO(-2), "Work", "color-cyan", ["Priority"], [], "Upload signed receipts to the accounting portal."),
    makeTask(202, "Follow up on vendor contract", "past-due", getFutureDateISO(-5), "Personal", "color-red", ["Design"])
];

let selectedTaskId = 3;
let selectedListColor = LIST_COLORS[0];
let currentView = { type: "today", value: "Today" };
let searchQuery = "";
let sortBy = "default";
let draggedPayload = null;
let lastDeletedRecord = null;
let undoTimeoutId = null;
let pendingDeleteTarget = null;
let detailDraft = { tags: [], subtasks: [] };
let modalSelectedTags = [];
const pendingCompletionTimers = new Map();
const TRASH_ICON_SVG = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`;

const $ = (id) => document.getElementById(id);
const appContainer = document.querySelector(".app-container");
const menuToggleBtn = $("menu-toggle");
const menuReopenBtn = $("menu-reopen");
const searchInput = $("search-input");
const taskListEl = $("task-list");
const mainViewTitleEl = $("main-view-title");
const mainTodayCountEl = $("main-today-count");
const sidebarUpcomingCountEl = $("sidebar-upcoming-count");
const sidebarTodayCountEl = $("sidebar-today-count");
const sidebarPastDueCountEl = $("sidebar-past-due-count");
const sidebarCompletedCountEl = $("sidebar-completed-count");
const navUpcomingEl = $("nav-upcoming");
const navTodayEl = $("nav-today");
const navPastDueEl = $("nav-past-due");
const navCompletedEl = $("nav-completed");
const listsNavListEl = $("lists-nav-list");
const addListBtn = $("add-list-btn");
const addListForm = $("add-list-form");
const newListInput = $("new-list-input");
const listErrorEl = $("list-error");
const listColorPaletteEl = $("list-color-palette");
const newListColorPreviewEl = $("new-list-color-preview");
const sidebarTagsEl = $("sidebar-tags");
const addSidebarTagForm = $("add-sidebar-tag-form");
const newSidebarTagInput = $("new-sidebar-tag-input");
const tagErrorEl = $("tag-error");
const addTaskBtn = $("add-task-btn");
const taskSortSelect = $("task-sort-select");
const detailTitleInput = $("detail-title");
const detailTitleErrorEl = $("detail-title-error");
const detailDescInput = $("detail-description");
const detailListSelect = $("detail-list");
const detailDueDateSelect = $("detail-due-date");
const detailTagsEl = $("detail-tags");
const subtaskListEl = $("subtask-list");
const addSubtaskForm = $("add-subtask-form");
const newSubtaskInput = $("new-subtask-input");
const subtaskErrorEl = $("subtask-error");
const saveTaskBtn = $("save-task-btn");
const deleteTaskBtn = $("delete-task-btn");
const undoToast = $("undo-toast");
const undoToastText = $("undo-toast-text");
const undoBtn = $("undo-btn");
const mobileBackdrop = $("mobile-backdrop");
const detailCloseBtn = $("detail-close-btn");
const taskDetailPanelEl = $("task-detail");
const taskModalBackdrop = $("task-modal-backdrop");
const newTaskModalForm = $("new-task-modal-form");
const closeTaskModalBtn = $("close-task-modal-btn");
const cancelTaskModalBtn = $("cancel-task-modal-btn");
const modalTaskTitleInput = $("modal-task-title");
const modalTitleErrorEl = $("modal-title-error");
const modalTaskDescInput = $("modal-task-desc");
const modalTaskListSelect = $("modal-task-list");
const modalTaskDueDateInput = $("modal-task-due-date");
const modalTaskTagsEl = $("modal-task-tags");
const deleteModalBackdrop = $("delete-modal-backdrop");
const deleteModalTitleEl = $("delete-modal-title");
const deleteModalMessageEl = $("delete-modal-message");
const closeDeleteModalBtn = $("close-delete-modal-btn");
const cancelDeleteModalBtn = $("cancel-delete-modal-btn");
const confirmDeleteModalBtn = $("confirm-delete-modal-btn");
const themeToggleBtn = $("theme-toggle");
const themeToggleLabel = $("theme-toggle-label");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.documentElement.setAttribute("data-theme", theme);
    if (themeToggleLabel) themeToggleLabel.textContent = isDark ? "Dark Mode" : "Light Mode";
    if (themeToggleBtn) themeToggleBtn.setAttribute("aria-checked", String(isDark));
    try { localStorage.setItem("theme", theme); } catch (_) { }
}

applyTheme((() => {
    try { return localStorage.getItem("theme") || "light"; } catch (_) { return "light"; }
})());

if (themeToggleBtn) {
    themeToggleBtn.addEventListener("click", () => {
        const next = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        applyTheme(next);
    });
}

function renderColorDotHtml(baseClass, colorVal) {
    if (colorVal && colorVal.startsWith("#")) {
        return `<span class="${baseClass}" style="background-color: ${colorVal};"></span>`;
    }
    const fallback = colorVal || "color-red";
    return `<span class="${baseClass} ${fallback}"></span>`;
}

function getListColor(listName) {
    if (listName === "List") return "color-yellow";
    const found = lists.find((l) => l.name === listName);
    return found ? found.color : "color-red";
}

function getTagColorClass(tagName) {
    const found = tags.find((t) => t.name === tagName);
    return found ? found.colorClass : "tag-teal";
}

function renderMetaItem(type, task) {
    if (type === "date" && task.dueDate) {
        return `<span class="meta-chip"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line><line x1="8" y1="14" x2="8.01" y2="14"></line><line x1="12" y1="14" x2="12.01" y2="14"></line><line x1="16" y1="14" x2="16.01" y2="14"></line><line x1="8" y1="18" x2="8.01" y2="18"></line><line x1="12" y1="18" x2="12.01" y2="18"></line></svg><span>${formatDateBadge(task.dueDate)}</span></span>`;
    }
    if (type === "subtasks" && task.subtasks && task.subtasks.length > 0) {
        return `<span class="meta-chip"><span class="meta-count-badge">${task.subtasks.length}</span><span>Subtasks</span></span>`;
    }
    if (type === "list" && task.list) {
        const dotHtml = renderColorDotHtml("meta-color-dot", task.listColor || getListColor(task.list));
        const displayLabel = task.listLabel || task.list;
        return `<span class="meta-chip">${dotHtml}<span>${displayLabel}</span></span>`;
    }
    if (type === "tags" && task.tags && task.tags.length > 0) {
        return task.tags.map((tagName) => {
            const colorClass = getTagColorClass(tagName);
            return `<span class="meta-chip"><span class="meta-tag-pill ${colorClass}">${tagName}</span></span>`;
        }).join('<span class="meta-divider"></span>');
    }
    return "";
}

function renderTaskMeta(task) {
    const baseOrder = task.metaOrder || ["date", "subtasks", "list"];
    const order = baseOrder.includes("tags") ? baseOrder : [...baseOrder, "tags"];
    const chips = order.map((type) => renderMetaItem(type, task)).filter(Boolean);
    return chips.length ? `<div class="task-meta-row">${chips.join('<span class="meta-divider"></span>')}</div>` : "";
}

function getVisibleTasks() {
    let filtered = tasks;
    const { type, value } = currentView;
    if (type === "completed") filtered = tasks.filter((t) => t.completed);
    else if (type === "upcoming" || type === "today" || type === "past-due") {
        filtered = tasks.filter((t) => !t.completed && getTaskSection(t) === type);
    } else if (type === "list") filtered = tasks.filter((t) => !t.completed && t.list === value);
    else if (type === "tag") filtered = tasks.filter((t) => !t.completed && t.tags && t.tags.includes(value));

    const q = searchQuery.toLowerCase().trim();
    if (q) {
        filtered = filtered.filter((t) =>
            t.title.toLowerCase().includes(q) ||
            (t.description && t.description.toLowerCase().includes(q)) ||
            (t.list && t.list.toLowerCase().includes(q)) ||
            (t.tags && t.tags.some((tag) => tag.toLowerCase().includes(q)))
        );
    }

    if (sortBy === "alpha") {
        filtered = [...filtered].sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === "date" || sortBy === "date-asc") {
        filtered = [...filtered].sort((a, b) => {
            const dateA = a.dueDate || "";
            const dateB = b.dueDate || "";
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            return dateA.localeCompare(dateB) || a.title.localeCompare(b.title);
        });
    } else if (sortBy === "date-desc") {
        filtered = [...filtered].sort((a, b) => {
            const dateA = a.dueDate || "";
            const dateB = b.dueDate || "";
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            return dateB.localeCompare(dateA) || a.title.localeCompare(b.title);
        });
    }
    return filtered;
}

function renderSortOptions() {
    if (!taskSortSelect) return;
    const isTagOrListView = currentView.type === "tag" || currentView.type === "list";
    const options = [
        { value: "default", label: "Default" },
        { value: "date-asc", label: "Due Date (Ascending)" },
        { value: "date-desc", label: "Due Date (Descending)" },
        { value: "alpha", label: isTagOrListView ? "Name" : "Alphabetical" }
    ];
    if (!options.some((o) => o.value === sortBy)) sortBy = "default";
    taskSortSelect.innerHTML = options.map((o) => `<option value="${o.value}">${o.label}</option>`).join("");
    taskSortSelect.value = sortBy;
}

function renderListsSidebar() {
    if (!listsNavListEl) return;
    listsNavListEl.innerHTML = lists.map((listObj) => {
        const count = tasks.filter((t) => !t.completed && t.list === listObj.name).length;
        const activeClass = currentView.type === "list" && currentView.value === listObj.name ? "active" : "";
        const dotHtml = renderColorDotHtml("color-dot", listObj.color);
        return `<li class="nav-item ${activeClass}" data-list="${listObj.name}"><a href="#">${dotHtml}<span class="nav-label">${listObj.name}</span><span class="badge">${count}</span></a></li>`;
    }).join("");

    if (detailListSelect) {
        const currentVal = detailListSelect.value;
        detailListSelect.innerHTML = [`<option value="">None</option>`, ...lists.map((l) => `<option value="${l.name}">${l.name}</option>`)].join("");
        if (currentVal === "" || lists.some((l) => l.name === currentVal)) detailListSelect.value = currentVal;
    }
}

function renderSidebarTags() {
    if (!sidebarTagsEl) return;
    const tagsHtml = tags.map((tagObj) => {
        const activeClass = currentView.type === "tag" && currentView.value === tagObj.name ? "active-filter" : "";
        return `<span class="tag ${tagObj.colorClass} ${activeClass}" data-tag="${tagObj.name}" draggable="true">${tagObj.name}</span>`;
    }).join("");
    sidebarTagsEl.innerHTML = `${tagsHtml}<button class="tag tag-add" id="sidebar-add-tag-btn" type="button">+ Add Tag</button>`;
}

function renderTasks() {
    renderSortOptions();
    const visibleTasks = getVisibleTasks();
    if (visibleTasks.length === 0) {
        const emptyMessages = { completed: "No completed tasks", "past-due": "No past due tasks", today: "No tasks today", upcoming: "No upcoming tasks" };
        const emptyText = emptyMessages[currentView.type] || "No tasks found";
        taskListEl.innerHTML = `<li class="task-empty-state"><svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg><p>${emptyText}</p></li>`;
    } else {
        taskListEl.innerHTML = visibleTasks.map((task) => {
            const isChecked = typeof task.pendingCompleted === "boolean" ? task.pendingCompleted : task.completed;
            const selectedClass = task.id === selectedTaskId ? "selected" : "";
            const checkedAttr = isChecked ? "checked" : "";
            const timerEntry = pendingCompletionTimers.get(task.id);
            const hiddenAttr = timerEntry ? "" : "hidden";
            const remainingSec = timerEntry ? Math.max(1, Math.ceil((timerEntry.expiresAt - Date.now()) / 1000)) : 3;
            const metaHtml = renderTaskMeta(task);
            return `<li class="task-item ${selectedClass}" data-id="${task.id}"><div class="task-row-main"><label class="checkbox-label"><input type="checkbox" class="task-checkbox" data-id="${task.id}" ${checkedAttr}><span class="custom-checkbox"></span><span class="task-title">${task.title}</span><span class="completion-countdown" data-countdown-id="${task.id}" ${hiddenAttr}><svg class="countdown-ring" viewBox="0 0 12 12"><circle cx="6" cy="6" r="4"></circle></svg><span class="countdown-text">${remainingSec}s</span></span></label><button type="button" class="task-delete-btn" data-delete-task-id="${task.id}" aria-label="Delete task" title="Delete task">${TRASH_ICON_SVG}</button></div>${metaHtml}</li>`;
        }).join("");
    }

    if (sidebarUpcomingCountEl) sidebarUpcomingCountEl.textContent = tasks.filter((t) => !t.completed && getTaskSection(t) === "upcoming").length;
    if (sidebarTodayCountEl) sidebarTodayCountEl.textContent = tasks.filter((t) => !t.completed && getTaskSection(t) === "today").length;
    if (sidebarPastDueCountEl) sidebarPastDueCountEl.textContent = tasks.filter((t) => !t.completed && getTaskSection(t) === "past-due").length;
    if (sidebarCompletedCountEl) sidebarCompletedCountEl.textContent = tasks.filter((t) => t.completed).length;

    if (navUpcomingEl) navUpcomingEl.classList.toggle("active", currentView.type === "upcoming");
    if (navTodayEl) navTodayEl.classList.toggle("active", currentView.type === "today");
    if (navPastDueEl) navPastDueEl.classList.toggle("active", currentView.type === "past-due");
    if (navCompletedEl) navCompletedEl.classList.toggle("active", currentView.type === "completed");

    if (mainViewTitleEl) {
        mainViewTitleEl.textContent = currentView.value;
        mainViewTitleEl.classList.toggle("past-due-title", currentView.type === "past-due");
        mainViewTitleEl.classList.toggle("completed-title", currentView.type === "completed");
    }
    if (mainTodayCountEl) mainTodayCountEl.textContent = visibleTasks.length;
    if (addTaskBtn) addTaskBtn.style.display = currentView.type === "completed" ? "none" : "inline-flex";

    renderListsSidebar();
    renderSidebarTags();
}

function renderDetailTags(task, keepPickerOpen = false) {
    if (!detailTagsEl) return;
    const taskTags = task && task.tags ? task.tags : [];
    const pills = taskTags.map((tagName) => {
        const colorClass = getTagColorClass(tagName);
        return `<span class="tag ${colorClass}" data-detail-tag="${tagName}" title="Click to remove tag">${tagName}</span>`;
    }).join("");
    const pickerOptions = tags.map((tagObj) => {
        const checkMark = taskTags.includes(tagObj.name) ? "✓" : "";
        return `<button type="button" class="tag-picker-option" data-pick-tag="${tagObj.name}"><span class="tag ${tagObj.colorClass}">${tagObj.name}</span><span class="tag-picker-check">${checkMark}</span></button>`;
    }).join("");
    const hiddenAttr = keepPickerOpen ? "" : "hidden";
    const saveIconSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>`;
    detailTagsEl.innerHTML = `${pills}<div class="tag-picker-wrapper"><button class="tag tag-add" id="detail-add-tag-btn" type="button">+ Add Tag</button><div class="tag-picker-menu" id="detail-tag-picker" ${hiddenAttr}>${pickerOptions}<form class="inline-create-form" id="detail-new-tag-form"><div class="list-input-row"><input type="text" id="detail-new-tag-input" placeholder="New tag..." maxlength="18"><button type="submit" class="inline-submit-btn" aria-label="Save tag" title="Save (Enter)">${saveIconSvg}</button></div><p class="inline-form-error" id="detail-tag-error" role="alert" hidden></p></form></div></div>`;
}

function renderSubtasks(task) {
    const subtasksToShow = task && task.subtasks ? task.subtasks : [];
    subtaskListEl.innerHTML = subtasksToShow.map((sub, index) => {
        const checkedAttr = sub.completed ? "checked" : "";
        return `<li class="subtask-item" data-sub-index="${index}"><label class="checkbox-label"><input type="checkbox" data-sub-index="${index}" ${checkedAttr}><span class="custom-checkbox"></span><span class="subtask-text">${sub.text}</span></label><button type="button" class="subtask-delete-btn" data-delete-sub-index="${index}" aria-label="Delete subtask" title="Delete subtask">${TRASH_ICON_SVG}</button></li>`;
    }).join("");
}

function renderDetailPanel() {
    setInlineError(detailTitleInput, detailTitleErrorEl, "");
    setInlineError(newSubtaskInput, subtaskErrorEl, "");
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) {
        detailDraft = { tags: [], subtasks: [] };
        detailTitleInput.value = detailDescInput.value = detailListSelect.value = detailDueDateSelect.value = "";
        subtaskListEl.innerHTML = "";
        renderDetailTags(null);
        return;
    }
    detailDraft = {
        tags: task.tags ? [...task.tags] : [],
        subtasks: task.subtasks ? task.subtasks.map((s) => ({ ...s })) : []
    };
    detailTitleInput.value = task.title;
    detailDescInput.value = task.description || "";
    detailListSelect.value = task.list && lists.some((l) => l.name === task.list) ? task.list : "";
    detailDueDateSelect.value = task.dueDate || "";
    renderDetailTags(detailDraft);
    renderSubtasks(detailDraft);
}

function showUndoToast(message, showUndoButton = true) {
    if (!undoToast || !undoToastText) return;
    if (undoTimeoutId) clearTimeout(undoTimeoutId);
    undoToastText.textContent = message;
    if (undoBtn) undoBtn.style.display = showUndoButton ? "inline-block" : "none";
    undoToast.hidden = false;
    undoTimeoutId = setTimeout(() => {
        undoToast.hidden = true;
        lastDeletedRecord = null;
    }, 4500);
}

function syncSelectedTask() {
    const visible = getVisibleTasks();
    if (!visible.some((t) => t.id === selectedTaskId)) {
        selectedTaskId = visible.length > 0 ? visible[0].id : null;
    }
}

function deleteTaskById(taskId) {
    const index = tasks.findIndex((t) => t.id === taskId);
    if (index === -1) return;
    const [removedTask] = tasks.splice(index, 1);
    lastDeletedRecord = { type: "task", task: removedTask, index };
    syncSelectedTask();
    renderTasks();
    renderDetailPanel();
    showUndoToast(`Deleted "${removedTask.title}"`, true);
}

function deleteSubtaskByIndex(taskId, subIndex) {
    if (!detailDraft.subtasks || !detailDraft.subtasks[subIndex]) return;
    const [removedSubtask] = detailDraft.subtasks.splice(subIndex, 1);
    const task = tasks.find((t) => t.id === taskId);
    if (task) task.subtasks = detailDraft.subtasks.map((s) => ({ ...s }));
    lastDeletedRecord = { type: "subtask", taskId, subtask: removedSubtask, index: subIndex };
    renderTasks();
    renderSubtasks(detailDraft);
    showUndoToast(`Deleted subtask "${removedSubtask.text}"`, true);
}

if (undoBtn) {
    undoBtn.addEventListener("click", () => {
        if (!lastDeletedRecord) return;
        if (lastDeletedRecord.type === "task") {
            tasks.splice(lastDeletedRecord.index, 0, lastDeletedRecord.task);
            selectedTaskId = lastDeletedRecord.task.id;
        } else if (lastDeletedRecord.type === "subtask") {
            const task = tasks.find((t) => t.id === lastDeletedRecord.taskId);
            if (task) task.subtasks.splice(lastDeletedRecord.index, 0, lastDeletedRecord.subtask);
        }
        renderTasks();
        renderDetailPanel();
        lastDeletedRecord = null;
        if (undoToast) undoToast.hidden = true;
        if (undoTimeoutId) clearTimeout(undoTimeoutId);
    });
}

// Sidebar & Mobile Drawers
function closeMobileDrawers() {
    if (!appContainer) return;
    appContainer.classList.remove("mobile-menu-open", "mobile-detail-open");
    if (mobileBackdrop) mobileBackdrop.hidden = true;
}

if (menuToggleBtn && appContainer) {
    menuToggleBtn.addEventListener("click", () => {
        if (window.innerWidth <= 1024) closeMobileDrawers();
        else {
            appContainer.classList.add("sidebar-collapsed");
            if (menuReopenBtn) menuReopenBtn.hidden = false;
        }
    });
}

if (menuReopenBtn && appContainer) {
    menuReopenBtn.addEventListener("click", () => {
        if (window.innerWidth <= 1024) {
            appContainer.classList.remove("mobile-detail-open");
            appContainer.classList.add("mobile-menu-open");
            if (mobileBackdrop) mobileBackdrop.hidden = false;
        } else {
            appContainer.classList.remove("sidebar-collapsed");
            menuReopenBtn.hidden = true;
        }
    });
}

if (detailCloseBtn) detailCloseBtn.addEventListener("click", closeMobileDrawers);
if (mobileBackdrop) mobileBackdrop.addEventListener("click", closeMobileDrawers);

let searchDebounceTimer = null;
if (searchInput) {
    searchInput.addEventListener("input", () => {
        if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            searchQuery = searchInput.value;
            syncSelectedTask();
            renderTasks();
            renderDetailPanel();
        }, 500);
    });
}

if (taskSortSelect) {
    taskSortSelect.addEventListener("change", () => {
        sortBy = taskSortSelect.value;
        renderTasks();
    });
}

// View Switching
function setView(type, value) {
    currentView = { type, value };
    syncSelectedTask();
    if (window.innerWidth <= 1024) closeMobileDrawers();
    renderTasks();
    renderDetailPanel();
}

if (navTodayEl && navUpcomingEl && navTodayEl.parentElement === navUpcomingEl.parentElement) {
    navTodayEl.parentElement.insertBefore(navTodayEl, navUpcomingEl);
}
[
    [navTodayEl, "today", "Today"],
    [navUpcomingEl, "upcoming", "Upcoming"],
    [navPastDueEl, "past-due", "Past Due"],
    [navCompletedEl, "completed", "Completed"]
].forEach(([el, type, label]) => {
    if (el) el.addEventListener("click", (e) => { e.preventDefault(); setView(type, label); });
});

if (listsNavListEl) {
    listsNavListEl.addEventListener("click", (e) => {
        e.preventDefault();
        const item = e.target.closest(".nav-item[data-list]");
        if (item) setView("list", item.dataset.list);
    });
}

function setInlineError(inputEl, errorEl, message) {
    if (!inputEl || !errorEl) return;
    const containerEl = inputEl.closest(".list-input-row, .add-subtask-bar") || inputEl;
    inputEl.classList.remove("input-error");
    containerEl.classList.remove("input-error");
    if (message) {
        void containerEl.offsetWidth;
        inputEl.classList.add("input-error");
        containerEl.classList.add("input-error");
        errorEl.textContent = message;
        errorEl.hidden = false;
    } else {
        errorEl.textContent = "";
        errorEl.hidden = true;
    }
}

function renderListColorPalette() {
    if (newListColorPreviewEl) newListColorPreviewEl.style.backgroundColor = selectedListColor;
    if (!listColorPaletteEl) return;
    listColorPaletteEl.innerHTML = LIST_COLORS.map((hex) => {
        const selectedClass = hex === selectedListColor ? "selected" : "";
        return `<button type="button" class="list-color-swatch ${selectedClass}" data-color="${hex}" style="background-color: ${hex};" aria-label="Select color ${hex}"></button>`;
    }).join("");
}

if (listColorPaletteEl) {
    listColorPaletteEl.addEventListener("click", (e) => {
        const swatch = e.target.closest(".list-color-swatch[data-color]");
        if (!swatch) return;
        selectedListColor = swatch.dataset.color;
        renderListColorPalette();
        if (newListInput) newListInput.focus();
    });
}

function cancelListInput() {
    if (!addListForm || !newListInput) return;
    newListInput.value = "";
    setInlineError(newListInput, listErrorEl, "");
    addListForm.hidden = true;
}

if (addListBtn && addListForm && newListInput) {
    renderListColorPalette();
    addListBtn.addEventListener("click", () => {
        if (!addListForm.hidden) return cancelListInput();
        addListForm.hidden = false;
        setInlineError(newListInput, listErrorEl, "");
        selectedListColor = LIST_COLORS[lists.length % LIST_COLORS.length];
        renderListColorPalette();
        newListInput.focus();
    });
    newListInput.addEventListener("input", () => setInlineError(newListInput, listErrorEl, ""));
    newListInput.addEventListener("keydown", (e) => { if (e.key === "Escape") cancelListInput(); });
    addListForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = newListInput.value.trim();
        if (!name) return setInlineError(newListInput, listErrorEl, "Please enter a list name");
        if (lists.some((l) => l.name.toLowerCase() === name.toLowerCase())) {
            return setInlineError(newListInput, listErrorEl, `List "${name}" already exists`);
        }
        lists.push({ name, color: selectedListColor });
        cancelListInput();
        setView("list", name);
    });
}

function cancelSidebarTagInput() {
    if (!addSidebarTagForm || !newSidebarTagInput) return;
    newSidebarTagInput.value = "";
    setInlineError(newSidebarTagInput, tagErrorEl, "");
    addSidebarTagForm.hidden = true;
}

if (sidebarTagsEl) {
    sidebarTagsEl.addEventListener("click", (e) => {
        if (e.target.closest("#sidebar-add-tag-btn") && addSidebarTagForm && newSidebarTagInput) {
            if (!addSidebarTagForm.hidden) cancelSidebarTagInput();
            else {
                addSidebarTagForm.hidden = false;
                setInlineError(newSidebarTagInput, tagErrorEl, "");
                newSidebarTagInput.focus();
            }
            return;
        }
        const tagPill = e.target.closest(".tag[data-tag]");
        if (tagPill) {
            const tagName = tagPill.dataset.tag;
            if (currentView.type === "tag" && currentView.value === tagName) setView("today", "Today");
            else setView("tag", tagName);
        }
    });
}

if (addSidebarTagForm && newSidebarTagInput) {
    newSidebarTagInput.addEventListener("input", () => setInlineError(newSidebarTagInput, tagErrorEl, ""));
    newSidebarTagInput.addEventListener("keydown", (e) => { if (e.key === "Escape") cancelSidebarTagInput(); });
    addSidebarTagForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = newSidebarTagInput.value.trim();
        if (!name) return setInlineError(newSidebarTagInput, tagErrorEl, "Please enter a tag name");
        if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
            return setInlineError(newSidebarTagInput, tagErrorEl, `Tag "${name}" already exists`);
        }
        tags.push({ name, colorClass: availableTagColors[tags.length % availableTagColors.length] });
        cancelSidebarTagInput();
        renderSidebarTags();
    });
}

document.addEventListener("mousedown", (e) => {
    if (addListForm && !addListForm.hidden) {
        if (!addListForm.contains(e.target) && (!addListBtn || !addListBtn.contains(e.target))) {
            cancelListInput();
        }
    }
    if (addSidebarTagForm && !addSidebarTagForm.hidden) {
        const addTagBtn = $("sidebar-add-tag-btn");
        if (!addSidebarTagForm.contains(e.target) && (!addTagBtn || !addTagBtn.contains(e.target))) {
            cancelSidebarTagInput();
        }
    }
});

// Detail Panel Tags
if (detailTagsEl) {
    detailTagsEl.addEventListener("click", (e) => {
        if (!tasks.some((t) => t.id === selectedTaskId)) return;
        if (e.target.closest("#detail-add-tag-btn")) {
            const picker = $("detail-tag-picker");
            if (picker) picker.hidden = !picker.hidden;
            return;
        }
        const pickOption = e.target.closest(".tag-picker-option[data-pick-tag]");
        if (pickOption) {
            const pickedTag = pickOption.dataset.pickTag;
            detailDraft.tags = detailDraft.tags.includes(pickedTag)
                ? detailDraft.tags.filter((t) => t !== pickedTag)
                : [...detailDraft.tags, pickedTag];
            renderDetailTags(detailDraft, false);
            return;
        }
        const existingTag = e.target.closest(".tag[data-detail-tag]");
        if (existingTag) {
            detailDraft.tags = detailDraft.tags.filter((t) => t !== existingTag.dataset.detailTag);
            renderDetailTags(detailDraft, false);
        }
    });

    detailTagsEl.addEventListener("input", (e) => {
        if (e.target.id === "detail-new-tag-input") setInlineError(e.target, $("detail-tag-error"), "");
    });

    detailTagsEl.addEventListener("submit", (e) => {
        if (!e.target.closest("#detail-new-tag-form")) return;
        e.preventDefault();
        if (!tasks.some((t) => t.id === selectedTaskId)) return;
        const inputEl = $("detail-new-tag-input");
        const errEl = $("detail-tag-error");
        const name = inputEl ? inputEl.value.trim() : "";
        if (!name) return setInlineError(inputEl, errEl, "Please enter a tag name");
        if (tags.some((t) => t.name.toLowerCase() === name.toLowerCase())) {
            return setInlineError(inputEl, errEl, `Tag "${name}" already exists`);
        }
        tags.push({ name, colorClass: availableTagColors[tags.length % availableTagColors.length] });
        detailDraft.tags.push(name);
        renderSidebarTags();
        renderDetailTags(detailDraft, false);
    });

    document.addEventListener("mousedown", (e) => {
        if (!detailTagsEl.contains(e.target)) {
            const picker = $("detail-tag-picker");
            if (picker && !picker.hidden) {
                const inputEl = $("detail-new-tag-input");
                if (inputEl) inputEl.value = "";
                setInlineError(inputEl, $("detail-tag-error"), "");
                picker.hidden = true;
            }
        }
    });
}

// Task List Interactions
function clearPendingCompletion(id) {
    if (!pendingCompletionTimers.has(id)) return;
    const entry = pendingCompletionTimers.get(id);
    clearTimeout(entry.timeoutId);
    if (entry.intervalId) clearInterval(entry.intervalId);
    pendingCompletionTimers.delete(id);
}

taskListEl.addEventListener("change", (e) => {
    const checkbox = e.target.closest(".task-checkbox");
    if (!checkbox) return;
    const id = Number(checkbox.dataset.id);
    const task = tasks.find((t) => t.id === id);
    if (!task) return;

    clearPendingCompletion(id);
    const nextCompleted = checkbox.checked;
    const countdownBadge = taskListEl.querySelector(`.completion-countdown[data-countdown-id="${id}"]`);

    if (nextCompleted === task.completed) {
        delete task.pendingCompleted;
        if (countdownBadge) countdownBadge.hidden = true;
        return;
    }

    task.pendingCompleted = nextCompleted;
    const delayMs = nextCompleted ? 3000 : 0;

    if (nextCompleted && countdownBadge) {
        const textEl = countdownBadge.querySelector(".countdown-text");
        if (textEl) textEl.textContent = "3s";
        countdownBadge.hidden = false;
        const circle = countdownBadge.querySelector("circle");
        if (circle) {
            circle.style.animation = "none";
            void circle.offsetWidth;
            circle.style.animation = "";
        }
    }

    const expiresAt = Date.now() + delayMs;
    const intervalId = nextCompleted ? setInterval(() => {
        const badge = taskListEl.querySelector(`.completion-countdown[data-countdown-id="${id}"]`);
        const textEl = badge && badge.querySelector(".countdown-text");
        if (textEl) textEl.textContent = `${Math.max(1, Math.ceil((expiresAt - Date.now()) / 1000))}s`;
    }, 200) : null;

    const timeoutId = setTimeout(() => {
        clearPendingCompletion(id);
        task.completed = nextCompleted;
        delete task.pendingCompleted;
        syncSelectedTask();
        renderTasks();
        renderDetailPanel();
    }, delayMs);

    pendingCompletionTimers.set(id, { timeoutId, intervalId, expiresAt });
});

taskListEl.addEventListener("click", (e) => {
    const delBtn = e.target.closest(".task-delete-btn[data-delete-task-id]");
    if (delBtn) {
        e.stopPropagation();
        const taskId = Number(delBtn.dataset.deleteTaskId);
        const task = tasks.find((t) => t.id === taskId);
        if (task) openDeleteConfirmModal({ type: "task", id: task.id, title: task.title });
        return;
    }
    if (e.target.closest(".custom-checkbox") || e.target.closest(".task-checkbox")) return;
    if (e.target.closest(".checkbox-label")) e.preventDefault();
    const item = e.target.closest(".task-item");
    if (item) {
        selectedTaskId = Number(item.dataset.id);
        renderTasks();
        renderDetailPanel();
        if (window.innerWidth <= 768 && appContainer) {
            appContainer.classList.remove("mobile-menu-open");
            appContainer.classList.add("mobile-detail-open");
            if (mobileBackdrop) mobileBackdrop.hidden = false;
        }
    }
});

subtaskListEl.addEventListener("click", (e) => {
    const delBtn = e.target.closest(".subtask-delete-btn[data-delete-sub-index]");
    if (!delBtn) return;
    e.stopPropagation();
    const subIndex = Number(delBtn.dataset.deleteSubIndex);
    const sub = detailDraft.subtasks && detailDraft.subtasks[subIndex];
    if (sub && selectedTaskId !== null) {
        openDeleteConfirmModal({ type: "subtask", taskId: selectedTaskId, subIndex, title: sub.text });
    }
});

subtaskListEl.addEventListener("change", (e) => {
    const checkbox = e.target.closest('input[type="checkbox"]');
    if (!checkbox) return;
    const subIndex = Number(checkbox.dataset.subIndex);
    if (detailDraft.subtasks && detailDraft.subtasks[subIndex]) {
        detailDraft.subtasks[subIndex].completed = checkbox.checked;
    }
});

// Sidebar Tag Drag & Drop
function resetTagDragState() {
    draggedPayload = null;
    document.querySelectorAll(".tag-drop-over").forEach((el) => el.classList.remove("tag-drop-over"));
}

if (sidebarTagsEl) {
    sidebarTagsEl.addEventListener("dragstart", (e) => {
        const tagPill = e.target.closest(".tag[data-tag]");
        if (!tagPill) return;
        const tagName = tagPill.dataset.tag;
        draggedPayload = { type: "tag", tagName, title: tagName };
        e.dataTransfer.effectAllowed = "copyMove";
        e.dataTransfer.setData("text/plain", JSON.stringify(draggedPayload));
        requestAnimationFrame(() => tagPill.classList.add("dragging"));
    });
    sidebarTagsEl.addEventListener("dragend", (e) => {
        const tagPill = e.target.closest(".tag[data-tag]");
        if (tagPill) tagPill.classList.remove("dragging");
        resetTagDragState();
    });
}

taskListEl.addEventListener("dragover", (e) => {
    if (!draggedPayload || draggedPayload.type !== "tag") return;
    const item = e.target.closest(".task-item");
    if (!item) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    document.querySelectorAll(".task-item.tag-drop-over").forEach((el) => { if (el !== item) el.classList.remove("tag-drop-over"); });
    item.classList.add("tag-drop-over");
});

taskListEl.addEventListener("dragleave", (e) => {
    if (!draggedPayload || draggedPayload.type !== "tag") return;
    const item = e.target.closest(".task-item");
    if (item && !item.contains(e.relatedTarget)) item.classList.remove("tag-drop-over");
});

taskListEl.addEventListener("drop", (e) => {
    if (!draggedPayload || draggedPayload.type !== "tag") return;
    const item = e.target.closest(".task-item");
    if (!item) return;
    e.preventDefault();
    const taskId = Number(item.dataset.id);
    const { tagName } = draggedPayload;
    resetTagDragState();
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.tags) task.tags = [];
    if (task.tags.includes(tagName)) return;
    task.tags.push(tagName);
    renderTasks();
    if (selectedTaskId === taskId) {
        if (!detailDraft.tags.includes(tagName)) detailDraft.tags.push(tagName);
        renderDetailTags(detailDraft, false);
    }
    showUndoToast(`Added "${tagName}" to "${task.title}"`, false);
});

if (taskDetailPanelEl) {
    taskDetailPanelEl.addEventListener("dragover", (e) => {
        if (!draggedPayload || draggedPayload.type !== "tag" || selectedTaskId === null) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
        taskDetailPanelEl.classList.add("tag-drop-over");
    });
    taskDetailPanelEl.addEventListener("dragleave", (e) => {
        if (draggedPayload && draggedPayload.type === "tag" && !taskDetailPanelEl.contains(e.relatedTarget)) {
            taskDetailPanelEl.classList.remove("tag-drop-over");
        }
    });
    taskDetailPanelEl.addEventListener("drop", (e) => {
        if (!draggedPayload || draggedPayload.type !== "tag" || selectedTaskId === null) return;
        e.preventDefault();
        const { tagName } = draggedPayload;
        resetTagDragState();
        if (!detailDraft.tags.includes(tagName)) {
            detailDraft.tags.push(tagName);
            renderDetailTags(detailDraft, false);
        }
    });
}

// New Task Modal, Subtasks, Save & Delete
function renderModalTags() {
    if (!modalTaskTagsEl) return;
    modalTaskTagsEl.innerHTML = tags.map((tagObj) => {
        const selectedClass = modalSelectedTags.includes(tagObj.name) ? "selected" : "";
        return `<button type="button" class="tag ${tagObj.colorClass} modal-tag-option ${selectedClass}" data-modal-tag="${tagObj.name}">${tagObj.name}</button>`;
    }).join("");
}

function setBackgroundInert(isInert) {
    if (!appContainer) return;
    appContainer.classList.toggle("modal-open", isInert);
    appContainer.querySelectorAll(".sidebar, .tasks-main, .task-detail").forEach((el) => { el.inert = isInert; });
}

function openNewTaskModal() {
    if (!taskModalBackdrop) return;
    setInlineError(modalTaskTitleInput, modalTitleErrorEl, "");
    if (modalTaskTitleInput) modalTaskTitleInput.value = "";
    if (modalTaskDescInput) modalTaskDescInput.value = "";
    if (modalTaskListSelect) {
        modalTaskListSelect.innerHTML = [`<option value="">None</option>`, ...lists.map((l) => `<option value="${l.name}">${l.name}</option>`)].join("");
        modalTaskListSelect.value = currentView.type === "list" ? currentView.value : "";
    }
    if (modalTaskDueDateInput) {
        modalTaskDueDateInput.value = currentView.type === "upcoming" ? getFutureDateISO(1) : currentView.type === "past-due" ? getFutureDateISO(-1) : "";
    }
    modalSelectedTags = currentView.type === "tag" ? [currentView.value] : [];
    renderModalTags();
    taskModalBackdrop.hidden = false;
    setBackgroundInert(true);
    requestAnimationFrame(() => { if (modalTaskTitleInput) modalTaskTitleInput.focus(); });
}

function closeNewTaskModal() {
    if (!taskModalBackdrop) return;
    taskModalBackdrop.hidden = true;
    setBackgroundInert(false);
}

function openDeleteConfirmModal(target) {
    if (!deleteModalBackdrop) return;
    pendingDeleteTarget = target;
    const isSubtask = target.type === "subtask";
    if (deleteModalTitleEl) deleteModalTitleEl.textContent = isSubtask ? "Delete Subtask?" : "Delete Task?";
    if (deleteModalMessageEl) {
        deleteModalMessageEl.textContent = `Are you sure you want to delete "${target.title}"?`;
    }
    deleteModalBackdrop.hidden = false;
    setBackgroundInert(true);
    requestAnimationFrame(() => { if (confirmDeleteModalBtn) confirmDeleteModalBtn.focus(); });
}

function closeDeleteConfirmModal() {
    if (!deleteModalBackdrop) return;
    deleteModalBackdrop.hidden = true;
    pendingDeleteTarget = null;
    setBackgroundInert(false);
}

if (closeDeleteModalBtn) closeDeleteModalBtn.addEventListener("click", closeDeleteConfirmModal);
if (cancelDeleteModalBtn) cancelDeleteModalBtn.addEventListener("click", closeDeleteConfirmModal);
if (deleteModalBackdrop) {
    deleteModalBackdrop.addEventListener("click", (e) => {
        if (e.target === deleteModalBackdrop) closeDeleteConfirmModal();
    });
}
if (confirmDeleteModalBtn) {
    confirmDeleteModalBtn.addEventListener("click", () => {
        const target = pendingDeleteTarget;
        closeDeleteConfirmModal();
        if (!target) return;
        if (target.type === "task") {
            deleteTaskById(target.id);
            if (window.innerWidth <= 768) closeMobileDrawers();
        } else if (target.type === "subtask") {
            deleteSubtaskByIndex(target.taskId, target.subIndex);
        }
    });
}

if (addTaskBtn) addTaskBtn.addEventListener("click", openNewTaskModal);
if (closeTaskModalBtn) closeTaskModalBtn.addEventListener("click", closeNewTaskModal);
if (cancelTaskModalBtn) cancelTaskModalBtn.addEventListener("click", closeNewTaskModal);
window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        if (deleteModalBackdrop && !deleteModalBackdrop.hidden) closeDeleteConfirmModal();
        else if (taskModalBackdrop && !taskModalBackdrop.hidden) closeNewTaskModal();
    }
});

if (modalTaskTagsEl) {
    modalTaskTagsEl.addEventListener("click", (e) => {
        const tagBtn = e.target.closest(".modal-tag-option[data-modal-tag]");
        if (!tagBtn) return;
        const tagName = tagBtn.dataset.modalTag;
        modalSelectedTags = modalSelectedTags.includes(tagName)
            ? modalSelectedTags.filter((t) => t !== tagName)
            : [...modalSelectedTags, tagName];
        renderModalTags();
    });
}

if (modalTaskTitleInput) {
    modalTaskTitleInput.addEventListener("input", () => setInlineError(modalTaskTitleInput, modalTitleErrorEl, ""));
}

if (newTaskModalForm) {
    newTaskModalForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const title = modalTaskTitleInput ? modalTaskTitleInput.value.trim() : "";
        if (!title) return setInlineError(modalTaskTitleInput, modalTitleErrorEl, "Please enter a task title");

        const chosenDate = modalTaskDueDateInput ? modalTaskDueDateInput.value : "";
        const assignedList = modalTaskListSelect ? modalTaskListSelect.value : "";
        const section = getTaskSection({ dueDate: chosenDate });
        const newTask = {
            id: Date.now(), title,
            description: modalTaskDescInput ? modalTaskDescInput.value : "",
            category: section, completed: false, dueDate: chosenDate, detailDueDate: chosenDate,
            list: assignedList, listColor: assignedList ? getListColor(assignedList) : "",
            tags: [...modalSelectedTags], subtasks: []
        };
        tasks.push(newTask);
        selectedTaskId = newTask.id;

        if (["today", "upcoming", "past-due"].includes(currentView.type) && currentView.type !== section) {
            const labels = { today: "Today", upcoming: "Upcoming", "past-due": "Past Due" };
            currentView = { type: section, value: labels[section] };
        }
        closeNewTaskModal();
        renderTasks();
        renderDetailPanel();
    });
}

if (detailTitleInput) {
    detailTitleInput.addEventListener("input", () => setInlineError(detailTitleInput, detailTitleErrorEl, ""));
}

newSubtaskInput.addEventListener("input", () => setInlineError(newSubtaskInput, subtaskErrorEl, ""));
newSubtaskInput.addEventListener("blur", () => {
    newSubtaskInput.value = "";
    setInlineError(newSubtaskInput, subtaskErrorEl, "");
});
newSubtaskInput.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
        newSubtaskInput.value = "";
        setInlineError(newSubtaskInput, subtaskErrorEl, "");
        newSubtaskInput.blur();
    }
});

addSubtaskForm.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!tasks.some((t) => t.id === selectedTaskId)) return;
    const text = newSubtaskInput.value.trim();
    if (!text) return setInlineError(newSubtaskInput, subtaskErrorEl, "Please enter a subtask");
    detailDraft.subtasks.push({ text, completed: false });
    newSubtaskInput.value = "";
    setInlineError(newSubtaskInput, subtaskErrorEl, "");
    renderSubtasks(detailDraft);
});

saveTaskBtn.addEventListener("click", () => {
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (!task) return;
    const titleVal = detailTitleInput.value.trim();
    if (!titleVal) return setInlineError(detailTitleInput, detailTitleErrorEl, "Please enter a task title");
    const chosenDate = detailDueDateSelect.value;
    task.title = titleVal;
    task.description = detailDescInput.value;
    task.list = detailListSelect.value;
    delete task.listLabel;
    task.listColor = task.list ? getListColor(task.list) : "";
    task.dueDate = task.detailDueDate = chosenDate;
    task.category = getTaskSection(task);
    task.tags = [...detailDraft.tags];
    task.subtasks = detailDraft.subtasks.map((s) => ({ ...s }));
    renderTasks();
    renderDetailPanel();
    if (window.innerWidth <= 768) closeMobileDrawers();
    showUndoToast("Changes saved", false);
});

deleteTaskBtn.addEventListener("click", () => {
    if (selectedTaskId === null) return;
    const task = tasks.find((t) => t.id === selectedTaskId);
    if (task) openDeleteConfirmModal({ type: "task", id: task.id, title: task.title });
});

renderTasks();
renderDetailPanel();
