FROM ubuntu:24.04 AS audiowaveform

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    cmake \
    g++ \
    git \
    make \
    libboost-filesystem1.83-dev \
    libboost-program-options1.83-dev \
    libboost-regex1.83-dev \
    libgd-dev \
    libid3tag0-dev \
    libmad0-dev \
    libsndfile1-dev \
    ; \
    rm -rf /var/lib/apt/lists/*

ARG AUDIOWAVEFORM_VERSION=1.10.2

RUN set -eux; \
    git clone --depth 1 --branch ${AUDIOWAVEFORM_VERSION} https://github.com/bbc/audiowaveform.git /tmp/audiowaveform; \
    mkdir /tmp/audiowaveform/build; \
    cmake -S /tmp/audiowaveform -B /tmp/audiowaveform/build \
    -DCMAKE_BUILD_TYPE=Release \
    -DENABLE_TESTS=0; \
    make -C /tmp/audiowaveform/build -j$(nproc); \
    make -C /tmp/audiowaveform/build install; \
    rm -rf /tmp/audiowaveform

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

ENV DEBIAN_FRONTEND=noninteractive

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
    ca-certificates \
    ffmpeg \
    libboost-filesystem1.83.0 \
    libboost-program-options1.83.0 \
    libboost-regex1.83.0 \
    libgd3 \
    libid3tag0 \
    libmad0 \
    libsndfile1 \
    ; \
    rm -rf /var/lib/apt/lists/*

# Skip this first because I am not yet finish HAHA, but i want to merge first.
# ARG SHAKA_PACKAGER_VERSION=v3.6.1
# RUN curl -fsSL \
#     "https://github.com/shaka-project/shaka-packager/releases/download/${SHAKA_PACKAGER_VERSION}/packager-linux-x64" \
#     -o /usr/local/bin/packager \
#     && chmod +x /usr/local/bin/packager

COPY --from=audiowaveform /usr/local/bin/audiowaveform /usr/local/bin/

COPY --from=build /app/publish ./

ENV HTTP_PORTS=8080
EXPOSE 8080

ENTRYPOINT ["dotnet", "Music.Api.dll"]
