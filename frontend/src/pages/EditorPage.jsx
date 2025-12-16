import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';

export default function EditorPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [files, setFiles] = useState([]);
    const [activeFileName, setActiveFileName] = useState(null);
    const fileContents = useRef({}); // Store content in ref to avoid re-renders on typing

    // Initialize Socket.IO
    useEffect(() => {
        const url = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
        console.log("Connecting to socket at:", url);
        const s = io(url, {
            reconnectionAttempts: 3
        });

        setSocket(s);

        s.on('connect', () => {
            console.log("Connected to socket server");
            setConnected(true);
            s.emit('join-room', roomId);
        });

        s.on('disconnect', () => {
            console.log("Disconnected");
            setConnected(false);
        });

        s.on('project-data', (filesData) => {
            console.log("Received project data:", filesData);
            setFiles(filesData);
            // Initialize content map
            filesData.forEach(f => {
                fileContents.current[f.name] = f.content;
            });

            if (filesData.length > 0 && !activeFileName) {
                setActiveFileName(filesData[0].name);
            }
        });

        s.on('file-created', (newFile) => {
            setFiles(prev => [...prev, newFile]);
            fileContents.current[newFile.name] = newFile.content;
        });

        s.on('server-op', ({ fileName, op }) => {
            // Also update our local ref if we get an external update
            // Note: This is a simplification. For perfect sync, we'd need to apply the op string-wise.
            // But since 'Editor' handles the live view, we mainly care about switching files.
            // If we switch to a file that had remote updates, we want the latest.
            // Ideally, we should apply the op to fileContents.current[fileName].
            // Implementing basic op application here:
            const currentContent = fileContents.current[fileName] || "";
            const prefix = currentContent.slice(0, op.from);
            const suffix = currentContent.slice(op.to);
            fileContents.current[fileName] = prefix + op.insert + suffix;
        });

        return () => {
            s.disconnect();
        };
    }, [roomId]);

    const handleFileCreate = (fileName) => {
        if (socket) {
            socket.emit('create-file', { roomId, fileName, language: 'javascript' });
        }
    };

    const handleContentUpdate = (fileName, newContent) => {
        fileContents.current[fileName] = newContent;
    };

    const activeFile = files.find(f => f.name === activeFileName);

    if (!socket) return <div className="container">Initializing...</div>;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header className="header" style={{ marginBottom: 0, padding: '0.5rem 1rem', borderRadius: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard')}>&larr; Back</button>
                    <h3>Project: {roomId}</h3>
                </div>
                <div>
                    <span style={{
                        display: 'inline-block',
                        width: '10px',
                        height: '10px',
                        borderRadius: '50%',
                        backgroundColor: connected ? '#4caf50' : '#f44336',
                        marginRight: '0.5rem'
                    }}></span>
                    {connected ? 'Connected' : 'Disconnected'}
                </div>
            </header>

            <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
                <FileExplorer
                    files={files}
                    activeFile={activeFileName}
                    onFileSelect={setActiveFileName}
                    onFileCreate={handleFileCreate}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backdropFilter: 'blur(5px)' }}>
                    {activeFileName && (
                        <div style={{
                            padding: '5px 10px',
                            backgroundColor: 'rgba(30, 30, 30, 0.4)',
                            color: '#ccc',
                            fontSize: '0.9rem',
                            borderBottom: '1px solid rgba(51, 51, 51, 0.5)'
                        }}>
                            {activeFileName}
                        </div>
                    )}
                    <div className="editor-container" style={{ flex: 1, overflow: 'hidden', position: 'relative', height: 'auto', borderRadius: 0, border: 'none' }}>
                        {activeFileName ? (
                            <Editor
                                socket={socket}
                                roomId={roomId}
                                fileName={activeFileName}
                                initialContent={fileContents.current[activeFileName] || ''}
                                onContentChange={handleContentUpdate}
                            />
                        ) : (
                            <div style={{ padding: '20px', color: '#666' }}>Select a file to start editing</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
