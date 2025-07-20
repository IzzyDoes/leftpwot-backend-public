-- posts.sql  ────────────────────────────────────────────────
-- Seed realistic U.S.-politics discussion posts
-- Schema expected:  (title, content, user_id, created_at)
-- ────────────────────────────────────────────────────────────

INSERT INTO posts (title, content, user_id, created_at) VALUES
/* ————— johndoe ————— */
(
  'Can someone explain this debt-ceiling shit-show?',
  'Look, I’m no economist but if Congress keeps playing chicken with the debt ceiling, \
the markets will tank and so will my 401k.  Why the hell is this even a bargaining chip? \
Either pay the damn bills or don’t, but stop holding the rest of us hostage.',
  (SELECT id FROM users WHERE username = 'johndoe'),
  NOW() - INTERVAL '6 days'
),
(
  'Red states banning TikTok?  Seriously?',
  'I get the “national-security” angle, but a flat-out statewide ban feels like \
politicians who don’t know a damn thing about the internet trying to look “tough.” \
Regulate data privacy, sure, but leave the doom-scrolling to us.',
  (SELECT id FROM users WHERE username = 'johndoe'),
  NOW() - INTERVAL '3 days'
),

/* ————— janedoe ————— */
(
  'Student-loan pause is ending — time to panic?',
  'My servicer just emailed me: payments resume this fall.  I’ve budgeted for it, \
but I’m still pissed that Congress ditched the full-forgiveness bill.  \
Anyone got legit tips (not the “skip your latte” crap) to soften the blow?',
  (SELECT id FROM users WHERE username = 'janedoe'),
  NOW() - INTERVAL '5 days'
),
(
  'Stop freaking out over gas stoves, dudes',
  'Saw a House hearing where a rep literally yelled “COME TAKE MY STOVE.” \
Guys, nobody’s confiscating your damn cookware.  They’re proposing incentives \
for induction ranges because indoor air quality kinda matters.  Chill.',
  (SELECT id FROM users WHERE username = 'janedoe'),
  NOW() - INTERVAL '2 days'
),

/* ————— political_pundit ————— */
(
  'Primary-season prediction thread (bring receipts)',
  'Okay nerds, post your spicy midterm takes now so we can roast you later.  \
My call: Arizona flips Senate *again*, Ohio stays red but by <3 pts, and MT-01 \
surprises everybody.  Fight me.',
  (SELECT id FROM users WHERE username = 'political_pundit'),
  NOW() - INTERVAL '4 days'
),
(
  'Why the border argument is stuck in Groundhog Day',
  'Each side trots out the same talking points every election cycle: \
“Finish the wall!” vs. “Pathway to citizenship!” Meanwhile nothing substantive \
gets passed because it’s too useful as a wedge issue.  Prove me wrong.',
  (SELECT id FROM users WHERE username = 'political_pundit'),
  NOW() - INTERVAL '1 day'
),

/* ————— quick filler ————— */
(
  'Supreme Court leak drops — brace for chaos',
  'If the draft opinion on Section 230 is real, social-media moderation’s about \
to get messy as hell.  Grab popcorn.',
  (SELECT id FROM users WHERE username = 'johndoe'),
  NOW() - INTERVAL '12 hours'
),
(
  'Congressional-hearing drinking game?',
  'Rules so far: every time someone says “The American people want…”, take a sip. \
If they claim to “yield the remainder” but keep talking, finish the glass.',
  (SELECT id FROM users WHERE username = 'janedoe'),
  NOW() - INTERVAL '10 hours'
),
(
  'Infrastructure money: where the heck did it go?',
  'My state got billions, yet the bridge by Main St is still patched with duct tape. \
Open-data nerds—any dashboards that track actual spend?',
  (SELECT id FROM users WHERE username = 'political_pundit'),
  NOW() - INTERVAL '6 hours'
),
(
  'Ban on book bans (meta!)',
  'Florida yanks a history book, California writes a law banning bans.  \
We’re now banning bans of bans?  My brain hurts.',
  (SELECT id FROM users WHERE username = 'johndoe'),
  NOW() - INTERVAL '3 hours'
),
(
  'Poll: ranked-choice voting — yay or nah?',
  'I’m sick of the “spoiler effect.”  NYC’s RCV pilot was messy but promising.  \
Would you want it nationwide?  Drop your pros/cons.',
  (SELECT id FROM users WHERE username = 'janedoe'),
  NOW() - INTERVAL '1 hour'
);

-- (Optional) sanity-check count:
--   SELECT COUNT(*) FROM posts
--   WHERE user_id IN (
--     SELECT id FROM users
--     WHERE username IN ('johndoe','janedoe','political_pundit')
--   );
-- ────────────────────────────────────────────────
