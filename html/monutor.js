




function optClear()
{
  document.getElementById('opt').innerHTML = ""; 
}

function optAppend(str)
{
  document.getElementById('opt').innerHTML += str; 
}


function plotHelp()
{
alert("||| to separate lines on same plot, line returns to separate plots"); 

}




function lastModified(file) 
{
  var req = new XMLHttpRequest(); 
  req.open("HEAD", file, false); 
  req.send(null); 
  return new Date(req.getResponseHeader("Last-Modified")).getTime(); 
}

// persist some things... 
var canvases = []; 
var graphs = [];  
var multigraphs = []; 
var legends = []; 
var wants = []; 
var labels =[]; 
var xtitles = []; 
var ytitles = []; 
var titles = []; 
var xtime = []; 
var ytime = []; 
var pstyle = []; 

function clearCanvases()
{
  graphs = []; 
  wants = [];  
  multigraphs = []; 
  xtitles = []; 
  ytitles = []; 
  xtime = []; 
  ytime = []; 
  labels = []; 
  pstyle = []; 
  legends = []; 
  titles = []; 

  for (var i = 0; i < canvases.length; i++) 
  {
    JSROOT.cleanup(canvases[i]); 
  }

  canvases =[]; 
  var c = document.getElementById('c'); 
  c.innerHTML = ""; 
}

function addCanvas() 
{
  var i = canvases.length+1; 
  name = "c" + i; 
  var c = document.getElementById('c'); 
  c.innerHTML += '<div class="canvas" id="' +name+ '">'+name+'</div>'; 
  canvases.push(name); 
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
      leg.fFillColor=36; 
      leg.fNColumns = objs.length > 3 ? 2 : 1; 
 
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


function doDraw(t, what,cut) 
{
  clearCanvases(); 
  var plots = document.getElementById(what).value.split("\n"); 
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
    var this_pstyle = "PLC"; 
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

    xtitles.push(this_xtitle); 
    titles.push(this_title); 
    ytitles.push(this_ytitle); 
    labels.push(this_label); 
    xtime.push(this_xtime); 
    ytime.push(this_ytime); 
    pstyle.push(this_pstyle); 


    graphs.push([]); 
    addCanvas(); 
    wants.push(draws.length); 
    for (var j = 0; j < draws.length; j++) 
    {
      args = { expr: draws[j], cut: cut, graph: true, drawopt: [i,j]}; 
      t.Draw(args, function(g,indices,ignore)
      {
        var ii = indices[0]; 
        var jj = indices[1]; 
        g.fEditable = false; 
        g.fTitle = labels[ii][jj]; 
        g.fName = labels[ii][jj]; 
        graphs[ii].push(g); 
        if (graphs[ii].length == wants[ii]) 
        {
          var mg = JSROOT.CreateTMultiGraph.apply(0,graphs[ii]); 
          mg.fEditable = false; 
          mg.fTitle = titles[ii]; 
          JSROOT.draw(canvases[ii],mg,"A" +pstyle[ii], function (painter) 
            {
              mg.fHistogram.fXaxis.fTitle=xtitles[ii]; 
              mg.fHistogram.fYaxis.fTitle=ytitles[ii]; 
              mg.fHistogram.fYaxis.fTimeDisplay=ytime[ii]; 
              mg.fHistogram.fXaxis.fTimeDisplay=xtime[ii]; 
              JSROOT.redraw(canvases[ii],mg,"A" +pstyle[ii], function (painter) 
                {
                  var leg = makeLegend(0.8,1,0.9,1,graphs[ii]); 
                  JSROOT.draw(canvases[ii],leg);
                  legends.push(leg); 
                }); 
            }
          ); 
          multigraphs.push(mg); 
        }
      }); 
    }
  }
}

var HKTree = ''; 
var HKTreeWhen = 0; 

function hkTreeDraw() 
{
  var cut = document.getElementById('cut').value; 
  if (cut != "") cut+= "&&"; 
  var t0 = new Date(document.getElementById('start_time').value); 
  var t1 = new Date(document.getElementById('end_time').value); 
  cut += "(hk.unixTime>" + t0.getTime()/1000 + "&&hk.unixTime<" + t1.getTime()/1000 + ")"; 

  if (HKTree == '' || lastModified('all_hk.root') >  HKTreeWhen) 
  {
    startLoading("Loading all_hk.root"); 
    var when = lastModified('all_hk.root'); 
    JSROOT.OpenFile('all_hk.root', function(file) { 
                    file.ReadObject("hk;1", function(tree) 
                    {
                      stopLoading(); 
                      HKTree = tree; 
                      HKTreeWhen = when; 
                      doDraw(tree,'plot_hk',cut); 
                    }); 
           }
      ) ; 
  }
  else doDraw(HKTree,'plot_hk',cut); 
}



function hk() 
{

  optAppend("Start Time: <input id='start_time' size=20> ");
  optAppend("Stop Time: <input id='end_time' size=20> " ); 
  optAppend("Cut: <input id='cut' size=20 value='Entry$%10==0'> <br>");
  optAppend("Plot(<a onClick='return plotHelp()' href='#hk'>?</a>):<br>");
  optAppend("<textarea id='plot_hk' cols=160 rows=5>hk.unixTime:hk.temp_master|||hk.unixTime:hk.temp_slave|||hk.unixTime:hk.temp_case;;;xtitle:time;title:Temperatures;ytitle:C;xtime:1;labels:master,slave,case\nhk.unixTime:hk.current_master|||hk.unixTime:hk.current_slave|||hk.unixTime:hk.current_frontend;;;xtitle:time;ytitle:mA;labels:master,slave,frontend;xtime:1;title:currents\nhk.unixTime:hk.disk_space_kB;;;title:disk;xtitle:time;xtime:1;labels:disk;ytitle:kB</textarea>");
  optAppend("<br><input type='button' onClick='return hkTreeDraw()' value='Draw'>"); 
  optAppend("<a href='all_hk.root'>  (Download ROOT File)</a>"); 
  
  var now = Date.now(); 

  document.getElementById('start_time').value = new Date(Date.now()- 7*24*3600*1000).toISOString(); 
  document.getElementById('end_time').value = new Date(Date.now()).toISOString(); 

  hkTreeDraw(); 

} 


function show(what) 
{
  window.location.hash = what; 
  optClear(); 
  clearCanvases(); 

  if (what == 'hk') 
  {
    hk(); 
  }
  else
  {
    optAppend("Not implemented yet"); 
  }
}


function monutor_load()
{

  JSROOT.gStyle.fTitleX=0.1; 
  JSROOT.gStyle.fFrameFillColor=37; 

  var hash = window.location.hash; 
  window.location.hash = ''; 
  if (hash == '')
  {
    show('hk'); 
  }
  else 
  {
    show(hash.substring(1)); 
  }
}

