const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const https = require('https');
const express = require('express');
const rateLimit = require('express-rate-limit');
const uniqueString = require('unique-string');
const { Lame } = require('node-lame');

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
  const wavFile = path.join(__dirname, 'sounds', id + '.wav');
  const mp3File = path.join(__dirname, 'sounds', id + '.mp3');

  const command = `say -v ${JSON.stringify(req.query.voice)} -o ${JSON.stringify(wavFile)} --data-format=LEF32@28400 "${req.query.text.replace('$', '\\$').replace('"', '\"')}"`;
  console.log('\t' + command);
  exec(command, async (error, stdout, stderr) => {
    if (error) {
      res.status(500).end('Could not generate speech file');
      console.log('Say failed');
      return;
    }

    const encoder = new Lame({
      output: mp3File,
      bitrate: config.bitrate
    }).setFile(wavFile);

    console.log('Encoding...');

    await encoder.encode();

    console.log('Sending...');

    res.set('Content-Type', 'audio/mpeg');
    res.sendFile(mp3File, err => {
      if (err) {
        console.log('Could not send MP3');
      }

      console.log('Deleting files...');
  
      fs.unlink(wavFile, err => {
        if (err) {
          console.error(err);
        } else {
          console.log('Deleted wav');
        }
      });

      fs.unlink(mp3File, err => {
        if (err) {
          console.error(err);
        } else {
          console.log('Deleted mp3');
        }
      });
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