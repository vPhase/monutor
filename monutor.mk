###############################################
#  monutor 
#
#  That's right, monutor is largely implemented in make. Sorry, it seemed like it'd be a
#  good idea, but it's probably an illegible mess. 
#
#  Cosmin Deaconu <cozzyd@kicp.uchicago.edu>
#     
#

## Define what you need for your site in site.cfg


.PHONY: all sync clean extract-status extract-header extract-hk extract-event rootify-event rootify-hk rootify-header rootify-status 

all: rootify 

include site.cfg


### Pretty error message if you don't have site 
site.cfg: 
	$(error "You must copy (or symlink) a site.cfg into this directory!") 

clean: 
	rm -f sync *.d extract rootify 


### Copy over new files 
sync: | $(LOCAL_DEST) 
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(STATUS_DIR) $(LOCAL_DEST)/ >> $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HK_DIR) $(LOCAL_DEST)/ >> $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(EVENT_DIR) $(LOCAL_DEST)/ >> $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HEADER_DIR) $(LOCAL_DEST)/ >> $@


### These are responsible for generating the list of files to extract and rootify 
### Synce sync is phony (and must be), these will infinitely loop (because they are included) 
### without MAKE_RESTARTS
ifndef MAKE_RESTARTS 
extract.d: sync | $(RAW_DIR) $(RAW_DIR)/hk
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "extract-event: " >> $@
	find $(LOCAL_DEST)/$(EVENT_DIR) -type f -name *.flat.tar | sed 's/.flat.tar/.extracted \\/'>> $@
	echo >> $@
	echo -n "extract-status: " >> $@
	find $(LOCAL_DEST)/$(STATUS_DIR) -type f -name *.flat.tar | sed 's/.flat.tar/.extracted \\/'>> $@
	echo >> $@
	echo -n "extract-header: " >> $@
	find $(LOCAL_DEST)/$(HEADER_DIR) -type f -name *.flat.tar | sed 's/.flat.tar/.extracted \\/'>> $@
	echo >> $@
	echo -n "extract-hk: " >> $@ 
	find $(LOCAL_DEST)/$(HK_DIR) -type f -name *.flat.tar | sed 's/.flat.tar/.hkextracted \\/'>> $@
	echo >> $@

# This enumerates the necessary ROOT files 
rootify.d: extract | $(ROOT_DIR) 
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "rootify-event: " >> $@
	find $(RAW_DIR) -type d -name event -printf '$(ROOT_DIR)/%P.root ' >> $@
	find $(RAW_DIR) -type f -name event.tar -printf '$(ROOT_DIR)/%P ' | sed 's/.tar/.root/g' >> $@
	echo >> $@
	echo -n "rootify-status: " >> $@
	find $(RAW_DIR) -type d -name status -printf '$(ROOT_DIR)/%P.root ' >> $@
	find $(RAW_DIR) -type f -name status.tar -printf '$(ROOT_DIR)/%P ' | sed 's/.tar/.root/g' >> $@
	echo >> $@
	echo -n "rootify-header: " >> $@
	find $(RAW_DIR) -type d  -name header -printf '$(ROOT_DIR)/%P.root ' >> $@
	find $(RAW_DIR) -type f -name header.tar -printf '$(ROOT_DIR)/%P ' | sed 's/.tar/.root/g' >> $@
	echo >> $@
	echo -n "rootify-hk: " >> $@ 
	find $(RAW_DIR)/hk -mindepth 3 -type d -printf '$(ROOT_DIR)/hk/%P.root ' >> $@
	find $(RAW_DIR) -type f -name *.tar -printf '$(ROOT_DIR)/%P ' | sed 's/.tar/.root/g' >> $@
	echo >> $@


endif

## Directories
$(LOCAL_DEST): 
	mkdir -p $@
$(RAW_DIR): 
	mkdir -p $@
$(RAW_DIR)/hk: 
	mkdir -p $@
$(ROOT_DIR): 
	mkdir -p $@
$(HTML_DIR): 
	mkdir -p $@

## Extraction!
extract: extract.d extract-status extract-event extract-hk extract-header 
	touch $@


## Extraction of hk 
%.hkextracted: %.tar | $(RAW_DIR)/hk
	tar -C $(RAW_DIR)/hk -x -f $^
	touch $@ 

## Extraction of non-hk
%.extracted: %.tar | $(RAW_DIR) 
	tar -C $(RAW_DIR) -x -f $^
	touch $@ 

## Unflatten 
$(LOCAL_DEST)/%.tar: $(LOCAL_DEST)/%.flat.tar  | $(LOCAL_DEST) 
	tar -C $(@D) -xf $^ *.tar 

# Put all files in tar files so we don't have so many of them 
$(RAW_DIR)/%.tar: $(RAW_DIR)/%
	## TODO: add temporary file here to avoid misaps
	
	cd $(@D); tar --update -f $(*F).tar.tmp $(*F)/* 
	rm -f $</* 
	rmdir $< 


# Do NOT delete tar files!
.PRECIOUS: $(RAW_DIR)/%.tar 


# Crazy rule to rootify root file from raw event tar
$(ROOT_DIR)/%.root: $(RAW_DIR)/%.tar 
	mkdir -p $(@D) 
	tar -C $(@D) --extract -f $< 
	nuphaseroot-convert $(*F) $(@D)/$(*F) $@.tmp
	mv $@.tmp $@ 
	rm -rf $(@D)/$(*F)  


#special case hk 
$(ROOT_DIR)/hk/%.root: $(RAW_DIR)/hk/%.tar 
	mkdir -p $(@D) 
	tar -C $(@D) --extract -f $< 
	nuphaseroot-convert hk $(@D)/$(*F) $@.tmp
	mv $@.tmp $@ 
	rm -rf $(@D)/$(*F)  


rootify: extract rootify.d rootify-event rootify-status rootify-header rootify-hk 
	touch $@ 

##TODO 
html/site.js: 
	touch $@

##TODO 
html/runlist.js: 
	touch $@ 

$(HTML_DIR)/% : html/% 
	cp  $< $@


# Merge all housekeeping into a single root file since it's small 
$(HTML_DIR)/all_hk.root: rootify  | $(HTML_DIR) 
	hadd  $@.tmp $(ROOT_DIR)/hk/*/*/*.root
	mv $@.tmp $@


$(HTML_DIR)/rootdata:  | $(HTML_DIR) 
	ln -sf $(ROOT_DIR) $(HTML_DIR)/rootdata 

deploy:  rootify $(HTML_DIR)/rootdata $(HTML_DIR)/index.html $(HTML_DIR)/site.js $(HTML_DIR)/monutor.js  $(HTML_DIR)/runlist.js $(HTML_DIR)/all_hk.root  | $(HTML_DIR) 
	touch $@ 




include extract.d
include rootify.d





