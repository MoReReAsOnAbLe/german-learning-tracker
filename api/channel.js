/**
 * GET /api/channel?handle=@ComprehensibleGerman
 *
 * Resolves a YouTube channel handle to { channelId, channelTitle }.
 * The API key is kept server-side via the YOUTUBE_API_KEY environment variable.
 */
export default async function handler(req, res) {
  const { handle } = req.query;

  if (!handle) {
    return res.status(400).json({ error: 'Missing handle parameter' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  // Support both @handle lookups and direct channel IDs (UC...)
  let url;
  if (handle.startsWith('UC')) {
    url = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&id=${encodeURIComponent(handle)}&key=${apiKey}`;
  } else {
    const cleanHandle = handle.startsWith('@') ? handle : `@${handle}`;
    url = `https://www.googleapis.com/youtube/v3/channels?part=id,snippet&forHandle=${encodeURIComponent(cleanHandle)}&key=${apiKey}`;
  }

  try {
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    if (!data.items || data.items.length === 0) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const item = data.items[0];
    return res.json({
      channelId:    item.id,
      channelTitle: item.snippet.title,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch channel info' });
  }
}
