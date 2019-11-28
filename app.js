const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process');
const express = require('express');
const uniqueString = require('unique-string');

const soundPath = id => path.join(__dirname, 'sounds', id + '.wav');

const app = express();

app.use((req, res) => {
  if (req.query.password !== config.password)
    return res.status(401).end('Invalid password argument');
  if (!req.query.text)
    return res.status(400).end('Missing text argument');
  if (!req.query.voice)
    req.query.voice = 'Alex';

  const id = uniqueString();
  const tempFile = soundPath(id);
  
  const command = `say -v ${JSON.stringify(req.query.voice)} -o ${JSON.stringify(tempFile)} --data-format=LEF32@28400 ${JSON.stringify(req.query.text)}`;
  console.log(command);
  exec(command, (error, stdout, stderr) => {
    if (error) {
      res.status(500).end('Could not generate speech file');
      return;
    }

    res.sendFile(tempFile, err => {
      if (err) {
        res.status(500).end('Could not send file');
      }
      fs.unlink(tempFile, err => {
        if (err) {
          console.error(err);
        } else {
          console.log('File deleted');
        }
      });
    });
  });
});

app.listen(config.port, () => {
  console.log(`HTTP listening on port ${config.port}`);
});