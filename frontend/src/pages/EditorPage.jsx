import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Editor from '../components/Editor';
import FileExplorer from '../components/FileExplorer';
import Terminal from '../components/Terminal';
import Chat from '../components/Chat';

export default function EditorPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);
    const [files, setFiles] = useState([]);
    const [activeFileName, setActiveFileName] = useState(null);
    const [showTerminal, setShowTerminal] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [activeUsers, setActiveUsers] = useState([]);
    const [showChat, setShowChat] = useState(true);
    const username = localStorage.getItem('username');
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
            s.emit('join-room', { roomId, username });
        });

        s.on('disconnect', () => {
            console.log("Disconnected");
            setConnected(false);
        });

        s.on('room-users', (users) => {
            console.log("Active users:", users);
            setActiveUsers(users);
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

    const handleFileCreate = (fileName, language) => {
        if (socket) {
            socket.emit('create-file', { roomId, fileName, language });
        }
    };

    const handleContentUpdate = (fileName, newContent) => {
        fileContents.current[fileName] = newContent;
    };

    const runCode = async () => {
        if (!activeFileName) return;
        const code = fileContents.current[activeFileName] || '';
        // Determine language basic
        const language = activeFileName.endsWith('.py') ? 'python' : (activeFileName.endsWith('.cpp') ? 'cpp' : 'javascript');

        setShowTerminal(true);
        setTerminalOutput("Running...");
        setIsRunning(true);

        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

        try {
            const res = await fetch(`${apiUrl}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, language })
            });
            const data = await res.json();
            setTerminalOutput(data.output);
        } catch (err) {
            console.error(err);
            setTerminalOutput("Error connecting to execution server.");
        } finally {
            setIsRunning(false);
        }
    };

    const downloadProject = () => {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
        window.open(`${apiUrl}/documents/${roomId}/download`, '_blank');
    };

    const activeFile = files.find(f => f.name === activeFileName);

    if (!socket) return <div className="container">Initializing...</div>;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header className="header" style={{ marginBottom: 0, padding: '0.5rem 1rem', borderRadius: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard')}>&larr; Back</button>
                    <h3>Project: {roomId}</h3>
                    <button
                        onClick={runCode}
                        disabled={isRunning}
                        className="primary"
                        style={{ marginLeft: '1rem', padding: '0.4rem 1rem', fontSize: '0.9rem' }}
                    >
                        {isRunning ? 'Running...' : 'Run Code'}
                    </button>
                    <button
                        onClick={downloadProject}
                        style={{ padding: '0.4rem 1rem', fontSize: '0.9rem', backgroundColor: '#333' }}
                    >
                        Download
                    </button>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button
                        onClick={() => setShowChat(!showChat)}
                        style={{
                            background: showChat ? '#0e639c' : '#333',
                            border: 'none',
                            padding: '4px 8px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '5px'
                        }}
                        title="Toggle Chat"
                    >
                        Chat
                    </button>
                    {/* Active Users List */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        {activeUsers.map((u, i) => (
                            <div key={i} title={u.username} style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: u.color, color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontWeight: 'bold', fontSize: '14px', border: '2px solid #1e293b'
                            }}>
                                {u.username ? u.username[0].toUpperCase() : '?'}
                            </div>
                        ))}
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
                                key={activeFileName}
                                socket={socket}
                                roomId={roomId}
                                fileName={activeFileName}
                                initialContent={fileContents.current[activeFileName] || ''}
                                onContentChange={handleContentUpdate}
                                activeUsers={activeUsers}
                            />
                        ) : (
                            <div style={{ padding: '20px', color: '#666' }}>Select a file to start editing</div>
                        )}
                    </div>
                </div>
                {showChat && (
                    <Chat socket={socket} roomId={roomId} username={username} />
                )}
            </div>
            {showTerminal && (
                <Terminal
                    output={terminalOutput}
                    onClose={() => setShowTerminal(false)}
                />
            )}
        </div>
    );
}
