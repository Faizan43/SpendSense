-- Keep public.normalize_name() in step with lib/normalize.ts.
--
-- Apostrophes are removed rather than turned into a space, so "Sainsbury's"
-- and "Sainsburys" produce the same key and don't end up as two stores.

create or replace function public.normalize_name(input text)
returns text
language sql
immutable
as $$
  select nullif(
    btrim(
      regexp_replace(
        regexp_replace(
          regexp_replace(lower(coalesce(input, '')), '[''’`]', '', 'g'),
          '[^a-z0-9]+', ' ', 'g'
        ),
        '\s+', ' ', 'g'
      )
    ),
    ''
  );
$$;
