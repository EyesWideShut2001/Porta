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

Add the Cloudinary settings to the API configuration, for example in `API/appsettings.Development.json`:

```json
"CloudinarySettings": {
  "CloudName": "NAME",
  "ApiKey": "API_KEY",
  "ApiSecret": "API_SECRET"
}
```
