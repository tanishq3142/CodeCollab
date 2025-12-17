import { useEffect, useRef } from 'react';
import { EditorView, keymap } from '@codemirror/view';
import { EditorState, Annotation } from '@codemirror/state';
import { basicSetup } from 'codemirror';
import { defaultKeymap } from '@codemirror/commands';
import { javascript } from '@codemirror/lang-javascript';
import { cpp } from '@codemirror/lang-cpp';
import { oneDark } from '@codemirror/theme-one-dark';

const SyncAnnotation = Annotation.define();

export default function Editor({ socket, roomId, fileName, initialContent, onContentChange }) {
    const editorRef = useRef(null);
    const viewRef = useRef(null);

    useEffect(() => {
        if (!editorRef.current) return;

        // 1. Initialize CodeMirror
        console.log("Initializing CodeMirror instance for", fileName);
        const startState = EditorState.create({
            doc: initialContent,
            extensions: [
                basicSetup,
                keymap.of(defaultKeymap),
                oneDark,
                fileName.endsWith('.cpp') ? cpp() : javascript(),
                EditorView.updateListener.of((update) => {
                    const isRemote = update.transactions.some(tr => tr.annotation(SyncAnnotation));

                    if (update.docChanged) {
                        if (isRemote) {
                            // no-op
                        } else {
                            // Sync to parent
                            if (onContentChange) {
                                onContentChange(fileName, view.state.doc.toString());
                            }

                            update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
                                const op = {
                                    from: fromA,
                                    to: toA,
                                    insert: inserted.toString()
                                };
                                socket.emit('client-op', { roomId, fileName, op });
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
        const handleServerOp = ({ fileName: opFileName, op }) => {
            if (opFileName !== fileName) return;

            view.dispatch({
                changes: { from: op.from, to: op.to, insert: op.insert },
                annotations: [SyncAnnotation.of(true)]
            });
        };

        socket.on('server-op', handleServerOp);

        return () => {
            console.log("Editor cleanup for", fileName);
            socket.off('server-op', handleServerOp);
            view.destroy();
        };
    }, [socket, roomId, fileName]); // Re-init when file/room changes. Note: initialContent is only used on mount/remount.

    return <div ref={editorRef} className="cm-editor-wrapper" style={{ height: '100%' }} />;
}
