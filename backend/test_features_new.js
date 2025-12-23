import http from 'http';
import { io } from 'socket.io-client';
import fs from 'fs';
import path from 'path';

const API_URL = 'http://127.0.0.1:3000';

function post(path, body) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: path,
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.write(JSON.stringify(body));
        req.end();
    });
}

async function testDownload(docId) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: `/documents/${docId}/download`,
            method: 'GET'
        }, (res) => {
            if (res.statusCode === 200) {
                // Just consume stream
                res.on('data', () => { });
                res.on('end', () => {
                    console.log("Download test passed: Status 200");
                    resolve();
                });
            } else {
                reject(new Error(`Download failed with status ${res.statusCode}`));
            }
        });
        req.on('error', reject);
        req.end();
    });
}

async function testChat(roomId) {
    return new Promise((resolve, reject) => {
        const socket = io(API_URL);
        socket.on('connect', () => {
            console.log("Socket connected");
            socket.emit('join-room', { roomId, username: 'Tester' });
        });

        socket.on('chat-message', (data) => {
            if (data.message === 'Hello Test' && data.username === 'Tester') {
                console.log("Chat test passed: Received echoed message");
                socket.disconnect();
                resolve();
            }
        });

        // Give it a moment to join
        setTimeout(() => {
            socket.emit('chat-message', { roomId, message: 'Hello Test', username: 'Tester' });
        }, 500);

        setTimeout(() => {
            reject(new Error("Chat test timed out"));
            socket.disconnect();
        }, 3000);
    });
}

async function run() {
    try {
        console.log("Creating doc...");
        const doc = await post('/documents', { name: "Test Features", owner: "Tester" });
        console.log("Doc created:", doc.id);

        console.log("Testing Download...");
        await testDownload(doc.id);

        console.log("Testing Chat...");
        await testChat(doc.id);

        console.log("ALL TESTS PASSED");
        process.exit(0);
    } catch (e) {
        console.error("TEST FAILED:", e);
        process.exit(1);
    }
}

run();
