// HTTP API Wrapper のテストクライアント
import http from 'http';

interface TestResult {
  test: string;
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
}

class APITester {
  private baseUrl = 'http://localhost:3000';
  
  async runTests(): Promise<void> {
    console.log('🧪 Starting HTTP API Wrapper Tests...\n');
    
    const tests = [
      () => this.testHealthCheck(),
      () => this.testConnection(),
      () => this.testConversationStats(),
      () => this.testKeywordAnalysis(),
      () => this.testRiskDetection(),
      () => this.testPersonalizedAdvice(),
      () => this.testExtensionEndpoints()
    ];
    
    const results: TestResult[] = [];
    
    for (const test of tests) {
      try {
        const result = await test();
        results.push(result);
        
        if (result.success) {
          console.log(`✅ ${result.test} - ${result.duration}ms`);
        } else {
          console.log(`❌ ${result.test} - ${result.error} (${result.duration}ms)`);
        }
        
        // テスト間の間隔
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`💥 ${error}`);
      }
    }
    
    console.log('\n📊 Test Summary:');
    const passed = results.filter(r => r.success).length;
    const total = results.length;
    console.log(`   Passed: ${passed}/${total}`);
    console.log(`   Success Rate: ${(passed/total*100).toFixed(1)}%`);
    
    if (passed === total) {
      console.log('\n🎉 All tests passed! HTTP API Wrapper is ready!');
    } else {
      console.log('\n⚠️ Some tests failed. Check the server logs.');
    }
  }
  
  private async testHealthCheck(): Promise<TestResult> {
    return this.makeRequest('GET', '/health', null, 'Health Check');
  }
  
  private async testConnection(): Promise<TestResult> {
    return this.makeRequest('POST', '/mcp-api', {
      tool: 'test_connection'
    }, 'MCP Connection Test');
  }
  
  private async testConversationStats(): Promise<TestResult> {
    return this.makeRequest('POST', '/mcp-api', {
      tool: 'get_conversation_stats'
    }, 'Conversation Stats');
  }
  
  private async testKeywordAnalysis(): Promise<TestResult> {
    return this.makeRequest('POST', '/mcp-api', {
      tool: 'analyze_conversation_keywords',
      args: {
        keywords: ['不安', '成長']
      }
    }, 'Keyword Analysis');
  }
  
  private async testRiskDetection(): Promise<TestResult> {
    return this.makeRequest('POST', '/mcp-api', {
      tool: 'detect_risk_patterns',
      args: {
        sensitivity: 'medium'
      }
    }, 'Risk Detection');
  }
  
  private async testPersonalizedAdvice(): Promise<TestResult> {
    return this.makeRequest('POST', '/mcp-api', {
      tool: 'generate_personalized_advice',
      args: {
        focus_area: 'overall'
      }
    }, 'Personalized Advice');
  }
  
  private async testExtensionEndpoints(): Promise<TestResult> {
    return this.makeRequest('POST', '/extension/session-start', {
      sessionId: 'test_session_123',
      projectName: 'Test Project'
    }, 'Extension Session Start');
  }
  
  private async makeRequest(method: string, path: string, data: any, testName: string): Promise<TestResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      const postData = data ? JSON.stringify(data) : '';
      
      const options = {
        hostname: 'localhost',
        port: 3000,
        path: path,
        method: method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      
      const req = http.request(options, (res) => {
        let responseData = '';
        
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        
        res.on('end', () => {
          const duration = Date.now() - startTime;
          
          try {
            const parsed = JSON.parse(responseData);
            
            resolve({
              test: testName,
              success: res.statusCode === 200 && (parsed.success !== false),
              data: parsed,
              duration: duration
            });
            
          } catch (error) {
            resolve({
              test: testName,
              success: false,
              error: 'Invalid JSON response',
              duration: duration
            });
          }
        });
      });
      
      req.on('error', (error) => {
        resolve({
          test: testName,
          success: false,
          error: error.message,
          duration: Date.now() - startTime
        });
      });
      
      if (postData) {
        req.write(postData);
      }
      
      req.end();
    });
  }
}

// テスト実行
const tester = new APITester();
tester.runTests().catch(console.error);
