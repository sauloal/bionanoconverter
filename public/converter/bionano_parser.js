//http://stackoverflow.com/questions/15313418/javascript-assert
function assert(condition, message) {
    if (!condition) {
        message = message || "Assertion failed";
        if (typeof Error !== "undefined") {
            throw new Error(message);
        }
        throw message; // Fallback
    }
}

var bionano_parser = function() {
  this.files              = {};
  this.data               = {};
  this.acceptedExtensions = {
    'txt'    : 'key_file',
    '_r.cmap': 'r_cmap'  ,
    '_q.cmap': 'q_cmap'  ,
    'xmap'   : 'xmap'    ,
    //'smap'   : 'smap'    ,
  };
}

bionano_parser.prototype.add_file = function(file) {
  console.log('adding file', file);

  for ( var ext in this.acceptedExtensions ) {
    if ( file.name.endsWith(ext) ) {
      console.log('ext', ext, 'OK');
      this.files[this.acceptedExtensions[ext]] = file;
      break;
    }
    console.log('ext', ext, 'NO');
  }
}


bionano_parser.prototype.read_file      = function(file, clbk) {
  /*
  //http://www.html5rocks.com/en/tutorials/file/dndfiles/
  var reader = new FileReader();

  onloadstart
  onprogress
  reader.onload = function (event) {}
  onloadend 
  onabort
  onerror

  reader.readAsText(file);
  */
  var reader = new FileReader();
  reader.onload = function (event) {
    //console.log('read:', event);
    clbk(reader.result);
  }
  reader.readAsText(file);
}


bionano_parser.prototype.parse_header   = function(ldata) {
  var header_names = ldata['header'][ldata['header'].length-2].substring(3).split(/\s+/);
  var header_types = ldata['header'][ldata['header'].length-1].substring(3).split(/\s+/);
  
  console.log('header_names', header_names.length, header_names);
  console.log('header_types', header_types.length, header_types);
  
  for ( var l in header_types ) {
    var ht = header_types[l];
    //console.log('l', ht);
    if ( ht == 'int' ) {
      header_types[l] = parseInt;
    } else if ( ht == 'float' ) {
      header_types[l] = parseFloat;
    } else if ( ht == 'string' ) {
      header_types[l] = function (f) {return f};
    }
  }

  ldata['col_names'   ] = header_names;
  ldata['header_types'] = header_types;
  
  function get_val(key, cols) {
    var p = header_names.indexOf(key);
    if ( p == -1 ) {
      assert(false, "no such column: "+key+" "+header_names);
      return false;
    } else {
      return header_types[p](cols[p]);
    }
  }
  
  return get_val;
}







bionano_parser.prototype.parse          = function(clbk) {
  if (!( 'key_file' in this.files && 'r_cmap' in this.files && 'q_cmap' in this.files && 'xmap' in this.files )) {
    console.error('needs key file, r_cmap, q_cmap and xmap');
  } else {
    var self = this;
    self.parse_key_file( self, function() {
      self.parse_r_cmap( self, function() {
        self.parse_q_cmap( self, function() {
          self.parse_xmap( self, function() {
            if ( 'smap' in self.files ) {
              self.parse_smap(self, function(s) { clbk(s); } );
            } else {
              clbk(self);
            }
          });
        });
      });
    });
  }
}


bionano_parser.prototype.parse_key_file = function(self, clbk) { 
  var file = self.files['key_file'];
  console.log('parse_key_file', file.name);
  /*
  # CMAP = D:\Bionano-references\S_lycopersicum_chromosomes.2.50.fa\S_lycopersicum_chromosomes.2.50_knicked
  # filter: Minimum Labels = 5
  # filter: Minimum Size (Kb) = 20
  CompntId    CompntName  CompntLength
  1   SL2.50ch00  21805821
  2   SL2.50ch01  98543444
  3   SL2.50ch02  55340444
  4   SL2.50ch03  70787664
  5   SL2.50ch04  66470942
  */
  self.read_file(file, function (text) {
    self.data['key_file'] = { 
      'header'    : [],
      'data'      : {},
      'total_size': 0
     };
    
    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var rows = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    for ( var linenum = 0, line; line = rows[linenum]; linenum++ ) {
      //console.log(linenum, line);
      if ( line.length > 0 ) {
        if ( line[0] == "#" ) { // header
          self.data['key_file']['header'].push(line);
          
        } else { //data
          datanum++;
          if ( datanum == 1 ) { // col names
            var dfl = "CompntId\tCompntName\tCompntLength";
            var hdl = line;
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
          
          } else {
            var cols = line.split(/\s+/);
            //console.log("cols", cols);
            var chrid   = parseInt(cols[0]);
            var chrsize = parseInt(cols[2]);
            self.data['key_file']['data'      ][chrid]  = [ cols[1], chrsize ];
            self.data['key_file']['total_size']        +=   chrsize;
          }
        }
      }
    }
    console.log('parse_key_file', file.name, 'parsed', self.data['key_file']);
    assert(self.data['key_file']['data'].length != 0);
    clbk();
  });
}


bionano_parser.prototype.add_cmap       = function(self, key, cols, get_val, ldata) {
  var chrid   = get_val('CMapId'      , cols);
  var chrpos  = get_val('LabelChannel', cols);
  var chrsize = get_val('ContigLength', cols);
  
  if (! (chrid in ldata['data'      ])) {
    if (key == "r_cmap") {

      /*
      console.log("self.data               "           , self.data);
      console.log("self.data.key_file      "           , self.data['key_file']);
      console.log("self.data.key_file.data "           , self.data['key_file']['data']);
      console.log("self.data.key_file.data."+chrid     , self.data['key_file']['data'][chrid]);
      console.log("self.data.key_file.data."+chrid+".1", self.data['key_file']['data'][chrid][1]);
      */
      
      assert(chrsize == self.data['key_file']['data'][chrid][1], 'chromosome size mismatch');
    }
    
    ldata['data'      ][chrid] = [];
    ldata['chr_size'  ][chrid] = chrsize;
    ldata['chr_sites' ][chrid] = 0;
  }


  for (var c in cols) {
    cols[c] = ldata['header_types'][c](cols[c]);
  }
  
  ldata['data'       ][chrid].push(cols);
  ldata['chr_sites'  ][chrid]++;
  ldata['total_sites']++;
}


