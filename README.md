# Porta

## Start the API

```bash
cd API
dotnet run
```

The API runs from the development launch profile at `https://localhost:5001`.

## Start the client

```bash
cd client
npm install
npm start
```

The Angular client runs at `http://localhost:4200/`.

## Required API settings

For Docker, copy the environment template and fill in the API secrets:

```bash
cp .env.example .env
docker compose up --build
```

The client is available at `http://localhost:4200`, and the API is also exposed at
`http://localhost:5000`. The client proxies `/api` and `/hubs` to the API container.

ASP.NET Core maps the Compose environment variables to this configuration:

```json
"CloudinarySettings": {
  "CloudName": "NAME",
  "ApiKey": "API_KEY",
  "ApiSecret": "API_SECRET"
}
```

The SQLite database is stored in the named volume `api-data`.
