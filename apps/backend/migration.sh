#!/usr/bin/env bash

set -e

MIGRATION_NAME=$1

echo "Adding migration: $MIGRATION_NAME"

dotnet ef migrations add "$MIGRATION_NAME" \
  --project Music.Infrastructure \
  --startup-project Music.Api
