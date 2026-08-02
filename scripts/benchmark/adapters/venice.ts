import { OpenAICompatibleAdapter } from './openai-compatible';

export function veniceRequestBody(model: string): Record<string, unknown> {
  return {
    venice_parameters: {
      enable_web_search: 'off',
      include_venice_system_prompt: false,
      ...(model === 'e2ee-qwen3-6-35b-a3b-uncensored-p' ? { disable_thinking: true } : {}),
    },
  };
}

export const veniceAdapter = new OpenAICompatibleAdapter({
  id: 'venice',
  endpoint: 'https://api.venice.ai/api/v1/chat/completions',
  apiKey: () => process.env.VENICE_API_KEY,
  body: (request) => veniceRequestBody(request.model),
});
