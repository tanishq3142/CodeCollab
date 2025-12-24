import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './db.js';
import Document from './Document.js';
import { exec, spawn } from 'child_process';
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
    let runningProcess = null; // Store reference to running process for this socket

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
        if (runningProcess) {
            runningProcess.kill();
            runningProcess = null;
        }
    });

    socket.on('create-file', async ({ roomId, fileName, language }) => {
        console.log(`create-file request: ${roomId}, ${fileName}`);
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

    // --- Interactive Execution Logic ---
    socket.on('execute-code', ({ code, language }) => {
        if (runningProcess) {
            runningProcess.kill();
            runningProcess = null;
        }

        const fileExtension = language === 'python' ? 'py' : (language === 'cpp' ? 'cpp' : 'js');
        const fileName = `temp_script_${socket.id}_${Date.now()}.${fileExtension}`;
        const filePath = path.join(process.cwd(), fileName);

        fs.writeFileSync(filePath, code);

        let cmd, args;

        if (language === 'python') {
            // -u for unbuffered binary stdout/stderr
            cmd = 'python';
            args = ['-u', filePath];
        } else if (language === 'cpp') {
            // Compile then run (sync compile for simplicity or chained)
            const outPath = filePath.replace('.cpp', '.exe');
            try {
                // Compile synchronously first
                // TODO: Make compilation async to avoid blocking event loop, but for now strict sequence
                exec(`g++ "${filePath}" -o "${outPath}"`, (error, stdout, stderr) => {
                    if (error) {
                        socket.emit('terminal-output', { data: `Compilation Error:\n${stderr}\n` });
                        fs.unlink(filePath, () => { });
                        return;
                    }
                    // Run the compiled executable
                    runningProcess = spawn(outPath, [], { stdio: ['pipe', 'pipe', 'pipe'] });
                    attachProcessListeners(runningProcess, [filePath, outPath]);
                });
                return; // Return early, spawn happens in callback
            } catch (err) {
                socket.emit('terminal-output', { data: `Setup Error: ${err.message}\n` });
                return;
            }
        } else {
            cmd = 'node';
            args = [filePath];
        }

        if (language !== 'cpp') {
            runningProcess = spawn(cmd, args, { stdio: ['pipe', 'pipe', 'pipe'] });
            attachProcessListeners(runningProcess, [filePath]);
        }
    });

    function attachProcessListeners(process, filesToDelete) {
        process.stdout.on('data', (data) => {
            socket.emit('terminal-output', { data: data.toString() });
        });

        process.stderr.on('data', (data) => {
            socket.emit('terminal-output', { data: data.toString() });
        });

        process.on('close', (code) => {
            socket.emit('terminal-output', { data: `\n[Process exited with code ${code}]\n` });
            runningProcess = null;
            // Cleanup
            filesToDelete.forEach(f => {
                if (fs.existsSync(f)) fs.unlinkSync(f); // Sync is fine for cleanup here
            });
        });

        process.on('error', (err) => {
            socket.emit('terminal-output', { data: `\n[Error spawning process: ${err.message}]\n` });
        });
    }

    socket.on('terminal-input', (inputData) => {
        if (runningProcess && runningProcess.stdin) {
            try {
                runningProcess.stdin.write(inputData + '\n');
            } catch (err) {
                console.error("Error writing to stdin:", err);
            }
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        if (runningProcess) {
            runningProcess.kill();
        }
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
