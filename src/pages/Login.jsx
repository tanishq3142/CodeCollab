import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

export default function Login() {
    const [username, setUsername] = useState('');
    const navigate = useNavigate();

    const handleLogin = (e) => {
        e.preventDefault();
        if (!username.trim()) return;

        // Simulate simple auth by storing username in localStorage
        localStorage.setItem('codecollab_username', username);
        localStorage.setItem('codecollab_userid', uuidv4());
        navigate('/dashboard');
    };

    return (
        <div className="container" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100vh', maxWidth: '400px' }}>
            <div className="card">
                <h1>Welcome to CodeCollab</h1>
                <p style={{ marginBottom: '1.5rem', color: '#aaa' }}>Real-time collaborative code editor</p>
                <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <input
                        type="text"
                        placeholder="Enter your username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        autoFocus
                    />
                    <button type="submit" className="primary">Enter</button>
                </form>
            </div>
        </div>
    );
}
