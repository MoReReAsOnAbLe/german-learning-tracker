/**
 * GET /api/playlist?playlistId=UUxxx[&pageToken=...]
 *
 * Returns one page (up to 50 items) of a YouTube playlist.
 * Response: { items: [{videoId, title, thumbnail, publishedAt, channelId, channelTitle}], nextPageToken }
 *
 * Uses playlistItems.list (1 quota unit per call) rather than search.list (100 units).
 */
export default async function handler(req, res) {
  const { playlistId, pageToken } = req.query;

  if (!playlistId) {
    return res.status(400).json({ error: 'Missing playlistId parameter' });
  }

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'YouTube API key not configured on server' });
  }

  let url = `https://www.googleapis.com/youtube/v3/playlistItems`
          + `?part=snippet,contentDetails`
          + `&playlistId=${encodeURIComponent(playlistId)}`
          + `&maxResults=50`
          + `&key=${apiKey}`;

  if (pageToken) {
    url += `&pageToken=${encodeURIComponent(pageToken)}`;
  }

  try {
    const ytRes = await fetch(url);
    const data = await ytRes.json();

    if (data.error) {
      return res.status(400).json({ error: data.error.message });
    }

    const items = (data.items || [])
      .filter(item => {
        // Skip private/deleted videos (they have no title or videoId)
        const videoId = item.contentDetails?.videoId;
        const title   = item.snippet?.title;
        return videoId && title && title !== 'Private video' && title !== 'Deleted video';
      })
      .map(item => ({
        videoId:      item.contentDetails.videoId,
        title:        item.snippet.title,
        thumbnail:    item.snippet.thumbnails?.medium?.url
                   || item.snippet.thumbnails?.default?.url
                   || '',
        publishedAt:  item.snippet.publishedAt,
        channelId:    item.snippet.videoOwnerChannelId || '',
        channelTitle: item.snippet.videoOwnerChannelTitle || '',
      }));

    return res.json({
      items,
      nextPageToken: data.nextPageToken || null,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch playlist' });
  }
}
