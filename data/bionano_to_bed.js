var fs = require('fs');

var FileAPI = require('file-api')
  , File = FileAPI.File
  , FileList = FileAPI.FileList
  , FileReader = FileAPI.FileReader
  ;







// ES5 does not have endsWith
if (!String.prototype.endsWith) {
  String.prototype.endsWith = function(searchString, position) {
      var subjectString = this.toString();
      if (typeof position !== 'number' || !isFinite(position) || Math.floor(position) !== position || position > subjectString.length) {
        position = subjectString.length;
      }
      position -= searchString.length;
      var lastIndex = subjectString.indexOf(searchString, position);
      return lastIndex !== -1 && lastIndex === position;
  };
}




// add libraries
eval(fs.readFileSync('../public/converter/bionano_parser.js')+'');
//eval(fs.readFileSync('../public/converter/tools.js')+'');







function create_file(filename, ext, text) {
  var of = filename+'.'+ext;
  
  fs.writeFile(of, text, function(err) {
      console.log("Saving", of);
      
      if(err) {
        return console.log(err);
      }
      
      return;
  }); 
}






//parse
var parse = new bionano_parser();

//console.log('parse', parse);


console.log('abc'.endsWith('c'));

var files = [
  "exp/exp_refineFinal1_merged_q.cmap",
  "exp/exp_refineFinal1_merged_r.cmap",
  "exp/exp_refineFinal1_merged.smap",
  "exp/exp_refineFinal1_merged.xmap",
  "exp/s_lycopersicum_chromosomes.2.50_knicked_key.txt"
];

for (var f=0; f<files.length; f++) {
  files[f] = new File({path: files[f], name: files[f]});
}

//var files = new FileList("exp_refineFinal1_merged.xmap");
console.log('files',files);


for ( var filenum = 0, file; file = files[filenum]; filenum++ ) {
    //if ( filenum == files.length ) { break };
    
    file.name = String(file.name) + '';
    
    console.log('file'              , filenum                , file);
    console.log('lastModified'      , file.lastModified            );
    console.log('lastModifiedDate'  , file.lastModifiedDate        );
    console.log('name'              , file.name                    );
    console.log('size'              , file.size                    );
    console.log('type'              , file.type                    );
    console.log('webkitRelativePath', file.webkitRelativePath      );
    
    console.log(file.name);
    console.log(typeof(file.name));
    console.log(file.name.endsWith('txt'));
    
    parse.add_file(file);
}
  
var clbk = function() {
  /*
  var clbk2 = function (filename, text) {
    create_file(filename, text);
  }
  parse.report(parse, clbk2);
  */
  parse.report(parse, create_file);
}

parse.parse(clbk);
