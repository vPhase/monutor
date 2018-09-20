
var graph_colors = [30,46,28,6,7,5,4,42,41,2,3,10,49,1,33,40,37,32,29,20,21]; 


function checkModTime(file, callback)
{

  var req = new XMLHttpRequest(); 
  req.open("HEAD",file);
  req.send(null); 
  req.onload = function() 
  {
    if (req.status == 200) 
    {
      callback(req.getResponseHeader('Last-Modified'));
    }
    else callback(req.status); 
  }
}

function updateRunlist() 
{
  var xhr = new XMLHttpRequest() ;
  xhr.open('GET','runlist.json'); 
  xhr.onload = function() 
  {
    if (xhr.status == 200) 
    {
      json = JSON.parse(xhr.response); 
      runs = json.runs; 
      document.getElementById('last_updated').innerHTML= json.last_updated; 
    }
  }
  xhr.send() 
}


function optClear()
{
  document.getElementById('opt').innerHTML = ""; 
}

function optAppend(str)
{
  document.getElementById('opt').innerHTML += str; 
}

function hashParams(what) 
{

  var pars = {}; 
  var hash = window.location.hash.split("&"); 

  if (hash[0].substring(1) != what) return pars; 
  
  for (var i = 0; i < hash.length; i++)
  {
    var idx =hash[i].indexOf("="); 
    if (idx > 0) 
    {
      pars[hash[i].substr(0,idx)]=hash[i].substr(idx+1); 
    }
  }

  return pars; 
}

function iir_filter(g, b,a) 
{

  if (a == null || a.length == 0) a = [1]; 
  if (b == null || b.length == 0) b = [1]; 
  var yNew = new Float32Array(g.fNpoints); 


  var inv = 1./a[0]; 
  for (var i = 0; i < g.fNpoints; i++) 
  {
    var val = 0; 

    for (var j = 0; j < Math.min(i+1,b.length); j++)
    {
      val += b[j] * g.fY[i-j]; 
    }

    for (var k = 1; k < Math.min(i+1,a.length); k++) 
    {
      val -= a[k] * yNew[i-k]; 
    }

    yNew[i] = val *inv; 

  }

//  console.log(yNew); 

  for (var i = 0; i < g.fNpoints;i++) 
  {
    g.fY[i] = yNew[i]; 
  }
}


function prettyPrintHeader(vars) 
{
  str = ""; 

  str += "<table><tr>"; 
  str += "<td>Event number: " + vars["header.event_number"] +"</td>"; 
  str += "<td>Trigger number: " + vars["header.trig_number"] +"</td>"; 
  str += "<td>Readout time (master): " + new Date(parseInt(vars["header.readout_time"][0])*1000 + parseInt(vars["header.readout_time_ns"][0])/1e6).toISOString() +"</td>"; 
  str += "<td>Readout time (slave): " + new Date(parseInt(vars["header.readout_time"][1])*1000 + parseInt(vars["header.readout_time_ns"][1])/1e6).toISOString() +"</td></tr>"; 
  var isRF = parseInt(vars["header.trigger_type"]) == 2; 
  var isCalib = isRF && parseInt(vars["header.gate_flag"]); 
  str += "<tr><td>Trigger type: " + ( isCalib ? "CALIB" : isRF ? "RF" : "FORCE") + "</td>"
  var triggered_beam = Math.log2(parseInt(vars["header.triggered_beams"])); 
  str += "<td>Triggered beam: " + (isRF? triggered_beam : "N/A") +"</td>"; 
  str += "<td>Triggered beam power: " + (isRF ? vars["header.beam_power"][triggered_beam] : "N/A") + "</td>"; 
  str += "<td>Raw TrigTime: " +vars["header.trig_time"]+"</td></tr>"; 
  str += "</table> "; 
    
  return str; 

}


function plotHelp()
{
  alert("Plot Help:\nDifferent plots are separated by line returns. Different lines on same plot are separated by |||.\nAfter ;;;, you may add additional options\n\txtitle=string\n\tytitle=string\n\txtime=0|1\n\tytime=0|1\n\tlabels=label1,label2,label3,etc."); 
}

function transferHelp()
{
  alert("If checked (default), will fully download all ROOT files before making plots. Otherwise, will use partial transfers, which might be faster, but I think results in additional bandwidth and might defeat browser cache... maybe."); 
}

function arrNonZero(arr) 
{
  for (var i = 0; i < arr.length; i++)
  {
    if (arr[i]) return true; 
  }

  return false; 
}

var ffts = {}; 
var navg = 0; 


function getFFT(size) 
{
  if (ffts[size] === undefined)
  {
    ffts[size] = new FFTR(size); 
  }

  return ffts[size]; 
}

