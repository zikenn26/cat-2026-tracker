-- Enable realtime for friendships so users get instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
