"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPClient = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class MCPClient {
    constructor(mcpServerPath) {
        this.mcpServerUrl = mcpServerPath || 'http://localhost:3001';
    }
    async callTool(toolName, params) {
        try {
            const response = await (0, node_fetch_1.default)(`${this.mcpServerUrl}/tool/${toolName}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(params)
            });
            return await response.json();
        }
        catch (error) {
            console.error('MCP call failed:', error);
            throw error;
        }
    }
    async getServerStatus() {
        return {
            running: true,
            databaseConnected: true,
            lastAnalysis: new Date().toISOString(),
            uptime: process.uptime()
        };
    }
    async clearAnalysisCache() {
        return { clearedCount: 0 };
    }
    async getAnalysisHistory(params) {
        return { items: [], total: 0 };
    }
}
exports.MCPClient = MCPClient;