/** Gets the power spectrum of a TGraph, returning as a TGraph. Optionally will upsample in fourier space */ 
function spec(g, upsample=1, envelope = null) 
{
  var N = g.fX.length;
  var fft = getFFT(N); 
  var Y = fft.forward(g.fY); 
  var dt = g.fX[1] - g.fX[0]; 
  var df = 1./(N * dt); 
  var t0 = g.fX[0]; 
  var f = []; 
  var P = []; 
  for (var i = 0; i < N/2+1; i++)
  {
    f.push(i*df); 
    var p = (Y[2*i]*Y[2*i] + Y[2*i+1]*Y[2*i+1]) / N; 
    if (i > 0 || i < N/2) p*=2; 
    P.push(10*Math.log10(p)); 
  }

  var G = JSROOT.CreateTGraph(N/2+1, f,P); 
  G.fName = g.fName + "_power"; 
  G.fTitle = g.fTitle.substring(g.fTitle.indexOf(',')+1); 

  upsample = Math.round(upsample); 

  var Yp = null;


  if (upsample > 1) 
  {
    var newY = new Float32Array( 2*((upsample * N)/2 + 1)); 
    for (var i = 0; i < 2*(N/2 + 1); i++) newY[i] = Y[i]/N; 
    var fftU = getFFT(upsample * N); 
    g.fNpoints = upsample*N; 
    g.fY = fftU.inverse(newY); 
    for (var i = 0; i < N*upsample; i++) 
    {
      g.fX[i] = dt/upsample *i + t0; 
    }
    delete newY; 
  }

  if (envelope != null) 
  {
    var Yp = new Float32Array( 2*((upsample*N)/2+1)); 
    for (var i = 1; i < N/2; i++)
    {
      Yp[2*i] = -Y[2*i+1] / N; 
      Yp[2*i+1] = Y[2*i] / N; 
    }

    var fftH = getFFT(upsample * N); 
    var yp = fftH.inverse(Yp); 
    envelope.fNpoints = N*upsample;; 

    for (var i = 0; i < N*upsample; i++)
    {
      envelope.fX[i] = dt/upsample * i + t0; 
      envelope.fY[i] = Math.sqrt( g.fY[i] * g.fY[i] + yp[i] * yp[i]); 
    }
  }

  G.InvertBit(JSROOT.BIT(18)); 
  return G; 
}





var pages = {}; 

function setGraphHistStyle(histo) 
{
    histo.fXaxis.fTitleSize = 0.05; 
    histo.fYaxis.fTitleSize = 0.05; 
    histo.fXaxis.fLabelSize = 0.045; 
    histo.fYaxis.fLabelSize = 0.045; 
    histo.fXaxis.fTitleColor = 30;
    histo.fYaxis.fTitleColor = 30; 
    histo.fXaxis.fLabelColor = 30;
    histo.fYaxis.fLabelColor = 30; 
    histo.fYaxis.fAxisColor = 11; 
    histo.fXaxis.fAxisColor = 11; 
    histo.fBits = histo.fBits | JSROOT.TH1StatusBits.kNoStats;
}

function Page(name)
{
  console.log("Made new page " + name); 
  P = new Object; 
  P.main_canvas = name+"c"; 
  document.getElementById('main').innerHTML += '<div id="'+P.main_canvas+'" style="display: none" width="100%" height=100%"> </div>'; 
  P.page_name = name; 
  P.canvases = []; 
  P.graphs = [];  
  P.leg_graphs = [];  
  P.multigraphs = []; 
  P.legends = []; 
  P.wants = []; 
  P.labels =[]; 
  P.xtitles = []; 
  P.ytitles = []; 
  P.titles = []; 
  P.xtime = []; 
  P.ytime = []; 
  P.pstyle = []; 
//  console.log(P); 
  return P; 
}

// persist some things... 
function clearCanvases(p)
{
  for (var i = 0; i < p.canvases.length; i++) 
  {
      JSROOT.cleanup(p.canvases[i]); 
  }

  p.graphs = []; 
  p.leg_graphs = []; 
  p.wants = [];  
  p.multigraphs = []; 
  p.xtitles = []; 
  p.ytitles = []; 
  p.xtime = []; 
  p.ytime = []; 
  p.labels = []; 
  p.pstyle = []; 
  p.legends = []; 
  p.titles = []; 

//  p.canvases =[]; 
//  var c = document.getElementById(p.main_canvas); 
//  c.innerHTML = ""; 
}

function addCanvas(P,cl='canvas',show_name = true) 
{
  var i = P.canvases.length+1; 
  var name = P.page_name+"_c" + i; 
  var c = document.getElementById(P.main_canvas); 
  var show = show_name ? name : ''; 
  c.innerHTML += '<div class="'+cl+'" id="' + name + '">'+show+'</div>'; 
  P.canvases.push(name); 
  return name; 
}

function startLoading(str = "Loading...") 
{
  document.getElementById("load").innerHTML = str; 
}
function appendLoading(str) 
{
  document.getElementById("load").innerHTML += str; 
}

function stopLoading() 
{
  document.getElementById("load").innerHTML = ""; 
}



function makeLegend(xlow,xhigh,ylow,yhigh, objs) 
{
      var leg = JSROOT.Create("TLegend"); 
      leg.fName="legend";
      leg.fTitle="Legend"; 
      leg.fX1NDC = xlow;
      leg.fX2NDC = xhigh; 
      leg.fY1NDC = ylow;
      leg.fY2NDC = yhigh; 
      leg.fFillStyle=1001; 
      leg.fFillColor=14; 
      leg.fNColumns = objs.length > 12 ? 4 : objs.length > 8 ? 3 : objs.length > 3 ? 2 : 1; 
 
      for (var i = 0; i < objs.length; i++) 
      {
        var entry = JSROOT.Create("TLegendEntry"); 
        entry.fObject=objs[i]; 
        entry.fLabel=objs[i].fTitle; 
        entry.fOption="l"; 
        leg.fPrimitives.arr.push(entry); 
      }
     
      return leg; 

}


