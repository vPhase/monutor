#
#  Main implementation of monutor
#

include site.cfg

.PHONY: all sync sync-status sync-headers sync-event sync-hk rootify-status rootify-event rootify-hk rootify-header rootify html 

all: sync

sync-status: 
	rsync -a --progress $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(STATUS_DIR) $(LOCAL_PATH_BASE)/

sync-hk: 
	rsync -a --progress $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HK_DIR) $(LOCAL_PATH_BASE)/

sync-event: 
	rsync -a --progress $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(EVENT_DIR) $(LOCAL_PATH_BASE)/

sync-header: 
	rsync -a --progress $(REMOTE_HOST):$(REMOTE_PATH_BASE)/$(HEADER_DIR) $(LOCAL_PATH_BASE)/

sync: sync-status sync-header sync-event sync-hk 






