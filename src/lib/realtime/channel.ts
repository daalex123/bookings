import type { SupabaseClient } from "@supabase/supabase-js";
import type { RealtimeChannel } from "@supabase/supabase-js";

export function getRealtimeTopic(channelName: string): string {
  return `realtime:${channelName}`;
}

export async function removeRealtimeChannel(
  supabase: SupabaseClient,
  channelName: string
): Promise<void> {
  const topic = getRealtimeTopic(channelName);
  const channels = supabase
    .getChannels()
    .filter((channel) => channel.topic === topic);

  await Promise.all(channels.map((channel) => supabase.removeChannel(channel)));
}

export async function ensureRealtimeAuth(
  supabase: SupabaseClient
): Promise<boolean> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return false;

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) return false;

  await supabase.realtime.setAuth(session.access_token);
  return true;
}

export async function subscribePostgresChannel(
  supabase: SupabaseClient,
  channelName: string,
  configure: (channel: RealtimeChannel) => RealtimeChannel,
  onStatus?: (status: string, err?: Error) => void
): Promise<RealtimeChannel> {
  await removeRealtimeChannel(supabase, channelName);

  const channel = configure(
    supabase.channel(channelName, {
      config: { private: true },
    })
  );
  channel.subscribe((status, err) => {
    onStatus?.(status, err);
  });

  return channel;
}