function doDraw(page, ts, what,cut) 
{

  clearCanvases(page); 
  var plots = document.getElementById(what).value.split("\n"); 

  //clear out any null trees 
  var real_ts = []; 
  for (var it = 0; it < ts.length; it++)
  {
    if (ts[it] != null) real_ts.push(ts[it]); 
  }


  for (var i = 0; i < plots.length; i++) 
  {
    //see if we have titles and time displays
    
    var these_plots = plots[i].split(";;;"); 



    var draws = these_plots[0].split("|||"); 
    var this_xtitle = ""; 
    var this_ytitle = ""; 
    var this_label = []; 
    var this_xtime = false; 
    var this_ytime = false; 
    var this_pstyle = "lp"; 
    var this_title = "Plot "+i; 

    if (these_plots.length > 1) 
    {

      var kvs = these_plots[1].split(";"); 
      for (var k = 0; k < kvs.length; k++)
      {
        var kv = kvs[k].split(":"); 

        if (kv[0].trim()==="xtitle")
        {
          this_xtitle = kv[1].trim(); 
        }
        if (kv[0].trim()==="title")
        {
          this_title = kv[1].trim(); 
        }
 
        if (kv[0].trim()==="ytitle")
        {
          this_ytitle = kv[1].trim(); 
        }
        if (kv[0].trim()==="labels")
        {
          this_label = kv[1].trim().split(","); 
        }
        if (kv[0].trim()==="xtime")
        {
          this_xtime = parseInt(kv[1].trim()); 
        }
        if (kv[0].trim()==="ytime")
        {
          this_ytime = parseInt(kv[1].trim()); 
        }
        if (kv[0].trim()==="opt")
        {
          this_pstyle = kv[1].trim(); 
        }
      }

    }

    page.xtitles.push(this_xtitle); 
    page.titles.push(this_title); 
    page.ytitles.push(this_ytitle); 
    page.labels.push(this_label); 
    page.xtime.push(this_xtime); 
    page.ytime.push(this_ytime); 
    page.pstyle.push(this_pstyle); 


    page.graphs.push([]); 
    page.leg_graphs.push([]); 
    if (page.canvases.length <= i) addCanvas(page); 
    var howmanytrees = 0; 
    var min_tt = ts.length -1; 

    page.wants.push(draws.length*real_ts.length); 

    for (var j = 0; j < draws.length; j++) 
    {
      for (var it = 0; it < real_ts.length; it++)
      {

        args = { expr: draws[j], cut: cut, graph: true, drawopt: [i,j,it]}; 
//        console.log(args); 
        real_ts[it].Draw(args, function(g,indices,ignore)
        {
          var ii = indices[0]; 
          var jj = indices[1]; 
          var tt = indices[2]; 

          g.InvertBit(JSROOT.BIT(18)); 
          g.fTitle = page.labels[ii][jj]; 
          g.fName = page.labels[ii][jj]; 
          g.fLineColor = graph_colors[jj]; 
          g.fMarkerColor = graph_colors[jj]; 
          g.fFillColor = graph_colors[jj]; 
          page.graphs[ii].push(g); 
          if (tt == 0) 
          {
            page.leg_graphs[ii].push(g); 
          }
          if (page.graphs[ii].length == page.wants[ii]) 
          {
            var mg = JSROOT.CreateTMultiGraph.apply(0,page.graphs[ii]); 
            mg.fTitle = page.titles[ii]; 
            JSROOT.draw(page.canvases[ii],mg,"A" +page.pstyle[ii], function (painter) 
              {
                var hist = painter.firstpainter.GetHisto(); 
                hist.fXaxis.fTitle=page.xtitles[ii]; 
                hist.fYaxis.fTitle=page.ytitles[ii]; 
                if (page.xtime[ii])
                {
                  hist.fXaxis.fTitle += " (start = " + new Date(hist.fXaxis.fXmin*1000.).toISOString() + ")"; 
                }
                if (page.ytime[ii])
                {
                  hist.fYaxis.fTitle += " (start = " + new Date(hist.fYaxis.fXmin*1000.).toISOString() + ")"; 
                }
 
                var date = new Date(Date.now()); 
                hist.fYaxis.fTimeDisplay=page.ytime[ii]; 
                hist.fXaxis.fTimeDisplay=page.xtime[ii]; 
                hist.fYaxis.fTimeFormat="%F1970-01-01 " +date.getTimezoneOffset()/60 +":00:00s0" ;
                hist.fXaxis.fTimeFormat="%F1970-01-01 " +date.getTimezoneOffset()/60 +":00:00s0" ;
                JSROOT.redraw(painter.divid,hist,"", function (painter) 
                  {
                    if (page.labels[ii].length)
                    {
                      var leg = makeLegend(0.7,1,0.9,1,page.leg_graphs[ii]); 
                      JSROOT.draw(painter.divid,leg);
                      page.legends.push(leg); 
                    }
                  }); 
              }
            ); 
            page.multigraphs.push(mg); 
          }
        }); 
      }
    }
  }
}


