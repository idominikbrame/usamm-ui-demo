# USAMM Task Workspace UI Demo

A clean, modern task management web application built with vanilla HTML, CSS, and JavaScript.

## Main Features

- **Smart Task Views & Filtering**: Organize tasks across **Today**, **Upcoming**, **Past Due**, and **Completed** views, or filter by custom **Lists** and **Tags**.
- **Debounced Search & Context-Aware Sorting**: Includes a 500ms debounced search bar for scalability and sorting by **Due Date (Ascending/Descending)** and **Alphabetical / Name**.
- **Staged Task Inspector**: Edit task titles, descriptions, lists, due dates, tags, and subtasks in the right-hand **Task Overview** panel—changes are staged and only committed when clicking **Save changes**.
- **Custom Lists & Tags**: Create lists with a 33-color swatch palette and create or drag-and-drop tags directly onto tasks, complete with inline validation and empty-input shake feedback.
- **Hover Delete & Confirmation Dialog**: Hover over any task or subtask to reveal a quick delete button backed by a confirmation modal and an **Undo** toast notification.
- **3-Second Completion Grace Period**: Checking off a task displays an animated 3-second countdown ring before moving it to **Completed**, allowing accidental clicks to be undone immediately.
- **Light & Dark Mode**: Built-in theme toggle switch in the sidebar footer with state persisted in `localStorage`.

## Responsive CSS & Layout

- **3-Column Split-Pane Desktop Layout**: Centered `1800px` max-width workspace (`100dvh`) with a collapsible `250ms` animated left navigation rail, main task list, and right detail inspector.
- **Tablet Breakpoint (`<= 1024px`)**: Automatically collapses the left sidebar into a slide-over drawer with a backdrop overlay while keeping the main list and detail panel side-by-side.
- **Mobile Breakpoint (`<= 768px`)**: Adapts to a single-column layout where the left navigation opens as a slide-out drawer and the **Task Overview** inspector slides up as a bottom sheet with safe-area inset support.

## View in the Browser (GitHub Pages)

You can view and interact with the live project directly in your browser via GitHub Pages (no cloning or setup required):

**[https://idominikbrame.github.io/usamm-ui-demo/](https://idominikbrame.github.io/usamm-ui-demo/)**


