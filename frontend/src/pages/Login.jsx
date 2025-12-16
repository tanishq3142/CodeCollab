import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import FloatingShapes from '../components/FloatingShapes';

export default function Login() {
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (!username.trim()) return;

        // Simulate simple auth by storing username in localStorage
        localStorage.setItem('username', username);
        localStorage.setItem('codecollab_userid', uuidv4());
        navigate('/dashboard');
    };

    return (
        <div style={{ position: 'relative', width: '100%', height: '100vh', overflow: 'hidden' }}>
            <FloatingShapes />
            <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', maxWidth: '480px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
                <div className="glass-card" style={{ padding: '3rem' }}>
                    <h1 style={{ marginBottom: '0.5rem', textAlign: 'center' }}>CodeCollab</h1>
                    <p style={{ marginBottom: '2.5rem', textAlign: 'center', fontSize: '1.1rem' }}>Real-time collaborative code editor</p>
                    <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div>
                            <input
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                                autoFocus
                            />
                        </div>
                        <button type="submit" className="primary" style={{ width: '100%' }}>
                            Start Coding <span style={{ marginLeft: '5px' }}>&rarr;</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
