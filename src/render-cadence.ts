/** Limit GPU submissions while simulation, input and audio keep their own clocks. */
export class RenderCadence {
  private next = -Infinity;
  due(time: number, unrestricted = false) {
    const interval = 1 / 30;
    if (unrestricted) { this.next = time + interval; return true; }
    if (time + 0.0001 < this.next) return false;
    this.next = Number.isFinite(this.next)
      ? this.next + (Math.floor(Math.max(0, time - this.next) / interval) + 1) * interval
      : time + interval;
    return true;
  }
}
