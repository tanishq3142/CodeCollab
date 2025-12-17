import http from 'http';

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

function get(path) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: '127.0.0.1',
            port: 3000,
            path: path,
            method: 'GET'
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(JSON.parse(data)));
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        console.log("Creating room...");
        const room = await post('/documents', { name: "Test Room Feature" });
        console.log("Created:", room);

        if (room.id.length !== 6) {
            throw new Error("Room ID is not 6 chars!");
        }

        console.log("Fetching list...");
        const list = await get('/documents');
        console.log("List length:", list.length);

        const found = list.find(r => r.id === room.id || r._id === room.id);
        if (found) {
            console.log("SUCCESS: Room found in list");
        } else {
            throw new Error("Room not found in list!");
        }
    } catch (e) {
        console.error("FAILED:", e);
        process.exit(1);
    }
}

run();
