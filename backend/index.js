import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import Document from './Document.js';

dotenv.config();
connectDB();

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

// MongoDB handles storage now


// REST API
app.get('/documents/:id', async (req, res) => {
    const { id } = req.params;
    console.log(`fetching document ${id}`);
    try {
        const doc = await Document.findById(id);
        res.json({ id, content: doc ? doc.content : "" });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

app.post('/documents', async (req, res) => {
    const { name } = req.body;
    const id = Date.now().toString(); // Use timestamp as ID for simplicity
    try {
        await Document.create({ _id: id, name, content: `// New document: ${name}\n` });
        res.json({ id, name });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('join-room', async (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);

        // Send current project state (files) to the new user
        let doc = await Document.findById(roomId);
        if (!doc) {
            // Initialize default project if not exists
            doc = await Document.create({
                _id: roomId,
                name: "Untitled Project",
                files: [{ name: "main.js", content: "// Start coding...", language: "javascript" }]
            });
        }
        socket.emit('project-data', doc.files);
    });

    socket.on('create-file', async ({ roomId, fileName, language }) => {
        try {
            const doc = await Document.findById(roomId);
            if (doc) {
                const newFile = { name: fileName, content: "", language: language || 'plaintext' };
                doc.files.push(newFile);
                await doc.save();
                // Broadcast to all clients in room (including sender) to update list
                io.in(roomId).emit('file-created', newFile);
            }
        } catch (e) {
            console.error("Error creating file:", e);
        }
    });

    socket.on('client-op', async ({ roomId, fileName, op }) => {
        // op: { from, to, insert }
        try {
            const doc = await Document.findById(roomId);
            if (!doc) return;

            const file = doc.files.find(f => f.name === fileName);
            if (!file) return;

            const currentContent = file.content || "";

            // Apply string splice
            const prefix = currentContent.slice(0, op.from);
            const suffix = currentContent.slice(op.to);
            const newContent = prefix + op.insert + suffix;

            file.content = newContent;
            await doc.save();

            // Broadcast to other clients in the room
            socket.to(roomId).emit('server-op', { fileName, op });
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
