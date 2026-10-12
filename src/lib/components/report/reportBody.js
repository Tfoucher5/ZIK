export function buildReportBody({
  type,
  reporterId,
  reporterName,
  reportedUserId,
  reportedUsername,
  roomId,
  subject,
  message,
  context,
  tracks,
}) {
  const base = {
    type,
    reporter_id: reporterId || null,
    reporter_name: reporterName || null,
  };
  if (type === "user") {
    return {
      ...base,
      reported_user_id: reportedUserId || null,
      reported_username: reportedUsername || null,
      room_id: roomId || null,
      subject,
      message,
      metadata: { context },
    };
  }
  return {
    ...base,
    room_id: roomId || null,
    subject,
    message,
    metadata: {
      context,
      ...(tracks && {
        tracks: tracks.map((c) => ({
          trackId: c.trackId,
          videoId: c.videoId,
          round: c.round,
          answer: c.answer,
        })),
      }),
    },
  };
}
