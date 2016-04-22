//http://html5doctor.com/drag-and-drop-to-server/
//http://www.html5rocks.com/en/tutorials/file/dndfiles/
var doc        = document.documentElement;


var dndSupported = function () {
  var div = document.createElement('div');
  return ('draggable' in div) || ('ondragstart' in div && 'ondrop' in div);
};




document.addEventListener("DOMContentLoaded", function(event) {
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
    
    document.getElementById('fileinput').addEventListener('change', function(){
      for(var i = 0; i<this.files.length; i++){
            var file =  this.files[i];
            // This code is only for demo ...
            console.group("File "+i);
            console.log("name : " + file.name);
            console.log("size : " + file.size);
            console.log("type : " + file.type);
            console.log("date : " + file.lastModified);
            console.groupEnd();
        }
      parse_files(this.files);
    }, false);
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
});