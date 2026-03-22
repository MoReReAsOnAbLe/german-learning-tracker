/**
 * GET /api/durations?ids=id1,id2,id3,...
 *
 * Returns duration in seconds for up to 50 YouTube video IDs.
 * Response: { videoId: seconds, ... }
 *
 * Live streams return durationSeconds: 0 and should be skipped by the importer.
 */
export default async function handler(req, res) {
  const { ids } = req.query;

  if (!ids) {
    return res.status(400).json({ error: 'Missing ids parameter' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  const url = `https://www.googleapis.com/youtube/v3/videos`
            + `?part=contentDetails`
            + `&id=${encodeURIComponent(ids)}`
            + `&key=${apiKey}`;

  try {
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const result = {};
    for (const item of (data.items || [])) {
      result[item.id] = parseISODuration(item.contentDetails?.duration);
    }

    return res.json(result);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch video durations' });
  }
}

/**
 * Parses ISO 8601 duration to seconds.
 * "PT1H23M45S" → 5025, "PT45S" → 45, "P0D" → 0
 */
function parseISODuration(str) {
  if (!str || str === 'P0D') return 0;
  const m = str.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!m) return 0;
  return (parseInt(m[1] || 0) * 3600) +
         (parseInt(m[2] || 0) * 60)   +
          parseInt(m[3] || 0);
}
