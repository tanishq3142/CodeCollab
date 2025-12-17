// Basic mock API wrapper for demonstration since backend might not be running
// In a real scenario, this would fetch from import.meta.env.VITE_API_URL

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:3000';

export async function getDocuments(owner) {
    try {
        const query = owner ? `?owner=${owner}` : '';
        const response = await fetch(`${API_BASE}/documents${query}`);
        if (!response.ok) throw new Error('Failed to fetch documents');
        return await response.json();
    } catch (error) {
        console.warn("API Error (Backend might be down):", error);
        // Return empty list if backend down
        return [];
    }
}

export async function getDocument(roomId) {
    try {
        const response = await fetch(`${API_BASE}/documents/${roomId}`);
        if (!response.ok) throw new Error('Failed to fetch document');
        return await response.json();
    } catch (error) {
        console.warn("API Error (Backend might be down):", error);
        // Return mock data so frontend can still work to some extent
        return { content: `// Mock content for room ${roomId}\nconsole.log("Hello World");` };
    }
}

export async function createDocument(name, owner) {
    try {
        const response = await fetch(`${API_BASE}/documents`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, owner })
        });
        if (!response.ok) throw new Error('Failed to create document');
        return await response.json();
    } catch (error) {
        console.warn("API Error:", error);
        // Mock ID
        return { id: `room-${Date.now()}`, name, owner };
    }
}
