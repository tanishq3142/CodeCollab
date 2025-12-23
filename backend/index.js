import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import Document from './Document.js';
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';

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


// Helper for 6-char code
const generateRoomId = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

// REST API
app.get('/documents', async (req, res) => {
    const { owner } = req.query;
    try {
        const query = owner ? { owner } : {};
        const docs = await Document.find(query, 'name _id owner');
        res.json(docs);
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

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
    const { name, owner } = req.body;
    let id = generateRoomId();

    // Ensure uniqueness (simple retry)
    let exists = await Document.findById(id);
    while (exists) {
        id = generateRoomId();
        exists = await Document.findById(id);
    }

    try {
        await Document.create({ _id: id, name, owner, content: `// New document: ${name}\n` });
        res.json({ id, name, owner });
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

app.post('/execute', async (req, res) => {
    const { code, language } = req.body;
    if (!code) return res.status(400).json({ output: "No code provided" });

    const fileExtension = language === 'python' ? 'py' : (language === 'cpp' ? 'cpp' : 'js');
    const fileName = `temp_script_${Date.now()}.${fileExtension}`;
    const filePath = path.join(process.cwd(), fileName);

    fs.writeFileSync(filePath, code);

    let command;
    if (language === 'python') {
        command = `python "${filePath}"`;
    } else if (language === 'cpp') {
        // Compile then run
        const outPath = filePath.replace('.cpp', '.exe');
        command = `g++ "${filePath}" -o "${outPath}" && "${outPath}"`;
    } else {
        command = `node "${filePath}"`;
    }

    exec(command, { timeout: 5000 }, (error, stdout, stderr) => {
        // Cleanup temp file
        fs.unlink(filePath, () => { });
        if (language === 'cpp') {
            fs.unlink(filePath.replace('.cpp', '.exe'), () => { });
        }

        if (error && error.killed) {
            return res.json({ output: "Error: Execution timed out" });
        }

        if (stderr) {
            // Some tools output to stderr even on success, but usually it's errors
            // We'll combine them or just output stderr if stdout is empty
            return res.json({ output: stderr + (stdout ? "\n" + stdout : "") });
        }

        res.json({ output: stdout });
    });
});


app.get('/documents/:id/download', async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await Document.findById(id);
        if (!doc) return res.status(404).send('Document not found');

        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });

        res.attachment(`${doc.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.zip`);

        archive.on('error', function (err) {
            res.status(500).send({ error: err.message });
        });

        archive.pipe(res);

        doc.files.forEach(file => {
            archive.append(file.content, { name: file.name });
        });

        archive.finalize();
    } catch (e) {
        console.error(e);
        res.status(500).send('Server Error');
    }
});

// Socket.IO
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    const roomUsers = {}; // { roomId: { socketId: { username, color } } }

    socket.on('join-room', async ({ roomId, username }) => {
        socket.join(roomId);
        console.log(`User ${username} (${socket.id}) joined room ${roomId}`);

        // Assign random color
        const colors = ['#f87171', '#fbbf24', '#4ade80', '#60a5fa', '#a78bfa', '#f472b6'];
        const color = colors[Math.floor(Math.random() * colors.length)];

        if (!roomUsers[roomId]) roomUsers[roomId] = {};
        roomUsers[roomId][socket.id] = { username, color, socketId: socket.id };

        // Broadcast active users
        io.in(roomId).emit('room-users', Object.values(roomUsers[roomId]));

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

    socket.on('cursor-move', ({ roomId, position }) => {
        // Broadcast cursor position to others, including username/color
        if (roomUsers[roomId] && roomUsers[roomId][socket.id]) {
            const userInfo = roomUsers[roomId][socket.id];
            socket.to(roomId).emit('remote-cursor', {
                socketId: socket.id,
                position,
                username: userInfo.username,
                color: userInfo.color
            });
        }
    });

    socket.on('leaving-room', ({ roomId }) => {
        if (roomUsers[roomId] && roomUsers[roomId][socket.id]) {
            delete roomUsers[roomId][socket.id];
            io.in(roomId).emit('room-users', Object.values(roomUsers[roomId]));
        }
    });

    socket.on('create-file', async ({ roomId, fileName, language }) => {
        console.log(`create-file request: ${roomId}, ${fileName}`);
        try {
            const doc = await Document.findById(roomId);
            console.log(`Document found: ${!!doc}`);
            if (doc) {
                const newFile = { name: fileName, content: "", language: language || 'plaintext' };
                doc.files.push(newFile);
                await doc.save();
                console.log("File saved");
                // Broadcast to all clients in room (including sender) to update list
                io.in(roomId).emit('file-created', newFile);
            } else {
                console.log("Document not found for room:", roomId);
            }
        } catch (e) {
            console.error("Error creating file:", e);
        }
    });

    // Simple in-memory queue for sequential processing per room
    const opQueues = {};

    socket.on('client-op', ({ roomId, fileName, op }) => {
        if (!opQueues[roomId]) {
            opQueues[roomId] = Promise.resolve();
        }

        opQueues[roomId] = opQueues[roomId].then(async () => {
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
    });

    socket.on('chat-message', ({ roomId, message, username }) => {
        io.in(roomId).emit('chat-message', {
            username,
            message,
            timestamp: new Date().toISOString()
        });
    });

    // Optional: Handle full autosave if we wanted to be safer, 
    // but client-op handles the state continuously.

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Remove from all rooms
        for (const roomId in roomUsers) {
            if (roomUsers[roomId][socket.id]) {
                delete roomUsers[roomId][socket.id];
                // Broadcast updated list
                io.in(roomId).emit('room-users', Object.values(roomUsers[roomId]));
            }
        }
    });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
    try {
        await connectDB();
        server.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    } catch (err) {
        console.error("Failed to connect to database. Server not started.", err);
        process.exit(1);
    }
};

startServer();
