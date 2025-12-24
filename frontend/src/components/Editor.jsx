import React, { useRef, useEffect } from 'react';
import { EditorState, StateField, StateEffect } from '@codemirror/state';
import { EditorView, keymap, lineNumbers, Decoration, WidgetType } from '@codemirror/view';
import { basicSetup } from 'codemirror';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';
import { Annotation } from '@codemirror/state';

const SyncAnnotation = Annotation.define();

// Cursor Widget
class CursorWidget extends WidgetType {
    constructor(color, username) {
        super();
        this.color = color;
        this.username = username;
    }

    toDOM() {
        const span = document.createElement("span");
        span.style.borderLeft = `2px solid ${this.color}`;
        span.style.marginLeft = "-1px";
        span.style.marginRight = "-1px";
        span.style.height = "1.2em";
        span.style.display = "inline-block";
        span.style.verticalAlign = "text-bottom";
        span.style.position = "relative";

        const label = document.createElement("span");
        label.textContent = this.username;
        label.style.position = "absolute";
        label.style.top = "-1.4em";
        label.style.left = "-2px";
        label.style.fontSize = "10px";
        label.style.backgroundColor = this.color;
        label.style.color = "white";
        label.style.padding = "1px 3px";
        label.style.borderRadius = "3px";
        label.style.whiteSpace = "nowrap";

        span.appendChild(label);
        return span;
    }
}

// Effects for cursor updates
const remoteCursorEffect = StateEffect.define();

const cursorStateField = StateField.define({
    create() { return Decoration.none; },
    update(decorations, tr) {
        decorations = decorations.map(tr.changes);
        for (let e of tr.effects) {
            if (e.is(remoteCursorEffect)) {
                // e.value = [{ pos, color, username }, ...]
                return Decoration.set(e.value.map(c =>
                    Decoration.widget({ widget: new CursorWidget(c.color, c.username), side: 1 }).range(c.pos)
                ));
            }
        }
        return decorations;
    },
    provide: f => EditorView.decorations.from(f)
});

function Editor({ socket, roomId, fileName, initialContent, onContentChange, activeUsers }) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const remoteCursors = useRef(new Map()); // socketId -> { pos, color, username }

    // Cleanup cursors when activeUsers changes
    useEffect(() => {
        if (!viewRef.current || !activeUsers) return;

        const activeIds = new Set(activeUsers.filter(u => u.socketId).map(u => u.socketId));
        let changed = false;

        // Remove cursors for users who are no longer active
        for (const [socketId] of remoteCursors.current) {
            if (!activeIds.has(socketId)) {
                remoteCursors.current.delete(socketId);
                changed = true;
            }
        }

        if (changed) {
            viewRef.current.dispatch({
                effects: remoteCursorEffect.of(Array.from(remoteCursors.current.values()))
            });
        }
    }, [activeUsers]);

    useEffect(() => {
        if (!editorRef.current) return;

        console.log("Initializing CodeMirror instance for", fileName);

        const broadcastCursor = EditorView.updateListener.of((update) => {
            const isRemote = update.transactions.some(tr => tr.annotation(SyncAnnotation));

            if (update.docChanged) {
                if (!isRemote && onContentChange) {
                    onContentChange(fileName, update.state.doc.toString());
                    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                        const op = { from: fromA, to: toA, insert: inserted.toString() };
                        socket.emit('client-op', { roomId, fileName, op });
                    });
                }
            }

            if (update.selectionSet && socket) {
                const head = update.state.selection.main.head;
                socket.emit('cursor-move', { roomId, position: head });
            }
        });

        const startState = EditorState.create({
            doc: initialContent,
            extensions: [
                basicSetup,
                keymap.of(defaultKeymap),
                oneDark,
                fileName.endsWith('.cpp') ? cpp() : (fileName.endsWith('.py') ? python() : javascript()),
                broadcastCursor,
                cursorStateField,
                EditorView.theme({
                    "&": { height: "100%" },
                    ".cm-scroller": { overflow: "auto" }
                })
            ]
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });
        viewRef.current = view;

        const handleServerOp = ({ fileName: opFileName, op }) => {
            if (opFileName !== fileName) return;
            view.dispatch({
                changes: { from: op.from, to: op.to, insert: op.insert },
                annotations: [SyncAnnotation.of(true)]
            });
        };

        const handleRemoteCursor = ({ socketId, position, username, color }) => {
            remoteCursors.current.set(socketId, { pos: position, color, username });
            // Dispatch effect to update all cursors
            view.dispatch({
                effects: remoteCursorEffect.of(Array.from(remoteCursors.current.values()))
            });
        };

        socket.on('server-op', handleServerOp);
        socket.on('remote-cursor', handleRemoteCursor);

        return () => {
            console.log("Editor cleanup for", fileName);
            socket.off('server-op', handleServerOp);
            socket.off('remote-cursor', handleRemoteCursor);
            view.destroy();
        };
    }, [socket, roomId, fileName]);

    return <div ref={editorRef} className="cm-editor-wrapper" style={{ height: '100%' }} />;
}

export default React.memo(Editor);
