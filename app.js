const config = require('./config.json');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { exec } = require('child_process');
const https = require('https');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { Lame } = require('node-lame');
const fileExists = require('file-exists');
const morgan = require('morgan');

const app = express();

const validBitrates = [8, 16, 24, 32, 40, 48, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];

app.use(rateLimit({
	windowMs: 15 * 60 * 1000,
	max: 100
}));

app.use(morgan('short'));

const sanitize = str => str.replace(/\$/g, '\\$').replace(/"/g, '\\"');

app.use(async (req, res) => {
	if (req.query.password !== config.password)
		return res.status(401).end('Invalid password argument');
	if (!req.query.text)
		return res.status(400).end('Missing text argument');
	if (!req.query.voice)
		req.query.voice = 'Alex';

	const bitrate = Number(req.query.bitrate || config.bitrate);
	if (!validBitrates.includes(bitrate))
		return res.status(400).end('Invalid bitrate ' + bitrate);

	const hash = crypto.createHash('sha256').update(`${bitrate};${req.query.voice};${req.query.text}`).digest('hex');
	const mp3File = path.join(__dirname, 'sounds', hash + '.mp3');

	if (await fileExists(mp3File)) {
		console.log('Sending cached voice');
		res.sendFile(mp3File, err => {
			if (err) {
				console.log('Could not send MP3');
			}
		});
		return;
	}

	const wavFile = path.join(__dirname, 'sounds', hash + '.wav');

	const command = `say -v "${sanitize(req.query.voice)}" -o "${wavFile}" --data-format=LEF32@28400 "${sanitize(req.query.text)}"`;
	exec(command, async error => {
		if (error) {
			res.status(500).end('Could not generate speech file');
			console.log('Say failed');
			return;
		}

		try {
			const encoder = new Lame({
				output: mp3File,
				bitrate: bitrate
			}).setFile(wavFile);

			console.log('Encoding...');
			await encoder.encode();
		} catch (err) {
			console.log('Lame failed');
			fs.unlink(wavFile, () => {
				res.status(500).end('Could not encode speech file');
			});
			return;
		}

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