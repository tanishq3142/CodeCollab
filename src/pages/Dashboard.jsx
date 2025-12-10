import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { createDocument } from '../api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const username = localStorage.getItem('codecollab_username');

    useEffect(() => {
        if (!username) {
            navigate('/');
            return;
        }
        // Mock existing rooms
        setRooms([
            { id: 'demo-room-js', name: 'JavaScript Demo' },
            { id: 'demo-room-py', name: 'Python Algorithm' },
            { id: 'notes', name: 'Quick Notes' }
        ]);
    }, [username, navigate]);

    const handleCreateRoom = async () => {
        const name = prompt("Enter room name:");
        if (!name) return;

        // Call API (mocked) or just generate ID
        // const newDoc = await createDocument(name);
        // navigate(`/editor/${newDoc.id}`);

        // For pure frontend demo:
        const newRoomId = uuidv4();
        navigate(`/editor/${newRoomId}`);
    };

    return (
        <div className="container">
            <div className="header">
                <h2>Dashboard</h2>
                <div>
                    <span style={{ marginRight: '1rem' }}>User: <b>{username}</b></span>
                    <button onClick={() => { localStorage.clear(); navigate('/'); }}>Logout</button>
                </div>
            </div>

            <div style={{ marginBottom: '2rem', textAlign: 'right' }}>
                <button className="primary" onClick={handleCreateRoom}>+ New Document</button>
            </div>

            <div className="dashboard-grid">
                {rooms.map(room => (
                    <div key={room.id} className="card room-card" onClick={() => navigate(`/editor/${room.id}`)}>
                        <h3>{room.name}</h3>
                        <p style={{ color: '#666', fontSize: '0.9em' }}>ID: {room.id}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}
