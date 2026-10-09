import http.server
import json
import os
import re
import urllib.parse

PORT = 3000
NOTES_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'notes.txt')

def ensure_notes_file():
    if not os.path.exists(NOTES_FILE):
        initial = (
            "1|Welcome to Notes Saver|This Master-Detail UI seamlessly connects to notes.txt without touching notes saver.cpp!\n"
            "2|C++ File Interoperability|Any changes made in this UI update notes.txt, which is directly readable by the C++ application.\n"
            "3|Keyboard Shortcuts|Press Ctrl+N for a new note, Ctrl+S to save, / to search, and Esc to clear.\n"
        )
        with open(NOTES_FILE, 'w', encoding='utf-8') as f:
            f.write(initial)
        print(f"Created new {NOTES_FILE} with initial sample notes.")

def read_notes():
    ensure_notes_file()
    notes = []
    if not os.path.exists(NOTES_FILE):
        return notes
    with open(NOTES_FILE, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip('\r\n')
            if not line:
                continue
            parts = line.split('|', 2)
            if len(parts) == 3:
                try:
                    nid = int(parts[0])
                    notes.append({
                        "id": nid,
                        "title": parts[1],
                        "content": parts[2]
                    })
                except ValueError:
                    continue
    return notes

def write_notes(notes):
    with open(NOTES_FILE, 'w', encoding='utf-8') as f:
        for n in notes:
            title = str(n.get("title", "")).replace("|", "-")
            content = str(n.get("content", "")).replace("\r\n", "\\n").replace("\n", "\\n")
            f.write(f"{n['id']}|{title}|{content}\n")

class RequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/notes':
            notes = read_notes()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(notes).encode('utf-8'))
            return
        
        # Static files
        if parsed.path == '/':
            self.path = '/index.html'
        return super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == '/api/notes':
            length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(length)
            try:
                data = json.loads(body_data.decode('utf-8'))
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

            notes = read_notes()
            max_id = max([n["id"] for n in notes], default=0)
            new_note = {
                "id": max_id + 1,
                "title": data.get("title", "Untitled"),
                "content": data.get("content", "")
            }
            notes.append(new_note)
            write_notes(notes)

            self.send_response(201)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(new_note).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_PUT(self):
        parsed = urllib.parse.urlparse(self.path)
        match = re.match(r'^/api/notes/(\d+)$', parsed.path)
        if match:
            target_id = int(match.group(1))
            length = int(self.headers.get('Content-Length', 0))
            body_data = self.rfile.read(length)
            try:
                data = json.loads(body_data.decode('utf-8'))
            except Exception:
                self.send_response(400)
                self.end_headers()
                return

            notes = read_notes()
            found = False
            updated = None
            for idx, n in enumerate(notes):
                if n["id"] == target_id:
                    if "title" in data:
                        n["title"] = data["title"]
                    if "content" in data:
                        n["content"] = data["content"]
                    found = True
                    updated = n
                    break

            if not found:
                self.send_response(404)
                self.end_headers()
                return

            write_notes(notes)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps(updated).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urllib.parse.urlparse(self.path)
        match = re.match(r'^/api/notes/(\d+)$', parsed.path)
        if match:
            target_id = int(match.group(1))
            notes = read_notes()
            new_notes = [n for n in notes if n["id"] != target_id]
            if len(new_notes) == len(notes):
                self.send_response(404)
                self.end_headers()
                return
            write_notes(new_notes)
            self.send_response(200)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(json.dumps({"success": True, "deletedId": target_id}).encode('utf-8'))
            return

        self.send_response(404)
        self.end_headers()

if __name__ == '__main__':
    ensure_notes_file()
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    server = http.server.ThreadingHTTPServer(('127.0.0.1', PORT), RequestHandler)
    print("=" * 52)
    print("  Notes Saver UI (Master-Detail View) is Running!  ")
    print(f"  URL: http://localhost:{PORT}")
    print(f"  Backing file: {NOTES_FILE}")
    print("=" * 52)
    server.serve_forever()
