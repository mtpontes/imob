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

.PHONY: run infra-up infra-down

run:
	$(BASH) ./start-backend.sh
	cd backend && mvn quarkus:dev

infra-up:
	docker compose up -d

infra-down:
	docker compose down -v --remove-orphans
