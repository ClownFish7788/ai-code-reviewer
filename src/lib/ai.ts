import { deepseek } from "@ai-sdk/deepseek";


export const MODEL = deepseek(process.env.DEFAULT_MODEL || 'deepseek-chat')