import React, { useState, useEffect, useRef } from 'react';

export default function Chat({ socket, roomId, username }) {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const messagesEndRef = useRef(null);

    useEffect(() => {
        if (!socket) return;

        const handleMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        socket.on('chat-message', handleMessage);

        return () => {
            socket.off('chat-message', handleMessage);
        };
    }, [socket]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const sendMessage = (e) => {
        e.preventDefault();
        if (!newMessage.trim() || !socket) return;

        socket.emit('chat-message', {
            roomId,
            message: newMessage,
            username
        });

        setNewMessage('');
    };

    return (
        <div style={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            backgroundColor: '#1e1e1e',
            borderLeft: '1px solid #333',
            width: '300px'
        }}>
            <div style={{
                padding: '10px',
                borderBottom: '1px solid #333',
                backgroundColor: '#252526',
                fontWeight: 'bold',
                color: '#ccc'
            }}>
                Chat
            </div>
            <div style={{
                flex: 1,
                overflowY: 'auto',
                padding: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
            }}>
                {messages.map((msg, index) => (
                    <div key={index} style={{
                        alignSelf: msg.username === username ? 'flex-end' : 'flex-start',
                        maxWidth: '85%',
                        backgroundColor: msg.username === username ? '#37373d' : '#2d2d2d',
                        padding: '8px',
                        borderRadius: '6px',
                        fontSize: '0.9rem'
                    }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: msg.username === username ? '#60a5fa' : '#a78bfa',
                            marginBottom: '2px'
                        }}>
                            {msg.username} <span style={{ color: '#666', marginLeft: '4px' }}>
                                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                        <div style={{ color: '#e0e0e0', wordBreak: 'break-word' }}>
                            {msg.message}
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={sendMessage} style={{
                padding: '10px',
                borderTop: '1px solid #333',
                display: 'flex',
                gap: '8px'
            }}>
                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    style={{
                        flex: 1,
                        padding: '8px',
                        borderRadius: '4px',
                        border: '1px solid #3e3e42',
                        backgroundColor: '#3e3e42',
                        color: '#fff',
                        outline: 'none'
                    }}
                />
                <button type="submit" style={{
                    padding: '8px 12px',
                    backgroundColor: '#0e639c',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                }}>
                    Send
                </button>
            </form>
        </div>
    );
}
