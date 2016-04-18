//var exports  = module.exports = {};
var fs       = require('fs');
var readline = require('readline');

function gen_size(filename, cb) {
    console.log("filename", filename);

    var lineReader = readline.createInterface({
        terminal: false,
        input: fs.createReadStream(filename)
    });

    var stats = [];

    lineReader.on('line', function (line) {
        //console.log('Line from file:', line);

        if (line.length >0){
            if (line[0] == ">") {
                console.log("HEADER", line);

                var names    = line.split(/[ ,\|]/g);
                var name     = names[0].substr(1);
                
                //console.log("NAMES ", names);
                console.log("NAME  '"+name +"'");

                stats.push([name, 0]);

                //console.log(stats);

            } else {
                //console.log("SEQ   ", line);
                stats[stats.length-1][1] += line.length;
            }
        }
    });

    lineReader.on('close', function() { cb(stats); });
}

//node -e 'var gs = require("./gen_sizes.js"); gs("../data/S_lycopersicum_chromosomes.2.50.fa",function(stats){console.log("stats",stats);});'

module.exports = gen_size;
