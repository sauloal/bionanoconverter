//http://html5doctor.com/drag-and-drop-to-server/
//http://www.html5rocks.com/en/tutorials/file/dndfiles/
var doc        = document.documentElement;


var dndSupported = function () {
  var div = document.createElement('div');
  return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
};


function create_file(filename, text) {
  var file = new File([text], filename, {type: "text/plain", lastModified: Date()});
  
  var fr    = new FileReader();
  
  fr.onload = function(evt){
    console.log(file.name            );
    console.log(file.type            );
    console.log(file.lastModifiedDate);
     //document.body.innerHTML = evt.target.result + "<br><a href="+URL.createObjectURL(file)+" download=" + file.name + ">Download " + file.name + "</a><br>type: "+file.type+"<br>last modified: "+ file.lastModifiedDate
     //document.body.appendChild( document.createElement("br") );
     var span = document.createElement("span");
     document.body.appendChild( span );
     span.innerHTML = "<br><a href="+URL.createObjectURL(file)+" download=" + file.name + ">Download " + file.name + "</a>";
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
    parse.report(create_file);
  }
  
  parse.parse(clbk);
}




if (dndSupported() && window.File && window.FileReader && window.FileList && window.Blob) {
  console.warn('drag and drop is supported');
  
  doc.ondragover = function () { 
    this.className = 'hover'; 
    //console.log('drag start');
    return false; 
  };
  
  doc.ondragend  = function () {
    this.className = ''     ; 
    console.log('drag end');
    return false; 
  };
  
  doc.ondrop     = function (event) {
    event.preventDefault && event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';          // Explicitly show this is a copy.;
    
    this.className = '';
    
    console.log('dropped');
    // now do something with:
    var files = event.dataTransfer.files;
    console.log('files',files);
    
    parse_files(files);
    
    return false;
  };
} else {
  console.warn('drag and drop not supported');
  // take alternative route
  /*
  document.getElementById('upload').onchange = function (event) {
    // `this` refers to the element the event fired upon
    var files = this.files;
  };
  */
}