import React from 'react';

export default function Terminal({ output, onClose }) {
    return (
        <div style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: '100%',
            height: '200px',
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
            <pre style={{
                flex: 1,
                padding: '10px',
                margin: 0,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                fontSize: '0.9rem'
            }}>
                {output || "Run code to see output..."}
            </pre>
        </div>
    );
}
