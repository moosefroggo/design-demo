const fs = require('fs');
console.log(fs.readFileSync('test-screenshot-after-click.png', 'base64').substring(0, 100));
