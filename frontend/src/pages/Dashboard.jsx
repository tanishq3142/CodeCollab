import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { createDocument } from '../api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const username = localStorage.getItem('username'); // Assuming username is stored in localStorage

    useEffect(() => {
        if (!username) {
            navigate('/');
        } else {
            // Mock existing rooms
            setRooms([
                { id: 'demo-room-js', name: 'JavaScript Demo' },
                { id: 'demo-room-py', name: 'Python Algorithm' },
                { id: 'notes', name: 'Quick Notes' }
            ]);
        }
    }, [username, navigate]);

    if (!username) return <div style={{ color: 'white', padding: '2rem' }}>Redirecting to login...</div>;

    const handleCreateRoom = () => {
        setShowModal(true);
        setNewRoomName('');
    };

    const confirmCreateRoom = (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        // For pure frontend demo:
        const newRoomId = uuidv4();
        // Ideally we would add to 'rooms' state here if staying on dashboard, but we navigate away
        navigate(`/editor/${newRoomId}`);
        setShowModal(false);
    };

    return (
        <div className="container">
            <div className="header glass">
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    {/* Placeholder for Logo if needed, or just text */}
                    <div style={{ width: '32px', height: '32px', background: 'linear-gradient(135deg, #6366f1, #a855f7)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '18px' }}>C</div>
                    <h2 style={{ margin: 0, fontSize: '1.5rem', background: 'none', WebkitTextFillColor: 'white' }}>CodeCollab</h2>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '0.5rem 1rem', borderRadius: '50px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#4f46e5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px' }}>
                            {username ? username[0].toUpperCase() : 'U'}
                        </div>
                        <span style={{ color: '#e2e8f0', fontSize: '0.95rem' }}>{username}</span>
                    </div>
                    <button onClick={() => { localStorage.clear(); navigate('/'); }} style={{ padding: '0.5rem 1.2rem', fontSize: '0.9rem' }}>Logout</button>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h3 style={{ margin: 0 }}>Your Projects</h3>
                <button className="primary" onClick={handleCreateRoom}>+ New Project</button>
            </div>

            <div className="dashboard-grid">
                {rooms.map((room, index) => (
                    <div
                        key={room.id}
                        className="room-card glass-card"
                        onClick={() => navigate(`/editor/${room.id}`)}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <h3 style={{ fontSize: '1.25rem' }}>{room.name}</h3>
                        <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>ID: {room.id}</p>
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--primary-color)' }}>Open &rarr;</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Modal */}
            {showModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
                    background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)',
                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                    zIndex: 1000,
                    animation: 'fadeIn 0.2s ease-out'
                }} onClick={() => setShowModal(false)}>
                    <div className="glass-card" style={{ width: '100%', maxWidth: '400px', padding: '2rem', animation: 'scaleIn 0.2s ease-out' }} onClick={e => e.stopPropagation()}>
                        <h3 style={{ marginTop: 0 }}>Create New Project</h3>
                        <form onSubmit={confirmCreateRoom}>
                            <div style={{ marginBottom: '1.5rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#ccc' }}>Project Name</label>
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="My Awesome Project"
                                    value={newRoomName}
                                    onChange={(e) => setNewRoomName(e.target.value)}
                                    style={{ width: '100%' }}
                                />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                                <button type="button" onClick={() => setShowModal(false)} style={{ background: 'transparent', border: '1px solid #444' }}>Cancel</button>
                                <button type="submit" className="primary">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
