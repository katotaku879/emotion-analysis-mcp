import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

export interface MCPRequest {
  tool: string;
  args: any;
}

export interface MCPResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export class MCPClient {
  private mcpProcess: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, {
    resolve: (value: MCPResponse) => void;
    reject: (error: Error) => void;
    timeout: NodeJS.Timeout;
  }>();

  constructor(private mcpServerPath: string) {}

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      const serverPath = path.join(this.mcpServerPath, 'dist/stdio-server-final.js');
      console.log('🚀 Starting MCP Server:', serverPath);

      this.mcpProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: this.mcpServerPath
      });

      if (!this.mcpProcess.stdin || !this.mcpProcess.stdout) {
        reject(new Error('Failed to create MCP process pipes'));
        return;
      }

      this.mcpProcess.on('error', (error) => {
        console.error('❌ MCP Process Error:', error);
        reject(error);
      });

      this.mcpProcess.on('exit', (code) => {
        console.log('🔚 MCP Process exited with code:', code);
        this.mcpProcess = null;
      });

      this.mcpProcess.stdout.on('data', (data) => {
        this.handleResponse(data.toString());
      });

      this.mcpProcess.stderr?.on('data', (data) => {
        console.error('🔴 MCP Server stderr:', data.toString());
      });

      setTimeout(() => {
        console.log('✅ MCP Client initialized');
        resolve();
      }, 1000);
    });
  }

  private handleResponse(data: string): void {
    try {
      const lines = data.trim().split('\n');
      for (const line of lines) {
        if (line.trim()) {
          try {
            const response = JSON.parse(line);
            if (response.id !== undefined) {
              const pending = this.pendingRequests.get(response.id);
              if (pending) {
                clearTimeout(pending.timeout);
                this.pendingRequests.delete(response.id);

                if (response.error) {
                  pending.reject(new Error(response.error.message || 'MCP Error'));
                } else {
                  pending.resolve({
                    success: true,
                    data: response.result
                  });
                }
              }
            }
          } catch (parseError) {
            console.warn('⚠️ Failed to parse MCP response:', line);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error handling MCP response:', error);
    }
  }

  async callTool(toolName: string, args: any = {}): Promise<MCPResponse> {
    if (!this.mcpProcess || !this.mcpProcess.stdin) {
      throw new Error('MCP process not started or stdin not available');
    }

    const stdin = this.mcpProcess.stdin; // 👈 TypeScriptに非nullと認識させる

    return new Promise((resolve, reject) => {
      const id = ++this.requestId;

      const request = {
        jsonrpc: '2.0',
        id,
        method: 'tools/call',
        params: {
          name: toolName,
          arguments: args
        }
      };

      const requestStr = JSON.stringify(request) + '\n';

      console.log('🛠 [callTool] Tool呼び出し開始');
      console.log('🔧 Tool名:', toolName);
      console.log('📦 引数:', JSON.stringify(args, null, 2));
      console.log('📤 送信内容:', requestStr.trim());

      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        console.warn(`⏳ MCP Tool応答タイムアウト: ${toolName}`);
        reject(new Error(`Tool call timeout: ${toolName}`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      try {
        stdin.write(requestStr); // 👈 エラーが消える
      } catch (error) {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(error);
      }
    });
  }


  async testConnection(): Promise<MCPResponse> {
    try {
      return await this.callTool('test_connection', {});
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  async analyzeEmotions(days: number = 30): Promise<MCPResponse> {
    return this.callTool('analyze_emotions', { days });
  }

  async getConversationStats(): Promise<MCPResponse> {
    return this.callTool('get_conversation_stats', {});
  }

  async analyzeConversationKeywords(keywords: string[]): Promise<MCPResponse> {
    return this.callTool('analyze_conversation_keywords', { keywords });
  }

  async detectRiskPatterns(sensitivity: string = 'medium'): Promise<MCPResponse> {
    return this.callTool('detect_risk_patterns', { sensitivity });
  }

  async generatePersonalizedAdvice(focusArea: string = 'overall'): Promise<MCPResponse> {
    return this.callTool('generate_personalized_advice', {
      focus_area: focusArea,
      advice_type: 'analytical'
    });
  }

  async stop(): Promise<void> {
    if (this.mcpProcess) {
      this.mcpProcess.kill();
      this.mcpProcess = null;
    }

    for (const [id, pending] of this.pendingRequests) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('MCP Client stopped'));
    }

    this.pendingRequests.clear();
  }
}