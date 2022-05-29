// Write a script that looks through all sub folders of the current folder and copies all files with the name confirmation.pdf to a directory.

var fs = require('fs');
var path = require('path');

var currentDir = process.argv[2];
var targetDir = process.argv[3];

let count = 0;

fs.readdir(currentDir, function (err, files) {
    if (err) {
        console.log(err);
    } else {
        files.forEach(function (file) {
            var filePath = path.join(currentDir, file);
            fs.stat(filePath, function (err, stats) {
                if (err) {
                    console.log(err);
                } else {
                    if (stats.isDirectory()) {
                        copyFiles(filePath, targetDir);
                    }
                }
            });
        });
    }
});

function copyFiles(currentDir, targetDir) {
    fs.readdir(currentDir, function (err, files) {
        if (err) {
            console.log(err);
        } else {
            files.forEach(function (file) {
                var filePath = path.join(currentDir, file);
                fs.stat(filePath, function (err, stats) {
                    if (err) {
                        console.log(err);
                    } else {
                        if (stats.isFile()) {
                            if (file === 'confirmation.pdf') {
                                count++;
                                var filename = path.parse(path.basename(filePath)).name + '-' + count + '.pdf';
                                var targetFile = path.join(targetDir, filename);
                                fs.createReadStream(filePath).pipe(fs.createWriteStream(targetFile));
                            }
                        }
                    }
                });
            });
        }
    });
}
