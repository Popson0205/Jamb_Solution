#!/bin/bash
echo "Starting from: $(pwd)"
echo "dist/server.js exists: $(test -f dist/server.js && echo YES || echo NO)"
echo "test-notifications in dist: $(grep -c 'test-notifications' dist/server.js 2>/dev/null || echo 0) occurrences"
node dist/server.js
