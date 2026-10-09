const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const NOTES_FILE = path.join(__dirname, 'notes.txt');

// Helper to ensure notes.txt exists or seed it if new
function ensureNotesFile() {
  if (!fs.existsSync(NOTES_FILE)) {
    const initialNotes = [
      '1|Welcome to Notes Saver|This Master-Detail UI seamlessly connects to notes.txt without touching notes saver.cpp!',
      '2|C++ File Interoperability|Any changes made in this UI update notes.txt, which is directly readable by the C++ application.',
      '3|Keyboard Shortcuts|Press Ctrl+N for a new note, Ctrl+S to save, / to search, and Esc to clear.'
    ].join('\n') + '\n';
    fs.writeFileSync(NOTES_FILE, initialNotes, 'utf8');
    console.log(`Created new ${NOTES_FILE} with initial sample notes.`);
  }
}

// Read and parse notes.txt (matching C++ id|title|content format)
function readNotesFromFile() {
  ensureNotesFile();
  try {
    const raw = fs.readFileSync(NOTES_FILE, 'utf8');
    const lines = raw.split(/\r?\n/);
    const notes = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      // Format: id|title|content
      const firstPipe = line.indexOf('|');
      if (firstPipe === -1) continue;

      const secondPipe = line.indexOf('|', firstPipe + 1);
      if (secondPipe === -1) continue;

      const id = parseInt(line.substring(0, firstPipe), 10);
      const title = line.substring(firstPipe + 1, secondPipe);
      const content = line.substring(secondPipe + 1);

      if (!isNaN(id)) {
        notes.push({ id, title, content });
      }
    }
    return notes;
  } catch (err) {
    console.error('Error reading notes.txt:', err);
    return [];
  }
}

// Write notes array back to notes.txt (preserving exact C++ format)
function writeNotesToFile(notes) {
  const content = notes
    .map(n => `${n.id}|${(n.title || '').replace(/\|/g, '-')}|${(n.content || '').replace(/\r?\n/g, '\\n')}`)
    .join('\n') + '\n';
  fs.writeFileSync(NOTES_FILE, content, 'utf8');
}

// MIME Types
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
};

// Request Parser Helper
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch (e) {
        reject(e);
      }
    });
  });
}

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // CORS Headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // API Endpoints
  if (pathname === '/api/notes' && method === 'GET') {
    const notes = readNotesFromFile();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(notes));
    return;
  }

  if (pathname === '/api/notes' && method === 'POST') {
    try {
      const body = await parseBody(req);
      const notes = readNotesFromFile();
      const maxId = notes.reduce((max, n) => Math.max(max, n.id), 0);
      const newNote = {
        id: maxId + 1,
        title: body.title || 'Untitled',
        content: body.content || ''
      };
      notes.push(newNote);
      writeNotesToFile(notes);

      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(newNote));
    } catch (e) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid JSON request' }));
    }
    return;
  }

  const matchNoteId = pathname.match(/^\/api\/notes\/(\d+)$/);
  if (matchNoteId) {
    const targetId = parseInt(matchNoteId[1], 10);
    const notes = readNotesFromFile();

    if (method === 'PUT') {
      try {
        const body = await parseBody(req);
        const idx = notes.findIndex(n => n.id === targetId);
        if (idx === -1) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Note not found' }));
          return;
        }

        notes[idx] = {
          id: targetId,
          title: body.title !== undefined ? body.title : notes[idx].title,
          content: body.content !== undefined ? body.content : notes[idx].content
        };
        writeNotesToFile(notes);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(notes[idx]));
      } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid payload' }));
      }
      return;
    }

    if (method === 'DELETE') {
      const filtered = notes.filter(n => n.id !== targetId);
      if (filtered.length === notes.length) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Note not found' }));
        return;
      }
      writeNotesToFile(filtered);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deletedId: targetId }));
      return;
    }
  }

  // Static File Serving
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

ensureNotesFile();

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`  Notes Saver UI (Master-Detail View) is Running!  `);
  console.log(`  URL: http://localhost:${PORT}                     `);
  console.log(`  Backing file: ${NOTES_FILE}                       `);
  console.log(`====================================================`);
});
