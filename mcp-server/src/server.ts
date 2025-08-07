#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { testConnection } from './database/config.js';
import { emotionQueries } from './database/queries.js';

class EmotionAnalysisMCPServer {
  private server: Server;

  constructor() {
    this.server = new Server({
      name: 'emotion-analysis-mcp-server',
      version: '1.0.0',
    });

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  private setupToolHandlers() {
    // ツール一覧の提供
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'test_connection',
            description: 'Test database connection and return status',
            inputSchema: {
              type: 'object',
              properties: {},
              required: [],
            },
          },
          {
            name: 'analyze_emotions',
            description: 'Analyze emotion patterns over a specified time period',
            inputSchema: {
              type: 'object',
              properties: {
                days: {
                  type: 'number',
                  description: 'Number of days to analyze (default: 30)',
                  default: 30,
                },
              },
              required: [],
            },
          },
          {
            name: 'analyze_activity',
            description: 'Analyze the emotional impact of a specific activity',
            inputSchema: {
              type: 'object',
              properties: {
                activity: {
                  type: 'string',
                  description: 'Name of the activity to analyze',
                },
              },
              required: ['activity'],
            },
          },
          {
            name: 'find_happiness_triggers',
            description: 'Discover activities that consistently bring high happiness',
            inputSchema: {
              type: 'object',
              properties: {
                min_intensity: {
                  type: 'number',
                  description: 'Minimum intensity threshold (1-10, default: 8)',
                  default: 8,
                },
              },
              required: [],
            },
          },
        ],
      };
    });

    // ツール実行の処理
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'test_connection':
            return await this.handleTestConnection();

          case 'analyze_emotions':
            return await this.handleEmotionAnalysis(args as { days?: number });

          case 'analyze_activity':
            return await this.handleActivityAnalysis(args as { activity: string });

          case 'find_happiness_triggers':
            return await this.handleHappinessTriggers(args as { min_intensity?: number });

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `❌ Error executing ${name}: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleTestConnection() {
    const isConnected = await testConnection();
    
    return {
      content: [
        {
          type: 'text',
          text: isConnected 
            ? '✅ Database connection successful! Ready to analyze your emotion data with 411 records.'
            : '❌ Database connection failed. Please check configuration.',
        },
      ],
    };
  }

  private async handleEmotionAnalysis(args: { days?: number }) {
    try {
      const analysis = await emotionQueries.getEmotionSummary(args.days || 30);
      
      const emotionList = analysis.emotionDistribution
        .slice(0, 5)
        .map(e => `• ${e.emotion}: ${e.count} times (${e.percentage}%)`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📊 **Emotion Analysis - ${analysis.period}**

**Overview:**
- Total records: ${analysis.totalRecords}
- Average intensity: ${analysis.averageIntensity}/10
- Most common emotion: ${analysis.predominantEmotion}

**Top 5 Emotions:**
${emotionList}

**Insights:**
${this.generateEmotionInsights(analysis)}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to analyze emotions: ${error}`);
    }
  }

  private async handleActivityAnalysis(args: { activity: string }) {
    try {
      const analysis = await emotionQueries.getActivityAnalysis(args.activity);
      
      if (analysis.totalOccurrences === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ No data found for activity: "${args.activity}"
              
Try one of these activities from your data:
- CCNAの勉強
- 仕事  
- 睡眠
- 彼女との時間
- 筋トレ

Or check the spelling of the activity name.`,
            },
          ],
        };
      }

      const emotionList = analysis.emotionImpact.emotionDistribution
        .slice(0, 5)
        .map(e => `• ${e.emotion}: ${e.count} times`)
        .join('\n');

      const recommendationList = analysis.recommendations
        .map(r => `• ${r}`)
        .join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🎯 **Activity Analysis: "${analysis.activityName}"**

**Statistics:**
- Total occurrences: ${analysis.totalOccurrences}
- Average emotional intensity: ${analysis.emotionImpact.averageIntensity}/10

**Associated Emotions:**
${emotionList}

**Recommendations:**
${recommendationList}`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to analyze activity: ${error}`);
    }
  }

  private async handleHappinessTriggers(args: { min_intensity?: number }) {
    try {
      const triggers = await emotionQueries.getHappinessTriggers(args.min_intensity || 8);
      
      if (triggers.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `😕 No happiness triggers found with intensity ${args.min_intensity || 8}+
              
Try lowering the intensity threshold (e.g., 7 or 6) to find more activities.`,
            },
          ],
        };
      }

      const triggerList = triggers
        .map((t, i) => `${i + 1}. **${t.activity}**
   • Average intensity: ${t.avg_intensity}/10
   • Occurrences: ${t.occurrences} times
   • Peak intensity: ${t.max_intensity}/10`)
        .join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `✨ **Your Happiness Triggers** (${args.min_intensity || 8}+ intensity)

These activities consistently bring you high levels of happiness:

${triggerList}

💡 **Insight:** Focus on incorporating these activities more frequently into your routine for sustained well-being!`,
          },
        ],
      };
    } catch (error) {
      throw new Error(`Failed to find happiness triggers: ${error}`);
    }
  }

  private generateEmotionInsights(analysis: any): string {
    const insights: string[] = [];
    
    if (analysis.averageIntensity >= 7.5) {
      insights.push("🌟 You're experiencing high emotional well-being overall!");
    } else if (analysis.averageIntensity >= 6.5) {
      insights.push("😊 Your emotional state is generally positive.");
    } else {
      insights.push("🤔 Consider focusing on activities that boost your mood.");
    }

    const positiveEmotions = analysis.emotionDistribution.filter((e: any) => 
      ['満足', '楽しさ', '希望', '誇り', '喜び', '安心'].includes(e.emotion)
    );
    const positivePercentage = positiveEmotions.reduce((sum: number, e: any) => sum + e.percentage, 0);

    if (positivePercentage > 60) {
      insights.push("✨ Positive emotions dominate your recent experiences!");
    } else if (positivePercentage > 40) {
      insights.push("⚖️ You have a balanced mix of emotions.");
    } else {
      insights.push("💪 Consider activities that have brought you joy in the past.");
    }

    return insights.join('\n• ');
  }

  private setupErrorHandling() {
    this.server.onerror = (error) => {
      console.error('[MCP Error]', error);
    };

    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('🚀 Emotion Analysis MCP Server running with real database queries...');
  }
}

// サーバー起動
const server = new EmotionAnalysisMCPServer();
server.run().catch(console.error);
