require('dotenv').config();

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT || 3000);
const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
const ROOT_DIR = __dirname;
const PORT_CANDIDATES = [PORT, PORT + 1, PORT + 2, PORT + 3, PORT + 4, PORT + 5];

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, content, contentType = 'text/plain; charset=utf-8') {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(content);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e6) {
        req.destroy();
        reject(new Error('Request body too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function serveStatic(res, reqPath) {
  const safePath = path.normalize(reqPath).replace(/^([.]{1,2}[\\/])+/g, '');
  const absolutePath = path.join(ROOT_DIR, safePath);

  if (!absolutePath.startsWith(ROOT_DIR)) {
    sendText(res, 403, 'Forbidden');
    return;
  }

  fs.readFile(absolutePath, (error, data) => {
    if (error) {
      sendText(res, 404, 'Not found');
      return;
    }
    sendText(res, 200, data, getMimeType(absolutePath));
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === 'POST' && url.pathname === '/api/chat') {
    try {
      const body = await readBody(req);
      const userText = body.message || '';

      if (!userText.trim()) {
        sendJson(res, 400, { reply: 'Please ask me something about global politics.' });
        return;
      }

      if (!GROQ_API_KEY) {
        sendJson(res, 200, {
          reply: 'I’m running in local demo mode right now, so I can still chat about global politics with a quick, tea-sipping reply.'
        });
        return;
      }

      const upstreamRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${GROQ_API_KEY}`
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are Ms. Diplomatt, a pixel-style Gen Z diplomat in a café. Give short, spicy, Gen Z-style answers about global politics like you are gossiping over tea with your bestie. Keep it under 3 sentences.'
            },
            { role: 'user', content: userText }
          ]
        })
      });

      if (!upstreamRes.ok) {
        const errorText = await upstreamRes.text();
        throw new Error(`Groq API returned ${upstreamRes.status}: ${errorText}`);
      }

      const data = await upstreamRes.json();
      const reply = data?.choices?.[0]?.message?.content?.trim() || 'I’m still brewing that tea.';
      sendJson(res, 200, { reply });
    } catch (error) {
      console.error(error);
      sendJson(res, 200, {
        reply: 'The tea kettle hiccupped, so I’m serving a backup reply instead. Try again in a moment.'
      });
    }
    return;
  }

  if (req.method === 'GET' && url.pathname === '/') {
    serveStatic(res, '/index.html');
    return;
  }

  if (req.method === 'GET') {
    serveStatic(res, url.pathname);
    return;
  }

  sendText(res, 404, 'Not found');
});

function startServer(atIndex = 0) {
  const selectedPort = PORT_CANDIDATES[atIndex];
  server.once('error', (error) => {
    if (error.code === 'EADDRINUSE' && atIndex < PORT_CANDIDATES.length - 1) {
      console.warn(`Port ${selectedPort} is busy, trying ${PORT_CANDIDATES[atIndex + 1]}...`);
      startServer(atIndex + 1);
      return;
    }
    throw error;
  });

  server.listen(selectedPort, '127.0.0.1', () => {
    console.log(`Geopolitea server running at http://127.0.0.1:${selectedPort}`);
  });
}

startServer();