function statusTreeDraw()
{
  var cut = document.getElementById('status_cut').value; 
  var run0 = parseInt(document.getElementById('status_start_run').value); 
  var run1 = parseInt(document.getElementById('status_end_run').value); 

  var decimated = document.getElementById('status_use_decimated').checked ? ".decimated" : "" 
  window.location.hash = "status&run0=" + run0 + "&run1=" + run1; 

  var status_trees = []; 

  startLoading("[Loading status files... be patient if you asked for a lot of runs]"); 

  var suffix = document.getElementById('status_full_transfers').checked ? "+" : ""; 
  var files_to_load = [];

  for (var r = run0; r <= run1; r++)
  {
    files_to_load.push("rootdata/run"+r+"/status"+decimated+".root"+suffix); 
  }

  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {
    JSROOT.OpenFile(files_to_load[i], function(file)
    {  
       appendLoading("="); 
       if (file == null)
       { 
         status_trees.push(null); 
         appendLoading("+"); 
         if (status_trees.length == files_to_load.length) 
         {
            stopLoading(); 
            doDraw(pages['status'],status_trees,'plot_status',cut); 
         }
 
         return; 
       }

       file.ReadObject("status;1", function(tree) 
       {
          status_trees.push(tree); 
          appendLoading("+"); 
          if (status_trees.length == files_to_load.length) 
          {
             stopLoading(); 
             doDraw(pages['status'],status_trees,'plot_status',cut); 
          }
       }); 
    }) ; 
  }
}


function hkTreeDraw() 
{
  var cut = document.getElementById('hk_cut').value; 
  if (cut != "") cut+= "&&"; 
  var t0 = new Date(document.getElementById('hk_start_time').value); 
  var t1 = new Date(document.getElementById('hk_end_time').value); 
  var t2 = new Date(t1.getTime() + 24* 3600 * 1000); 
  cut += "(hk.unixTime>" + t0.getTime()/1000 + "&&hk.unixTime<" + t1.getTime()/1000 + ")"; 

  window.location.hash = "hk&t0=" + t0.getTime() + "&t1=" + t1.getTime(); 

  //figure out what days we need 

  var hktrees = []; 

  var suffix = document.getElementById('hk_full_transfers').checked ? "+" : ""; 
  startLoading("[Loading hk files]"); 
  var files_to_load = []; 
  for (var d = new Date(t0); d<= t2; d.setDate(d.getDate()+1)) 
  {
    var mon = d.getUTCMonth()+1; 
    var day = d.getUTCDate(); 
    if (mon < 10) mon = "0" + mon; 
    if (day < 10) day = "0" + day; 
    files_to_load.push("rootdata/hk/" + d.getUTCFullYear()  + "/" + mon + "/" + day+ ".root"+suffix); 
  }
  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {

    JSROOT.OpenFile(files_to_load[i], function(file)
    { 
       appendLoading("="); 
       if (file == null)
       { 
         hktrees.push(null); 
         appendLoading("+"); 
         if (hktrees.length == files_to_load.length) 
         {
             stopLoading(); 
             doDraw(pages['hk'],hktrees,'plot_hk',cut); 
         }

         return; 
       }
       file.ReadObject("hk;1", function(tree) 
       {
       appendLoading("+"); 
          hktrees.push(tree); 
          if (hktrees.length == files_to_load.length) 
          {
             stopLoading(); 
             doDraw(pages['hk'],hktrees,'plot_hk',cut); 
          }
       }); 
    }) ; 
  }
}



function hk() 
{

  optAppend("Start Time: <input id='hk_start_time' size=30> ");
  optAppend("Stop Time: <input id='hk_end_time' size=30> " ); 
  optAppend("Cut: <input id='hk_cut' size=20 value='Entry$%10==0'>");
  optAppend(" | Full xfers(<a href='javascript:transferHelp()'>?</a>) : <input type=checkbox id='hk_full_transfers' checked> <br>" ); 
  optAppend("Plot(<a onClick='return plotHelp()'>?</a>):<br>");
  optAppend("<textarea id='plot_hk' cols=160 rows=5>hk.unixTime:hk.temp_master|||hk.unixTime:hk.temp_slave|||hk.unixTime:hk.temp_case;;;xtitle:time;title:Temperatures;ytitle:C;xtime:1;labels:master,slave,case\nhk.unixTime:hk.current_master|||hk.unixTime:hk.current_slave|||hk.unixTime:hk.current_frontend;;;xtitle:time;ytitle:mA;labels:master,slave,frontend;xtime:1;title:currents\nhk.unixTime:hk.disk_space_kB;;;title:disk;xtitle:time;xtime:1;labels:disk;ytitle:kB</textarea>");
  optAppend("<br><input type='button' onClick='return hkTreeDraw()' value='Draw'>"); 
  optAppend("<a href='all_hk.root'>  (Download All HK ROOT File)</a>"); 
  
  var now = Date.now(); 

  var hash_params = hashParams('hk'); 

  document.getElementById('hk_start_time').value = new Date( hash_params['t0'] === undefined ? Date.now()- 7*24*3600*1000 : parseInt(hash_params['t0'])).toISOString(); 
  document.getElementById('hk_end_time').value = new Date(hash_params['t1'] === undefined ? Date.now() : parseInt(hash_params['t1'])).toISOString(); 

  hkTreeDraw(); 

} 

