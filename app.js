const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https');
const express = require('express');
const rateLimit = require('express-rate-limit');
const uniqueString = require('unique-string');
const Lame = require('node-lame').Lame;

const app = express();

app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
}));

app.use((req, res) => {
  if (req.query.password !== config.password)
    return res.status(401).end('Invalid password argument');
  if (!req.query.text)
    return res.status(400).end('Missing text argument');
  if (!req.query.voice)
    req.query.voice = 'Alex';

  const id = uniqueString();
  const tempFile = path.join(__dirname, 'sounds', id + '.wav');

  const command = `say -v ${JSON.stringify(req.query.voice)} -o ${JSON.stringify(tempFile)} --data-format=LEF32@28400 ${JSON.stringify(req.query.text)}`;
  console.log(command);
  exec(command, async (error, stdout, stderr) => {
    if (error) {
      res.status(500).end('Could not generate speech file');
      return;
    }

    const encoder = new Lame({
      output: 'buffer',
      bitrate: config.bitrate
    }).setFile(tempFile);

    await encoder.encode();

    res.set('Content-Type', 'audio/mpeg');
    res.end(encoder.getBuffer());

    fs.unlink(tempFile, err => {
      if (err) {
        console.error(err);
      } else {
        console.log('File deleted');
      }
    });
  });
});

if (config.https) {
  https.createServer({
    key: fs.readFileSync(path.join(config.certDirectory, 'privkey.pem')),
    cert: fs.readFileSync(path.join(config.certDirectory, 'fullchain.pem'))
  }, app).listen(config.port, () => {
    console.log(`HTTPS listening on port ${config.port}`);
  });
} else {
  app.listen(config.port, () => {
    console.log(`HTTP listening on port ${config.port}`);
  });
}