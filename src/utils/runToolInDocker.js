var fs = require('fs'),
    path = require('path'),
    exec = require('child_process').exec,
    outputDir = __dirname,
    config,
    commands,
    free = true,
    normalOutput = '',
    errorOutput = '',
    timerId = null;

function finishExecution() {
    fs.writeFileSync(path.join(outputDir, 'output.normal.log'), normalOutput, 'utf8');
    fs.writeFileSync(path.join(outputDir, 'output.error.log'), errorOutput, 'utf8');
    process.exit(0);
}

function executeCommand(command) {
    command = command.replace(/\$dir/g, __dirname);
    exec(command, {maxBuffer: 2048 * 1024}, function (err, stdout, stderr) {
        normalOutput += '\n' + (stdout || 'no output for command [' + command + ']') + '\n';
        errorOutput += '\n' + (stderr || 'no output for command [' + command + ']') + '\n';
        if (err) {
            clearInterval(timerId);
            errorOutput += '\nexecution failed at command [' + command + ']\n';
            errorOutput += '\nError:\n' + err;
            errorOutput += '\nErrorStackTrace:\n' + err.stack;
            finishExecution();
        }

        free = true;
    });
}

config = JSON.parse(fs.readFileSync(path.join(__dirname, 'options.cfg'), 'utf8'));
commands = config.commands || [];

timerId = setInterval(function () {
    if (free) {
        if (commands.length > 0) {
            free = false;
            executeCommand(commands.shift());
        } else {
            clearInterval(timerId);
            finishExecution();
        }

    }
}, 100);