the_ffts = [];


last_run = -1; 
last_hd_tree = null; 
last_ev_tree = null; 
last_hd_modified= 0; 
last_ev_modified = 0; 



function go(i) 
{
  var P = pages['event']; 
   
  if (P.canvases.length < 1) 
  {
    addCanvas(P,"canvas_short",false); 
  }


  if (i < 0)
  {
    i = parseInt(document.getElementById('evt_entry').value); 
  }
  else
  {
    document.getElementById('evt_entry').value = i; 
  }

  var run = parseInt(document.getElementById('evt_run').value); 

  if (runs.indexOf(run) < 0) 
  {
    alert("No run " + run); 
    return; 
  }

  window.location.hash = "event&run=" + run + "&entry=" + i; 

  var load_div = document.getElementById('load'); 
  var event_file = "rootdata/run" + run + "/event.root"; 
  load_div.innerHTML = '<a href="'+event_file+'">Event File</a>'
  var head_file = "rootdata/run" + run + "/header.filtered.root"; 
  load_div.innerHTML += ' | <a href="'+head_file+'">Filtered Head File</a>'
  var full_head_file = "rootdata/run" + run + "/header.root"; 
  load_div.innerHTML += ' | <a href="'+full_head_file+'">Full Head File</a>'
  var status_file = "rootdata/run" + run + "/status.root"; 
  load_div.innerHTML += ' | <a href="'+status_file+'">Status File</a>'
  load_div.innerHTML += ' | <a id="dl_link" href="data:text/csv;charset=utf-8">Event CSV</a> '

  var dl_link = document.getElementById("dl_link"); 

  csvContent = "data:text/csv;charset=utf-8,"; 

  if (run!=last_run) 
  {
    last_hd_tree = null;
    last_ev_tree = null;
    last_hd_modified = "";
    last_ev_modified = "";
    last_run = run; 
  }


  //closure for processing header tree
    head_proc = function(tree) 
    {
        if (tree.fEntries <= i) 
        {
          i = tree.fEntries-1; 
          document.getElementById('evt_entry').value = i; 
          pause(); 
        }

        last_hd_tree = tree; 

        dl_link.setAttribute("download",run+"_"+i+".csv"); 


        var sel = new JSROOT.TSelector(); 

        var header_vars = ["event_number","trig_number","buffer_length","pretrigger_samples","readout_time", "readout_time_ns", "trig_time","raw_approx_trigger_time","raw_approx_trigger_time_nsecs","triggered_beams","beam_power","buffer_number","gate_flag","trigger_type","sync_problem"]; 
        for (var b = 0; b < header_vars.length; b++) 
        {
          sel.AddBranch("header."+header_vars[b]);     
        }
        

        sel.Begin = function ()
        {
        }

        sel.Process = function ()
        { 
          var hdrc = document.getElementById(pages['event'].canvases[0]); 

          /*
          var str = ""; 
          //todo, format nicer 
          
          str += "<table>"; 
          for (var b = 0; b < header_vars.length; b++) 
          {
            if ( b % 3 == 0) str += "<tr>"; 
            str += "<td>"+ header_vars[b] + ": </td> <td> " + this.tgtobj["header."+header_vars[b]] + "</td>"; 
            if ( b % 3 == 2) str += "</tr>"; 
          }
          str += "</table>"; 
          */
          hdrc.innerHTML = prettyPrintHeader(this.tgtobj);  
        }; 

        sel.Terminate = function(res) { ; } 

        var args = { numentries: 1, firstentry : i} ;
        tree.Process(sel, args); 
    }

    checkModTime(head_file, function(time)
    {
          if (last_hd_tree && time == last_hd_modified) 
          {
            head_proc(last_hd_tree); 
          }
          else
          {
            last_hd_modified=time; 
            JSROOT.OpenFile(head_file, function(file)  
            {
              if (file == null) 
              { 
                alert("Could not open event file!"); 
                return; 
              }

              file.ReadObject("header", head_proc); 

            }); 
          }

    });



    ev_proc = function(tree) 
    {
      last_ev_tree = tree;
      if (tree.fEntries <= i) 
      {
        i = tree.fEntries-1; 
        document.getElementById('evt_entry').value = i; 
        pause(); 
      }

      var sel = new JSROOT.TSelector(); 

      sel.AddBranch("event.event_number"); 
      sel.AddBranch("event.raw_data"); 
      sel.AddBranch("event.buffer_length"); 

      sel.Begin = function (){ }  ; 
      sel.Process = function ()
      { 
        var data = this.tgtobj['event.raw_data']; 
        var ev = this.tgtobj['event.event_number']; 
        var N = this.tgtobj['event.buffer_length']; 

        var X = []; 
        var ii = 0; 
        for (var x = 0; x < N; x++) { X.push(x/1.5) }; 
        var do_fft = document.getElementById('evt_fft').checked; 
        var do_envelope = document.getElementById('evt_hilbert').checked; 
        var do_measure = document.getElementById('evt_measure').checked; 
        var do_avg = document.getElementById('avg_fft').checked; 
        var upsample = document.getElementById('upsample').value; 
        var autoscale = document.getElementById('evt_autoscale').checked; 

        for (var b = 0; b < data.length; b++)
        {
          for (var ch = 0; ch < data[b].length; ch++)
          {
            if (!arrNonZero(data[b][ch])) continue; 
            var c =""; 

            if (P.canvases.length < ii+2) 
            {
             c = addCanvas(pages['event'],"canvas_small",false) ;
            }
            else
            { 
              c = P.canvases[ii+1]; 
              JSROOT.cleanup(c); 
            }

            var g= JSROOT.CreateTGraph(N, X, data[b][ch]); 

            for (var y = 0; y < N; y++) { g.fY[y]-=64; } 

            if (document.getElementById('filt').checked) 
            {
              var As = document.getElementById('filt_A').value.split(','); 
              var Bs = document.getElementById('filt_B').value.split(','); 

              var A = []; 
              var B = [];

              for (var jj =0; jj < As.length; jj++) 
              {
                A[jj] = parseFloat(As[jj]) 
              }
              for (var jj =0; jj < Bs.length; jj++) 
              {
                B[jj] = parseFloat(Bs[jj]) 
              }

              iir_filter(g,B,A); 

            }

            g.fTitle = " Evt" + ev + ", BD " + b + " , CH " + ch; 
            g.fLineColor = graph_colors[0]; 
            g.fMarkerColor = graph_colors[0]; 
            g.InvertBit(JSROOT.BIT(18)); 
            g.fName="g_b"+b+"_c"+ch; 

            env = null; 

            if (do_envelope && do_fft) 
            {
              env = JSROOT.CreateTGraph(0,[],[]); 
              env.fLineColor = graph_colors[4]; 
              env.fMarkerColor = graph_colors[4]; 
              env.fTitle = "Envelope" 
              env.fName = "envelope" 
            }

            P.graphs[2*ii]=g; 
            P.graphs[2*ii+1]=env; 

            if (do_measure)
            {
              var sum = 0; 
              var sum2 = 0; 

            }


            if (do_fft) 
            {
              var fft =  spec(g,upsample, do_envelope ? env : null); 
              if (do_avg && navg > 0) 
              {
                 if (ii ==0) navg++; 

                 for (var ff = 0; ff < the_ffts[ii].fNpoints; ff++)
                 {
                   the_ffts[ii].fY[ff] =  10 * Math.log10((Math.pow(10, the_ffts[ii].fY[ff]/10) * (navg-1) + Math.pow(10, fft.fY[ff]/10)) / (navg)); 
                 }

              }
              else
              {
                navg = do_avg ? 1 : 0; 
                the_ffts[ii] =fft; 
                the_ffts[ii].fLineColor = graph_colors[ii]; 
                the_ffts[ii].fMarkerColor = graph_colors[ii]; 
              }
            }

            csvContent += g.fY.join(",") + "\r\n"

            var min=64; 
            var max=-64; 
            var sum2 = 0; 
            var sum = 0;

            if (autoscale || do_measure) 
            {
              for (var y = 0; y < g.fY.length; y++) 
              {
                  if (g.fY[y] < min) min = g.fY[y]; 
                  if (g.fY[y] > max) max = g.fY[y]; 

                  if (do_measure)
                  {
                    sum2 += g.fY[y]*g.fY[y]; 
                    sum += g.fY[y]; 
                  }
              }

            }
            var delta = max-min;
            var pave = null; 

            if (do_measure) 
            {
              var avg = sum / g.fNpoints; 
              var rms = Math.sqrt(sum2 / g.fNpoints - avg * avg); 

              pave =  JSROOT.Create("TPaveText"); 
              pave.fTitle="measurements"; 
              pave.fName="measure"; 
              pave.fLineStyle = 0; 
              pave.fTextSize = 12; 
              pave.fX1NDC=0.1; 
              pave.fX2NDC=0.9; 
              pave.fY1NDC=0.1; 
              pave.fY2NDC=0.3; 
              pave.AddText("max: " + max.toFixed(3) + "  min: " + min.toFixed(3) + "  Vpp: " + delta.toFixed(3)); 
              pave.AddText("avg: " + avg.toFixed(3) + "  rms: " + rms.toFixed(3)); 
              pave.fLines.arr[0].fTextColor = 5; 
              pave.fLines.arr[1].fTextColor = 5; 
              P.legends[ii] = pave; 
            }

 
            if (!autoscale)
            {
              var range = parseInt(document.getElementById('evt_zoom').value); 
              min= -range; 
              max= range; 
            }
            else
            {
              max +=0.1*delta; 
              min -=0.1*delta;
            }

            var histo = JSROOT.CreateHistogram("TH1I",100); 
            histo.fName = g.fName + "_h";
            histo.fTitle = g.fTitle;
            histo.fXaxis.fXmin = 0;
            histo.fXaxis.fXmax = N/1.5;;
            histo.fYaxis.fXmin = min;
            histo.fYaxis.fXmax = max;
            histo.fMinimum = min;
            histo.fMaximum = max;
            histo.fXaxis.fTitle = "ns"; 
            histo.fYaxis.fTitle = "adu"; 
            setGraphHistStyle(histo); 
            
            g.fHistogram = histo; 

            JSROOT.draw(c,g,"AL", function(painter)
                {
                  var hist = painter.GetObject().fHistogram; 
                  painter.root_pad().fGridx = 1; 
                  painter.root_pad().fGridy = 1; 
                  var tpainter = painter.FindPainterFor(null,"title"); 
                  var pavetext = tpainter.GetObject(); 
                  pavetext.fTextColor = 31; 
                  tpainter.Redraw(); 
                  JSROOT.redraw(painter.divid, hist, ""); 
                  if (do_envelope & do_fft) 
                  {

                  }
                }); 

            if (do_envelope && do_fft) 
            {
              JSROOT.draw(c,env, "LSAME"); 
            }

            if (do_measure) 
            {
              JSROOT.draw(c,pave,"SAME"); 
            }

            ii++; 
          }
        }
      }; 

      sel.Terminate = function(res) 
      { 
        if (document.getElementById('evt_fft').checked) 
        {
          if (P.canvases.length <= the_ffts.length+1) 
          {
            c = addCanvas(P,'canvas_med',false); 
          }
          else
          {
            c = P.canvases[the_ffts.length+1]; 
            document.getElementById(c).style.display = 'block'; 
            JSROOT.cleanup(c); 
          }

          var mg = JSROOT.CreateTMultiGraph.apply(0, the_ffts); 
          P.multigraphs[0] = mg; 
          mg.fName="power"; 
          mg.fTitle = "Power Spectra" ; 
          if (navg > 0) mg.fTitle += " (" + navg + "avgs)"; 
          var histo = JSROOT.CreateHistogram("TH1I",100); 
          histo.fName = mg.fName + "_h";
          histo.fTitle = mg.fTitle;
          histo.fXaxis.fXmin = 0;
          histo.fXaxis.fXmax = 0.75; 
          histo.fYaxis.fXmin = -30;
          histo.fYaxis.fXmax = 50;
          histo.fMinimum = -30;
          histo.fMaximum = 50;
          histo.fXaxis.fTitle = "f (GHz)"; 
          histo.fYaxis.fTitle = "db ish"; 
          setGraphHistStyle(histo); 
          mg.fHistogram = histo; 
 
          JSROOT.draw(c, mg, "ALP", function (painter) 
          {


                var leg = makeLegend(0.6,1,0.75,1,the_ffts); 
                var tpainter = painter.FindPainterFor(null,"title"); 
                var pavetext = tpainter.GetObject(); 
                pavetext.fTextColor = 31; 
                tpainter.Redraw(); 
   
                JSROOT.draw(painter.divid,leg);
                P.legends[0] = leg; 
           }); 
         }
        else
        {

          if (P.canvases.length > the_ffts.length+1)
          {
            document.getElementById(P.canvases[the_ffts.length+1]).style.display = 'none'; 
          }
        }
      }

      var args = { numentries: 1, firstentry : i} ;
      tree.Process(sel, args); 
    }; 

    checkModTime(event_file, function(time)
        {
          if (last_ev_tree && time == last_ev_modified) 
          {
            ev_proc(last_ev_tree); 
          }
          else
          {
            last_ev_modified=time; 
            JSROOT.OpenFile(event_file, function(file)  
            {
              if (file == null) 
              { 
                alert("Could not open event file!"); 
                return; 
              }

              file.ReadObject("event", ev_proc); 

            }); 
          }

        });





}

