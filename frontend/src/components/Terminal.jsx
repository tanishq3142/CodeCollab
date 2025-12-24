import React, { useState, useEffect, useRef } from 'react';

export default function Terminal({ output, onClose, onInput }) {
    const [inputValue, setInputValue] = useState('');
    const outputRef = useRef(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            if (onInput) {
                onInput(inputValue);
            }
            setInputValue('');
        }
    };

    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '250px',
            backgroundColor: '#1e1e1e',
            color: '#d4d4d4',
            borderTop: '1px solid #333',
            fontFamily: 'monospace',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 10
        }}>
            <div style={{
                padding: '5px 10px',
                backgroundColor: '#252526',
                borderBottom: '1px solid #333',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '0.8rem',
                textTransform: 'uppercase'
            }}>
                <span>Terminal / Output</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#ccc',
                        cursor: 'pointer',
                        fontSize: '1rem'
                    }}
                >
                    &times;
                </button>
            </div>
            <div
                ref={outputRef}
                style={{
                    flex: 1,
                    padding: '10px',
                    margin: 0,
                    overflow: 'auto',
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.9rem'
                }}
            >
                {output || "Run code to see output..."}
            </div>
            <div style={{
                display: 'flex',
                borderTop: '1px solid #333',
                backgroundColor: '#1e1e1e'
            }}>
                <span style={{ padding: '5px 0 5px 10px', color: '#666' }}>&gt;</span>
                <input
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'white',
                        fontFamily: 'monospace',
                        fontSize: '0.9rem',
                        padding: '5px 10px',
                        outline: 'none'
                    }}
                    placeholder="Type here to send to process (stdin)..."
                />
            </div>
        </div>
    );
}
