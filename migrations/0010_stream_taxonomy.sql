-- Backfill inputs from old broad streams (ai, events, market) to new sub-verticals
-- (general-ai, event-general, event-tech, vc-investment, piper-dev) based on feed_source category.
-- Non-RSS inputs (feed_source_id IS NULL) are left untouched.
UPDATE inputs SET stream = (
  SELECT CASE fs.category
    WHEN 'LLM/Product' THEN 'general-ai'
    WHEN 'AI News' THEN 'general-ai'
    WHEN 'AI Research' THEN 'general-ai'
    WHEN 'AI Digest' THEN 'general-ai'
    WHEN 'Tech Business' THEN 'general-ai'
    WHEN 'Events' THEN 'event-general'
    WHEN 'Meetings' THEN 'event-general'
    WHEN 'Hospitality' THEN 'event-general'
    WHEN 'Event Tech' THEN 'event-tech'
    WHEN 'Competitor Intel' THEN 'event-tech'
    WHEN 'Funding' THEN 'vc-investment'
    WHEN 'Startups' THEN 'vc-investment'
    WHEN 'SaaS/Business' THEN 'piper-dev'
    ELSE inputs.stream
  END
  FROM feed_sources fs
  WHERE fs.id = inputs.feed_source_id
)
WHERE inputs.feed_source_id IS NOT NULL;
