/**
 * npm run deploy -- mode=product env=sde dir=html msg=修改
 */
var spawn = require('child_process').spawn;
var os = require('os');
var path = require('path');
var config = require('./config');
var slice = Array.prototype.slice;
var argv = {};
slice.call(process.argv, 2).forEach(function (item) {
    var arr = item.split('=');
    if (arr.length == 2 && arr[0] && arr[1]) {
        argv[arr[0]] = arr[1];
    }
});

['module', 'mode', 'env', 'dir', 'msg'].forEach(function (v) {
    if (!argv[v]) {
        console.error('Missing parameters:' + v + ', call 18610031062.');
        process.exit(0);
    }
});
var platform = os.platform(), command;

if (platform == 'darwin' || platform == "linux") {
    command = path.join(__dirname, 'deploy.sh');
}
else if (platform == 'win32' || platform == 'win64') {
    command = path.join(__dirname, 'deploy.bat');
}
else {
    console.error('Not support～');
    return false;
}
var child = spawn(command, [argv.module, argv.mode, config[argv.env], argv.dir, argv.msg]);
child.stdout.on('data', function (data) {
    console.log(data.toString().replace(/\n$/, ''));
});
child.stderr.on('data', function (data) {
    console.log(data.toString().replace(/\n$/, ''));
});
child.on('close', function () {
    process.exit(0);
});