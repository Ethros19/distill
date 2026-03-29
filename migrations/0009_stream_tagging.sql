ALTER TABLE inputs ADD COLUMN stream varchar(50);
--> statement-breakpoint
CREATE INDEX inputs_stream_idx ON inputs USING btree (stream);
--> statement-breakpoint
UPDATE inputs SET stream = (
  SELECT CASE
    WHEN fs.category IN ('AI News', 'AI Research', 'AI Digest', 'LLM/Product') THEN 'ai'
    WHEN fs.category IN ('Events', 'Meetings', 'Event Tech', 'Hospitality') THEN 'events'
    WHEN fs.category IN ('Funding', 'Startups', 'SaaS/Business', 'Tech Business', 'Competitor Intel') THEN 'market'
    ELSE NULL
  END
  FROM feed_sources fs
  WHERE fs.id = inputs.feed_source_id
)
WHERE inputs.source = 'rss' AND inputs.feed_source_id IS NOT NULL;
