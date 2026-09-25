import React, { useState } from 'react';
import { 
  MousePointer, 
  Move, 
  Trash2, 
  Sparkles, 
  CornerDownRight, 
  Command, 
  CheckCircle2 
} from 'lucide-react';
import TestHint from '../components/TestHint';

export default function InteractionLab() {
  // Kanban Drag and Drop State
  const initialTasks = [
    { id: 'task-1', title: 'Write Playwright smoke tests', status: 'todo' },
    { id: 'task-2', title: 'Verify XPath locators', status: 'todo' },
    { id: 'task-3', title: 'Setup CI/CD pipeline run', status: 'inprogress' },
    { id: 'task-4', title: 'Review pull request #42', status: 'done' }
  ];
  const [tasks, setTasks] = useState(initialTasks);
  const [draggedTaskId, setDraggedTaskId] = useState(null);

  // Trash Dropzone State
  const [trashedCount, setTrashedCount] = useState(0);

  // Double Click State
  const [doubleClickCount, setDoubleClickCount] = useState(0);

  // Right Click (Context Menu) State
  const [contextMenuPos, setContextMenuPos] = useState(null);
  const [contextActionSelected, setContextActionSelected] = useState('');

  // Hover State
  const [isHovered, setIsHovered] = useState(false);

  // Keyboard Tester State
  const [lastKey, setLastKey] = useState({ key: '', code: '', ctrl: false, shift: false, alt: false });
  const [shortcutTriggered, setShortcutTriggered] = useState(false);

  // Kanban Handlers
  const handleDragStart = (e, taskId) => {
    e.dataTransfer.setData('text/plain', taskId);
    setDraggedTaskId(taskId);
  };

  const handleDropOnColumn = (e, targetStatus) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: targetStatus } : t))
      );
    }
    setDraggedTaskId(null);
  };

  const handleDropOnTrash = (e) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData('text/plain') || draggedTaskId;
    if (taskId) {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setTrashedCount((prev) => prev + 1);
    }
    setDraggedTaskId(null);
  };

  // Right Click Handler
  const handleContextMenu = (e) => {
    e.preventDefault();
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  };

  // Keyboard Handler
  const handleKeyDown = (e) => {
    setLastKey({
      key: e.key,
      code: e.code,
      ctrl: e.ctrlKey || e.metaKey,
      shift: e.shiftKey,
      alt: e.altKey
    });

    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      e.preventDefault();
      setShortcutTriggered(true);
      setTimeout(() => setShortcutTriggered(false), 2500);
    }
  };

  return (
    <div
      className="max-w-5xl mx-auto px-4 py-8 space-y-8"
      onClick={() => setContextMenuPos(null)}
    >
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-slate-900">Mouse Actions & Drag and Drop Lab</h1>
          <TestHint
            testId="interactions-lab-header"
            tip="Test dragTo(), hover(), dblclick(), right-click contextmenu, and keyboard shortcuts."
          />
        </div>
        <p className="text-sm text-slate-600 mt-1">
          Automate complex gesture interactions: Kanban drag-and-drop, hover menus, double click, custom right-click menus, and keyboard combos.
        </p>
      </div>

      {/* Section 1: Drag and Drop Kanban Board */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Move className="w-4 h-4 text-emerald-600" />
              <span>1. Drag and Drop Kanban Board</span>
            </h2>
            <span className="text-xs text-slate-500">
              Drag cards between columns or into the Trash target below
            </span>
          </div>
          <TestHint
            testId="kanban-board"
            tip="In Playwright: await page.locator('[data-testid=task-task-1]').dragTo(page.locator('[data-testid=column-done]'));"
          />
        </div>

        {/* 3 Columns */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {[
            { id: 'todo', label: 'To Do', color: 'border-slate-300 bg-slate-50' },
            { id: 'inprogress', label: 'In Progress', color: 'border-amber-200 bg-amber-50/50' },
            { id: 'done', label: 'Done', color: 'border-emerald-200 bg-emerald-50/50' }
          ].map((col) => (
            <div
              key={col.id}
              data-testid={`column-${col.id}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnColumn(e, col.id)}
              className={`p-4 rounded-xl border-2 border-dashed ${col.color} min-h-56 flex flex-col`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-700 uppercase tracking-wider">
                  {col.label}
                </span>
                <span
                  data-testid={`count-${col.id}`}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded-full text-[10px] font-bold text-slate-600"
                >
                  {tasks.filter((t) => t.status === col.id).length}
                </span>
              </div>

              <div className="space-y-2 flex-1">
                {tasks
                  .filter((t) => t.status === col.id)
                  .map((task) => (
                    <div
                      key={task.id}
                      draggable
                      id={task.id}
                      data-testid={`task-${task.id}`}
                      onDragStart={(e) => handleDragStart(e, task.id)}
                      className="p-3 bg-white border border-slate-200 rounded-xl shadow-xs cursor-grab active:cursor-grabbing hover:border-indigo-400 text-xs font-medium text-slate-800 transition-all select-none"
                    >
                      {task.title}
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trash Dropzone */}
        <div
          data-testid="trash-dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDropOnTrash}
          className="mt-4 p-4 rounded-xl border-2 border-dashed border-rose-300 bg-rose-50 flex items-center justify-between text-rose-800 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-600" />
            <div>
              <span className="text-xs font-bold block">Drop here to Delete</span>
              <span className="text-[11px] text-rose-600">Drag any card into this box to remove it</span>
            </div>
          </div>
          <span
            data-testid="trash-counter"
            className="text-xs font-mono font-bold bg-white px-2.5 py-1 rounded-lg border border-rose-200 text-rose-700"
          >
            Deleted: {trashedCount}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Section 2: Mouse Hover & Tooltip */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MousePointer className="w-4 h-4 text-blue-500" />
              <span>2. Mouse Hover & Tooltip</span>
            </h2>
            <TestHint testId="hover-trigger-box" tip="In Playwright: await page.getByTestId('hover-trigger-box').hover();" />
          </div>

          <p className="text-xs text-slate-600">
            Hover over the card to reveal the hidden menu and inspect content dynamically.
          </p>

          <div
            data-testid="hover-trigger-box"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className="p-6 bg-slate-50 border border-slate-200 rounded-xl text-center cursor-pointer transition-all hover:border-indigo-400 hover:bg-indigo-50/20"
          >
            <span className="text-xs font-semibold text-slate-700">
              👉 Hover Your Mouse Over Me
            </span>

            {isHovered ? (
              <div
                data-testid="hover-revealed-content"
                className="mt-3 p-3 bg-indigo-600 text-white rounded-xl text-xs font-medium animate-fadeIn shadow-md"
              >
                🎉 Secret Hover Content Revealed!
              </div>
            ) : (
              <div className="mt-3 text-[11px] text-slate-400">
                (Content currently hidden)
              </div>
            )}
          </div>
        </div>

        {/* Section 3: Double Click & Right Click */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CornerDownRight className="w-4 h-4 text-purple-500" />
              <span>3. Double Click & Right Click</span>
            </h2>
            <TestHint testId="double-click-btn" tip="In Playwright: await page.getByTestId('double-click-btn').dblclick();" />
          </div>

          <div className="space-y-3 pt-1">
            {/* Double Click */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-700 block">Double Click Action</span>
                <span className="text-[11px] text-slate-500">Requires rapid double click</span>
              </div>
              <button
                type="button"
                data-testid="double-click-btn"
                onDoubleClick={() => setDoubleClickCount((prev) => prev + 1)}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                Double Click Me
              </button>
            </div>
            <div className="text-xs text-slate-600 flex justify-between px-1">
              <span>Double Click Counter:</span>
              <span data-testid="double-click-counter" className="font-mono font-bold text-purple-600">
                {doubleClickCount}
              </span>
            </div>

            {/* Right Click Area */}
            <div
              data-testid="right-click-zone"
              onContextMenu={handleContextMenu}
              className="p-4 bg-slate-100 border border-dashed border-slate-300 rounded-xl text-center text-xs font-medium text-slate-600 cursor-context-menu select-none mt-2"
            >
              🖱️ Right-Click anywhere inside this zone
            </div>
            {contextActionSelected && (
              <div data-testid="context-action-result" className="text-xs text-indigo-700 font-semibold text-center">
                Action executed: {contextActionSelected}
              </div>
            )}
          </div>
        </div>

        {/* Section 4: Keyboard Event & Shortcuts */}
        <div className="md:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Command className="w-4 h-4 text-indigo-600" />
              <span>4. Keyboard Event & Hotkey Listener</span>
            </h2>
            <TestHint testId="keyboard-input" tip="In Playwright: await page.getByTestId('keyboard-input').press('Control+s');" />
          </div>

          <p className="text-xs text-slate-600">
            Type inside the input field to test key presses, modifiers (Ctrl, Shift, Alt), or trigger the <code className="text-indigo-600 font-mono">Ctrl + S</code> shortcut.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
            <input
              type="text"
              data-testid="keyboard-input"
              onKeyDown={handleKeyDown}
              placeholder="Click here and press keys..."
              className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />

            <div className="bg-slate-900 text-slate-100 p-3.5 rounded-xl font-mono text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Key:</span>
                <span data-testid="key-name-label" className="text-amber-300 font-bold">{lastKey.key || 'None'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Code:</span>
                <span data-testid="key-code-label" className="text-indigo-300">{lastKey.code || 'None'}</span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800">
                <span>Modifiers:</span>
                <span className="text-emerald-400">
                  {lastKey.ctrl ? 'Ctrl ' : ''}{lastKey.shift ? 'Shift ' : ''}{lastKey.alt ? 'Alt' : ''}{!lastKey.ctrl && !lastKey.shift && !lastKey.alt ? 'None' : ''}
                </span>
              </div>
            </div>
          </div>

          {shortcutTriggered && (
            <div
              data-testid="shortcut-alert-msg"
              className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 animate-fadeIn"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Shortcut Ctrl + S triggered successfully!</span>
            </div>
          )}
        </div>

      </div>

      {/* Floating Custom Right-Click Context Menu */}
      {contextMenuPos && (
        <div
          data-testid="custom-context-menu"
          className="fixed z-50 bg-white border border-slate-200 rounded-xl shadow-xl p-1.5 text-xs w-48 animate-fadeIn"
          style={{ top: `${contextMenuPos.y}px`, left: `${contextMenuPos.x}px` }}
        >
          {['Copy Link', 'Inspect Element', 'Execute Quick Automation', 'Close Menu'].map((item) => (
            <button
              key={item}
              type="button"
              data-testid={`context-item-${item.toLowerCase().replace(/\s+/g, '-')}`}
              onClick={() => {
                setContextActionSelected(item);
                setContextMenuPos(null);
              }}
              className="w-full text-left px-3 py-1.5 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-slate-700"
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

