const NIM_BASE_URL =
  process.env.OPENAI_BASE_URL ?? "https://integrate.api.nvidia.com/v1";

export type NimMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: NimToolCall[];
    }
  | { role: "tool"; content: string; tool_call_id: string };

export type NimToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};

export type NimTool = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type NimChatCompletion = {
  choices: Array<{
    message: {
      role: "assistant";
      content: string | null;
      tool_calls?: NimToolCall[];
    };
    finish_reason: string;
  }>;
};

export function isAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY && process.env.ASSISTANT_AI_MODEL);
}

export async function createChatCompletion(
  messages: NimMessage[],
  tools?: NimTool[]
): Promise<NimChatCompletion> {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.ASSISTANT_AI_MODEL;

  if (!apiKey || !model) {
    throw new Error("AI assistant is not configured");
  }

  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  };

  if (tools?.length) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const res = await fetch(`${NIM_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const detail = await res.text();
    throw new Error(`AI request failed (${res.status}): ${detail.slice(0, 300)}`);
  }

  return res.json() as Promise<NimChatCompletion>;
}
