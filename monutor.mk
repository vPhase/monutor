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
include site.cfg


.PHONY: all delete_once extract-status extract-header extract-hk extract-event rootify rootify-event rootify-hk rootify-header rootify-status deploy

all: delete_once rootify 


## This is my hacky way of making sure that the rsync always runs, but only once
## There is probably a smarter way 
delete_once: 
	rm -f .*_once

.status_once: ;
.hk_once: ;
.event_once: ;
.header_once: ;



### Pretty error message if you don't have site 
site.cfg: 
	$(error "You must copy (or symlink) a site.cfg into this directory!") 

## This copies new files over and rootifys the extraction target. 
## 

sync-status.d: .status_once
	touch $^
	echo -n "extract-status : " > $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(STATUS_DIR) $(LOCAL_DEST)/ | grep flat.tar | sed 's#^#$(LOCAL_DEST)/#; s/.flat.tar/.extracted \\/' >> $@
	echo "" >> $@ 

sync-hk.d: .hk_once
	touch $^
	echo -n "extract-hk : " > $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HK_DIR) $(LOCAL_DEST)/ | grep flat.tar | sed 's#^#$(LOCAL_DEST)/#; s/.flat.tar/.hkextracted \\/' >> $@
	echo "" >> $@ 

sync-event.d: .event_once
	touch $^
	echo -n "extract-event : " > $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(EVENT_DIR) $(LOCAL_DEST)/ | grep flat.tar | sed 's#^#$(LOCAL_DEST)/#; s/.flat.tar/.extracted \\/' >> $@
	echo "" >> $@ 

sync-header.d: .header_once
	touch $^
	echo -n "extract-header : " > $@
	rsync -av $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HEADER_DIR) $(LOCAL_DEST)/ | grep flat.tar | sed 's#^#$(LOCAL_DEST)/#; s/.flat.tar/.extracted \\/' >> $@
	echo "" >> $@ 


extract: extract-status extract-event extract-hk extract-header 
	touch extract

include sync-status.d
include sync-hk.d
include sync-event.d
include sync-header.d

$(RAW_DIR)/hk: 
	mkdir -p $@ 

%.hkextracted: %.tar | $(RAW_DIR)/hk
	tar -C $(RAW_DIR)/hk -x -f $^
	touch $@ 

%.extracted: %.tar 
	tar -C $(RAW_DIR) -x -f $^
	touch $@ 

$(LOCAL_DEST)/%.tar: $(LOCAL_DEST)/%.flat.tar 
	tar -C $(@D) -xf $^ *.tar 

# This enumerates the necessary ROOT files 
rootify.d: | extract 
	echo "# Automatically generated file. Dont' touch. " > $@
	echo -n "rootify-event: " >> $@
	find $(RAW_DIR) -type d -name run* -printf '$(ROOT_DIR)/%f/event.root ' >> $@
	echo >> $@
	echo -n "rootify-status: " >> $@
	find $(RAW_DIR) -type d -name run* -printf '$(ROOT_DIR)/%f/status.root ' >> $@
	echo >> $@
	echo -n "rootify-header: " >> $@
	find $(RAW_DIR) -type d  -name run* -printf '$(ROOT_DIR)/%f/header.root ' >> $@
	echo >> $@
	echo -n "rootify-hk: " >> $@ 
	find $(RAW_DIR)/hk -mindepth 3 -type d -printf '$(ROOT_DIR)/hk/%P.root ' >> $@
	echo >> $@

# Put all files in tar files so we don't have so many of them 
$(RAW_DIR)/%.tar: $(RAW_DIR)/%
	tar ---update -f $@ $</* 
	rm -f $</* 


# Do NOT delete tar files!
.PRECIOUS: $(RAW_DIR)/%.tar 

include rootify.d

# Crazy rule to rootify root file from raw event tar
$(ROOT_DIR)/%.root: $(RAW_DIR)/%.tar 
	mkdir -p $(@D) 
	tar -C $(@D) --extract -f $< 
	nuphaseroot-converter $(*F) $@ $(@D)/event 
	rm -rf $(@D)/$(*F)  



rootify: rootify-event rootify-status rootify-header rootify-hk | extract

##TODO 
html/site.js: 
	touch $@

##TODO 
html/runlist.js: 
	touch $@ 

$(HTML_DIR)/% : html/% 
	cp $@ $< 

deploy: $(HTML_DIR)/index.html $(HTML_DIR)/site.js $(HTML_DIR)/monutor.js $(HTML_DIR)/root.js $(HTML_DIR)/runlist.js | rootify











