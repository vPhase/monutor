monutor  - jsROOT-based monitor for nuphase


Instructions: 

  Whenever invoked, monutor will process new data and generate an updated static monitoring page. 

  monutor uses GNU make to process new files and generate pages. 

  To run, you need a site.cfg file in this directory. Some examples in the cfg directory

  nuphaseroot is required and nuphaseroot-convert must be in a path (it's called to generate ROOT files) 


  The monitoring web page reads the ROOT files directly using jsroot, which is included as a submodule in this repository (you will probably need to check it out). 
  



