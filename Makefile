.PHONY: setup db install backend frontend dev clean

setup: db install
	@echo "Setup complete. Run 'make dev' to start."

db:
	docker compose up -d
	@echo "Waiting for PostgreSQL..."
	@sleep 3
	@docker compose exec db pg_isready -U dodge -d dodge > /dev/null 2>&1 && echo "PostgreSQL ready." || echo "PostgreSQL starting..."

install: install-backend install-frontend

install-backend:
	python3 -m venv venv
	./venv/bin/pip install -r requirements.txt -q
	@test -f .env || cp .env.example .env
	@echo "Backend dependencies installed."

install-frontend:
	cd frontend && npm install --silent
	@echo "Frontend dependencies installed."

backend:
	./venv/bin/uvicorn app.main:app --reload --host 0.0.0.0 --port 8040

frontend:
	cd frontend && npm run dev

dev:
	@echo "Starting backend on :8000 and frontend on :5173..."
	@make backend &
	@sleep 3
	@make frontend

clean:
	docker compose down -v
	rm -rf venv frontend/node_modules frontend/dist
	rm -f o2c.db
	@echo "Cleaned."
