####################################
# Build command for Chrome Extension
####################################

.PHONY: help build

STAGE ?= dev

help:
	$(info ${HELP_MESSAGE})
	@exit 0

build:
	@echo 'Removing prior build...' 
	npm run-script build:clean
ifeq ($(STAGE), dev)
	@echo 'Running new dev stage build..' 
	npm run-script build:dev
endif
ifeq ($(STAGE), demo)
	@echo 'Running new demo stage build..' 
	npm run-script build:demo
endif
ifeq ($(STAGE), wip)
	@echo 'Running new wip stage build..' 
	npm run-script build:wip
endif
ifeq ($(STAGE), prod)
	@echo 'Running new prod stage build..' 
	npm run-script build:prod
endif
ifdef APP_STORE_BUILD
	@echo 'Removing key from manifest.json for App Store build'
	grep -vwE "\"key\":" dist/manifest.json > dist/manifest_clean.json
	mv dist/manifest_clean.json dist/manifest.json
	@echo 'Removing dev files'
	rm dist/icon48-dev.png
	rm dist/icon48-dev-submitted.png
	rm dist/icon48-dev-error.png
	rm dist/icon48-dev-dark.png
	rm dist/icon48-dev-dark-submitted.png
	rm dist/icon48-dev-dark-error.png
endif
	@echo 'Zipping up build files for upload...'
	@zip -r -X latestBuild.zip dist/*
ifdef APP_STORE_BUILD
	@echo 'New extension build is ready to submit to Chrome App Store!'
else 
	@echo 'New extension build is ready!'
endif
	@exit 0

define HELP_MESSAGE

	--- Run this command to prepare the build for upload ---
	$ make build
	$ STAGE=prod APP_STORE_BUILD=1 make build

	Where stage is one of the deployment environments: [prod, dev, demo, wip]
endef


