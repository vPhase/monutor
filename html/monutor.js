
var graph_colors = [30, 46,33,40,39, 7,28,5,19,32,37,2,3,4,9,29,1,6,49,41,43,31]; 


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


function plotHelp()
{
alert("Plot Help:\nDifferent plots are separated by line returns. Different lines on same plot are separated by |||.\nAfter ;;;, you may add additional options\n\txtitle=string\n\tytitle=string\n\txtime=0|1\n\tytime=0|1\n\tlabels=label1,label2,label3,etc."); 

}


function arrNonZero(arr) 
{
  for (var i = 0; i < arr.length; i++)
  {
    if (arr[i]) return true; 
  }

  return false; 
}




var pages = {}; 

function Page(name)
{
  console.log("Made new page " + name); 
  P = new Object; 
  P.main_canvas = name+"c"; 
  document.getElementById('main').innerHTML += '<div id="'+P.main_canvas+'" style="display: none" width="100%" height=100%"> (loading js...)'+name+' </div>'; 
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

  for (var i = 0; i < p.canvases.length; i++) 
  {
      JSROOT.cleanup(p.canvases[i]); 
  }

  p.canvases =[]; 
  var c = document.getElementById(p.main_canvas); 
  c.innerHTML = ""; 
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
    addCanvas(page); 
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

          g.fEditable = false; 
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
            mg.fEditable = false; 
            mg.fTitle = page.titles[ii]; 
            JSROOT.draw(page.canvases[ii],mg,"A" +page.pstyle[ii], function (painter) 
              {
                var hist = painter.firstpainter.GetHisto(); 
                hist.fXaxis.fTitle=page.xtitles[ii]; 
                hist.fYaxis.fTitle=page.ytitles[ii]; 
                if (page.xtime[ii])
                {
                  hist.fXaxis.fTitle += " (start = " + new Date(hist.fXaxis.fXmin*1000.).toUTCString() + ")"; 
                }
                if (page.ytime[ii])
                {
                  hist.fYaxis.fTitle += " (start = " + new Date(hist.fYaxis.fXmin*1000.).toUTCString() + ")"; 
                }
 
                hist.fYaxis.fTimeDisplay=page.ytime[ii]; 
                hist.fXaxis.fTimeDisplay=page.xtime[ii]; 
                JSROOT.redraw(page.canvases[ii],hist,"", function (painter) 
                  {
                    if (page.labels[ii].length)
                    {
                      var leg = makeLegend(0.7,1,0.9,1,page.leg_graphs[ii]); 
                      JSROOT.draw(page.canvases[ii],leg);
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

  window.location.hash = "status&run0=" + run0 + "&run1=" + run1; 

  var status_trees = []; 
  startLoading("Loading status files... be patient if you asked for a lot of runs"); 

  var files_to_load = [];
  for (var r = run0; r <= run1; r++)
  {
    files_to_load.push("rootdata/run"+r+"/status.root"); 
  }
  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {
    JSROOT.OpenFile(files_to_load[i], function(file)
    {  
       if (file == null)
       { 
         status_trees.push(null); 
         return; 
       }

       file.ReadObject("status;1", function(tree) 
       {
          status_trees.push(tree); 
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

  startLoading("Loading hk files"); 
  var files_to_load = []; 
  for (var d = new Date(t0); d<= t2; d.setDate(d.getDate()+1)) 
  {
    var mon = d.getUTCMonth()+1; 
    var day = d.getUTCDate(); 
    if (mon < 9) mon = "0" + mon; 
    if (day < 9) day = "0" + day; 
    files_to_load.push("rootdata/hk/" + d.getUTCFullYear()  + "/" + mon + "/" + day+ ".root"); 
  }
  console.log(files_to_load); 

  for (var i = 0; i < files_to_load.length; i++)
  {

    JSROOT.OpenFile(files_to_load[i], function(file)
    { 
       if (file == null)
       { 
         hktrees.push(null); 
         return; 
       }
       file.ReadObject("hk;1", function(tree) 
       {
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
  optAppend("Cut: <input id='hk_cut' size=20 value='Entry$%10==0'> <br>");
  optAppend("Plot(<a onClick='return plotHelp()'>?</a>):<br>");
  optAppend("<textarea id='plot_hk' cols=160 rows=5>hk.unixTime:hk.temp_master|||hk.unixTime:hk.temp_slave|||hk.unixTime:hk.temp_case;;;xtitle:time;title:Temperatures;ytitle:C;xtime:1;labels:master,slave,case\nhk.unixTime:hk.current_master|||hk.unixTime:hk.current_slave|||hk.unixTime:hk.current_frontend;;;xtitle:time;ytitle:mA;labels:master,slave,frontend;xtime:1;title:currents\nhk.unixTime:hk.disk_space_kB;;;title:disk;xtitle:time;xtime:1;labels:disk;ytitle:kB</textarea>");
  optAppend("<br><input type='button' onClick='return hkTreeDraw()' value='Draw'>"); 
  optAppend("<a href='all_hk.root'>  (Download All HK ROOT File)</a>"); 
  
  var now = Date.now(); 

  var hash_params = hashParams('hk'); 

  document.getElementById('hk_start_time').value = new Date( hash_params['t0'] === undefined ? Date.now()- 7*24*3600*1000 : parseInt(hash_params['t0'])).toISOString(); 
  document.getElementById('hk_end_time').value = new Date(hash_params['t1'] === undefined ? Date.now() + 24*3600*1000 : parseInt(hash_params['t1'])).toISOString(); 

  hkTreeDraw(); 

} 


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

  var event_file = "rootdata/run" + run + "/event.root"; 
  document.getElementById('load').innerHTML = '<a href="'+event_file+'">Event File</a>'
  var head_file = "rootdata/run" + run + "/header.filtered.root"; 
  document.getElementById('load').innerHTML += ' | <a href="'+head_file+'">Filtered Head File</a>'
  var full_head_file = "rootdata/run" + run + "/header.root"; 
  document.getElementById('load').innerHTML += ' | <a href="'+full_head_file+'">Full Head File</a>'

  JSROOT.OpenFile(head_file, function(file) 
  {
    if (file == null) 
    { 
      alert("Could not open filtered file!"); 
      return; 
    }

    file.ReadObject("header", function(tree) 
    {
      if (tree.fEntries <= i) 
      {
        i = tree.fEntries-1; 
        document.getElementById('evt_entry').value = i; 
      }


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
        hdrc.innerHTML = str; 
      }; 

      sel.Terminate = function(res) { ; } 

      var args = { numentries: 1, firstentry : i} ;
      tree.Process(sel, args); 
    }); 
  }); 

  JSROOT.OpenFile(event_file, function(file)  
  {
    if (file == null) 
    { 
      alert("Could not open event file!"); 
      return; 
    }

    file.ReadObject("event", function(tree) 
    {
      if (tree.fEntries <= i) 
      {
        i = tree.fEntries-1; 
        document.getElementById('evt_entry').value = i; 
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
            g.fTitle = " Evt" + ev + ", BD " + b + " , CH " + ch; 
            g.fLineColor = graph_colors[0]; 
            g.fMarkerColor = graph_colors[0]; 
            P.graphs[ii]=g; 
            JSROOT.draw(c,g,"ALP"); 
            ii++; 
          }
        }
      }; 

      sel.Terminate = function(res) { ; } 
      var args = { numentries: 1, firstentry : i} ;
      tree.Process(sel, args); 
    }); 

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

function evt() 
{
  optAppend("<input type='button' value='<--' onClick='previous()'>"); 
  optAppend("Run: <input id='evt_run' size=20> "); 
  optAppend("Entry: <input id='evt_entry' value='0' size=20> "); 
  optAppend("<input type='button' value='Go' onClick='go(-1)'>"); 
  optAppend("<input type='button' value='-->' onClick='next()'>"); 

  var hash_params = hashParams('event'); 
  document.getElementById('evt_run').value = hash_params['run']===undefined ? runs[runs.length-1]: hash_params['run']; 
  document.getElementById('evt_entry').value = hash_params['entry']===undefined ? '0' : hash_params['entry']; 
  go(-1); 
}


function stat()
{

  optAppend("Start Run: <input id='status_start_run' size=10> ");
  optAppend("Stop Run: <input id='status_end_run' size=10> " ); 
  optAppend("Cut: <input id='status_cut' size=20 value='Entry$%10==0'> <br>");
  optAppend("Plot(<a onClick='return plotHelp()' >?</a>):<br>");

  var global_scalers= "status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[0]/10";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[1]/10";
  global_scalers += "|||status.readout_time+status.readout_time_ns*1e-9:status.global_scalers[2]";
  global_scalers += ";;;xtitle:time;title:Global Scalers;ytitle:Hz;xtime:1;labels:Slow,Slow Gated,Fast"

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
    beam_thresholds+="status.readout_time+status.readout_time_ns*1e-9:status.trigger_thresholds["+i+"]/10."; 
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
  document.getElementById('status_start_run').value =  hash_params['run0'] === undefined ? runs[Math.max(0,runs.length-5)] : parseInt(hash_params['run0']); 
  document.getElementById('status_end_run').value =  hash_params['run1'] === undefined ? runs[runs.length-1] : parseInt(hash_params['run1']); 

  statusTreeDraw(); 
}



function show(what) 
{
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
}

