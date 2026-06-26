import {
  createChatCompletion,
  type NimMessage,
  type NimToolCall,
} from "@/lib/ai/nim-client";
import {
  BOOKING_AGENT_TOOLS,
  buildBookingAgentSystemPrompt,
  executeBookingAgentTool,
  type AgentToolResult,
} from "@/lib/ai/booking-agent-tools";
import type { PublicBusinessContext } from "@/lib/booking";

export type ClientChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type BookingAgentResponse = {
  message: string;
  booking?: { appointmentId: string };
  cancelled?: { appointmentId: string };
};

const MAX_TOOL_ROUNDS = 6;

export async function runBookingAgent(
  bookingRef: string,
  ctx: PublicBusinessContext,
  userId: string,
  clientMessages: ClientChatMessage[]
): Promise<BookingAgentResponse> {
  const messages: NimMessage[] = [
    { role: "system", content: buildBookingAgentSystemPrompt(ctx) },
    ...clientMessages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  ];

  let booking: { appointmentId: string } | undefined;
  let cancelled: { appointmentId: string } | undefined;

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const completion = await createChatCompletion(messages, BOOKING_AGENT_TOOLS);
    const choice = completion.choices[0];
    if (!choice) {
      throw new Error("AI returned no response");
    }

    const assistantMessage = choice.message;
    const toolCalls = assistantMessage.tool_calls ?? [];

    if (!toolCalls.length) {
      return {
        message: assistantMessage.content?.trim() || "How can I help you book today?",
        booking,
        cancelled,
      };
    }

    messages.push({
      role: "assistant",
      content: assistantMessage.content,
      tool_calls: toolCalls,
    });

    for (const toolCall of toolCalls) {
      const result = await runToolCall(
        bookingRef,
        ctx,
        userId,
        toolCall
      );
      if (result.booking) {
        booking = result.booking;
      }
      if (result.cancelled) {
        cancelled = result.cancelled;
      }
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: result.content,
      });
    }
  }

  return {
    message:
      "I need a bit more information to finish your booking. Which service and date work for you?",
    booking,
    cancelled,
  };
}

async function runToolCall(
  bookingRef: string,
  ctx: PublicBusinessContext,
  userId: string,
  toolCall: NimToolCall
): Promise<AgentToolResult> {
  return executeBookingAgentTool(
    bookingRef,
    ctx,
    userId,
    toolCall.function.name,
    toolCall.function.arguments
  );
}