function previous() 
{
  var i =parseInt(document.getElementById('evt_entry').value); 
  if (i > 0) i--; 
  go(i); 
}

function next() 
{
  var i =parseInt(document.getElementById('evt_entry').value); 
  go(i+1); 
}

var playing = false; 

function pause()
{

  document.getElementById('play_button').disabled = false; 
  document.getElementById('pause_button').disabled = true; 
  playing = false; 
}


function start()
{
  document.getElementById('play_button').disabled = true; 
  document.getElementById('pause_button').disabled = false; 
  playing = true; 
  next(); 
  setTimeout(function() { if (playing) { start(); } } , document.getElementById('play_speed').value); 
}


function evt() 
{
  optAppend("Run: <input id='evt_run' size=20> "); 
  optAppend("Entry: <input id='evt_entry' value='0' size=20> "); 
  optAppend("<input type='button' value='Go' onClick='go(-1)'>"); 
  optAppend(" | <input type='button' value='&#x22A2;' onClick='go(0)' title='Go to first event'>"); 
  optAppend("<input type='button' value='&larr;' onClick='previous()' title='Previous event'>"); 
  optAppend("<input type='button' id='pause_button' value='&#x25a0;' onClick='pause()' disabled title='Pause playing'>"); 
  optAppend("<input type='button' id='play_button' value='&#x25b6;' onClick='start()' title='Play through events'>"); 
  optAppend("<input type='button' value='&rarr;' onClick='next()' title='Next event'>"); 
  optAppend("<input type='button' value='&#x22A3;' onClick='go(100000000)' title='Last event'>"); 
  optAppend(" &Delta;t<sub>&#x25b6;</sub>:<input type='range' value='500' min='50' max='5000' id='play_speed' size=30' title='Play speed' >"); 
  optAppend(" | Z: <input type='range' value='40' min='4' max='64' id='evt_zoom' title='Manual scale' size=30 onchange='go(-1)'> "); 
  optAppend(" auto<input type='checkbox' id='evt_autoscale' onchange='go(-1)'>"); 
  optAppend(" | spec?<input type='checkbox' id='evt_fft' checked title='Compute power spectrum (necessary for upsampling)' onchange='go(-1)'>");
  optAppend("avg?<input type='checkbox' id='avg_fft' title='Check to average fft's (uncheck to reset)' onchange='go(-1)'>");
  optAppend(" Up<input type='range' value='1' min='1' max ='16' id='upsample' onchange='go(-1)' title='upsample factor'>"); 
  optAppend(" | env?<input type='checkbox' id='evt_hilbert' title='Compute Hilbert Envelope (requires spectrum))' onchange='go(-1)'>");
  optAppend(" | meas?<input type='checkbox' id='evt_measure' title='Perform measurements' onchange='go(-1)'>");
  optAppend(" | filt?<input type='checkbox' id='filt' title='Apply filter' onchange='go(-1)'> b:<input id='filt_B' size=15 title='Filter B coeffs (Comma separated)' value='0.20657,0.41314,0.20657'> a:<input id='filt_A' title='Filter A coeffs (Comma separated)' size=15 value='1,-0.-0.36953,0.19582'>"); 

  var hash_params = hashParams('event'); 
  document.getElementById('evt_run').value = hash_params['run']===undefined ? runs[runs.length-1]: hash_params['run']; 
  document.getElementById('evt_entry').value = hash_params['entry']===undefined ? '0' : hash_params['entry']; 
  go(-1); 
}



