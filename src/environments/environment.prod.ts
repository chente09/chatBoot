export const environment = {
    production: true,
    apiKey: process.env['OPENAI_API_KEY'] || '',
    assistantId: process.env['OPENAI_ASSISTANT_ID'] || ''
};