import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*", // In production, restrict to frontend URL
        methods: ["GET", "POST"]
    }
});

const PORT = 3000;

// In-memory storage for now
// Map<roomId, content>
const documents = new Map();

// REST API
app.get('/documents/:id', (req, res) => {
    const { id } = req.params;
    const content = documents.get(id) || "";
    res.json({ id, content });
});

app.post('/documents', (req, res) => {
    const { name } = req.body;
    const id = Date.now().toString(); // Simple ID generation
    documents.set(id, `// New document: ${name}\n`);
    res.json({ id, name });
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Send current state to the new user
        const content = documents.get(roomId) || "";
        socket.emit('doc-state', content);
    });

    socket.on('client-op', ({ roomId, op }) => {
        // op: { from, to, insert }
        // Update server state 
        // Note: This is a naiive implementation. Real collaborative editing requires OT or CRDTs.
        // Here we just apply the patch blindly.
        const currentContent = documents.get(roomId) || "";

        // Apply string splice
        // We assume the client sends valid offsets based on the *current* state 
        // (which might be slightly off if there are concurrent edits, but we ignore conflicts for this task)

        let newContent = currentContent;
        try {
            const prefix = currentContent.slice(0, op.from);
            const suffix = currentContent.slice(op.to);
            newContent = prefix + op.insert + suffix;
            documents.set(roomId, newContent);

            // Broadcast to other clients in the room
            // We broadcast the *op* so they can apply it locally
            socket.to(roomId).emit('server-op', op);
        } catch (e) {
            console.error("Error applying op:", e);
        }
    });

    // Optional: Handle full autosave if we wanted to be safer, 
    // but client-op handles the state continuously.

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
