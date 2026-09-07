<script lang="ts">
	import { authClient } from '$lib/auth-client';
	import { toast } from '$lib/client/toast.svelte';

	type Props = { providers: { google: boolean; apple: boolean }; callbackURL?: string };
	let { providers, callbackURL = '/' }: Props = $props();

	let busy = $state<string | null>(null);

	async function signInWith(provider: 'google' | 'apple') {
		busy = provider;
		try {
			await authClient.signIn.social({ provider, callbackURL });
		} catch {
			busy = null;
			toast.error('Accesso non riuscito. Riprova.');
		}
	}

	const any = $derived(providers.google || providers.apple);
</script>

{#if any}
	<div class="space-y-2">
		{#if providers.google}
			<button
				type="button"
				class="btn btn-ghost w-full"
				onclick={() => signInWith('google')}
				disabled={busy !== null}
			>
				<!-- Logo Google ufficiale: colori del marchio, non decorativi. -->
				<svg width="19" height="19" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
					<path
						fill="#EA4335"
						d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.3 17.6 9.5 24 9.5z"
					/>
					<path
						fill="#4285F4"
						d="M46.1 24.5c0-1.6-.1-3.2-.4-4.7H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.6 5.9c4.4-4.1 6.7-10.1 6.7-17.1z"
					/>
					<path
						fill="#FBBC05"
						d="M10.4 28.7c-.5-1.4-.8-2.9-.8-4.7s.3-3.3.8-4.7l-7.8-6.1C.9 16.5 0 20.1 0 24s.9 7.5 2.6 10.8l7.8-6.1z"
					/>
					<path
						fill="#34A853"
						d="M24 48c6.2 0 11.5-2 15.4-5.6l-7.6-5.9c-2.1 1.4-4.8 2.3-7.8 2.3-6.4 0-11.7-3.8-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
					/>
				</svg>
				{busy === 'google' ? 'Ti porto su Google…' : 'Continua con Google'}
			</button>
		{/if}

		{#if providers.apple}
			<button
				type="button"
				class="btn btn-ghost w-full"
				onclick={() => signInWith('apple')}
				disabled={busy !== null}
			>
				<svg
					width="19"
					height="19"
					viewBox="0 0 24 24"
					fill="currentColor"
					aria-hidden="true"
					focusable="false"
				>
					<path
						d="M17.05 12.54c-.02-2.3 1.88-3.4 1.96-3.46-1.07-1.56-2.73-1.78-3.32-1.8-1.41-.14-2.76.83-3.48.83-.72 0-1.83-.81-3-.79-1.54.02-2.96.9-3.75 2.28-1.6 2.78-.41 6.9 1.15 9.16.76 1.11 1.67 2.35 2.86 2.3 1.15-.05 1.58-.74 2.97-.74 1.39 0 1.78.74 3 .72 1.24-.02 2.02-1.12 2.78-2.24.87-1.28 1.23-2.52 1.25-2.59-.03-.01-2.4-.92-2.42-3.67zM14.79 5.4c.63-.77 1.06-1.83.94-2.9-.91.04-2.01.61-2.67 1.37-.59.68-1.1 1.76-.96 2.8 1.01.08 2.05-.51 2.69-1.27z"
					/>
				</svg>
				{busy === 'apple' ? 'Ti porto su Apple…' : 'Continua con Apple'}
			</button>
		{/if}
	</div>

	<div class="my-5 flex items-center gap-3" role="separator" aria-orientation="horizontal">
		<span class="h-px flex-1" style="background:var(--c-border)"></span>
		<span class="text-sm" style="color:var(--c-fg-muted)">oppure</span>
		<span class="h-px flex-1" style="background:var(--c-border)"></span>
	</div>
{/if}
