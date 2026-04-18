/**
 * Emit a Socket.IO event to each target user's personal room (user-{id}).
 * This helper normalizes ids, removes invalid values, and deduplicates ids
 * to avoid accidental global broadcasts and duplicate emits.
 */
const emitToUsers = (io, userIds, event, payload) => {
  if (!io) return
  const uniqueIds = [...new Set(userIds.map((id) => Number.parseInt(id, 10)).filter(Number.isInteger))]
  uniqueIds.forEach((id) => io.to(`user-${id}`).emit(event, payload))
}

module.exports = {
  emitToUsers,
}

