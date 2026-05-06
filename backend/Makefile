.PHONY: build run dev test clean tidy migrate

GOCMD=go
GOBUILD=$(GOCMD) build
GOTEST=$(GOCMD) test
GOGET=$(GOCMD) get
BINARY_NAME=seleevent-api

build:
	$(GOBUILD) -o $(BINARY_NAME) ./cmd/server

run: build
	./$(BINARY_NAME)

dev:
	$(GOCMD) run ./cmd/server

test:
	$(GOTEST) -v ./...

clean:
	rm -f $(BINARY_NAME)
	rm -f *.db

tidy:
	$(GOCMD) mod tidy

migrate:
	$(GOCMD) run ./cmd/server --migrate