function stat()
{

  optAppend("Start Run: <input id='status_start_run' size=10> ");
  optAppend("Stop Run: <input id='status_end_run' size=10> " ); 
  optAppend("Cut: <input id='status_cut' size=20 value=''>");
  optAppend(" | Full xfers(<a href='javascript:transferHelp()'>?</a>) : <input type=checkbox id='status_full_transfers' checked>  | Use decimated files<input type=checkbox id='status_use_decimated' checked><br>"); 
  optAppend("Plot(<a href='javascript:plotHelp()'><u>?</u></a>):<br>");

  var global_scalers= "status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[2]";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[1]/10";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[0]/10";
  global_scalers += ";;;xtitle:time;title:Global Scalers;ytitle:Hz;xtime:1;labels:Fast,Slow Gated,Slow"

  var beam_scalers = ""; 
  for (var i = 0; i <15; i++)
  {
    if (i > 0) beam_scalers+="|||"; 
    beam_scalers+="status.readout_time+status.readout_time_ns*1e-9:status.beam_scalers[0]["+i+"]/10."; 
  }
  beam_scalers+=";;;xtitle:time;title:Beam Scalers;ytitle:Hz;xtime:1;labels:"; 
  for (var i = 0; i <15; i++)
  {
    if (i > 0) beam_scalers+=","; 
    beam_scalers+="Beam "+i; 
  }

  var beam_thresholds = ""; 
  for (var i = 0; i <15; i++)
  {
    if (i > 0) beam_thresholds+="|||"; 
    beam_thresholds+="status.readout_time+status.readout_time_ns*1e-9:status.trigger_thresholds["+i+"]"; 
  }
  beam_thresholds+=";;;xtitle:time;title:Trigger thresholds;ytitle:Power Sum(arb);xtime:1;labels:"; 
  for (var i = 0; i <15; i++)
  {
    if (i > 0) beam_thresholds+=","; 
    beam_thresholds+="Beam "+i; 
  }

  optAppend("<textarea id='plot_status' cols=160 rows=5>"+global_scalers+"\n"+beam_scalers+"\n"+beam_thresholds+"</textarea>");
  optAppend("<br><input type='button' onClick='return statusTreeDraw()' value='Draw'>"); 

  var hash_params = hashParams('status'); 
  document.getElementById('status_start_run').value =  hash_params['run0'] === undefined ? runs[Math.max(0,runs.length-8)] : parseInt(hash_params['run0']); 
  document.getElementById('status_end_run').value =  hash_params['run1'] === undefined ? runs[runs.length-1] : parseInt(hash_params['run1']); 

  statusTreeDraw(); 
}



