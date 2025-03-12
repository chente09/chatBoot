export const environment = {
  production: false,
  apiKey: process.env['OPENAI_API_KEY'] || '',
  assistantId: process.env['OPENAI_ASSISTANT_ID'] || ''
};

