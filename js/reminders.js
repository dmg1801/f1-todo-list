// Recordatorios locales. Se comprueban al cargar, al volver a la pestaña,
// cada 15 s y con un temporizador al próximo aviso (si la pestaña está abierta).
const LATE_MS = 60 * 1000;

export class Reminders {
  constructor({ getTasks, onFire, onChange }) {
    this.getTasks = getTasks;
    this.onFire = onFire;       // (task, late) => void
    this.onChange = onChange;   // () => void  (guardar + repintar)
    this.timer = null;
    this.swReg = null;
    setInterval(() => this.check(), 15000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) this.check(); });
    window.addEventListener('focus', () => this.check());
    window.addEventListener('pageshow', () => this.check());
  }

  check(now = Date.now()) {
    let changed = false;
    for (const task of this.getTasks()) {
      if (task.alarm == null || task.done || task.fired || task.dismissed) continue;
      if (task.alarm <= now) {
        task.fired = true;
        task.late = now - task.alarm > LATE_MS;
        changed = true;
        this.onFire(task, task.late);
      }
    }
    if (changed) this.onChange();
    this.schedule(now);
  }

  schedule(now = Date.now()) {
    clearTimeout(this.timer);
    const next = this.getTasks()
      .filter(t => t.alarm != null && !t.done && !t.fired && !t.dismissed && t.alarm > now)
      .reduce((m, t) => Math.min(m, t.alarm), Infinity);
    if (next !== Infinity) {
      const delay = Math.min(next - now + 250, 2 ** 31 - 1);
      this.timer = setTimeout(() => this.check(), delay);
    }
  }

  // Avisos visibles: disparados, sin descartar y de tareas pendientes.
  active() {
    return this.getTasks().filter(t => t.fired && !t.dismissed && !t.done);
  }

  static supported() { return 'Notification' in window; }
  static permission() { return Reminders.supported() ? Notification.permission : 'unsupported'; }

  async requestPermission() {
    if (!Reminders.supported()) return 'unsupported';
    try { return await Notification.requestPermission(); }
    catch (e) { return Notification.permission; }
  }

  async notify(title, body) {
    if (Reminders.permission() !== 'granted') return;
    const opts = { body, icon: './assets/icons/icon-192.png', badge: './assets/icons/icon-192.png', tag: 'pitwall-' + body };
    try {
      if (this.swReg && this.swReg.showNotification) { await this.swReg.showNotification(title, opts); return; }
    } catch (e) { /* seguir con la API directa */ }
    try { new Notification(title, opts); } catch (e) { /* Android exige Service Worker; el aviso de la app ya se muestra */ }
  }
}