bionano_parser.prototype.add_xmap       = function(self, key, cols, get_val, ldata) {
  //    0            1            2            3            4          5            6          7            8           9        10      11      12            13
  // #h XmapEntryID\tQryContigID\tRefContigID\tQryStartPos\tQryEndPos\tRefStartPos\tRefEndPos\tOrientation\tConfidence\tHitEnum\tQryLen\tRefLen\tLabelChannel\tAlignment";

  var RefContigID = get_val('RefContigID', cols);
  var RefLen      = get_val('RefLen'     , cols);
  var RefStartPos = get_val('RefStartPos', cols);
  var QryContigID = get_val('QryContigID', cols);
  var QryLen      = get_val('QryLen'     , cols);
  var QryStartPos = get_val('QryStartPos', cols);

  if (! (RefContigID in ldata['data'      ])) {
    assert((RefLen == self.data['r_cmap'  ]['chr_size'][RefContigID]), 'reference chromosome size mismatch. '+RefLen+' != '+self.data['r_cmap'  ]['chr_size'][RefContigID]);
    assert((QryLen == self.data['q_cmap'  ]['chr_size'][QryContigID]), 'target    chromosome size mismatch. '+QryLen+' != '+self.data['q_cmap'  ]['chr_size'][QryContigID]);
    
    ldata['data'      ][RefContigID] = {};
    ldata['chr_sites' ][RefContigID] = {};
    ldata['chr_size'  ][RefContigID] = RefLen;
  }

  if (! (QryContigID in ldata['data'][RefContigID])) {
    ldata['data'      ][RefContigID][QryContigID] = [];
    ldata['chr_sites' ][RefContigID][QryContigID] =  0;
  }
  
  for (var c in cols) {
    cols[c] = ldata['header_types'][c](cols[c]);
  }
  
  ldata['data'       ][RefContigID][QryContigID].push(cols);
  ldata['chr_sites'  ][RefContigID][QryContigID]++;
  ldata['total_sites']++;
}


bionano_parser.prototype.parse_map      = function(self, file, key, dfl, adder, clbk) { 
  self.read_file(file, function (text) {
    self.data[key] = {
      'filename'   : file.name,
      'header'     :        [],
      'data'       :        {},
      'chr_size'   :        {},
      'chr_sites'  :        {},
      'total_sites':         0,
      'col_names'  :        [],
      'nick_sites' :        {},
      'get_val'    :      null
     };

    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var get_val = self.data[key]['get_val'];
    var rows    = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    var ldata   = self.data[key];
    
    for ( var linenum = 0, line; line = rows[linenum]; linenum++ ) {
      //console.log(linenum, line);
      if ( line.length > 0 ) {
        if ( line[0] == "#" ) { // header
          ldata['header'].push(line);
          if ( line.indexOf("Nickase Recognition Site ") > -1 ) {
            console.log('nickase', line);
            var cols = line.split(/\s+/);
            
            var num  = cols[cols.length - 2];
            var seq  = cols[cols.length - 1];
            
            num      = parseInt(num.split(":")[0]);
            
            ldata['nick_sites'][num] = [seq, seq.length];
          }
        } else { //data
          datanum++;
          
          if ( datanum == 1 ) { // col names
            var hdl = ldata['header'][ldata['header'].length-2];
            //console.log(ldata['header']);
            
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
            
            self.data[key]['get_val'] = self.parse_header(ldata);
            get_val = self.data[key]['get_val'];
            
          }
          
          var cols = line.split(/\s+/);
          //console.log("cols", cols);
          
          adder(self, key, cols, get_val, ldata);
        }
      }
    }
    
    console.log('parse_'+key, file.name, 'parsed', ldata);
    assert(ldata['data'].length != 0);
    clbk();
  });
}


bionano_parser.prototype.parse_r_cmap   = function(self, clbk) { 
  var file = self.files['r_cmap'  ];
  console.log('parse_r_cmap'  , file.name); 
  /*
  # CMAP File Version:    0.1
  # Label Channels:   1
  # Nickase Recognition Site 1:   gctcttc
  # Enzyme1:  Nt.BspQI
  # Number of Consensus Nanomaps: 13
  #h CMapId   ContigLength    NumSites    SiteID  LabelChannel    Position    StdDev  Coverage    Occurrence
  #f int  float   int int int float   float   int int
  1   21805821.0  1558    1   1   10672.0 1.0 1   1
  1   21805821.0  1558    2   1   31122.0 1.0 1   1
  */
  var dfl = "#h CMapId\tContigLength\tNumSites\tSiteID\tLabelChannel\tPosition\tStdDev\tCoverage\tOccurrence";
  self.parse_map(self, file, "r_cmap", dfl, self.add_cmap, clbk);
}


