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
    console.log('ext', ext);
    if ( file.name.endsWith(ext) ) {
      this.files[this.acceptedExtensions[ext]] = file;
      break;
    }
  }
}

bionano_parser.prototype.parse          = function(clbk) {
  if (!( 'key_file' in this.files && 'r_cmap' in this.files && 'q_cmap' in this.files && 'xmap' in this.files )) {
    console.error('needs key file, r_cmape, q_cmap and xmap');
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



bionano_parser.prototype.report         = function(self, clbk) {
  self.report_r_cmap( self, clbk);
  self.report_q_cmap( self, clbk);
  self.report_xmap(   self, clbk);
  if ( 'smap' in self.files ) {
    self.report_scmap(self, clbk);
  }
}


bionano_parser.prototype.report_cmap  = function(self, ldata, desc, track_name, clbk) {
  var filename     = ldata['filename'    ]; //
  var header       = ldata['header'      ]; // []
  var data         = ldata['data'        ]; // {}
  var chr_size     = ldata['chr_size'    ]; // {}
  var chr_sites    = ldata['chr_sites'   ]; // {}
  var total_sites  = ldata['total_sites' ]; //  0
  var col_names    = ldata['col_names'   ];
  var header_types = ldata['header_types'];
  var nick_sites   = ldata['nick_sites'  ];

  console.log('data', data);
  
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
  console.log('chroms     ', chroms     );
  console.log('chrom_names', chrom_names);
  
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
    var chrom_name = chroms[chromnum];
    var chrom_size = chrom_sizes[chrom_name];
    var chrom_id   = chrom_names[chrom_name];
    
    console.log('chrom_name', chrom_name);
    console.log('chrom_id  ', chrom_id  );
    
    var cdata      = data[chrom_id];
    
    console.log(' cdatalen ', cdata.length);
    //console.log(' cdata    ', cdata       );
    
    
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
        outdata_wig.push( Position + " 1.0" );
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

  console.log('outdata_bed', outdata_bed);
  clbk(filename + '.bed', outdata_bed.join("\n"));
  
  console.log('outdata_wig', outdata_wig);
  clbk(filename + '.wig', outdata_wig.join("\n"));
}

//https://genome.ucsc.edu/FAQ/FAQformat.html#format1
bionano_parser.prototype.report_r_cmap  = function(self, clbk) {
  desc       = "BioNano Genomics - Reference Nicking Pattern";
  track_name = "referenceNicking";
  
  var ldata        = self.data['r_cmap' ];

  self.report_cmap(self, ldata, desc, track_name);
}



bionano_parser.prototype.report_q_cmap  = function(self, clbk) {
  desc       = "BioNano Genomics - Genomic Mapping Nicking Pattern";
  track_name = "MappingNicking";
  
  var ldata        = self.data['q_cmap' ];

  self.report_cmap(self, ldata, desc, track_name);
}

bionano_parser.prototype.report_xmap    = function(self, clbk) {
}

bionano_parser.prototype.report_smap    = function(self, clbk) {
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
  
  //console.log('header_names', header_names);
  //console.log('header_types', header_types);
  
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
  self.read_file(file, function (text) {
    self.data['r_cmap'] = {
      'filename'   : file.name,
      'header'     : [],
      'data'       : {},
      'chr_size'   : {},
      'chr_sites'  : {},
      'total_sites':  0,
      'col_names'  : [],
      'nick_sites' : {}
     };
    
    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var rows = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    var ldata   = self.data['r_cmap'];
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
            
            num = parseInt(num.split(":")[0]);
            
            ldata['nick_sites'][num] = [seq, seq.length];
          }
        } else { //data
          datanum++;
          if ( datanum == 1 ) { // col names
            var dfl = "#h CMapId\tContigLength\tNumSites\tSiteID\tLabelChannel\tPosition\tStdDev\tCoverage\tOccurrence";
            var hdl = ldata['header'][ldata['header'].length-2];
            //console.log(ldata['header']);
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
            self.parse_header(ldata);
            
          } else {
            var cols = line.split(/\s+/);
            //console.log("cols", cols);
            var chrid   = parseInt(cols[0]);
            var chrsize = parseInt(cols[1]);
            var chrpos  = parseInt(cols[5]);

            assert(chrsize == self.data['key_file']['data'      ][chrid][1], 'chromosome size mismatch');

            if (! (chrid in ldata['data'      ])) {
              ldata['data'      ][chrid] = [];
              ldata['chr_size'  ][chrid] = chrsize;
              ldata['chr_sites' ][chrid] =  0;
            }
            
            for (var c in cols) {
              cols[c] = ldata['header_types'][c](cols[c]);
            }
            
            ldata['data'       ][chrid].push(cols);
            ldata['chr_sites'  ][chrid]++;
            ldata['total_sites']++;
          }
        }
      }
    }
    console.log('parse_r_cmap', file.name, 'parsed', ldata);
    assert(ldata['data'].length != 0);
    clbk();
  });
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
  #h CMapId   ContigLength    NumSites    SiteID  LabelChannel    Position    StdDev  Coverage    Occurrence
  #f int  float   int int int float   float   float   float
  35  4171773.0   1214    1   1   19.9    105.0   39.9    39.9
  35  4171773.0   1214    2   1   2189.4  143.8   54.9    46.9
  */
  self.read_file(file, function (text) {
    self.data['q_cmap'] = { 
      'header'     : [],
      'data'       : {},
      'chr_size'   : {},
      'chr_sites'  : {},
      'total_sites':  0
    };
    
    
    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var rows    = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    var ldata   = self.data['q_cmap'];
    for ( var linenum = 0, line; line = rows[linenum]; linenum++ ) {
      //console.log(linenum, line);
      if ( line.length > 0 ) {
        if ( line[0] == "#" ) { // header
          ldata['header'].push(line);
        } else { //data
          datanum++;
          if ( datanum == 1 ) { // col names
            var dfl = "#h CMapId\tContigLength\tNumSites\tSiteID\tLabelChannel\tPosition\tStdDev\tCoverage\tOccurrence";
            var hdl = ldata['header'][ldata['header'].length-2];
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
            self.parse_header(ldata);
            
          } else {
            var cols = line.split(/\s+/);
            //console.log("cols", cols);
            var chrid   = parseInt(cols[0]);
            var chrsize = parseInt(cols[1]);
            var chrpos  = parseInt(cols[5]);

            if (! (chrid in ldata['data'      ])) {
              ldata['data'      ][chrid] = [];
              ldata['chr_size'  ][chrid] = chrsize;
              ldata['chr_sites' ][chrid] =  0;
            }
            
            for (var c in cols) {
              cols[c] = ldata['header_types'][c](cols[c]);
            }
            
            ldata['data'       ][chrid].push(cols);
            ldata['chr_sites'  ][chrid]++;
            ldata['total_sites']++;
          }
        }
      }
    }
    console.log('parse_q_cmap', file.name, 'parsed', ldata);
    assert(ldata['data'].length != 0);
    clbk();
  });
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
  self.read_file(file, function (text) {
    self.data['xmap'] = { 
      'header'     : [],
      'data'       : {},
      'chr_sites'  : {},
      'total_sites':  0
     };
    
    //.replace(/(^\s*)|(\s*$)/g,'') trim white spaces
    //
    var rows    = text.split(/\r\n|\n/);
    //console.log(rows);
    var datanum = 0;
    var ldata   = self.data['xmap'];
    for ( var linenum = 0, line; line = rows[linenum]; linenum++ ) {
      //console.log(linenum, line);
      if ( line.length > 0 ) {
        if ( line[0] == "#" ) { // header
          self.data['xmap']['header'].push(line);
        } else { //data
          datanum++;
          if ( datanum == 1 ) { // col names
            //            0           1           2           3           4         5           6         7           8           9       10      11      12            13      
            var dfl = "#h XmapEntryID\tQryContigID\tRefContigID\tQryStartPos\tQryEndPos\tRefStartPos\tRefEndPos\tOrientation\tConfidence\tHitEnum\tQryLen\tRefLen\tLabelChannel\tAlignment";
            var hdl = self.data['xmap']['header'][self.data['xmap']['header'].length-2];
            assert(hdl == dfl, "line: '" + hdl + "' ("+hdl.length+") != " + "'"+dfl+"' ("+dfl.length+")");
            self.parse_header(ldata);
          } else {
            var cols = line.split(/\s+/);

            for (var c in cols) {
              cols[c] = ldata['header_types'][c](cols[c]);
            }
            
            //console.log("cols", cols);

            var chrid   = cols[ 2];
            var chrsize = cols[11];
            var chrpos  = cols[ 5];
            var tgtid   = cols[ 1];
            var tgtsize = cols[10];
            var tgtpos  = cols[ 3];

            assert(parseInt(chrsize) == parseInt(self.data['r_cmap'  ]['chr_size'][chrid]), 'reference chromosome size mismatch. '+chrsize+' != '+self.data['r_cmap'  ]['chr_size'][chrid]);
            assert(parseInt(tgtsize) == parseInt(self.data['q_cmap'  ]['chr_size'][tgtid]), 'target    chromosome size mismatch. '+tgtsize+' != '+self.data['q_cmap'  ]['chr_size'][tgtid]);
            
            if (! (chrid in ldata['data'      ])) {
              ldata['data'      ][chrid] = {};
              ldata['chr_sites' ][chrid] =  0;
            }
            
            if (!(chrpos in ldata['data'       ][chrid])) {
              ldata['data'       ][chrid][chrpos] = [];
            }
            
            
            ldata['data'       ][chrid][chrpos].push(cols);
            ldata['chr_sites'  ][chrid]++;
            ldata['total_sites']++;
          }
        }
      }
    }
    console.log('parse_xmap', file.name, 'parsed', ldata);
    assert(ldata.length != 0);
    clbk();
  });
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