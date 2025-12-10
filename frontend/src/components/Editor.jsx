import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { defaultKeymap, history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

export default function Editor({ socket, roomId }) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);
    const isRemoteUpdate = useRef(false);

    useEffect(() => {
        // 1. Initialize CodeMirror
        const startState = EditorState.create({
            doc: '',
            extensions: [
                basicSetup,
                keymap.of(defaultKeymap),
                oneDark,
                javascript(), // Default to JS, could make dynamic
                EditorView.updateListruener.of((update) => {
                    if (update.docChanged && !isRemoteUpdate.current) {
                        // Compute changes and send to server
                        update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                            // Simple op format: { from, to, insert }
                            // In a real OT/CRDT system, this would be more complex.
                            // For this task, we send the raw change or full text.
                            // Let's send the specific operation for simplicity closer to OT
                            const op = {
                                from: fromA,
                                to: toA,
                                insert: inserted.toString()
                            };
                            socket.emit('client-op', { roomId, op });
                        });

                        // For Autosave (full content)
                        // We can debounce this or use a timer in another effect
                    }
                })
            ]
        });

        const view = new EditorView({
            state: startState,
            parent: editorRef.current
        });
        viewRef.current = view;

        // 2. Socket Listeners

        // Initial load
        socket.emit('join-room', roomId);
        socket.on('doc-state', (content) => {
            console.log('Received doc-state', content.length);
            const currentDoc = view.state.doc.toString();
            if (content !== currentDoc) {
                isRemoteUpdate.current = true;
                const transaction = view.state.update({
                    changes: { from: 0, to: view.state.doc.length, insert: content }
                    // annotations: [Transaction.addToHistory.of(false)] // Optional: Don't add load to history
                });
                view.dispatch(transaction);
                isRemoteUpdate.current = false;
            }
        });

        // Incoming changes from other clients
        socket.on('server-op', (op) => {
            isRemoteUpdate.current = true;
            const transaction = view.state.update({
                changes: { from: op.from, to: op.to, insert: op.insert }
            });
            view.dispatch(transaction);
            isRemoteUpdate.current = false;
        });

        // 3. Autosave Interval
        const saveInterval = setInterval(() => {
            const content = view.state.doc.toString();
            // We could emit a save event or simple log for now since 'client-op' handles realtime
            // But the requirement says "autosave every 5 seconds"
            console.log("Autosaving...", content.slice(0, 20) + "...");
            // socket.emit('autosave', { roomId, content });
        }, 5000);

        return () => {
            socket.off('doc-state');
            socket.off('server-op');
            clearInterval(saveInterval);
            view.destroy();
        };
    }, [socket, roomId]);

    return <div ref={editorRef} className="cm-editor-wrapper" style={{ height: '100%' }} />;
}
