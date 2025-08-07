#!/bin/bash
export NODE_ENV=production
cd /home/mkykr/emotion-analysis-mcp/mcp-server
exec node dist/server.js
