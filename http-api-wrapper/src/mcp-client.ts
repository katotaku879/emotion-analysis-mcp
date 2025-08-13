import fetch from 'node-fetch';

export interface MCPResponse {
  content?: any;
  cache_hit?: boolean;
  [key: string]: any;
}

export class MCPClient {
  private mcpServerUrl: string;

  constructor(mcpServerPath?: string) {
    this.mcpServerUrl = mcpServerPath || 
      process.env.MCP_SERVER_URL || 
      'http://host.docker.internal:3001';  // Dockerから外部アクセス
  }

  async callTool(toolName: string, params: any): Promise<MCPResponse> {
    try {
      const response = await fetch(`${this.mcpServerUrl}/tool/${toolName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params)
      });
      return await response.json() as MCPResponse;
    } catch (error) {
      console.error('MCP call failed:', error);
      throw error;
    }
  }

  async getServerStatus(): Promise<any> {
    return {
      running: true,
      databaseConnected: true,
      lastAnalysis: new Date().toISOString(),
      uptime: process.uptime()
    };
  }

  async clearAnalysisCache(): Promise<{ clearedCount: number }> {
    return { clearedCount: 0 };
  }

  async getAnalysisHistory(params: { limit: number; offset: number }): Promise<any> {
    return { items: [], total: 0 };
  }
}
