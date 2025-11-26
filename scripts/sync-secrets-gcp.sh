#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found!"
    exit 1
fi

PROJECT_ID="glavito-platform"

echo "Syncing secrets from .env to GCP Secret Manager for project $PROJECT_ID..."

# Read .env file line by line
while IFS='=' read -r key value; do
    # Skip comments and empty lines
    if [[ $key =~ ^#.* ]] || [[ -z $key ]]; then
        continue
    fi

    # Remove quotes from value if present
    value=$(echo "$value" | sed -e 's/^"//' -e 's/"$//')

    # Create secret (ignore error if exists)
    gcloud secrets create "$key" --replication-policy="automatic" --project="$PROJECT_ID" 2>/dev/null

    # Add secret version
    echo -n "$value" | gcloud secrets versions add "$key" --data-file=- --project="$PROJECT_ID"

    echo "Synced $key"

done < .env

echo "Secret sync complete!"
