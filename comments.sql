-- comments.sql ─────────────────────────────────────────────
-- Seed lively threads (content < 200 chars)

INSERT INTO comments (post_id, user_id, content, created_at) VALUES
/* ——— Thread: Debt-ceiling shit-show ——— */
( (SELECT id FROM posts WHERE title = 'Can someone explain this debt-ceiling shit-show?'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'Congress treats the ceiling like a drama-club prop every damn year.  We all lose.', 
  NOW() - INTERVAL '5 days 3 hours'),
( (SELECT id FROM posts WHERE title = 'Can someone explain this debt-ceiling shit-show?'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'It’s hostage-taking 101: “Nice global economy you got there… shame if it defaulted.”',
  NOW() - INTERVAL '5 days 2 hours'),
( (SELECT id FROM posts WHERE title = 'Can someone explain this debt-ceiling shit-show?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Both parties signed the damn credit-card bill.  Pay it and move on.',
  NOW() - INTERVAL '5 days 90 minutes'),

/* ——— Thread: TikTok ban ——— */
( (SELECT id FROM posts WHERE title = 'Red states banning TikTok?  Seriously?'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Lawmakers can’t find the Wi-Fi icon but want to legislate apps.  Cool cool cool.',
  NOW() - INTERVAL '2 days 6 hours'),
( (SELECT id FROM posts WHERE title = 'Red states banning TikTok?  Seriously?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Ban TikTok today, Instagram tomorrow, then what… Google?  Slippery slope, folks.',
  NOW() - INTERVAL '2 days 5 hours'),

/* ——— Thread: Student-loan pause ——— */
( (SELECT id FROM posts WHERE title = 'Student-loan pause is ending — time to panic?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Refinanced at 4 %.  Still hurts.  I vote we garnish Congress salaries for parity.',
  NOW() - INTERVAL '4 days'),
( (SELECT id FROM posts WHERE title = 'Student-loan pause is ending — time to panic?'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Pro tip: call your servicer, ask for “graduated repayment.”  Saves cash short-term.',
  NOW() - INTERVAL '3 days 20 hours'),

/* ——— Thread: Gas-stove freak-out ——— */
( (SELECT id FROM posts WHERE title = 'Stop freaking out over gas stoves, dudes'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'The outrage industry needs something new after plastic straws fell off the radar.',
  NOW() - INTERVAL '1 day 16 hours'),
( (SELECT id FROM posts WHERE title = 'Stop freaking out over gas stoves, dudes'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'I switched to induction: boils water faster, keeps the kitchen cooler.  Win-win.',
  NOW() - INTERVAL '1 day 15 hours'),

/* ——— Thread: Primary-season predictions ——— */
( (SELECT id FROM posts WHERE title = 'Primary-season prediction thread (bring receipts)'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'Bookmarking this so I can roast you in November 😂.',
  NOW() - INTERVAL '3 days 4 hours'),
( (SELECT id FROM posts WHERE title = 'Primary-season prediction thread (bring receipts)'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Ohio under 3 pts?  Spicy take.  I’ll buy you a beer if that lands.',
  NOW() - INTERVAL '3 days 3 hours'),
( (SELECT id FROM posts WHERE title = 'Primary-season prediction thread (bring receipts)'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Deal.  Screenshot this for posterity.',
  NOW() - INTERVAL '3 days 2 hours'),

/* ——— Thread: Border argument Groundhog Day ——— */
( (SELECT id FROM posts WHERE title = 'Why the border argument is stuck in Groundhog Day'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'True story: my dad’s 1996 op-ed on “comprehensive reform” still reads current.',
  NOW() - INTERVAL '20 hours'),
( (SELECT id FROM posts WHERE title = 'Why the border argument is stuck in Groundhog Day'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Both sides secretly love the stalemate — fundraising gold mine.',
  NOW() - INTERVAL '19 hours'),

/* ——— Thread: SCOTUS Section 230 draft ——— */
( (SELECT id FROM posts WHERE title = 'Supreme Court leak drops — brace for chaos'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Twitter lawyers right now: *internally screaming*.',
  NOW() - INTERVAL '10 hours'),
( (SELECT id FROM posts WHERE title = 'Supreme Court leak drops — brace for chaos'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'If 230 goes, comment sections everywhere turn into legal minefields overnight.',
  NOW() - INTERVAL '9 hours'),

/* ——— Thread: Congressional-hearing drinking game ——— */
( (SELECT id FROM posts WHERE title = 'Congressional-hearing drinking game?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Add: “Reclaiming my time” = chug.',
  NOW() - INTERVAL '8 hours'),
( (SELECT id FROM posts WHERE title = 'Congressional-hearing drinking game?'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Dangerous.  One session and you’ll need a new liver.',
  NOW() - INTERVAL '7 hours'),

/* ——— Thread: Infrastructure money ——— */
( (SELECT id FROM posts WHERE title = 'Infrastructure money: where the heck did it go?'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'Check your state DOT dashboard — mine lists “planning phase” for 80 % of projects.',
  NOW() - INTERVAL '4 hours'),
( (SELECT id FROM posts WHERE title = 'Infrastructure money: where the heck did it go?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Translation: consultants got paid, asphalt can wait.',
  NOW() - INTERVAL '3 hours'),

/* ——— Thread: Ban on book bans ——— */
( (SELECT id FROM posts WHERE title = 'Ban on book bans (meta!)'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Ironic meta-legislation is my kink.',
  NOW() - INTERVAL '90 minutes'),
( (SELECT id FROM posts WHERE title = 'Ban on book bans (meta!)'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'Soon we’ll need a ban-ban-ban just to keep score.',
  NOW() - INTERVAL '1 hour'),

/* ——— Thread: Ranked-choice voting poll ——— */
( (SELECT id FROM posts WHERE title = 'Poll: ranked-choice voting — yay or nah?'),
  (SELECT id FROM users WHERE username = 'johndoe'),
  'Yay.  If I can rank tacos, I can rank candidates.',
  NOW() - INTERVAL '40 minutes'),
( (SELECT id FROM posts WHERE title = 'Poll: ranked-choice voting — yay or nah?'),
  (SELECT id FROM users WHERE username = 'political_pundit'),
  'Nah.  Counting ballots shouldn’t need a PhD.',
  NOW() - INTERVAL '30 minutes'),
( (SELECT id FROM posts WHERE title = 'Poll: ranked-choice voting — yay or nah?'),
  (SELECT id FROM users WHERE username = 'janedoe'),
  'Better than the current two-party hostage situation.  Change my mind.',
  NOW() - INTERVAL '20 minutes');

-- ─────────────────────────────────────────────

