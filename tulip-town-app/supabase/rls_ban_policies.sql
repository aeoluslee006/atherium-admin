-- Ban / suspend write guards for posts & comments
-- Apply in Supabase SQL editor after reviewing existing policy names.

-- Helper: active (not banned, not currently suspended)
CREATE OR REPLACE FUNCTION public.profile_can_write(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = uid
      AND COALESCE(p.is_banned, false) = false
      AND (p.suspended_until IS NULL OR p.suspended_until <= now())
  );
$$;

-- Example: replace insert policies (names may differ in your project)
DROP POLICY IF EXISTS "Users can insert own posts" ON public.posts;
CREATE POLICY "Users can insert own posts"
ON public.posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND public.profile_can_write(auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own comments" ON public.comments;
CREATE POLICY "Users can insert own comments"
ON public.comments
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = author_id
  AND public.profile_can_write(auth.uid())
);
