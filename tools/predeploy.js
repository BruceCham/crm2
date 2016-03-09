var fs = require('fs');
var cwd = __dirname;
if (!fs.existsSync(cwd + '/config.js')) {
    fs.writeFileSync(cwd + '/config.js', fs.readFileSync(cwd + '/config.js.example'));
}