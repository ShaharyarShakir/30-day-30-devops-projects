#!/bin/sh
set -e

# Create a temporary file
CODE_FILE=$(mktemp /tmp/code.XXXXXX.py)

# Write the code from environment variable to file
echo "$CODE" > $CODE_FILE

# Execute the code
python3 $CODE_FILE 2>&1
