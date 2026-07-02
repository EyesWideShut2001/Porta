FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

COPY API.csproj ./
RUN dotnet restore API.csproj

COPY . ./
RUN dotnet publish API.csproj -c Release -o /app/publish --no-restore /p:UseAppHost=false

FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /app/publish ./
RUN mkdir -p /app/data && chown -R "$APP_UID:$APP_UID" /app

USER $APP_UID
EXPOSE 8080

ENTRYPOINT ["dotnet", "API.dll"]
