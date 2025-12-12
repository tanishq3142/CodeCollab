import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Annotation, EditorSelection } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { defaultKeymap, history } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { oneDark } from '@codemirror/theme-one-dark';

const SyncAnnotation = Annotation.define();

export default function Editor({ socket, roomId }) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);

    useEffect(() => {
        // 1. Initialize CodeMirror
        console.log("Initializing CodeMirror instance");
        const startState = EditorState.create({
            doc: '',
            extensions: [
                basicSetup,
                keymap.of(defaultKeymap),
                oneDark,
                javascript(),
                EditorView.updateListener.of((update) => {
                    // Check if the transaction is marked as a remote sync
                    const isRemote = update.transactions.some(tr => tr.annotation(SyncAnnotation));

                    if (update.docChanged) {
                        if (isRemote) {
                            console.log("Applied remote update (no emit)");
                        } else {
                            console.log("Local update detected, emitting client-op");
                            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                                const op = {
                                    from: fromA,
                                    to: toA,
                                    insert: inserted.toString()
                                };
                                socket.emit('client-op', { roomId, op });
                            });
                        }
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
        socket.emit('join-room', roomId);

        const handleDocState = (content) => {
            console.log('Received doc-state', content.length);
            const currentDoc = view.state.doc.toString();
            if (content !== currentDoc) {
                console.log("Replacing full doc content from server");

                // Preserve cursor position
                const ranges = view.state.selection.ranges.map(range => {
                    const newAnchor = Math.min(range.anchor, content.length);
                    const newHead = Math.min(range.head, content.length);
                    return EditorSelection.range(newAnchor, newHead);
                });
                const newSelection = EditorSelection.create(ranges, view.state.selection.mainIndex);

                view.dispatch({
                    changes: { from: 0, to: view.state.doc.length, insert: content },
                    selection: newSelection,
                    annotations: [SyncAnnotation.of(true)]
                });
            } else {
                console.log("Doc state matches, no replace");
            }
        };

        const handleServerOp = (op) => {
            console.log("Received server-op", op);
            view.dispatch({
                changes: { from: op.from, to: op.to, insert: op.insert },
                annotations: [SyncAnnotation.of(true)]
            });
        };

        socket.on('doc-state', handleDocState);
        socket.on('server-op', handleServerOp);

        const saveInterval = setInterval(() => {
            const content = view.state.doc.toString();
            console.log("Autosaving...", content.slice(0, 20) + "...");
        }, 5000);

        return () => {
            console.log("Editor cleanup");
            socket.off('doc-state', handleDocState);
            socket.off('server-op', handleServerOp);
            clearInterval(saveInterval);
            view.destroy();
        };
    }, [socket, roomId]);

    return <div ref={editorRef} className="cm-editor-wrapper" style={{ height: '100%' }} />;
}
