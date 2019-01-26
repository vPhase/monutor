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


.PHONY: all sync clean extract-status extract-header extract-hk extract-event rootify-event rootify-hk rootify-header rootify-status filtered-header decimated-status

all: deploy 

include site.cfg


### Pretty error message if you don't have site 
site.cfg: 
	$(error "You must copy (or symlink) a site.cfg into this directory!") 

clean: 
	rm -f sync *.d extract rootify 

startdir=$(shell pwd) 

### Copy over new files 
sync: | $(LOCAL_DEST) 
ifdef REMOTE_HOST
	echo "---" >> sync 
	date >> sync
	mkdir -p $(LOCAL_DEST)/$(EVENT_DIR)
	mkdir -p $(LOCAL_DEST)/$(STATUS_DIR)
	mkdir -p $(LOCAL_DEST)/$(HK_DIR)
	mkdir -p $(LOCAL_DEST)/$(HEADER_DIR)
	-ssh -x -T midway "cd $(startdir); rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(STATUS_DIR) $(LOCAL_DEST)/ >> $@"
	-ssh -x -T midway "cd $(startdir); rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HK_DIR) $(LOCAL_DEST)/ >> $@"
	-ssh -x -T midway "cd $(startdir); rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(EVENT_DIR) $(LOCAL_DEST)/ >> $@"
	-ssh -x -T midway "cd $(startdir); rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HEADER_DIR) $(LOCAL_DEST)/ >> $@"
	#rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(STATUS_DIR) $(LOCAL_DEST)/ >> $@
	#rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HK_DIR) $(LOCAL_DEST)/ >> $@
	#rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(EVENT_DIR) $(LOCAL_DEST)/ >> $@
	#rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HEADER_DIR) $(LOCAL_DEST)/ >> $@
else
	echo "No need to sync" 
endif

ifdef REMOTE_HOST # only need to the the weird tarring thing if from a remote host
### These are responsible for generating the list of files to extract and rootify 
### Since sync is phony (and must be), these will infinitely loop (because they are included) 
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

rootify.d: 
	touch $@
filtered.d: 
	touch $@
endif
endif


## Use slightly different rules for remote host vs. not. Assume not tarred if not using remote host

ifndef REMOTE_HOST
ifndef MAKE_RESTARTS
# This enumerates the necessary ROOT files 
rootify.d: sync | $(ROOT_DIR) 
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "rootify-event: " >> $@
	find $(RAW_DIR) -type d -name event -printf '$(ROOT_DIR)/%P.root ' >> $@
	echo >> $@
	echo -n "rootify-status: " >> $@
	find $(RAW_DIR) -type d -name status -printf '$(ROOT_DIR)/%P.root ' >> $@
	find $(RAW_DIR) -type d -name status -printf '$(ROOT_DIR)/%P.decimated.root ' >> $@
	echo >> $@
	echo -n "rootify-header: " >> $@
	find $(RAW_DIR) -type d  -name header -printf '$(ROOT_DIR)/%P.root ' >> $@
	echo >> $@
	echo -n "rootify-hk: " >> $@ 
	find $(RAW_DIR)/hk -mindepth 3 -type d -printf '$(ROOT_DIR)/hk/%P.root ' >> $@
	echo >> $@

filtered.d: 
	touch $@
endif

else #with remote host

ifeq (1,${MAKE_RESTARTS}) 
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
endif #end remote host 


ifdef REMOTE_HOST
MAKE_RESTARTS_FOR_FILTERED=2
else
MAKE_RESTARTS_FOR_FILTERED=1
endif

ifeq (${MAKE_RESTARTS_FOR_FILTERED},${MAKE_RESTARTS})
filtered.d: rootify  | $(ROOT_DIR) 
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "decimated-status: " >> $@
	find $(ROOT_DIR) -type f -name status.root -printf '%h/status.decimated.root ' >> $@
	echo >> $@
	echo -n "filtered-header: " >> $@
	find $(ROOT_DIR) -type d  -name run* -exec test -e {}/event.root -a -e {}/header.root \; -printf '%p/header.filtered.root ' >>$@
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
	tar -C $(@D) -xf $^ *.tar || tar -cvf $@ --files-from /dev/null 

