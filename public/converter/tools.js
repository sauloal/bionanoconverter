function create_file(filename, ext, text) {
  var file  = new File([text], filename +'.'+ext, {type: "text/plain", lastModified: Date()});
  
  var fr    = new FileReader();
  
  fr.onload = function(evt){
    console.log(file.name            );
    console.log(file.type            );
    console.log(file.lastModifiedDate);
    //document.body.innerHTML = evt.target.result + "<br><a href="+URL.createObjectURL(file)+" download=" + file.name + ">Download " + file.name + "</a><br>type: "+file.type+"<br>last modified: "+ file.lastModifiedDate
    //document.body.appendChild( document.createElement("br") );
    
    var span = document.getElementById(filename);

    if (! span) {
      var br          = document.createElement("br");
      span            = document.createElement("span");
      span.id         = filename;
      span.innerHTML += filename + " : ";
      document.body.appendChild( br   );
      document.body.appendChild( span );
    }
    
    span.innerHTML += " <a href="+URL.createObjectURL(file)+" download=" + file.name + ">" + ext + "</a>";
  }
  
  fr.readAsText(file);
}


function parse_files(files) {
  var parse = new bionano_parser();
  for ( var filenum = 0, file; file = files[filenum]; filenum++ ) {
    //if ( filenum == files.length ) { break };
    
    console.log('file'              , filenum                , file);
    console.log('lastModified'      , file.lastModified            );
    console.log('lastModifiedDate'  , file.lastModifiedDate        );
    console.log('name'              , file.name                    );
    console.log('size'              , file.size                    );
    console.log('type'              , file.type                    );
    console.log('webkitRelativePath', file.webkitRelativePath      );
    
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
}