bionano_parser.prototype.parse_q_cmap   = function(self, clbk) { 
  var file = self.files['q_cmap'  ];
  console.log('parse_q_cmap'  , file.name); 
  /*
  # hostname=phihost.local.net
  # $ cd /home/bionano/data/Heinz-denovo/hybrids/sv; /home/bionano/tools/RefAligner -i /mnt/scratch/geest008/2015-12-sl3/source/ngs/bsp_QL_S_lycopersicum_chromosomes.2.50.cmap -bed /home/bionano/data/Heinz-denovo/hybrids/sv/gaps_5kplus_SL2.50.bed -maxthreads 4 -i /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_contig35.cmap -o /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_group1 -f -stdout -stderr -output-veto-filter .align$ -sv 3 -FP 0.6 -FN 0.06 -sf 0.20 -sd 0.10 -mres 1e-3 -T 1e-12 -A 8 -biaswt 0 -f -maxmem 4 -readparameters /home/bionano/data/Heinz-denovo/hybrids/sv/alignref/iteration3.errbin
  # CompileDir= /home/users2/wandrews/tools/3995.4287/3995.4287 CompileCmd=g++  -fopenmp -Ofast -fno-associative-math -mavx -mfpmath=sse -DUSE_PFLOAT=1 -DUSE_RFLOAT=1 -DUSE_SSE=1 -I/home/users/tanantharaman/amdlibm-3-0-2/include -DREPLACE_WITH_AMDLIBM -Wpointer-arith  -lrt -L/home/users/tanantharaman/amdlibm-3-0-2/lib/static -lamdlibm   SVNversion=4287 $Header: http://svn.bnm.local:81/svn/Informatics/RefAligner/branches/3995/RefAligner.cpp 4114 2015-09-16 18:45:20Z wandrews $
  # FLAGS: USE_SSE=1 USE_AVX=1 USE_MIC=0 USE_PFLOAT=1 USE_RFLOAT=1 DEBUG=1 VERB=1
  # CMAP File Version:    0.1
  # Label Channels:   1
  # Nickase Recognition Site 1:   gctcttc
  # Number of Consensus Maps: 1
  #h  CMapId ContigLength NumSites SiteID LabelChannel Position  StdDev Coverage Occurrence
  #f  int    float        int      int    int          float     float  float    float
      35     4171773.0    1214     1      1            19.9      105.0  39.9     39.9
      35     4171773.0    1214     2      1            2189.4    143.8  54.9     46.9
      35     4171773.0    1214     1214   1            4171753.2 0.0    0.0      5.0
      35     4171773.0    1214     1215   0            4171773.0 0.0    1.0      1.0
      318    7181753.1    483      1      1            3706.6    461.7  0.0      7.0
      318    7181753.1    483      2      1            14210.9   665.1  0.0      4.0
  */
  var dfl = "#h CMapId\tContigLength\tNumSites\tSiteID\tLabelChannel\tPosition\tStdDev\tCoverage\tOccurrence";
  self.parse_map(self, file, "q_cmap", dfl, self.add_cmap, clbk);
}


bionano_parser.prototype.parse_xmap     = function(self, clbk) { 
  var file = self.files['xmap'    ];
  console.log('parse_xmap'    , file.name); 
  /*
  # hostname=phihost.local.net
  # $ cd /home/bionano/data/Heinz-denovo/hybrids/sv; /home/bionano/tools/RefAligner -i /mnt/scratch/geest008/2015-12-sl3/source/ngs/bsp_QL_S_lycopersicum_chromosomes.2.50.cmap -bed /home/bionano/data/Heinz-denovo/hybrids/sv/gaps_5kplus_SL2.50.bed -maxthreads 4 -i /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_contig35.cmap -o /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_group1 -f -stdout -stderr -output-veto-filter .align$ -sv 3 -FP 0.6 -FN 0.06 -sf 0.20 -sd 0.10 -mres 1e-3 -T 1e-12 -A 8 -biaswt 0 -f -maxmem 4 -readparameters /home/bionano/data/Heinz-denovo/hybrids/sv/alignref/iteration3.errbin
  # CompileDir= /home/users2/wandrews/tools/3995.4287/3995.4287 CompileCmd=g++  -fopenmp -Ofast -fno-associative-math -mavx -mfpmath=sse -DUSE_PFLOAT=1 -DUSE_RFLOAT=1 -DUSE_SSE=1 -I/home/users/tanantharaman/amdlibm-3-0-2/include -DREPLACE_WITH_AMDLIBM -Wpointer-arith  -lrt -L/home/users/tanantharaman/amdlibm-3-0-2/lib/static -lamdlibm   SVNversion=4287 $Header: http://svn.bnm.local:81/svn/Informatics/RefAligner/branches/3995/RefAligner.cpp 4114 2015-09-16 18:45:20Z wandrews $
  # FLAGS: USE_SSE=1 USE_AVX=1 USE_MIC=0 USE_PFLOAT=1 USE_RFLOAT=1 DEBUG=1 VERB=1
  # XMAP File Version:    0.2
  # Label Channels:   1
  # Reference Maps From:  /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged_r.cmap
  # Query Maps From:  /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged_q.cmap
  # Smap Entries From:    /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged_filter_inversions.smap
  #h XmapEntryID  QryContigID RefContigID QryStartPos QryEndPos   RefStartPos RefEndPos   Orientation Confidence  HitEnum QryLen  RefLen  LabelChannel    Alignment
  #f int          int         int         float       float       float       float       string      float       string  float   float   int             string   
  1   35  3   3838447.1   4147006.7   7578.0  319624.0    +   19.57   2M1D4M1I7M1D6M  4171773.0   55340444.0  1   (1,1194)(2,1195)(4,1196)(5,1197)(6,1198)(7,1199)(8,1201)(9,1202)(10,1203)(11,1204)(12,1205)(13,1206)(14,1207)(16,1208)(17,1209)(18,1210)(19,1211)(20,1212)(21,1213)
  */
  
  //            0            1            2            3            4          5            6          7            8           9        10      11      12            13
  var dfl = "#h XmapEntryID\tQryContigID\tRefContigID\tQryStartPos\tQryEndPos\tRefStartPos\tRefEndPos\tOrientation\tConfidence\tHitEnum\tQryLen\tRefLen\tLabelChannel\tAlignment";
  self.parse_map(self, file, "xmap", dfl, self.add_xmap, clbk);
}


