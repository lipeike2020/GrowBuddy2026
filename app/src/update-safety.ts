const guards = new Set<() => boolean>();
export function registerUpdateGuard(guard: () => boolean) { guards.add(guard); return () => { guards.delete(guard); }; }
export function safeToUpdate() { return [...guards].every(guard => !guard()); }
