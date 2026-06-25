-- Allow an image (e.g. a photo of the meal plan / schedule) on each info card.
alter table public.info_cards
  add column if not exists image_url text;