bionano_parser.prototype.parse_smap     = function(self, clbk) { 
  var file = self.files['smap'    ];
  console.log('parse_smap'    , file.name);
  /*
  # hostname=phihost.local.net
  # $ cd /home/bionano/data/Heinz-denovo/hybrids/sv; /home/bionano/tools/RefAligner -i /mnt/scratch/geest008/2015-12-sl3/source/ngs/bsp_QL_S_lycopersicum_chromosomes.2.50.cmap -bed /home/bionano/data/Heinz-denovo/hybrids/sv/gaps_5kplus_SL2.50.bed -maxthreads 4 -i /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_contig35.cmap -o /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/exp_refineFinal1_group1 -f -stdout -stderr -output-veto-filter .align$ -sv 3 -FP 0.6 -FN 0.06 -sf 0.20 -sd 0.10 -mres 1e-3 -T 1e-12 -A 8 -biaswt 0 -f -maxmem 4 -readparameters /home/bionano/data/Heinz-denovo/hybrids/sv/alignref/iteration3.errbin
  # CompileDir= /home/users2/wandrews/tools/3995.4287/3995.4287 CompileCmd=g++  -fopenmp -Ofast -fno-associative-math -mavx -mfpmath=sse -DUSE_PFLOAT=1 -DUSE_RFLOAT=1 -DUSE_SSE=1 -I/home/users/tanantharaman/amdlibm-3-0-2/include -DREPLACE_WITH_AMDLIBM -Wpointer-arith  -lrt -L/home/users/tanantharaman/amdlibm-3-0-2/lib/static -lamdlibm   SVNversion=4287 $Header: http://svn.bnm.local:81/svn/Informatics/RefAligner/branches/3995/RefAligner.cpp 4114 2015-09-16 18:45:20Z wandrews $
  # FLAGS: USE_SSE=1 USE_AVX=1 USE_MIC=0 USE_PFLOAT=1 USE_RFLOAT=1 DEBUG=1 VERB=1
  # SMAP File Version:    0.4
  # Reference Maps From:  /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged_r.cmap
  # Query Maps From:  /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged_q.cmap
  # Xmap Entries From:    /home/bionano/data/Heinz-denovo/hybrids/sv/sv_out/merged_smaps/exp_refineFinal1_merged.xmap
  #h SmapEntryID  QryContigID RefcontigID1    RefcontigID2    QryStartPos QryEndPos   RefStartPos RefEndPos   Confidence  Type    XmapID1 XmapID2 LinkID  QryStartIdx QryEndIdx   RefStartIdx RefEndIdx
  #f int          int         int             int             float       float       float       float       float   string  int int int int int int int
  1   35  3   -1  20.0    3838447.1   -1.0    7578.0  -1.00   end -1  1   -1  1   1194    -1  1
  2   318 13  13  5430077.7   6665500.4   17583348.0  24743004.0  -1.00   complex 2   4   -1  368 444 1302    1762
  */
  self.read_file(file, function (text) {
    self.data['smap'] = { 
      'header'    : [],
      'data'      : [],
      'total_size': 0
     };
    
    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var rows = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    for ( var linenum = 0, line; line = rows[linenum]; linenum++ ) {
      //console.log(linenum, line);
      if ( line.length > 0 ) {
        if ( line[0] == "#" ) { // header
          self.data['smap']['header'].push(line);
        } else { //data
          datanum++;
          if ( datanum == 1 ) { // col names
            var dfl = "#h SmapEntryID QryContigID RefcontigID1    RefcontigID2    QryStartPos QryEndPos   RefStartPos RefEndPos   Confidence  Type    XmapID1 XmapID2 LinkID  QryStartIdx QryEndIdx   RefStartIdx RefEndIdx";
            var hdl = self.data['smap']['header'][self.data['smap']['header'].length-2];
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
            self.parse_header(ldata);
            
          } else {
            /*
            var cols = line.split(/\s+/);
            //console.log("cols", cols);
            var chrid   = parseInt(cols[0]);
            var chrsize = parseInt(cols[2]);
            self.data['smap']['data'      ][chrid]  = [ cols[1], chrsize ];
            self.data['smap']['total_size']        +=   chrsize;
            */
          }
        }
      }
    }
    console.log('parse_smap', file.name, 'parsed', self.data['smap']);
    assert(self.data['smap']['data'].length != 0);
    clbk();
  });
}






bionano_parser.prototype.report         = function(self, clbk) {
  self.report_r_cmap( self, clbk);
  
  //self.report_q_cmap( self, clbk);
  
  self.report_xmap(   self, clbk);
  
  if ( 'smap' in self.files ) {
    self.report_scmap(self, clbk);
  }
}


