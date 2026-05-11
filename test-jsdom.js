const fs = require('fs');
const { JSDOM } = require('jsdom');
const html = fs.readFileSync('/Users/mustafa/Documents/vs-code/pseudoconverter/public/nextwork-directory.html', 'utf8');
const dom = new JSDOM(html, { runScripts: "dangerously", url: "http://localhost:3000/nextwork-directory.html" });
dom.window.console.log = (msg) => console.log('LOG:', msg);
dom.window.console.error = (msg) => console.error('ERROR:', msg);
dom.window.addEventListener('error', (e) => console.error('PAGE ERROR:', e.error || e.message));
setTimeout(() => console.log('Done'), 1000);
