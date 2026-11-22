// walks to the zone like the baseline but never fires
export function createBot() {
  return { name: 'pacifist', hello() {}, act(obs) {
    const me = obs.self, [x, y] = me.pos, c = obs.zone.next_center
    const d = Math.hypot(c[0] - x, c[1] - y) || 1
    return { tick: obs.tick, move: d > Math.max(6, obs.zone.next_radius * 0.3) ? [(c[0] - x) / d, (c[1] - y) / d] : [0, 0], boost: !me.in_zone, pick: obs.offer ? 0 : undefined }
  } }
}
