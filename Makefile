ifeq ($(OS),Windows_NT)
    # Detect Windows and try to use Git Bash
    GIT_BASH := "C:\Program Files\Git\bin\bash.exe"
    BASH_EXISTS := $(shell if exist $(GIT_BASH) echo yes)
    ifeq ($(BASH_EXISTS),yes)
        BASH := $(GIT_BASH)
    else
        BASH := bash
    endif
else
    BASH := bash
endif

.PHONY: run infra-up infra-down front watch-media

run:
	$(BASH) ./scripts/start-backend.sh
	cd backend/api && mvn quarkus:dev

front:
	cd frontend && npm start

watch-media:
	cd backend/media-processor && node watch-local.js

infra-up:
	docker compose up -d

infra-down:
	docker compose down -v --remove-orphans
