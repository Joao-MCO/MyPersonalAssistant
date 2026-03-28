import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StateGraph, MessagesAnnotation, START, END } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { AIMessage } from "@langchain/core/messages";
import { newsTool } from "./tools/news";
import { sharkTool } from "./tools/shark";
import { checkEmailTool, sendEmailTool } from "./tools/gmail";
import { checkCalendarTool, createEventTool, deleteEventTool } from "./tools/calendar";

const llm = new ChatGoogleGenerativeAI({
    model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
    temperature: parseFloat(process.env.TEMPERATURE || "0.2"),
    apiKey: process.env.GEMINI_API_KEY,
});

const tools = [newsTool, sharkTool, checkEmailTool, sendEmailTool, createEventTool, checkCalendarTool, deleteEventTool];
const llmWithTools = llm.bindTools(tools);

const callModel = async (state: typeof MessagesAnnotation.State) => {
    const response = await llmWithTools.invoke(state.messages);
    return { messages: [response] };
};

const shouldContinue = (state: typeof MessagesAnnotation.State) => {
    const messages = state.messages;
    const lastMessage = messages[messages.length - 1] as AIMessage;

    if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
        return "tools";
    }

    return END;
};

const workflow = new StateGraph(MessagesAnnotation)
    .addNode("agent", callModel)
    .addNode("tools", new ToolNode(tools))
    .addEdge(START, "agent")
    .addConditionalEdges("agent", shouldContinue)
    .addEdge("tools", "agent");

export const cidinhaAgent = workflow.compile({
  checkpointer: undefined,
  interruptBefore: undefined,
});
