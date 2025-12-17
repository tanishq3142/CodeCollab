import React, { useState } from 'react';

export default function FileExplorer({ files, activeFile, onFileSelect, onFileCreate }) {
    const [isCreating, setIsCreating] = useState(false);
    const [newFileName, setNewFileName] = useState('');

    const handleCreate = (e) => {
        e.preventDefault();
        if (newFileName.trim()) {
            onFileCreate(newFileName.trim());
            setNewFileName('');
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            width: '250px',
            backgroundColor: '#282c34', // Darker sidebar
            borderRight: '1px solid #3e4451',
            color: '#abb2bf',
            display: 'flex',
            flexDirection: 'column',
            height: '100%'
        }}>
            <div style={{
                padding: '10px',
                fontSize: '0.9rem',
                fontWeight: 'bold',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: '#21252b'
            }}>
                <span>EXPLORER</span>
                <button
                    onClick={() => setIsCreating(true)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'white',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                    }}
                >
                    +
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                {isCreating && (
                    <form onSubmit={handleCreate} style={{ padding: '0 10px' }}>
                        <input
                            autoFocus
                            type="text"
                            value={newFileName}
                            onChange={(e) => setNewFileName(e.target.value)}
                            // onBlur={() => setIsCreating(false)} // Intentionally removed to facilitate easier testing
                            placeholder="filename.js"
                            style={{
                                width: '100%',
                                background: '#3e4451',
                                border: '1px solid #007acc',
                                color: 'white',
                                padding: '2px 5px',
                                outline: 'none'
                            }}
                        />
                    </form>
                )}

                {files.map(file => (
                    <div
                        key={file.name}
                        onClick={() => onFileSelect(file.name)}
                        style={{
                            padding: '5px 15px',
                            cursor: 'pointer',
                            backgroundColor: activeFile === file.name ? '#3e4451' : 'transparent',
                            color: activeFile === file.name ? 'white' : '#abb2bf',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.9rem'
                        }}
                    >
                        <span style={{ marginRight: '8px' }}>📄</span>
                        {file.name}
                    </div>
                ))}
            </div>
        </div>
    );
}
