type ToastKind = 'success' | 'error' | 'info';
export type Toast = { id: number; kind: ToastKind; message: string };

let nextId = 0;

/**
 * Notifiche brevi. Vengono anche annunciate agli screen reader tramite la
 * live region in `Toaster.svelte`: un feedback che si vede soltanto non e'
 * un feedback per tutti.
 */
class ToastStore {
	items = $state<Toast[]>([]);

	push(message: string, kind: ToastKind = 'info', ms = 4000) {
		const id = nextId++;
		this.items.push({ id, kind, message });
		setTimeout(() => this.dismiss(id), ms);
		return id;
	}

	success = (m: string) => this.push(m, 'success');
	error = (m: string) => this.push(m, 'error', 6000);
	info = (m: string) => this.push(m, 'info');

	dismiss(id: number) {
		this.items = this.items.filter((t) => t.id !== id);
	}
}

export const toast = new ToastStore();
