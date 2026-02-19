FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

COPY Music.slnx .
COPY Directory.Packages.props .
COPY Music.Api/Music.Api.csproj Music.Api/
COPY Music.Core/Music.Core.csproj Music.Core/
COPY Music.Infrastructure/Music.Infrastructure.csproj Music.Infrastructure/
RUN dotnet restore ./Music.Api/Music.Api.csproj

COPY Music.Api/. ./Music.Api/
COPY Music.Core/. ./Music.Core/
COPY Music.Infrastructure/. ./Music.Infrastructure/

RUN dotnet publish ./Music.Api/Music.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish ./

ENV HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Music.Api.dll"]
