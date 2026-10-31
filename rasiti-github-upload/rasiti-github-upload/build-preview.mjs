// Builds a single-file preview (offline demo mode) for hosts that only accept one HTML file.
import { readFile, writeFile } from 'node:fs/promises';
const html = await readFile('public/index.html', 'utf8');
const css = await readFile('public/vendor/leaflet.css', 'utf8');
const app = await readFile('public/app.js', 'utf8');
const bg = (await readFile('public/img/login-bg.jpg')).toString('base64');
const logo = 'data:image/png;base64,' + (await readFile('public/img/bohlale-96.png')).toString('base64');
const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'))
  .replace(/<meta charset[^>]*>\n?/, '').replace(/<meta name="viewport"[^>]*>\n?/, '')
  .replace(/<link rel="icon"[^>]*>\n?/, '')
  .replace('<link rel="stylesheet" href="vendor/leaflet.css">', `<style>${css}</style>`)
  .replace('url("img/login-bg.jpg")', `url("data:image/jpeg;base64,${bg}")`);
const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>')).replaceAll('img/bohlale-96.png', logo)
  .replace('<script src="vendor/leaflet.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js"></script>')
  .replace('<script src="app.js"></script>', () => `<script>${app.replace("'img/bohlale-96.png'", `'${logo}'`).replace("'vendor/jspdf.umd.min.js'", "'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js'")}</script>`);
await writeFile(process.argv[2] || 'preview.html', `<meta name="claude:viewport-fit-sides" content="cover">\n${head}\n${body}`);
console.log('preview written');
