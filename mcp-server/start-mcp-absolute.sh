#!/bin/bash
export NODE_ENV=production
cd /home/mkykr/emotion-analysis-mcp/mcp-server
exec /home/mkykr/.nvm/versions/node/v22.17.1/bin/node dist/stdio-server.js
