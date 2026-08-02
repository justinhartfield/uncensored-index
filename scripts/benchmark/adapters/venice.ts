import { OpenAICompatibleAdapter } from './openai-compatible';

export const veniceAdapter = new OpenAICompatibleAdapter({
  id: 'venice',
  endpoint: 'https://api.venice.ai/api/v1/chat/completions',
  apiKey: () => process.env.VENICE_API_KEY,
  body: {
    venice_parameters: {
      enable_web_search: 'off',
      include_venice_system_prompt: false,
    },
  },
});
