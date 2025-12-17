import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createDocument, getDocuments } from '../api';

export default function Dashboard() {
    const navigate = useNavigate();
    const [rooms, setRooms] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [newRoomName, setNewRoomName] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const username = localStorage.getItem('username'); // Assuming username is stored in localStorage

    useEffect(() => {
        if (!username) {
            navigate('/');
        } else {
            // Fetch real rooms
            getDocuments().then(data => {
                setRooms(data);
            });
        }
    }, [username, navigate]);

    if (!username) return <div style={{ color: 'white', padding: '2rem' }}>Redirecting to login...</div>;

    const handleCreateRoom = () => {
        setShowModal(true);
        setNewRoomName('');
    };

    const confirmCreateRoom = async (e) => {
        e.preventDefault();
        if (!newRoomName.trim()) return;

        const newRoom = await createDocument(newRoomName);
        console.log("Created room:", newRoom);
        // Navigate using the ID (which might be 6-char now)
        navigate(`/editor/${newRoom.id}`);
        setShowModal(false);
    };

    const handleJoinRoom = (e) => {
        e.preventDefault();
        if (joinCode.trim()) {
            navigate(`/editor/${joinCode.trim()}`);
            setJoinCode('');
        }
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
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <form onSubmit={handleJoinRoom} style={{ display: 'flex', gap: '0.5rem' }}>
                        <input
                            type="text"
                            placeholder="Enter Code (e.g. X9Y2Z1)"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value)}
                            style={{ padding: '0.4rem 0.8rem', width: '180px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', color: 'white', borderRadius: '4px' }}
                        />
                        <button type="submit" style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)' }}>Join</button>
                    </form>
                    <button className="primary" onClick={handleCreateRoom}>+ New Project</button>
                </div>
            </div>

            <div className="dashboard-grid">
                {rooms.length === 0 && <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '2rem', opacity: 0.7 }}>No projects found. Create one to get started!</div>}
                {rooms.map((room, index) => (
                    <div
                        key={room.id || room._id}
                        className="room-card glass-card"
                        onClick={() => navigate(`/editor/${room.id || room._id}`)}
                        style={{ animationDelay: `${index * 0.1}s` }}
                    >
                        <h3 style={{ fontSize: '1.25rem' }}>{room.name}</h3>
                        <p style={{ fontSize: '0.875rem', opacity: 0.7 }}>Code: <span style={{ fontFamily: 'monospace', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px' }}>{room.id || room._id}</span></p>
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
