<script>
  import WalletMultiButton from "$lib/WalletMultiButton.svelte";
	import WalletProvider from "$lib/WalletProvider.svelte";
  import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
  import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";

	const localStorageKey = "walletAdapter";
  const walletAdapters = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
  ];
</script>

<div class="flex-col m-8 p-4 border-2 rounded-xl space-y-4 justify-center items-center text-center">
	<h1>Welcome to your library project</h1>
	<p>Create your package using @sveltejs/package and preview/showcase your work with SvelteKit</p>
	<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

	<WalletProvider {localStorageKey} wallets={walletAdapters} autoConnect />
	<WalletMultiButton/>
</div>