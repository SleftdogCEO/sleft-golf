-- Bulk seed: ~150+ golf courses across Florida and the Northeast US
-- Uses ON CONFLICT (name, city) DO NOTHING to avoid duplicating existing courses
-- price_tier: 1=$(<50), 2=$$($50-100), 3=$$$($100-200), 4=$$$$($200+/private)

-- ============================================
-- FLORIDA: PALM BEACH COUNTY
-- (Boca Raton, Delray Beach, Boynton Beach, Lake Worth, Jupiter, Wellington)
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Red Reef Executive Golf Course', NULL, 'Boca Raton', 'FL', 26.3580, -80.0720, 18, 61, 1, 28, false),
  ('Boca Raton Municipal Golf Course', NULL, 'Boca Raton', 'FL', 26.3680, -80.1200, 18, 72, 1, 42, false),
  ('Osprey Point Golf Course', NULL, 'Boca Raton', 'FL', 26.3920, -80.1510, 18, 72, 2, 65, false),
  ('The Boca Raton - Resort Course', 'The Boca Raton', 'Boca Raton', 'FL', 26.3460, -80.0890, 18, 71, 4, 250, false),
  ('Royal Palm Yacht & Country Club', NULL, 'Boca Raton', 'FL', 26.3560, -80.0830, 18, 72, 4, 350, true),
  ('St. Andrews Club', NULL, 'Boca Raton', 'FL', 26.3800, -80.1330, 18, 72, 4, 300, true),
  ('Delray Beach Golf Club', NULL, 'Delray Beach', 'FL', 26.4530, -80.0890, 18, 72, 2, 55, false),
  ('Lakeview Golf Club', NULL, 'Delray Beach', 'FL', 26.4610, -80.0980, 18, 72, 2, 60, false),
  ('Links at Boynton Beach', NULL, 'Boynton Beach', 'FL', 26.5340, -80.1020, 18, 71, 2, 55, false),
  ('Westchester Golf & Country Club', NULL, 'Boynton Beach', 'FL', 26.5210, -80.1380, 18, 72, 4, 200, true),
  ('Jupiter Dunes Golf Club', NULL, 'Jupiter', 'FL', 26.9370, -80.0810, 18, 54, 1, 35, false),
  ('Abacoa Golf Club', NULL, 'Jupiter', 'FL', 26.8840, -80.0970, 18, 72, 3, 110, false),
  ('Jupiter Hills Club - Hills Course', 'Jupiter Hills Club', 'Jupiter', 'FL', 27.0000, -80.1080, 18, 72, 4, 400, true),
  ('Wellington National Golf Club', NULL, 'Wellington', 'FL', 26.6530, -80.2530, 18, 72, 3, 120, false),
  ('Wanderers Club', NULL, 'Wellington', 'FL', 26.6650, -80.2350, 18, 72, 4, 250, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: BROWARD COUNTY
-- (Fort Lauderdale, Coral Springs, Pembroke Pines, Plantation)
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Jacaranda Golf Club - East Course', 'Jacaranda Golf Club', 'Plantation', 'FL', 26.1310, -80.2690, 18, 72, 2, 65, false),
  ('Jacaranda Golf Club - West Course', 'Jacaranda Golf Club', 'Plantation', 'FL', 26.1290, -80.2720, 18, 72, 2, 65, false),
  ('Lago Mar Country Club', NULL, 'Plantation', 'FL', 26.1130, -80.2570, 18, 72, 3, 100, true),
  ('TPC Eagle Trace', NULL, 'Coral Springs', 'FL', 26.2520, -80.2420, 18, 72, 4, 250, true),
  ('Coral Springs Country Club', NULL, 'Coral Springs', 'FL', 26.2470, -80.2600, 18, 72, 3, 85, false),
  ('Heron Bay Golf Course', NULL, 'Coral Springs', 'FL', 26.2860, -80.2490, 18, 72, 3, 100, false),
  ('Grand Palms Golf Club - Grand Course', 'Grand Palms Golf Club', 'Pembroke Pines', 'FL', 26.0050, -80.3130, 18, 72, 2, 55, false),
  ('Chapel Trail Golf Club', NULL, 'Pembroke Pines', 'FL', 26.0120, -80.3410, 18, 72, 2, 50, false),
  ('Fort Lauderdale Country Club', NULL, 'Fort Lauderdale', 'FL', 26.1570, -80.1660, 18, 72, 4, 200, true),
  ('Inverrary Country Club - East Course', 'Inverrary Country Club', 'Lauderhill', 'FL', 26.1680, -80.2240, 18, 72, 3, 100, false),
  ('Colony West Country Club - Championship Course', 'Colony West Country Club', 'Tamarac', 'FL', 26.2030, -80.2560, 18, 72, 2, 75, false),
  ('Deer Creek Golf Club', NULL, 'Deerfield Beach', 'FL', 26.3170, -80.1460, 18, 72, 3, 100, false),
  ('Pompano Beach Golf Course - Pines Course', 'Pompano Beach Golf Course', 'Pompano Beach', 'FL', 26.2490, -80.1310, 18, 72, 1, 45, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: MIAMI-DADE COUNTY
-- (Miami, Coral Gables, Doral, Key Biscayne)
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Trump National Doral - Blue Monster', 'Trump National Doral', 'Doral', 'FL', 25.8120, -80.3390, 18, 72, 4, 350, false),
  ('Trump National Doral - Gold Course', 'Trump National Doral', 'Doral', 'FL', 25.8150, -80.3360, 18, 72, 4, 250, false),
  ('Trump National Doral - Red Tiger', 'Trump National Doral', 'Doral', 'FL', 25.8100, -80.3420, 18, 72, 3, 195, false),
  ('Doral Golf Resort - Silver Fox', 'Trump National Doral', 'Doral', 'FL', 25.8080, -80.3450, 18, 71, 3, 175, false),
  ('Crandon Golf at Key Biscayne', NULL, 'Key Biscayne', 'FL', 25.6800, -80.1620, 18, 72, 3, 180, false),
  ('Biltmore Golf Course', NULL, 'Coral Gables', 'FL', 25.7440, -80.2780, 18, 71, 3, 150, false),
  ('Melreese Golf Course', NULL, 'Miami', 'FL', 25.7930, -80.2530, 18, 71, 2, 60, false),
  ('Palmetto Golf Course', NULL, 'Miami', 'FL', 25.6810, -80.3370, 18, 70, 1, 35, false),
  ('Killian Greens Golf Club', NULL, 'Miami', 'FL', 25.6590, -80.3620, 18, 70, 1, 40, false),
  ('Shula Golf Club', NULL, 'Miami Lakes', 'FL', 25.9100, -80.3200, 18, 72, 2, 75, false),
  ('Normandy Shores Golf Club', NULL, 'Miami Beach', 'FL', 25.8510, -80.1370, 18, 71, 2, 80, false),
  ('La Gorce Country Club', NULL, 'Miami Beach', 'FL', 25.8310, -80.1280, 18, 72, 4, 500, true),
  ('Indian Creek Country Club', NULL, 'Indian Creek', 'FL', 25.8650, -80.1350, 18, 72, 4, 600, true),
  ('Riviera Country Club', NULL, 'Coral Gables', 'FL', 25.7300, -80.2710, 18, 72, 4, 350, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: TAMPA BAY AREA
-- (Tampa, St. Petersburg, Clearwater)
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('TPC Tampa Bay', NULL, 'Lutz', 'FL', 28.1510, -82.4650, 18, 71, 3, 135, false),
  ('Innisbrook Resort - Copperhead Course', 'Innisbrook Resort', 'Palm Harbor', 'FL', 28.0920, -82.7450, 18, 71, 4, 275, false),
  ('Innisbrook Resort - Island Course', 'Innisbrook Resort', 'Palm Harbor', 'FL', 28.0900, -82.7480, 18, 72, 3, 175, false),
  ('Streamsong Resort - Red Course', 'Streamsong Resort', 'Bowling Green', 'FL', 27.6240, -81.8440, 18, 72, 4, 275, false),
  ('Streamsong Resort - Blue Course', 'Streamsong Resort', 'Bowling Green', 'FL', 27.6220, -81.8420, 18, 72, 4, 275, false),
  ('Streamsong Resort - Black Course', 'Streamsong Resort', 'Bowling Green', 'FL', 27.6260, -81.8460, 18, 73, 4, 275, false),
  ('Westchase Golf Club', NULL, 'Tampa', 'FL', 28.0580, -82.6100, 18, 72, 2, 75, false),
  ('Rocky Point Golf Course', NULL, 'Tampa', 'FL', 27.9680, -82.5350, 18, 71, 1, 40, false),
  ('Rogers Park Golf Course', NULL, 'Tampa', 'FL', 27.9920, -82.4430, 18, 72, 1, 30, false),
  ('Babe Zaharias Golf Course', NULL, 'Tampa', 'FL', 27.9990, -82.3960, 18, 70, 1, 28, false),
  ('Avila Golf & Country Club', NULL, 'Tampa', 'FL', 28.0850, -82.5260, 18, 72, 4, 300, true),
  ('Palma Ceia Golf & Country Club', NULL, 'Tampa', 'FL', 27.9230, -82.4900, 18, 72, 4, 400, true),
  ('Belleview Biltmore Golf Club', NULL, 'Clearwater', 'FL', 27.9570, -82.8070, 18, 72, 2, 60, false),
  ('Mangrove Bay Golf Course', NULL, 'St. Petersburg', 'FL', 27.7970, -82.6360, 18, 72, 1, 35, false),
  ('Cove Cay Golf Club', NULL, 'Clearwater', 'FL', 27.9140, -82.7310, 18, 71, 2, 55, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: ORLANDO AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Arnold Palmer Bay Hill Club - Championship Course', 'Arnold Palmer Bay Hill Club', 'Orlando', 'FL', 28.4590, -81.5140, 18, 72, 4, 295, false),
  ('Grand Cypress Golf Club - North/South', 'Grand Cypress Golf Club', 'Orlando', 'FL', 28.3760, -81.5100, 18, 72, 3, 175, false),
  ('Grand Cypress Golf Club - New Course', 'Grand Cypress Golf Club', 'Orlando', 'FL', 28.3740, -81.5080, 18, 72, 3, 175, false),
  ('Shingle Creek Golf Club', NULL, 'Orlando', 'FL', 28.4130, -81.4320, 18, 72, 3, 100, false),
  ('Orange County National - Panther Lake', 'Orange County National', 'Winter Garden', 'FL', 28.5190, -81.6010, 18, 72, 3, 110, false),
  ('Orange County National - Crooked Cat', 'Orange County National', 'Winter Garden', 'FL', 28.5210, -81.6040, 18, 72, 3, 110, false),
  ('Reunion Resort - Watson Course', 'Reunion Resort', 'Kissimmee', 'FL', 28.3120, -81.5970, 18, 72, 3, 140, false),
  ('Championsgate - National Course', 'Championsgate Golf Club', 'Championsgate', 'FL', 28.3060, -81.6190, 18, 72, 3, 130, false),
  ('Dubsdread Golf Course', NULL, 'Orlando', 'FL', 28.5630, -81.3930, 18, 70, 1, 45, false),
  ('MetroWest Golf Club', NULL, 'Orlando', 'FL', 28.5120, -81.4520, 18, 72, 2, 65, false),
  ('North Shore Golf Club', NULL, 'Orlando', 'FL', 28.5780, -81.3460, 18, 72, 1, 40, false),
  ('Isleworth Golf & Country Club', NULL, 'Windermere', 'FL', 28.4710, -81.5670, 18, 72, 4, 500, true),
  ('Lake Nona Golf & Country Club', NULL, 'Orlando', 'FL', 28.3700, -81.2850, 18, 72, 4, 500, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: JACKSONVILLE AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('TPC Sawgrass - Stadium Course', 'TPC Sawgrass', 'Ponte Vedra Beach', 'FL', 30.1970, -81.3940, 18, 72, 4, 550, false),
  ('TPC Sawgrass - Dye Valley Course', 'TPC Sawgrass', 'Ponte Vedra Beach', 'FL', 30.1950, -81.3960, 18, 72, 4, 225, false),
  ('World Golf Village - King & Bear', 'World Golf Village', 'St. Augustine', 'FL', 29.9770, -81.4640, 18, 72, 3, 120, false),
  ('World Golf Village - Slammer & Squire', 'World Golf Village', 'St. Augustine', 'FL', 29.9750, -81.4660, 18, 72, 3, 110, false),
  ('Sawgrass Country Club - East Course', 'Sawgrass Country Club', 'Ponte Vedra Beach', 'FL', 30.1810, -81.3850, 18, 72, 4, 350, true),
  ('Jacksonville Beach Golf Club', NULL, 'Jacksonville Beach', 'FL', 30.2670, -81.4120, 18, 72, 2, 55, false),
  ('Hyde Park Golf Club', NULL, 'Jacksonville', 'FL', 30.3830, -81.6300, 18, 72, 1, 35, false),
  ('Blue Sky Golf Club', NULL, 'Jacksonville', 'FL', 30.1770, -81.5090, 18, 72, 2, 65, false),
  ('Ponte Vedra Inn & Club - Ocean Course', 'Ponte Vedra Inn & Club', 'Ponte Vedra Beach', 'FL', 30.2150, -81.3830, 18, 72, 4, 300, false),
  ('Queens Harbour Yacht & Country Club', NULL, 'Jacksonville', 'FL', 30.3300, -81.4840, 18, 72, 4, 250, true),
  ('Timuquana Country Club', NULL, 'Jacksonville', 'FL', 30.2910, -81.7220, 18, 72, 4, 400, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: NAPLES / FORT MYERS AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Tiburon Golf Club - Gold Course', 'Tiburon Golf Club', 'Naples', 'FL', 26.2310, -81.8050, 18, 72, 4, 240, false),
  ('Tiburon Golf Club - Black Course', 'Tiburon Golf Club', 'Naples', 'FL', 26.2330, -81.8070, 18, 72, 4, 240, false),
  ('Lely Resort Golf & Country Club - Flamingo Island', 'Lely Resort', 'Naples', 'FL', 26.0830, -81.6950, 18, 72, 3, 140, false),
  ('Lely Resort Golf & Country Club - Mustang', 'Lely Resort', 'Naples', 'FL', 26.0810, -81.6970, 18, 72, 3, 130, false),
  ('Naples Beach Hotel Golf Club', NULL, 'Naples', 'FL', 26.1690, -81.8020, 18, 72, 3, 175, false),
  ('Calusa Pines Golf Club', NULL, 'Naples', 'FL', 26.2640, -81.7070, 18, 72, 4, 400, true),
  ('Old Corkscrew Golf Club', NULL, 'Estero', 'FL', 26.4350, -81.6280, 18, 72, 3, 150, false),
  ('Raptor Bay Golf Club', NULL, 'Bonita Springs', 'FL', 26.3590, -81.7830, 18, 72, 3, 100, false),
  ('Fort Myers Country Club', NULL, 'Fort Myers', 'FL', 26.6320, -81.8730, 18, 72, 1, 40, false),
  ('Eastwood Golf Course', NULL, 'Fort Myers', 'FL', 26.5820, -81.8190, 18, 72, 1, 38, false),
  ('Gateway Golf & Country Club', NULL, 'Fort Myers', 'FL', 26.5610, -81.7780, 18, 72, 2, 65, false),
  ('Shadow Wood Country Club', NULL, 'Bonita Springs', 'FL', 26.3470, -81.7580, 18, 72, 4, 300, true),
  ('Grey Oaks Country Club', NULL, 'Naples', 'FL', 26.1810, -81.7850, 18, 72, 4, 500, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- FLORIDA: SARASOTA / BRADENTON AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('The Concession Golf Club', NULL, 'Bradenton', 'FL', 27.4340, -82.4260, 18, 72, 4, 500, true),
  ('Lakewood Ranch Golf & Country Club', NULL, 'Lakewood Ranch', 'FL', 27.4010, -82.4140, 18, 72, 3, 90, false),
  ('Ritz-Carlton Members Golf Club', NULL, 'Bradenton', 'FL', 27.4360, -82.4290, 18, 72, 4, 350, true),
  ('Legacy Golf Club at Lakewood Ranch', NULL, 'Bradenton', 'FL', 27.3990, -82.3990, 18, 72, 2, 70, false),
  ('University Park Country Club', NULL, 'Sarasota', 'FL', 27.3760, -82.4780, 18, 72, 3, 100, false),
  ('Bobby Jones Golf Club - British Course', 'Bobby Jones Golf Club', 'Sarasota', 'FL', 27.3280, -82.5210, 18, 72, 1, 40, false),
  ('Bobby Jones Golf Club - American Course', 'Bobby Jones Golf Club', 'Sarasota', 'FL', 27.3260, -82.5190, 18, 72, 1, 40, false),
  ('Misty Creek Country Club', NULL, 'Sarasota', 'FL', 27.2820, -82.4670, 18, 72, 2, 60, false),
  ('Tatum Ridge Golf Links', NULL, 'Sarasota', 'FL', 27.2700, -82.4510, 18, 72, 2, 55, false),
  ('The Oaks Club - Eagle Course', 'The Oaks Club', 'Osprey', 'FL', 27.1940, -82.4750, 18, 72, 4, 350, true),
  ('Sara Bay Country Club', NULL, 'Sarasota', 'FL', 27.3470, -82.5470, 18, 72, 4, 300, true),
  ('Laurel Oak Country Club - East Course', 'Laurel Oak Country Club', 'Sarasota', 'FL', 27.2510, -82.4330, 18, 72, 4, 350, true)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- NORTHEAST: NEW YORK CITY METRO
-- (Westchester, Long Island, Northern NJ)
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Bethpage State Park - Black Course', 'Bethpage State Park', 'Farmingdale', 'NY', 40.7440, -73.4530, 18, 71, 3, 150, false),
  ('Bethpage State Park - Red Course', 'Bethpage State Park', 'Farmingdale', 'NY', 40.7460, -73.4510, 18, 72, 2, 75, false),
  ('Bethpage State Park - Green Course', 'Bethpage State Park', 'Farmingdale', 'NY', 40.7420, -73.4550, 18, 72, 2, 65, false),
  ('Winged Foot Golf Club - West Course', 'Winged Foot Golf Club', 'Mamaroneck', 'NY', 40.9620, -73.7440, 18, 72, 4, 500, true),
  ('Winged Foot Golf Club - East Course', 'Winged Foot Golf Club', 'Mamaroneck', 'NY', 40.9640, -73.7420, 18, 72, 4, 500, true),
  ('Shinnecock Hills Golf Club', NULL, 'Southampton', 'NY', 40.8920, -72.4430, 18, 70, 4, 600, true),
  ('National Golf Links of America', NULL, 'Southampton', 'NY', 40.8890, -72.4440, 18, 73, 4, 600, true),
  ('Pebble Creek Golf Club', NULL, 'Colts Neck', 'NJ', 40.2960, -74.1720, 18, 72, 2, 70, false),
  ('Ballyowen Golf Club', NULL, 'Hamburg', 'NJ', 41.1290, -74.5410, 18, 72, 3, 110, false),
  ('Crystal Springs Golf Club', NULL, 'Hamburg', 'NJ', 41.1330, -74.5530, 18, 72, 3, 100, false),
  ('Royce Brook Golf Club - East Course', 'Royce Brook Golf Club', 'Hillsborough', 'NJ', 40.5260, -74.6170, 18, 72, 2, 85, false),
  ('Ridgewood Country Club', NULL, 'Paramus', 'NJ', 40.9890, -74.0940, 27, 72, 4, 500, true),
  ('Pelham Bay Golf Course', NULL, 'Bronx', 'NY', 40.8690, -73.8060, 18, 71, 1, 45, false),
  ('Dyker Beach Golf Course', NULL, 'Brooklyn', 'NY', 40.6160, -74.0170, 18, 72, 1, 48, false),
  ('Trump Golf Links at Ferry Point', NULL, 'Bronx', 'NY', 40.8100, -73.8420, 18, 72, 3, 195, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- NORTHEAST: BOSTON AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Granite Links Golf Club', NULL, 'Quincy', 'MA', 42.2490, -71.0070, 27, 72, 3, 120, false),
  ('Pinehills Golf Club - Jones Course', 'Pinehills Golf Club', 'Plymouth', 'MA', 41.8930, -70.6620, 18, 72, 3, 100, false),
  ('Pinehills Golf Club - Nicklaus Course', 'Pinehills Golf Club', 'Plymouth', 'MA', 41.8910, -70.6640, 18, 72, 3, 100, false),
  ('Red Tail Golf Club', NULL, 'Devens', 'MA', 42.5440, -71.6270, 18, 72, 3, 110, false),
  ('George Wright Golf Course', NULL, 'Boston', 'MA', 42.2850, -71.1490, 18, 70, 1, 42, false),
  ('Franklin Park Golf Course', NULL, 'Boston', 'MA', 42.3060, -71.0990, 18, 70, 1, 38, false),
  ('Ponkapoag Golf Club - Course 1', 'Ponkapoag Golf Club', 'Canton', 'MA', 42.1740, -71.1260, 18, 72, 1, 40, false),
  ('The Country Club - Main Course', 'The Country Club', 'Brookline', 'MA', 42.3290, -71.1440, 18, 71, 4, 600, true),
  ('Salem Country Club', NULL, 'Peabody', 'MA', 42.5150, -70.9810, 18, 72, 4, 400, true),
  ('Myopia Hunt Club', NULL, 'South Hamilton', 'MA', 42.6180, -70.8430, 18, 72, 4, 400, true),
  ('Woodland Golf Club', NULL, 'Newton', 'MA', 42.3120, -71.2170, 18, 71, 4, 350, true),
  ('Cranberry Valley Golf Course', NULL, 'Harwich', 'MA', 41.6870, -70.0510, 18, 72, 2, 70, false),
  ('Farm Neck Golf Club', NULL, 'Oak Bluffs', 'MA', 41.4280, -70.5690, 18, 72, 3, 175, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- NORTHEAST: PHILADELPHIA AREA
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Pine Valley Golf Club', NULL, 'Pine Valley', 'NJ', 39.7870, -74.9700, 18, 70, 4, 600, true),
  ('Merion Golf Club - East Course', 'Merion Golf Club', 'Ardmore', 'PA', 40.0050, -75.3140, 18, 70, 4, 500, true),
  ('Aronimink Golf Club', NULL, 'Newtown Square', 'PA', 39.9600, -75.4110, 18, 72, 4, 500, true),
  ('Philadelphia Cricket Club - Wissahickon', 'Philadelphia Cricket Club', 'Flourtown', 'PA', 40.0800, -75.2170, 18, 72, 4, 450, true),
  ('Cobbs Creek Golf Club', NULL, 'Philadelphia', 'PA', 39.9520, -75.2490, 18, 71, 2, 65, false),
  ('Walnut Lane Golf Club', NULL, 'Philadelphia', 'PA', 40.0380, -75.1680, 18, 72, 1, 40, false),
  ('John F. Byrne Golf Course', NULL, 'Philadelphia', 'PA', 40.0530, -75.0620, 18, 67, 1, 32, false),
  ('Hartefeld National Golf Club', NULL, 'Avondale', 'PA', 39.8430, -75.7620, 18, 71, 3, 100, false),
  ('Broad Run Golfer''s Club', NULL, 'West Chester', 'PA', 39.9670, -75.6780, 18, 72, 2, 75, false),
  ('Whitemarsh Valley Country Club', NULL, 'Lafayette Hill', 'PA', 40.0890, -75.2600, 18, 72, 4, 350, true),
  ('Llanerch Country Club', NULL, 'Havertown', 'PA', 39.9720, -75.3120, 18, 70, 4, 300, true),
  ('RiverWinds Golf & Tennis Club', NULL, 'West Deptford', 'NJ', 39.8470, -75.1900, 18, 72, 2, 70, false),
  ('Scotland Run Golf Club', NULL, 'Williamstown', 'NJ', 39.6870, -75.0050, 18, 71, 3, 85, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- NORTHEAST: CONNECTICUT
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Yale Golf Course', NULL, 'New Haven', 'CT', 41.3400, -72.9650, 18, 70, 3, 130, false),
  ('Lake of Isles - North Course', 'Lake of Isles', 'North Stonington', 'CT', 41.4370, -71.8510, 18, 72, 3, 110, false),
  ('Lake of Isles - South Course', 'Lake of Isles', 'North Stonington', 'CT', 41.4350, -71.8530, 18, 72, 3, 100, false),
  ('Richter Park Golf Course', NULL, 'Danbury', 'CT', 41.3890, -73.4570, 18, 72, 2, 65, false),
  ('Sterling Farms Golf Course', NULL, 'Stamford', 'CT', 41.0780, -73.5510, 18, 72, 2, 55, false),
  ('Griffith E. Harris Golf Course', NULL, 'Greenwich', 'CT', 41.0560, -73.6050, 18, 71, 2, 75, false),
  ('Great River Golf Club', NULL, 'Milford', 'CT', 41.2100, -73.0790, 18, 72, 3, 120, false),
  ('Wethersfield Country Club', NULL, 'Wethersfield', 'CT', 41.7010, -72.6720, 18, 71, 4, 300, true),
  ('Hartford Golf Club', NULL, 'West Hartford', 'CT', 41.7530, -72.7640, 18, 71, 4, 350, true),
  ('Shorehaven Golf Club', NULL, 'Norwalk', 'CT', 41.0870, -73.3960, 18, 72, 4, 400, true),
  ('Country Club of Fairfield', NULL, 'Fairfield', 'CT', 41.1590, -73.2630, 18, 71, 4, 350, true),
  ('Crestbrook Park Golf Course', NULL, 'Watertown', 'CT', 41.6150, -73.1340, 18, 72, 1, 35, false),
  ('Lyman Orchards Golf Club - Jones Course', 'Lyman Orchards Golf Club', 'Middlefield', 'CT', 41.5160, -72.7240, 18, 72, 2, 70, false)
ON CONFLICT (name, city) DO NOTHING;

-- ============================================
-- NORTHEAST: WASHINGTON DC METRO
-- ============================================
INSERT INTO public.courses (name, parent_club, city, state, lat, lng, holes, par, price_tier, green_fee_estimate, is_private) VALUES
  ('Congressional Country Club - Blue Course', 'Congressional Country Club', 'Bethesda', 'MD', 39.0260, -77.1580, 18, 72, 4, 500, true),
  ('Congressional Country Club - Gold Course', 'Congressional Country Club', 'Bethesda', 'MD', 39.0240, -77.1600, 18, 72, 4, 500, true),
  ('TPC Potomac at Avenel Farm', NULL, 'Potomac', 'MD', 39.0320, -77.1980, 18, 70, 4, 300, true),
  ('Whiskey Creek Golf Club', NULL, 'Ijamsville', 'MD', 39.3340, -77.3170, 18, 72, 3, 85, false),
  ('Bulle Rock Golf Course', NULL, 'Havre de Grace', 'MD', 39.5580, -76.1530, 18, 72, 3, 110, false),
  ('Renditions Golf Course', NULL, 'Davidsonville', 'MD', 38.9230, -76.6350, 18, 72, 2, 75, false),
  ('Raspberry Falls Golf & Hunt Club', NULL, 'Leesburg', 'VA', 39.1700, -77.5480, 18, 72, 2, 80, false),
  ('Westfields Golf Club', NULL, 'Clifton', 'VA', 38.8090, -77.4020, 18, 72, 3, 100, false),
  ('Robert Trent Jones Golf Club', NULL, 'Gainesville', 'VA', 38.8180, -77.6130, 18, 72, 4, 400, true),
  ('Trump National Golf Club', NULL, 'Sterling', 'VA', 39.0240, -77.3600, 18, 72, 4, 350, true),
  ('East Potomac Golf Links - Blue Course', 'East Potomac Golf Links', 'Washington', 'DC', 38.8640, -77.0290, 18, 72, 1, 35, false),
  ('Langston Golf Course', NULL, 'Washington', 'DC', 38.8960, -76.9750, 18, 72, 1, 32, false),
  ('Rock Creek Park Golf Course', NULL, 'Washington', 'DC', 38.9520, -77.0460, 18, 65, 1, 28, false),
  ('Army Navy Country Club - Arlington Course', 'Army Navy Country Club', 'Arlington', 'VA', 38.8540, -77.0710, 18, 72, 4, 350, true),
  ('Columbia Country Club', NULL, 'Chevy Chase', 'MD', 38.9650, -77.0810, 18, 72, 4, 450, true)
ON CONFLICT (name, city) DO NOTHING;
