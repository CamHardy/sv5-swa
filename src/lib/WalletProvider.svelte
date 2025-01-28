<script>
	import { initialize } from "./walletStore.js";

	/**
	 * @typedef { import('@solana/wallet-adapter-base').Adapter } Adapter
	 * @typedef { import('@solana/wallet-adapter-base').WalletError } WalletError
	 */

	/** 
	 * @type { Object }
	 * @property { string } localStorageKey
	 * @property { Adapter[] } wallets
	 */
	let {
		localStorageKey,
		wallets,
		autoConnect = false,
		onError = /** @param { WalletError } error */ (error) => console.error(error)
	} = $props();

	$effect(() => {
		if (wallets) {
			initialize({ wallets, autoConnect, localStorageKey, onError });
		}
	});
</script>