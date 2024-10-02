#!/bin/bash

# Define the folder paths
DATA_DIR="_data"
ARCHIVE_DIR="$DATA_DIR/archive"
RESOURCE_DIR="_resources"

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

# Find the .tar.gz file in the data directory
TAR_FILE=$(find "$DATA_DIR" -maxdepth 1 -name "*.tar.gz")

# If a tar.gz file is found, proceed
if [[ -n "$TAR_FILE" ]]; then
  # Extract the tar.gz file
  mkdir -p "$RESOURCE_DIR"
  tar -xzvf "$TAR_FILE" -C "$RESOURCE_DIR" --strip=1

  # Move the tar.gz file to the archive folder
  mv "$TAR_FILE" "$ARCHIVE_DIR"

  echo "Extraction complete and tar.gz moved to _data/archive"
fi

# Start Python HTTP server
echo "Starting Python HTTP server..."
python render.py