bionano_parser.prototype.report_cmap    = function(self, ldata, desc, track_name, clbk) {
  var filename     = ldata['filename'    ];
  var header       = ldata['header'      ];
  var data         = ldata['data'        ];
  var chr_size     = ldata['chr_size'    ];
  var chr_sites    = ldata['chr_sites'   ];
  var total_sites  = ldata['total_sites' ];
  var col_names    = ldata['col_names'   ];
  var header_types = ldata['header_types'];
  var nick_sites   = ldata['nick_sites'  ];

  console.log('report_cmap :: data', data);
  
  var chroms      = [];
  var chrom_names = {};
  var chrom_sizes = {};
  for (var chrid in self.data['key_file']['data'      ]) {
    var cdata      = self.data['key_file']['data'     ][chrid];
    var chrom_name = cdata[0];
    var chrom_size = cdata[1];
    
    chroms.push(chrom_name);
    chrom_names[chrom_name] = chrid;
    chrom_sizes[chrom_name] = chrom_size;
  }
  
  chroms.sort();
  console.log('report_cmap :: chroms     ', chroms     );
  console.log('report_cmap :: chrom_names', chrom_names);
  
  var indexOfId           = col_names.indexOf('CMapId'      );
  var indexOfLabelChannel = col_names.indexOf('LabelChannel');
  var indexOfPosition     = col_names.indexOf('Position'    );
  var indexOfCoverage     = col_names.indexOf('Coverage'    );
  var indexOfOccurrence   = col_names.indexOf('Occurrence'  );
  
  var outdata_bed         = [
    '#track name="'+track_name+'" description="'+desc+'" useScore=1 src="'+filename+'"'
  ];
  
  //http://genome.ucsc.edu/goldenPath/help/wiggle.html
  var outdata_wig         = [];
  
  
  for ( var chromnum in chroms ) {
    var chrom_name = chroms[     chromnum  ];
    var chrom_size = chrom_sizes[chrom_name];
    var chrom_id   = chrom_names[chrom_name];
    
    //console.log('report_cmap :: chrom_name', chrom_name);
    //console.log('report_cmap :: chrom_id  ', chrom_id  );
    
    var cdata      = data[chrom_id];
    //console.log('report_cmap :: cdata     ', cdata       );
    
    //console.log('report_cmap :: cdatalen  ', cdata.length);
    
    outdata_wig.push( '#browser position '+chrom_name+':0-'+(chrom_size - 1) );
    outdata_wig.push( '#track type=wiggle_0 name="reference" description="BioNano Genomics Reference Nicking Pattern" visibility=full autoScale=off viewLimits=0.0:1.0 color=0,255,00 altColor=255,0,0 alwaysZero=on graphType=bar smoothingWindow=off priority=10' );
    outdata_wig.push( 'variableStep chrom='+chrom_name+' span='+nick_sites[Object.keys(nick_sites)[0]][1] );
    
    var out_row_bed = [
      chrom_name    , //  0 chrom
                   0, //  1 start
      chrom_size - 1, //  2 end
      'ref'         , //  3 name
      1000          , //  4 score
      '+'           , //  5 strand
                   0, //  6 thick start
      chrom_size - 1, //  7 thick end
      0             , //  8 RGB
      0             , //  9 count
      [0]           , // 10 sizes
      [0]             // 11 starts
    ];
    
    var lastPos      = -1;
    var lastFeatSize = -1;
    var num_valids   =  0;
    for ( var rowid in cdata ) {
      var row      = cdata[rowid];
      //console.log('rowid', rowid);
      //console.log('row  ', row  );
      var CMapId       = row[indexOfId          ];
      var LabelChannel = row[indexOfLabelChannel];
      var Position     = row[indexOfPosition    ];
      var Coverage     = row[indexOfCoverage    ];
      var Occurrence   = row[indexOfOccurrence  ];

      /*
      console.log('LabelChannel', LabelChannel );
      console.log('Position    ', Position     );
      console.log('Coverage    ', Coverage     );
      console.log('Occurrence  ', Occurrence   );
      */

      if ( Occurrence > 0 ) {
        if ((lastPos + lastFeatSize) >= Position) {
          continue;
        }
        
        num_valids++;
        
        /*
        if ( num_valids == 1 ) {
          out_row_bed[1] = Position;
          out_row_bed[6] = Position;
        }
        */


        var featSize = nick_sites[LabelChannel][1];
        lastFeatSize = featSize;
        
        out_row_bed[10].push(featSize);
        out_row_bed[11].push(Position);
        
        lastPos = Position;
        //outdata_wig.push( Position + " " + CMapId );
        outdata_wig.push( Position + " 1" );
      }
    }
      
    out_row_bed[ 2] = lastPos+lastFeatSize;
    out_row_bed[ 7] = lastPos+lastFeatSize;
    out_row_bed[ 9] = out_row_bed[10].length;
    out_row_bed[10] = out_row_bed[10].join(',');
    out_row_bed[11] = out_row_bed[11].join(',');
    out_row_bed     = out_row_bed.join("\t");
    outdata_bed.push(out_row_bed);
  }

  //console.log('report_cmap :: outdata_bed', outdata_bed);
  clbk(filename, 'bed', outdata_bed.join("\n"));
  
  //console.log('report_cmap :: outdata_wig', outdata_wig);
  clbk(filename, 'wig', outdata_wig.join("\n"));
}


