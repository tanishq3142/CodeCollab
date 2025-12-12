import { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';
import Editor from '../components/Editor';

export default function EditorPage() {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [socket, setSocket] = useState(null);
    const [connected, setConnected] = useState(false);

    // Initialize Socket.IO
    useEffect(() => {
        const url = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';
        console.log("Connecting to socket at:", url);
        const s = io(url, {
            reconnectionAttempts: 3 // Don't try forever if no backend
        });

        setSocket(s);

        s.on('connect', () => {
            console.log("Connected to socket server");
            setConnected(true);
        });

        s.on('disconnect', () => {
            console.log("Disconnected");
            setConnected(false);
        });

        // For demo purposes if backend isn't running, we still render the editor
        // but the 'connected' state might remain false.

        return () => {
            s.disconnect();
        };
    }, []);

    if (!socket) return <div className="container">Initializing...</div>;

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
            <header className="header" style={{ marginBottom: 0, padding: '0.5rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate('/dashboard')}>&larr; Back</button>
                    <h3>Room: {roomId}</h3>
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
                    {connected ? 'Connected' : 'Disconnected (Backend Offline?)'}
                </div>
            </header>

            <div style={{ flex: 1, overflow: 'hidden' }}>
                <Editor socket={socket} roomId={roomId} />
            </div>
        </div>
    );
}
