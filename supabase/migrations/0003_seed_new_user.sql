-- Bootstrap for a new account: a profile, the twelve categories, and the seed
-- keyword ruleset that gives auto-categorisation something to work with before
-- the user has corrected anything.
--
-- Categories are per-user rows rather than a shared lookup table so a user can
-- rename "Fruit & Vegetables" to "Produce" without affecting anyone else. The
-- slugs stay fixed — they are what the receipt extractor is asked to choose
-- between.

create or replace function public.seed_user_defaults(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (p_user_id)
  on conflict (id) do nothing;

  insert into public.categories
    (user_id, slug, name, icon, chart_slot, is_system, sort_order)
  values
    (p_user_id, 'fruit-vegetables', 'Fruit & Vegetables', 'carrot',     1, true,  0),
    (p_user_id, 'dairy',            'Dairy',              'milk',       2, true,  1),
    (p_user_id, 'meat-seafood',     'Meat & Seafood',     'beef',       3, true,  2),
    (p_user_id, 'bakery',           'Bakery',             'croissant',  4, true,  3),
    (p_user_id, 'snacks',           'Snacks',             'cookie',     5, true,  4),
    (p_user_id, 'beverages',        'Beverages',          'cup-soda',   6, true,  5),
    (p_user_id, 'frozen',           'Frozen Foods',       'snowflake',  7, true,  6),
    (p_user_id, 'household',        'Household Supplies', 'lamp',       8, true,  7),
    (p_user_id, 'personal-care',    'Personal Care',      'hand-heart', 1, true,  8),
    (p_user_id, 'baby',             'Baby Products',      'baby',       2, true,  9),
    (p_user_id, 'cleaning',         'Cleaning Products',  'spray-can',  3, true, 10),
    (p_user_id, 'other',            'Other',              'package',    0, true, 11)
  on conflict (user_id, slug) do nothing;

  -- Seeded keyword rules. The resolver matches longest-pattern-first within a
  -- priority band, so "hot chocolate" beats "chocolate" and "frozen peas"
  -- beats "peas" without needing hand-tuned priorities here.
  insert into public.category_rules
    (user_id, category_id, pattern, match_type, priority, source)
  select p_user_id, c.id, r.pattern, 'contains', 100, 'system'
  from (values
    -- Fruit & vegetables
    ('fruit-vegetables','apple'),('fruit-vegetables','banana'),
    ('fruit-vegetables','orange'),('fruit-vegetables','satsuma'),
    ('fruit-vegetables','clementine'),('fruit-vegetables','grape'),
    ('fruit-vegetables','strawberr'),('fruit-vegetables','raspberr'),
    ('fruit-vegetables','blueberr'),('fruit-vegetables','blackberr'),
    ('fruit-vegetables','melon'),('fruit-vegetables','pineapple'),
    ('fruit-vegetables','mango'),('fruit-vegetables','kiwi'),
    ('fruit-vegetables','pear'),('fruit-vegetables','peach'),
    ('fruit-vegetables','plum'),('fruit-vegetables','nectarine'),
    ('fruit-vegetables','avocado'),('fruit-vegetables','lemon'),
    ('fruit-vegetables','lime'),('fruit-vegetables','cherr'),
    ('fruit-vegetables','potato'),('fruit-vegetables','tomato'),
    ('fruit-vegetables','onion'),('fruit-vegetables','garlic'),
    ('fruit-vegetables','carrot'),('fruit-vegetables','broccoli'),
    ('fruit-vegetables','cauliflower'),('fruit-vegetables','cabbage'),
    ('fruit-vegetables','lettuce'),('fruit-vegetables','spinach'),
    ('fruit-vegetables','kale'),('fruit-vegetables','rocket'),
    ('fruit-vegetables','cucumber'),('fruit-vegetables','pepper'),
    ('fruit-vegetables','courgette'),('fruit-vegetables','aubergine'),
    ('fruit-vegetables','mushroom'),('fruit-vegetables','celery'),
    ('fruit-vegetables','leek'),('fruit-vegetables','sweetcorn'),
    ('fruit-vegetables','peas'),('fruit-vegetables','green bean'),
    ('fruit-vegetables','asparagus'),('fruit-vegetables','beetroot'),
    ('fruit-vegetables','parsnip'),('fruit-vegetables','swede'),
    ('fruit-vegetables','turnip'),('fruit-vegetables','radish'),
    ('fruit-vegetables','spring onion'),('fruit-vegetables','salad'),
    ('fruit-vegetables','coriander'),('fruit-vegetables','parsley'),
    ('fruit-vegetables','basil'),('fruit-vegetables','ginger'),
    ('fruit-vegetables','chilli'),('fruit-vegetables','squash butternut'),
    ('fruit-vegetables','pumpkin'),('fruit-vegetables','vegetable'),
    ('fruit-vegetables','veg '),('fruit-vegetables','fruit'),

    -- Dairy
    ('dairy','milk'),('dairy','semi skimmed'),('dairy','skimmed'),
    ('dairy','whole milk'),('dairy','cheese'),('dairy','cheddar'),
    ('dairy','mozzarella'),('dairy','parmesan'),('dairy','brie'),
    ('dairy','feta'),('dairy','halloumi'),('dairy','butter'),
    ('dairy','margarine'),('dairy','yoghurt'),('dairy','yogurt'),
    ('dairy','cream'),('dairy','double cream'),('dairy','single cream'),
    ('dairy','soured cream'),('dairy','creme fraiche'),('dairy','custard'),
    ('dairy','egg'),('dairy','cottage cheese'),('dairy','mascarpone'),
    ('dairy','ricotta'),('dairy','oat milk'),('dairy','almond milk'),
    ('dairy','soya milk'),('dairy','babybel'),('dairy','philadelphia'),

    -- Meat & seafood
    ('meat-seafood','chicken'),('meat-seafood','beef'),('meat-seafood','mince'),
    ('meat-seafood','steak'),('meat-seafood','pork'),('meat-seafood','sausage'),
    ('meat-seafood','bacon'),('meat-seafood','ham'),('meat-seafood','gammon'),
    ('meat-seafood','lamb'),('meat-seafood','turkey'),('meat-seafood','duck'),
    ('meat-seafood','salmon'),('meat-seafood','tuna'),('meat-seafood','cod'),
    ('meat-seafood','haddock'),('meat-seafood','prawn'),('meat-seafood','shrimp'),
    ('meat-seafood','mackerel'),('meat-seafood','sardine'),
    ('meat-seafood','seafood'),('meat-seafood','fish'),
    ('meat-seafood','fillet'),('meat-seafood','mussel'),('meat-seafood','crab'),
    ('meat-seafood','meatball'),('meat-seafood','burger'),
    ('meat-seafood','chorizo'),('meat-seafood','salami'),
    ('meat-seafood','pepperoni'),('meat-seafood','pastrami'),
    ('meat-seafood','ribs'),('meat-seafood','chicken wing'),

    -- Bakery
    ('bakery','bread'),('bakery','loaf'),('bakery','wholemeal'),
    ('bakery','sourdough'),('bakery','baguette'),('bakery','bread roll'),
    ('bakery','bagel'),('bakery','croissant'),('bakery','pain au chocolat'),
    ('bakery','muffin'),('bakery','crumpet'),('bakery','pitta'),
    ('bakery','naan'),('bakery','tortilla'),('bakery','wrap'),
    ('bakery','brioche'),('bakery','cake'),('bakery','sponge'),
    ('bakery','doughnut'),('bakery','donut'),('bakery','pastry'),
    ('bakery','scone'),('bakery','ciabatta'),('bakery','focaccia'),
    ('bakery','teacake'),('bakery','hot cross bun'),('bakery','tart'),

    -- Snacks
    ('snacks','crisps'),('snacks','doritos'),('snacks','pringles'),
    ('snacks','walkers'),('snacks','popcorn'),('snacks','nuts'),
    ('snacks','peanut'),('snacks','cashew'),('snacks','pistachio'),
    ('snacks','chocolate'),('snacks','cadbury'),('snacks','galaxy'),
    ('snacks','dairy milk'),('snacks','kitkat'),('snacks','snickers'),
    ('snacks','twix'),('snacks','biscuit'),('snacks','cookie'),
    ('snacks','oreo'),('snacks','digestive'),('snacks','hobnob'),
    ('snacks','sweets'),('snacks','haribo'),('snacks','candy'),
    ('snacks','chewing gum'),('snacks','cracker'),('snacks','pretzel'),
    ('snacks','granola bar'),('snacks','cereal bar'),('snacks','flapjack'),
    ('snacks','wotsits'),('snacks','quavers'),('snacks','monster munch'),
    ('snacks','mini cheddars'),('snacks','maltesers'),('snacks','aero'),

    -- Beverages
    ('beverages','water'),('beverages','sparkling water'),
    ('beverages','juice'),('beverages','orange juice'),
    ('beverages','apple juice'),('beverages','smoothie'),
    ('beverages','coke'),('beverages','cola'),('beverages','pepsi'),
    ('beverages','fanta'),('beverages','sprite'),('beverages','lemonade'),
    ('beverages','irn bru'),('beverages','cordial'),('beverages','ribena'),
    ('beverages','tea'),('beverages','coffee'),('beverages','nescafe'),
    ('beverages','hot chocolate'),('beverages','beer'),('beverages','lager'),
    ('beverages','ale'),('beverages','cider'),('beverages','wine'),
    ('beverages','prosecco'),('beverages','champagne'),('beverages','vodka'),
    ('beverages','gin'),('beverages','whisky'),('beverages','rum'),
    ('beverages','energy drink'),('beverages','red bull'),
    ('beverages','lucozade'),('beverages','tonic'),('beverages','squash drink'),

    -- Frozen
    ('frozen','frozen'),('frozen','ice cream'),('frozen','ben jerry'),
    ('frozen','magnum'),('frozen','cornetto'),('frozen','sorbet'),
    ('frozen','gelato'),('frozen','frozen pizza'),('frozen','fish finger'),
    ('frozen','chicken nugget'),('frozen','oven chips'),
    ('frozen','potato waffle'),('frozen','frozen peas'),
    ('frozen','frozen veg'),('frozen','ice lolly'),
    ('frozen','yorkshire pudding'),('frozen','frozen berries'),

    -- Household supplies
    ('household','foil'),('household','cling film'),
    ('household','baking paper'),('household','bin bag'),
    ('household','bin liner'),('household','kitchen roll'),
    ('household','paper towel'),('household','toilet roll'),
    ('household','toilet paper'),('household','andrex'),
    ('household','battery'),('household','batteries'),
    ('household','light bulb'),('household','candle'),
    ('household','matches'),('household','lighter'),
    ('household','sandwich bag'),('household','freezer bag'),
    ('household','tea towel'),('household','sponge'),
    ('household','scourer'),('household','rubber glove'),
    ('household','sellotape'),('household','notebook'),
    ('household','envelope'),('household','carrier bag'),
    ('household','bag for life'),

    -- Personal care
    ('personal-care','shampoo'),('personal-care','conditioner'),
    ('personal-care','shower gel'),('personal-care','body wash'),
    ('personal-care','soap'),('personal-care','deodorant'),
    ('personal-care','antiperspirant'),('personal-care','toothpaste'),
    ('personal-care','toothbrush'),('personal-care','mouthwash'),
    ('personal-care','dental floss'),('personal-care','razor'),
    ('personal-care','shaving'),('personal-care','moisturis'),
    ('personal-care','moisturiz'),('personal-care','body lotion'),
    ('personal-care','sun cream'),('personal-care','suncream'),
    ('personal-care','lip balm'),('personal-care','mascara'),
    ('personal-care','foundation makeup'),('personal-care','nail'),
    ('personal-care','cotton wool'),('personal-care','cotton bud'),
    ('personal-care','tissue'),('personal-care','plaster'),
    ('personal-care','paracetamol'),('personal-care','ibuprofen'),
    ('personal-care','vitamin'),('personal-care','supplement'),
    ('personal-care','tampon'),('personal-care','sanitary'),
    ('personal-care','hand cream'),('personal-care','perfume'),
    ('personal-care','aftershave'),('personal-care','hair gel'),
    ('personal-care','hairspray'),

    -- Baby
    ('baby','nappy'),('baby','nappies'),('baby','pampers'),
    ('baby','huggies'),('baby','baby wipe'),('baby','formula milk'),
    ('baby','aptamil'),('baby','cow gate'),('baby','baby food'),
    ('baby','ella kitchen'),('baby','baby puree'),('baby','dummy'),
    ('baby','baby lotion'),('baby','baby shampoo'),('baby','sudocrem'),
    ('baby','rusks'),('baby','baby rice'),('baby','toddler'),
    ('baby','infant'),('baby','muslin'),

    -- Cleaning
    ('cleaning','washing up liquid'),('cleaning','fairy liquid'),
    ('cleaning','detergent'),('cleaning','laundry'),('cleaning','persil'),
    ('cleaning','ariel'),('cleaning','fabric conditioner'),
    ('cleaning','fabric softener'),('cleaning','comfort'),
    ('cleaning','bleach'),('cleaning','domestos'),
    ('cleaning','disinfectant'),('cleaning','dettol'),
    ('cleaning','antibacterial'),('cleaning','surface spray'),
    ('cleaning','cif'),('cleaning','mr muscle'),('cleaning','flash spray'),
    ('cleaning','cleaner'),('cleaning','polish'),
    ('cleaning','glass cleaner'),('cleaning','oven cleaner'),
    ('cleaning','drain unblock'),('cleaning','limescale'),
    ('cleaning','descaler'),('cleaning','air freshener'),
    ('cleaning','febreze'),('cleaning','toilet cleaner'),
    ('cleaning','dishwasher tablet'),('cleaning','rinse aid'),
    ('cleaning','dishwasher salt'),('cleaning','mop'),
    ('cleaning','washing powder'),('cleaning','washing capsule')
  ) as r(slug, pattern)
  join public.categories c
    on c.user_id = p_user_id and c.slug = r.slug
  on conflict (user_id, pattern, match_type) do nothing;
end;
$$;

-- Fire the bootstrap the moment an account is created, so the very first page
-- load already has categories to show.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.seed_user_defaults(new.id);

  update public.profiles
     set display_name = coalesce(
           nullif(new.raw_user_meta_data ->> 'full_name', ''),
           nullif(new.raw_user_meta_data ->> 'name', ''),
           initcap(split_part(coalesce(new.email, 'there'), '@', 1))
         ),
         avatar_url = nullif(new.raw_user_meta_data ->> 'avatar_url', '')
   where id = new.id;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
