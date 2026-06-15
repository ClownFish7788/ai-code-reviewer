import { createOpenAI } from "@ai-sdk/openai";

/**
 * DeepSeek API 客户端（兼容 OpenAI 接口）
 * API Key 从环境变量 DEEPSEEK_API_KEY 读取
 */
export const deepseek = createOpenAI({
  baseURL: "https://api.deepseek.com/v1",
  apiKey: process.env.DEEPSEEK_API_KEY,
});

/** 默认使用的模型 */
export const DEFAULT_MODEL = deepseek("deepseek-chat");
