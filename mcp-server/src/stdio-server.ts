#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { testConnection } from './database/config.js';
import { emotionQueries } from './database/queries.js';

const server = new Server({
  name: 'emotion-analysis-mcp-server',
  version: '1.0.0',
});

// ツール一覧の提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
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
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'test_connection':
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

      case 'analyze_emotions':
        const analysis = await emotionQueries.getEmotionSummary((args as any)?.days || 30);
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
${emotionList}`,
            },
          ],
        };

      case 'analyze_activity':
        const activityAnalysis = await emotionQueries.getActivityAnalysis((args as any).activity);
        
        if (activityAnalysis.totalOccurrences === 0) {
          return {
            content: [
              {
                type: 'text',
                text: `❌ No data found for activity: "${(args as any).activity}"`,
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: `🎯 **Activity Analysis: "${activityAnalysis.activityName}"**

**Statistics:**
- Total occurrences: ${activityAnalysis.totalOccurrences}
- Average emotional intensity: ${activityAnalysis.emotionImpact.averageIntensity}/10`,
            },
          ],
        };

      case 'find_happiness_triggers':
        const triggers = await emotionQueries.getHappinessTriggers((args as any)?.min_intensity || 8);
        
        if (triggers.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: '😕 No happiness triggers found with this intensity threshold.',
              },
            ],
          };
        }

        const triggerList = triggers
          .slice(0, 5)
          .map((t, i) => `${i + 1}. **${t.activity}** (${t.avg_intensity}/10)`)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `✨ **Your Happiness Triggers**

${triggerList}`,
            },
          ],
        };

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      ],
    };
  }
});

// STDIO transport で起動
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(console.error);
