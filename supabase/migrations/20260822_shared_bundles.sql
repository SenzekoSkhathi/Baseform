CREATE TABLE public.shared_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    token TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    paths TEXT[] NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.shared_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bundles" ON public.shared_bundles
    FOR ALL
    USING (auth.uid() = profile_id);

CREATE POLICY "Anyone can view bundles if they have the token" ON public.shared_bundles
    FOR SELECT
    USING (true);