bionano_parser.prototype.report_xmap    = function(self, clbk) {
  var ldata        = self.data['xmap' ];
  var desc         = "BioNano Genomics - Nicking Mapping Pattern";
  var track_name   = "NickingMapping";

  var filename     = ldata['filename'    ];
  var header       = ldata['header'      ];
  var data         = ldata['data'        ];
  var chr_size     = ldata['chr_size'    ];
  var chr_sites    = ldata['chr_sites'   ];
  var total_sites  = ldata['total_sites' ];
  var col_names    = ldata['col_names'   ];
  var header_types = ldata['header_types'];
  var get_val      = ldata['get_val'     ];
  var nick_sites   = self.data['r_cmap'  ]['nick_sites'  ];

  
  console.log('report_xmap :: col_names'   , col_names);
  console.log('report_xmap :: data     '   , data     );
  console.log('report_xmap :: keyfile_data', self.data['key_file']['data'     ]);
  
  
  var chroms       = [];
  var chrom_names  = {};
  var chrom_sizes  = {};
  for (var RefContigID in self.data['key_file']['data'     ])              {
    //console.log('report_xmap :: RefContigID', RefContigID);
    
    var cdata      =      self.data['key_file']['data'     ][RefContigID];
    var chrom_name = cdata[0];
    var chrom_size = cdata[1];
    
    chroms.push(chrom_name);
    chrom_names[chrom_name] = RefContigID;
    chrom_sizes[chrom_name] = chrom_size;
  }
  
  
  chroms.sort();
  console.log('report_xmap :: chroms     ', chroms     );
  console.log('report_xmap :: chrom_names', chrom_names);
  console.log('report_xmap :: chrom_sizes', chrom_sizes);

  
  var r_map     = {};
  var r_cmap    = self.data['r_cmap'];
  var r_data    = r_cmap['data'   ];
  var r_get_val = r_cmap['get_val'];
  console.log('r_data', r_data);
  for ( chrid in r_data ) {
    r_map[chrid] = {};
    //console.log('chrid', chrid);
    var r_data_c = r_data[chrid];
    for ( colid in r_data_c ) {
      //console.log('colid', colid);
      var col              = r_data_c[colid];
      //console.log('col', col);
      var SiteID           = r_get_val('SiteID', col);
      //console.log('SiteID', SiteID);
      var Position         = r_get_val('Position', col);
      //console.log('Position', Position);
      r_map[chrid][SiteID] = Position;
      //console.log('chrid', chrid, 'colid', colid, 'SiteID', SiteID, 'Position', Position);
    }
  }
  console.log('r_map', r_map);

  
  
  var outdata_bed_g       = [];
  var outdata_bed         = [
    '#track name="'+track_name+'" description="'+desc+'" useScore=1 src="'+filename+'"'
  ];
  
  //http://genome.ucsc.edu/goldenPath/help/wiggle.html
  var outdata_wig_g       = [];
  var outdata_wig         = [];
  
  
  for ( var RefContigName in chrom_names ) {
    var RefContigSize = chrom_sizes[RefContigName];
    var RefContigID   = chrom_names[RefContigName];
    
    var donePos        = {};
    var doneRangeStart = [];
    var doneRangeEnd   = [];
    
    console.log('report_xmap :: RefContigID   ', RefContigID  );
    console.log('report_xmap :: RefContigName ', RefContigName);
    console.log('report_xmap :: RefContigSize ', RefContigSize);

    var RefData       = data[RefContigID];
    //console.log('report_xmap :: RefData       ', RefData                    );
    console.log('report_xmap :: RefData Length', Object.keys(RefData).length);
    
    //outdata_wig.push( '#browser position '+RefContigName+':0-'+(RefContigSize - 1) );
    
    var contig_order     = {};
    for ( QryContigID in RefData ) {
      var QryData      = RefData[QryContigID];
      for ( var rowid in QryData ) {
        var cols         = QryData[rowid];
        var RefStart     = get_val('RefStartPos' , cols);
        var RefEnd       = get_val('RefEndPos'   , cols);
        var minPos       = RefStart < RefEnd ? RefStart : RefEnd;
        
        if (! (QryContigID in contig_order)) {
          contig_order[QryContigID] = minPos;
        }
        
        if (minPos < contig_order[QryContigID]) {
          contig_order[QryContigID] = minPos;
        }
      }
    }
    
    var sorted_contig_ids = [];
    for (var QryContigID in contig_order) {
      sorted_contig_ids.push([QryContigID, contig_order[QryContigID]])
    }
    sorted_contig_ids.sort(function(a, b) {return a[1] - b[1]})
    
    console.log('report_xmap :: sorted_contig_ids', sorted_contig_ids);

    
    for ( QryContigNum in sorted_contig_ids ) {
      var QryContigID   = sorted_contig_ids[QryContigNum][0];
      var QryData      = RefData[QryContigID];
      
      //console.log('report_xmap :: QryContigID', QryContigID);
      //console.log('report_xmap :: QryData    ', QryData    );


      var out_row_bed = [
        RefContigName    , //  0 chrom
        Number.MAX_VALUE , //  1 start
        0                , //  2 end
        'ref'            , //  3 name
        1000             , //  4 score
        '+'              , //  5 strand
        Number.MAX_VALUE , //  6 thick start
        0                , //  7 thick end
        0                , //  8 RGB
        0                , //  9 count
        []               , // 10 sizes
        []                 // 11 starts
      ];


      
      var lastPos      = -1;
      var lastFeatSize = -1;
      var num_valids   =  0;
      for ( var rowid in QryData ) {
        var cols         = QryData[rowid];
        
        //console.log('report_xmap :: rowid', rowid);
        //console.log('report_xmap :: cols ', cols );
        
        /*
        #h  CMapId ContigLength NumSites SiteID LabelChannel Position  StdDev Coverage Occurrence
        #f  int    float        int      int    int          float     float  float    float
            35     4171773.0    1214     1      1            19.9      105.0  39.9     39.9
            35     4171773.0    1214     2      1            2189.4    143.8  54.9     46.9
            35     4171773.0    1214     1214   1            4171753.2 0.0    0.0      5.0
            35     4171773.0    1214     1215   0            4171773.0 0.0    1.0      1.0
            318    7181753.1    483      1      1            3706.6    461.7  0.0      7.0
            318    7181753.1    483      2      1            14210.9   665.1  0.0      4.0
        */
        
        /*
        #h  XmapEntryID  QryContigID  RefContigID  QryStartPos  QryEndPos  RefStartPos  RefEndPos   Orientation  Confidence  HitEnum  QryLen     RefLen      LabelChannel  Alignment
        #f  int          int          int          float        float      float        float       string       float       string   float      float       int           string   
            1            35           3            3838447.1    4147006.7  7578.0       319624.0    +            19.57       2M1D4M   4171773.0  55340444.0  1             (1,1194)(2,1195)(4,1196)(5,1197)(6,1198)
            2            318          13           6665500.4    7181733.4  17583348.0   18095746.0  +            46.41       7M1I4M   7181753.1  67145203.0  1             (1302,444)(1303,445)(1304,446)(1305,447)
            3            318          13           6433023.1    5490820.5  22619678.0   23558208.0  -            50.62       6M1I1D   7181753.1  67145203.0  1             (1619,427)(1620,426)(1621,425)(1622,424)
            4            318          13           5430077.7    4298610.3  23610572.0   24743004.0  -            94.57       4M1D3M   7181753.1  67145203.0  1             (1681,368)(1682,367)(1683,366)(1684,365)
            5            318          13           4253918.8    3711500.2  24780354.0   25321618.0  -            42.05       1M1D2M   7181753.1  67145203.0  1             (1763,289)(1765,288)(1766,287)(1768,286)
            6            318          13           3669614.3    3328281.8  25357812.0   25698204.0  -            26.48       3M1D1M   7181753.1  67145203.0  1             (1805,250)(1806,249)(1807,248)(1809,247)
            7            318          13           3286534.9    2432155.1  25745976.0   26597884.0  -            66.17       2M1D1M   7181753.1  67145203.0  1             (1831,228)(1832,227)(1834,226)(1836,225)
            8            318          13           2425746.4    746901.8   26606770.0   28275584.0  -            132.77      14M1D8   7181753.1  67145203.0  1             (1894,169)(1895,168)(1896,167)(1897,166)
            9            318          13           357315.0     3706.6     29119400.0   29475168.0  -            27.03       6M1D11   7181753.1  67145203.0  1             (2050,20)(2051,19)(2052,18)(2053,17)(205
            10           297          2            19.8         347880.9   56451240.0   56798660.0  +            32.09       4M1D1M   5429318.1  98543444.0  1             (3509,1)(3510,2)(3511,3)(3512,4)(3514,5)
            11           297          2            372615.5     3083439.8  56828280.0   59536760.0  +            230.89      16M1D9   5429318.1  98543444.0  1             (3540,27)(3541,28)(3542,29)(3543,30)
            12           297          2            3131118.6    3474262.2  59594220.0   59937016.0  +            28.38       19M      5429318.1  98543444.0  1             (3771,235)(3772,236)(3773,237)(3774,238)
            13           297          2            3490101.1    4005745.4  59963788.0   60475880.0  +            51.17       8M1D2M   5429318.1  98543444.0  1             (3790,254)(3791,255)(3792,256)(3793,257)
            14           297          2            4011445.1    4389378.9  60477000.0   60854036.0  +            31.82       2M2D6M   5429318.1  98543444.0  1             (3842,300)(3843,301)(3846,302)(3847,303)
            15           297          2            4468633.8    4865809.6  60919504.0   61315048.0  +            40.30       1M1D2M   5429318.1  98543444.0  1             (3879,330)(3881,331)(3882,332)(3884,333)
            16           297          2            4886751.7    5429233.1  61329344.0   61871676.0  +            41.56       3M1D7M   5429318.1  98543444.0  1             (3922,367)(3923,368)(3924,369)(3926,370)
            17           130          2            4892098.3    3791449.6  45520728.0   46606732.0  -            83.70       19M1D7   5053702.6  98543444.0  1             (2815,375)(2816,374)(2817,373)(2818,372)
            18           130          2            3780061.3    3617333.6  46619216.0   46782536.0  -            19.07       9M1D4M   5053702.6  98543444.0  1             (2905,276)(2906,275)(2907,274)(2908,273)
            19           130          2            3602241.8    1790068.2  46807124.0   48613612.0  -            136.61      5M1D1M   5053702.6  98543444.0  1             (2919,263)(2920,262)(2921,261)(2922,260)
            20           130          2            1691543.6    1343609.7  50776184.0   51120740.0  -            24.50       10M1D1   5053702.6  98543444.0  1             (3091,116)(3092,115)(3093,114)(3094,113)
            21           130          2            1293713.6    388370.7   51166472.0   52065944.0  -            87.01       7M1I22   5053702.6  98543444.0  1             (3120,84)(3121,83)(3122,82)(3123,81)
            22           130          2            339704.1     19.8       52085672.0   52423168.0  -            25.78       3M1I8M   5053702.6  98543444.0  1             (3178,22)(3179,21)(3180,20)(3181,18)
            23           222          4            5234942.7    4030155.6  19604658.0   20802360.0  -            88.75       3M1D1M   5244212.9  70787664.0  1             (1188,384)(1189,383)(1190,382)(1192,381)
        */
      
        var RefId        = get_val('RefContigID' , cols);
        var RefStart     = get_val('RefStartPos' , cols);
        var RefEnd       = get_val('RefEndPos'   , cols);
  
        var QryId        = get_val('QryContigID' , cols);
        var QryStart     = get_val('QryStartPos' , cols);
        var QryEnd       = get_val('QryEndPos'   , cols);
  
        var LabelChannel = get_val('LabelChannel', cols);
        var Orientation  = get_val('Orientation' , cols);
        var Confidence   = get_val('Confidence'  , cols);
        var Alignment    = get_val('Alignment'   , cols);
        var featSize     = nick_sites[LabelChannel][1];
        lastFeatSize     = featSize;

        
        if (RefStart > RefEnd) {
          tmp      = RefEnd;
          RefStart = RefEnd;
          RefEnd   = tmp;
        }
        
        if (RefStart < out_row_bed[1]) {
          out_row_bed[1] = RefStart;
          out_row_bed[6] = RefStart;
        }
        if (RefEnd   > out_row_bed[2]) {
          out_row_bed[2] = RefEnd;
          out_row_bed[7] = RefEnd;
        }

        
        
        var piecesS = Alignment.substring(1,Alignment.length-1).split(")(");
        var piecesP = piecesS.slice();
        
        for (var p = 0; p < piecesS.length; p++) {
          var q = piecesS[p].split(",");
          piecesP[p] = [ parseInt(q[0]), parseInt(q[1]) ];
        }
        
        
        
        var RefStartW = RefStart;
        var RefEndW   = RefEnd;
        
        
        for ( var pos in doneRangeStart ) {
          var pos_start = doneRangeStart[pos];
          var pos_end   = doneRangeEnd  [pos];
          
          if ( ( RefStartW >= pos_start ) && ( RefStartW <= pos_end ) ) {
            RefStartW = pos_end   + 2;
          }
          
          if ( ( RefEndW   >= pos_start ) && ( RefEndW   <= pos_end ) ) {
            RefEndW   = pos_start - 2;
          }
        }
        
        /*
        if ( (RefEnd - RefStartW) == 0 ){
          continue;
        }
        */
        
        doneRangeStart.push(RefStartW);
        doneRangeEnd  .push(RefEndW  );
        
        outdata_wig.push( '#browser position '+RefContigName+':'+RefStartW+'-'+RefEndW );
        outdata_wig.push( '#track type=wiggle_0 name="xmap - '+QryContigID+'.'+(rowid+1)+'" description="BioNano Genomics - XMAP Nicking Pattern" visibility=full autoScale=off viewLimits=0.0:1.0 color=0,255,00 altColor=255,0,0 alwaysZero=on graphType=bar smoothingWindow=off priority=10' );
        outdata_wig.push( 'variableStep chrom='+RefContigName+' span=1' );
        //outdata_wig.push( 'variableStep chrom='+RefContigName+' span='+featSize );
        
        /*
        console.log('report_xmap :: RefId       ', RefId        );
        console.log('report_xmap :: RefStart    ', RefStart     );
        console.log('report_xmap :: RefEnd      ', RefEnd       );
        
        console.log('report_xmap :: QryId       ', QryId        );
        console.log('report_xmap :: QryStart    ', QryStart     );
        console.log('report_xmap :: QryEnd      ', QryEnd       );
        
        console.log('report_xmap :: LabelChannel', LabelChannel );
        console.log('report_xmap :: Orientation ', Orientation  );
        console.log('report_xmap :: Confidence  ', Confidence   );
        console.log('report_xmap :: Alignment   ', Alignment    );
        */
        
        /*
        if ((lastPos + lastFeatSize) >= Position) {
          continue;
        }
        
        */

        
        //console.log('report_xmap :: piecesS     ', piecesS.length, piecesS);
        //console.log('report_xmap :: piecesP     ', piecesP.length, piecesP);
        
        for (var p = 0; p < piecesP.length; p++) {
          num_valids++;
          
          var piece  = piecesP[p];
          var refId  = piece[0];
          var qryId  = piece[1];
          
          if (refId in r_map[RefContigID]) {
            var refPos = r_map[RefContigID][refId];
            
            out_row_bed[10].push(featSize);
            out_row_bed[11].push(refPos  );
            
            
            
            if (refPos <= RefStartW) {
              continue;
            }
            
            if (refPos >= RefEndW  ) {
              continue;
            }

            
            while (refPos in donePos) {
              refPos += 1;
            }
            
            if (refPos > RefEnd) {
              while (refPos in donePos) {
                refPos -= 1;
              }
            }


            if (refPos in donePos) {
              continue;
            }

            donePos[refPos] = 1;
            
            lastPos = refPos;
            
            outdata_wig.push( refPos + " 1" );
          } else {
            console.warn('RefContigID', RefContigID, 'refId', refId, 'r_map', r_map[RefContigID]);
          }
        }
        
        
        
        /*
        out_row_bed[10].push(featSize);
        out_row_bed[11].push(RefStart);
        
        outdata_wig.push( RefStart + " 1.0" );
        */
        
        lastPos = RefStart;
      }



    
      out_row_bed[ 2] += lastFeatSize;
      out_row_bed[ 7] += lastFeatSize;
      
      for (var rp = 0; rp < out_row_bed[11].length; rp++) {
        out_row_bed[11][rp] -= out_row_bed[1];
      }
      
      out_row_bed[ 9] = out_row_bed[10].length;
      out_row_bed[10] = out_row_bed[10].join(',');
      out_row_bed[11] = out_row_bed[11].join(',');
      out_row_bed     = out_row_bed.join("\t");
      
      outdata_bed.push(out_row_bed);
    } // QryContigID

  
    //console.log('report_xmap :: outdata_wig', outdata_wig);
    //clbk(filename, RefContigName+'.wig', outdata_wig.join("\n"));
    outdata_wig_g.push.apply(outdata_wig_g, outdata_wig);
    outdata_wig = [];
    

    //clbk(filename, RefContigName+'.bed', outdata_bed.join("\n"));
    outdata_bed_g.push.apply(outdata_bed_g, outdata_bed);
    outdata_bed = [];
  } // RefContigID

  
  clbk(filename, 'wig', outdata_wig_g.join("\n"));
  //console.log('report_xmap :: outdata_bed', outdata_bed);
  clbk(filename, 'bed', outdata_bed_g.join("\n"));
}


//https://genome.ucsc.edu/FAQ/FAQformat.html#format1
bionano_parser.prototype.report_r_cmap  = function(self, clbk) {
  var desc         = "BioNano Genomics - Reference Nicking Pattern";
  var track_name   = "referenceNicking";
  var ldata        = self.data['r_cmap' ];

  self.report_cmap(self, ldata, desc, track_name, clbk);
}


bionano_parser.prototype.report_q_cmap  = function(self, clbk) {
  /*
  var desc         = "BioNano Genomics - Genomic Mapping Nicking Pattern";
  var track_name   = "MappingNicking";
  var ldata        = self.data['q_cmap' ];

  self.report_cmap(self, ldata, desc, track_name, clbk);
  */
}


bionano_parser.prototype.report_smap    = function(self, clbk) {
}


