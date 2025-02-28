#!/bin/bash

set -e

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file is missing in apps/expo directory"
    echo "Please copy apps/expo/.env.local.sample to apps/expo/.env.local and fill in the required values"
    exit 1
fi

exit 0
