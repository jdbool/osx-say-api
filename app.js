const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const send = require('send');
const uniqueString = require('unique-string');

const soundPath = id => path.join(__dirname, 'sounds', id + '.aiff');

const app = express();

app.get('/', (req, res) => {
  if (req.query.password !== config.password)
    return res.status(401).end('Invalid password argument');
  if (!req.query.text)
    return res.status(400).end('Missing text argument');
  if (!req.query.voice)
    req.query.voice = 'Alex';

  const id = uniqueString();
  const tempFile = soundPath(id);
  
  const command = `say -v ${JSON.stringify(req.query.voice)} -o ${JSON.stringify(tempFile)} ${JSON.stringify(req.query.text)}`;
  console.log(command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).end('Could not generate speech file');
      return;
    }

    try {
      send(req, tempFile).pipe(res);
    } catch (err) {
      res.status(500).end('Could not send file');
    }

    fs.unlink(tempFile);
  });
});

app.use((req, res) => {
  res.status(404).end('Not found');
});

app.listen(config.port, () => {
  console.log(`HTTP listening on port ${config.port}`);
});