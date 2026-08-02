import { ProviderSchema } from '../lib/schemas';

export const providers = [
  {
    id: 'openrouter',
    name: 'OpenRouter',
    routeType: 'openrouter',
    credentialEnv: 'OPENROUTER_API_KEY',
    docsUrl: 'https://openrouter.ai/docs',
    catalogUrl: 'https://openrouter.ai/api/v1/models',
  },
  {
    id: 'venice',
    name: 'Venice AI',
    routeType: 'venice',
    credentialEnv: 'VENICE_API_KEY',
    docsUrl: 'https://docs.venice.ai/',
    catalogUrl: 'https://api.venice.ai/api/v1/models',
  },
].map((provider) => ProviderSchema.parse(provider));
