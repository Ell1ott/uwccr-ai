import type { Citation } from "./database.types";
import { supabase } from "./supabase";

export type Conversation = {
  id: string;
  title: string;
  updated_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations: Citation[];
  created_at: string;
};

export async function listConversations(): Promise<Conversation[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function listMessages(
  conversationId: string,
): Promise<ChatMessage[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("messages")
    .select("id, role, content, citations, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    ...row,
    citations: Array.isArray(row.citations) ? row.citations : [],
  }));
}