function show(what) 
{
  playing = false; 

  optClear(); 

  for (var key in pages)
  { 
    document.getElementById(pages[key].main_canvas).style.display = (key === what ? 'block' : 'none');
  }

//  console.log("show('" + what + "')"); 
  if (what in pages)
    clearCanvases(pages[what]); 


  if (what == 'hk') 
  {
    hk(); 
  }
  else if (what == 'status') 
  {
    stat(); 
  }
  else if (what == 'event') 
  {
    evt(); 
  }
  else
  {
    optAppend("Not implemented yet");  
  }
}


function monutor_load()
{



  JSROOT.gStyle.fTitleX=0.1; 
  JSROOT.gStyle.fFrameFillColor=12; 
  JSROOT.gStyle.fFrameLineColor=11; 
  JSROOT.gStyle.fTitleColor=3; 
  JSROOT.gStyle.fGridColor=11; 

  pages['hk'] = Page('hk'); 
  pages['status'] = Page('status'); 
  pages['event'] = Page('event'); 

  document.getElementById('last_updated').innerHTML = last_updated; 

  var hash = window.location.hash; 
  if (hash == '')
  {
    show('hk'); 
  }
  else 
  {
    show(hash.substring(1).split('&')[0]); 
  }

  setInterval(updateRunlist, 30e3); 
}

