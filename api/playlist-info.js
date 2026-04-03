/**
 * GET /api/playlist-info?playlistId=PLxxx
 *
 * Returns metadata for a YouTube playlist.
 * Response: { playlistId, playlistTitle, channelTitle }
 *
 * Uses playlists.list (1 quota unit per call).
 */
export default async function handler(req, res) {
  const { playlistId } = req.query;

  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlistId parameter' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  const url = `https://www.googleapis.com/youtube/v3/playlists`
            + `?part=snippet`
            + `&id=${encodeURIComponent(playlistId)}`
            + `&key=${apiKey}`;

  try {
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const item = data.items?.[0];
    if (!item) {
      return res.status(404).json({ error: 'Playlist not found or is private' });
    }

    return res.json({
      playlistId:    item.id,
      playlistTitle: item.snippet.title,
      channelTitle:  item.snippet.channelTitle,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch playlist info' });
  }
}
