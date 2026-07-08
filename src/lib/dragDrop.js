// Drag-and-drop helper functions for kanban

let draggedItem = null;
let draggedElement = null;

export function handleDragStart(e, item) {
  draggedItem = item;
  draggedElement = e.currentTarget;
  e.currentTarget.style.opacity = "0.5";
  e.currentTarget.style.transform = "rotate(2deg)";
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/html", e.currentTarget);
}

export function handleDragEnd(e) {
  e.currentTarget.style.opacity = "1";
  e.currentTarget.style.transform = "rotate(0deg)";
  draggedItem = null;
  draggedElement = null;
}

export function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
}

export function handleDragEnter(e) {
  e.currentTarget.style.border = "2px dashed var(--accent)";
  e.currentTarget.style.background = "var(--accent-dim)";
}

export function handleDragLeave(e) {
  e.currentTarget.style.border = "";
  e.currentTarget.style.background = "";
}

export function getDraggedItem() {
  return draggedItem;
}

export function handleDrop(e, onDrop) {
  e.preventDefault();
  e.currentTarget.style.border = "";
  e.currentTarget.style.background = "";
  
  if (draggedItem && onDrop) {
    onDrop(draggedItem);
  }
}

