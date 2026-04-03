-- Populate price_tier, green_fee_estimate, and is_private for seeded courses
-- price_tier: 1=$(<50), 2=$$($50-100), 3=$$$($100-200), 4=$$$$($200+/private)

-- Ibis Golf & Country Club - Private club
UPDATE public.courses SET price_tier = 4, green_fee_estimate = 85, is_private = true
WHERE parent_club = 'Ibis Golf & Country Club';

-- PGA National Resort - Premium resort
UPDATE public.courses SET price_tier = 4, green_fee_estimate = 295, is_private = false
WHERE parent_club = 'PGA National Resort';

-- Banyan Cay Resort & Golf - Upscale resort
UPDATE public.courses SET price_tier = 3, green_fee_estimate = 175, is_private = false
WHERE name = 'Banyan Cay Resort & Golf';

-- The Park West Palm - Mid-range public
UPDATE public.courses SET price_tier = 2, green_fee_estimate = 65, is_private = false
WHERE name = 'The Park West Palm';

-- Okeeheelee Golf Course - Affordable public/municipal
UPDATE public.courses SET price_tier = 1, green_fee_estimate = 40, is_private = false
WHERE name = 'Okeeheelee Golf Course';

-- Madison Green Golf Club - Mid-range public
UPDATE public.courses SET price_tier = 2, green_fee_estimate = 55, is_private = false
WHERE name = 'Madison Green Golf Club';
