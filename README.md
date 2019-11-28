# osx-say-api
Used to get Mac OS speech over HTTP.

# Usage
`GET /?password=...&text=...&voice=...`

If the status is OK, this will reply with an MP3 file.

If voice is left out, it will default to **Alex**.

The password must match the one found in config.json.

# config.json
You need to create this file yourself.
```js
{
  // Port to listen on
  "port": 8090,
  // Password argument that all requests must match
  "password": "yerbamateisgood",
  // Whether to do HTTPS over HTTP
  "https": true,
  // Directory of letsencrypt certificates
  "certDirectory": "/etc/letsencrypt/live/.../",
  // MP3 output bitrate (kbit/s)
  "bitrate": 64
}
```