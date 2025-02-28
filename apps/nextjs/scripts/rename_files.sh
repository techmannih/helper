#!/bin/bash

# Function to convert snake_case to camelCase
to_camel_case() {
    echo "$1" | awk -F'_' '{
        for(i=1; i<=NF; i++) {
            if(i==1) {
                printf tolower($i)
            } else {
                printf toupper(substr($i,1,1)) tolower(substr($i,2))
            }
        }
    }'
}

# Function to recursively rename files and directories
rename_items() {
    find "$1" -depth | while read -r item; do
        dir=$(dirname "$item")
        base=$(basename "$item")

        # Skip hidden files and directories (like .git)
        if [[ "$base" == .* ]]; then
            continue
        fi

        # Handle dynamic route parameters (keep them as is)
        if [[ "$base" =~ ^\[.*\]$ ]]; then
            new_base="$base"
        else
            new_base=$(to_camel_case "$base")
        fi

        if [[ "$base" != "$new_base" ]]; then
            mv "$item" "$dir/$new_base"
            echo "Renamed: $item -> $dir/$new_base"
        fi
    done
}

# Function to update import statements in files
update_imports() {
    find "$1" -type f \( -name "*.tsx" -o -name "*.ts" \) | while read -r file; do
        perl -i -pe '
            s{
                (from\s+["'\''"])([^"'\''"]+)(["'\''"])
            }{
                my ($pre, $path, $post) = ($1, $2, $3);
                my @parts = split "/", $path;
                foreach my $part (@parts) {
                    # Skip if part is current directory or parent directory
                    next if $part eq "." || $part eq "..";
                    # Handle dynamic route parameters
                    if ($part =~ /^\[.*\]$/) {
                        # Keep as is
                    } else {
                        # Convert snake_case to camelCase
                        $part =~ s/_(.)/\U$1/g;
                        $part = lcfirst($part);
                    }
                }
                $pre . join("/", @parts) . $post;
            }gex
        ' "$file"
        echo "Updated imports in: $file"
    done
}

# Start processing from the src directory
SRC_DIR="apps/nextjs/src"

# Rename files and directories
rename_items "$SRC_DIR"

# Update import statements
update_imports "$SRC_DIR"

echo "File and directory renaming complete, and imports have been updated!"
