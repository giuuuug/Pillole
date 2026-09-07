import { test, expect } from '@playwright/test';
import { registerUser, registerAndVerifyUser } from '../support/actors';
import { uniquePill } from '../support/factories';

test.describe('Preferite e salvataggio in libreria', () => {
	test('segnare/togliere una pillola come preferita cambia il filtro "favorites"', async () => {
		const { api } = await registerUser();
		const { id } = await api.json<{ id: string }>(await api.createPill(uniquePill()));

		const toggled = await api.json<{ isFavorite: boolean }>(await api.toggleFavorite(id));
		expect(toggled.isFavorite).toBe(true);

		const favorites = await api.json<{ items: { id: string }[] }>(
			await api.library({ filtro: 'favorites' })
		);
		expect(favorites.items.some((p) => p.id === id)).toBe(true);

		const toggledBack = await api.json<{ isFavorite: boolean }>(await api.toggleFavorite(id));
		expect(toggledBack.isFavorite).toBe(false);

		const favoritesAfter = await api.json<{ items: { id: string }[] }>(
			await api.library({ filtro: 'favorites' })
		);
		expect(favoritesAfter.items.some((p) => p.id === id)).toBe(false);
	});

	test('non si può segnare come preferita una pillola di qualcun altro (404)', async () => {
		const owner = await registerUser();
		const { id } = await owner.api.json<{ id: string }>(await owner.api.createPill(uniquePill()));

		const other = await registerUser();
		expect((await other.api.toggleFavorite(id)).status).toBe(404);
	});

	test('salvare una pillola pubblica altrui la aggiunge alla libreria e incrementa il contatore', async () => {
		const author = await registerAndVerifyUser();
		const { id } = await author.api.json<{ id: string }>(
			await author.api.createPill(uniquePill({ isPublic: true }))
		);

		const saver = await registerUser();
		const res = await saver.api.savePill(id);
		expect(res.status).toBe(200);
		const body = await saver.api.json<{ saved: boolean; saveCount: number }>(res);
		expect(body.saved).toBe(true);
		expect(body.saveCount).toBe(1);

		const library = await saver.api.json<{ items: { id: string }[] }>(
			await saver.api.library({ filtro: 'saved' })
		);
		expect(library.items.some((p) => p.id === id)).toBe(true);
	});

	test('salvare la stessa pillola due volte non duplica né fa salire il contatore due volte', async () => {
		const author = await registerAndVerifyUser();
		const { id } = await author.api.json<{ id: string }>(
			await author.api.createPill(uniquePill({ isPublic: true }))
		);
		const saver = await registerUser();

		await saver.api.savePill(id);
		const second = await saver.api.json<{ saveCount: number }>(await saver.api.savePill(id));
		expect(second.saveCount).toBe(1);
	});

	test('non si può salvare una pillola privata altrui', async () => {
		const owner = await registerUser();
		const { id } = await owner.api.json<{ id: string }>(
			await owner.api.createPill(uniquePill({ isPublic: false }))
		);

		const other = await registerUser();
		expect((await other.api.savePill(id)).status).toBe(404);
	});

	test('non si può salvare la propria pillola', async () => {
		const author = await registerAndVerifyUser();
		const { id } = await author.api.json<{ id: string }>(
			await author.api.createPill(uniquePill({ isPublic: true }))
		);

		expect((await author.api.savePill(id)).status).toBe(400);
	});

	test('togliere una pillola salvata la rimuove dalla libreria e decrementa il contatore, mai sotto zero', async () => {
		const author = await registerAndVerifyUser();
		const { id } = await author.api.json<{ id: string }>(
			await author.api.createPill(uniquePill({ isPublic: true }))
		);
		const saver = await registerUser();
		await saver.api.savePill(id);

		const removed = await saver.api.json<{ saved: boolean; saveCount: number }>(
			await saver.api.unsavePill(id)
		);
		expect(removed.saved).toBe(false);
		expect(removed.saveCount).toBe(0);

		const removedAgain = await saver.api.json<{ saveCount: number }>(
			await saver.api.unsavePill(id)
		);
		expect(removedAgain.saveCount).toBe(0);
	});
});
