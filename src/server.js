const path = require('path');
const express = require('express');
const { nanoid } = require('nanoid');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const PORT = process.env.PORT || 3000;
const CODE_LENGTH = 7;

function isValidUrl(value) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// Create a short link
app.post('/api/shorten', (req, res) => {
  const { url, code } = req.body || {};

  if (typeof url !== 'string' || !isValidUrl(url)) {
    return res.status(400).json({ error: 'A valid http(s) "url" is required.' });
  }

  let shortCode = code;
  if (shortCode !== undefined) {
    if (typeof shortCode !== 'string' || !/^[A-Za-z0-9_-]{3,32}$/.test(shortCode)) {
      return res.status(400).json({
        error: 'Custom "code" must be 3-32 chars, alphanumeric/underscore/hyphen.',
      });
    }
    const existing = db.prepare('SELECT code FROM links WHERE code = ?').get(shortCode);
    if (existing) {
      return res.status(409).json({ error: `Code "${shortCode}" is already taken.` });
    }
  } else {
    do {
      shortCode = nanoid(CODE_LENGTH);
    } while (db.prepare('SELECT code FROM links WHERE code = ?').get(shortCode));
  }

  db.prepare('INSERT INTO links (code, url) VALUES (?, ?)').run(shortCode, url);

  const row = db.prepare('SELECT code, url, clicks, created_at FROM links WHERE code = ?').get(shortCode);
  res.status(201).json({
    code: row.code,
    url: row.url,
    shortUrl: `${req.protocol}://${req.get('host')}/${row.code}`,
    createdAt: row.created_at,
  });
});

// List all links, newest first
app.get('/api/links', (req, res) => {
  const rows = db
    .prepare('SELECT code, url, clicks, created_at FROM links ORDER BY created_at DESC, code DESC LIMIT 200')
    .all();
  res.json(
    rows.map((row) => ({
      code: row.code,
      url: row.url,
      clicks: row.clicks,
      createdAt: row.created_at,
      shortUrl: `${req.protocol}://${req.get('host')}/${row.code}`,
    }))
  );
});

// Stats for a short link
app.get('/api/stats/:code', (req, res) => {
  const row = db.prepare('SELECT code, url, clicks, created_at FROM links WHERE code = ?').get(req.params.code);
  if (!row) {
    return res.status(404).json({ error: 'Short code not found.' });
  }
  res.json({
    code: row.code,
    url: row.url,
    clicks: row.clicks,
    createdAt: row.created_at,
  });
});

// Redirect to the original URL
app.get('/:code', (req, res) => {
  const row = db.prepare('SELECT url FROM links WHERE code = ?').get(req.params.code);
  if (!row) {
    return res.status(404).json({ error: 'Short code not found.' });
  }
  db.prepare('UPDATE links SET clicks = clicks + 1 WHERE code = ?').run(req.params.code);
  res.redirect(302, row.url);
});

app.listen(PORT, () => {
  console.log(`URL shortener API listening on http://localhost:${PORT}`);
});