# Put all files in tar files so we don't have so many of them 
$(RAW_DIR)/%.tar: $(RAW_DIR)/%
	rm -f $@.tmp 
	if [ -f  $@ ]; then cp $@ $@.tmp ; fi 
	cd $(@D); tar --update -f $(*F).tar.tmp $(*F)/* 
	mv $@.tmp $@ 
	rm -f $</* 
	rmdir $< 


# Do NOT delete tar files!
.PRECIOUS: $(RAW_DIR)/%.tar 

#special case hk 


#special case hk 
$(ROOT_DIR)/hk/%.root: $(RAW_DIR)/hk/%.tar 
	mkdir -p $(@D) 
	tar -C $(@D) --extract -f $< 
	nuphaseroot-convert hk $(@D)/$(*F) $@.tmp
	mv $@.tmp $@ 
	rm -rf $(@D)/$(*F)  
	touch new_hk; 

$(ROOT_DIR)/hk/%.root: $(RAW_DIR)/hk/% 
	mkdir -p $(@D)
	nuphaseroot-convert hk $< $@.tmp
	mv $@.tmp $@ 
	touch new_hk 



# Crazy rule to rootify root file from raw event tar
$(ROOT_DIR)/%.root: $(RAW_DIR)/%.tar 
	mkdir -p $(@D) 
	tar -C $(@D) --extract -f $< 
	nuphaseroot-convert $(*F) $(@D)/$(*F) $@.tmp
	mv $@.tmp $@ 
	rm -rf $(@D)/$(*F)  

$(ROOT_DIR)/%.root: $(RAW_DIR)/% 
	mkdir -p $(@D)
	nuphaseroot-convert $(*F) $< $@.tmp
	mv $@.tmp $@ 



# Rule to make decimated file 
$(ROOT_DIR)/%.decimated.root: $(ROOT_DIR)/%.root
	ln $< $<.tmp 
	nuphaseroot-decimate $(*F) 25 $(@D)/$(*F).root.tmp 
	unlink $<.tmp 
	mv $@.tmp $@ 

$(ROOT_DIR)/%/header.filtered.root: $(ROOT_DIR)/%/event.root $(ROOT_DIR)/%/header.root 
	nuphaseroot-convert filtered_header $^ $@ 

rootify: rootify.d rootify-event rootify-status rootify-header rootify-hk 
	touch $@ 

filtered: rootify filtered.d filtered-header decimated-status
	touch $@ 


html/runs: rootify filtered
	find $(ROOT_DIR) -type d -name run* -printf '  %f\n' | sed 's/run//' | sort -n  | paste -s -d ',' > $@ 

html/runlist.js: html/runs
	echo "var runs = [ " > $@ 
	cat  $< >> $@
	echo "];" >> $@
	echo "var last_updated = \"`date -u`\";" >> $@ 

html/runlist.json: html/runs
	echo "{ \"runs\" : [" > $@
	sed -e 's/,^//g'  $< >> $@
	echo "]," >> $@
	echo "\"last_updated\" : \"`date -u`\"" >> $@ 
	echo "}" >> $@

$(HTML_DIR)/% : html/% 
	cp  $< $@

new_hk: 
	touch $@

# Merge all housekeeping into a single root file since it's small 
$(HTML_DIR)/all_hk.root: new_hk  | $(HTML_DIR) rootify
	hadd  $@.tmp $(ROOT_DIR)/hk/*/*/*.root
	mv $@.tmp $@


$(HTML_DIR)/rootdata:  | $(HTML_DIR) 
	ln -sf $(ROOT_DIR) $(HTML_DIR)/rootdata 

$(HTML_DIR)/jsroot: jsroot/scripts jsroot/style
	mkdir -p $@
	cp -r $^ $@

DEPLOY_TARGETS= rootify filtered $(HTML_DIR)/rootdata $(HTML_DIR)/index.html $(HTML_DIR)/monutor.js  $(HTML_DIR)/runlist.js $(HTML_DIR)/runlist.json \
								$(HTML_DIR)/all_hk.root $(HTML_DIR)/jsroot $(HTML_DIR)/monutor.ico $(HTML_DIR)/monutor.png $(HTML_DIR)/KissFFT.js $(HTML_DIR)/FFT.js 

ifdef REMOTE_HOST
ALL_DEPLOY_TARGETS = extract $(DEPLOY_TARGETS)
else
ALL_DEPLOY_TARGETS = $(DEPLOY_TARGETS)
endif

deploy: $(ALL_DEPLOY_TARGETS) | $(HTML_DIR) 
	touch $@ 


ifdef REMOTE_HOST
include extract.d
endif

include rootify.d
include filtered.d 





