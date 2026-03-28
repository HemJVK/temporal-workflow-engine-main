import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

async function test() {
  const transport = new StdioClientTransport({
    command: 'npx',
    args: ['-y', '@smithery/cli@latest', 'run', 'gmail'],
  });

  const client = new Client({ name: 'test-client', version: '1.0.0' }, { capabilities: {} });
  
  try {
    console.log('Connecting...');
    await client.connect(transport);
    console.log('Connected! Fetching tools...');
    const tools = await client.listTools();
    console.log(tools);
    client.close();
  } catch (e) {
    console.error('Failed:', e);
  }
}

test();
