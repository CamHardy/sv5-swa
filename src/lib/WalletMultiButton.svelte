<script>
	import { walletStore } from "./walletStore.js";

	/** 
	 * @typedef { import('@solana/wallet-adapter-base').Adapter } Adapter
	 * @typedef { import('./walletStore.js').Wallet } Wallet
	 */

	/**
	 * @param { Wallet } a
	 * @param { Wallet } b
	 */
	const byInstalledStatus = (a, b) => {
		if (a.readyState === "Installed" && b.readyState !== "Installed") {
			return -1;
		}

		if (a.readyState !== "Installed" && b.readyState === "Installed") {
			return 1;
		}

		return 0;
	};

	const installedWalletAdaptersWithReadyState = $derived($walletStore.wallets
		.filter((walletAdapterAndReadyState) => {
			return walletAdapterAndReadyState.readyState === "Installed";
		})
		.sort((walletAdapterAndReadyStateA, walletAdapterAndReadyStateB) => {
			return byInstalledStatus(
				walletAdapterAndReadyStateA,
				walletAdapterAndReadyStateB,
			);
    })
	);

	/** @param { Adapter } wallet */
	async function handleConnect(wallet) {
		$walletStore.select(wallet.name);
		await $walletStore.connect();
	}

	async function copyToClipboard() {
		await navigator.clipboard.writeText($walletStore.publicKey.toBase58());
	}

	async function handleDisconnect() {
		await $walletStore.disconnect();
	}

	/** @param { string } address */
	function abbrAddress(address) {
		return `${address.slice(0, 4)}...${address.slice(-4)}`;
	}
</script>

{#if $walletStore.connected}
	<button id="connected-wallet-btn" popovertarget="connected-wallet-menu">
		<img
			alt="icon of {$walletStore.adapter.name}"
			src={$walletStore.adapter.icon}
			width="38px"
		/>
		<span>{abbrAddress($walletStore.publicKey.toBase58())}</span></button
	>
	<ul id="connected-wallet-menu" popover="auto">
		<li><button class="wallet-op-btn" onclick={copyToClipboard}>Copy Address</button></li>
		<li><button class="wallet-op-btn" onclick={handleDisconnect}>Disconnect</button></li>
	</ul>
{:else}
	<button id="select-wallet-btn" popovertarget="select-wallet-modal">Connect Solana Wallet</button>
	<ul id="select-wallet-modal" popover="auto">
		{#each installedWalletAdaptersWithReadyState as wallet}
			<li>
				{#if !wallet.adapter.connected}
					<button class="wallet-item-btn"
						onclick={async () => {
								await handleConnect(wallet.adapter);
						}}
						type="button"
					>
						<img
							alt="icon of {wallet.adapter.name}"
							src={wallet.adapter.icon}
							width="38px"
						/>
						<span>{wallet.adapter.name}</span>
					</button>
				{/if}
			</li>
		{/each}
	</ul>
{/if}

<style>
	ul {
		list-style-type: none;
		padding: 0;
		margin: 0;
	}
	li {
		list-style-type: none;
	}
	[popover] {
		margin: 0;
		padding: 0;
		border: 0;
	}

	#connected-wallet-btn {
		anchor-name: --connected-wallet-btn;
		display: flex;
		align-items: center;
	}
	#connected-wallet-btn img {
		margin-right: 10px;
	}
	#connected-wallet-btn span {
		flex: 1;
	}

	#connected-wallet-menu {
		position: absolute;
		position-anchor: --connected-wallet-btn;
		right: anchor(right);
		top: anchor(bottom);
		inset-area: bottom;
	}

	#select-wallet-btn {
		anchor-name: --select-wallet-btn;
	}
	#select-wallet-modal {
		position-anchor: --select-wallet-btn;
		right: anchor(right);
		bottom: anchor(bottom);
		inset-area: bottom;
	}

	.wallet-item-btn {
		display: flex;
		align-items: center; 
		justify-content: flex-start; 
		width: 100%; 
		padding: 10px; 
		border: none; 
		background: none; 
		cursor: pointer; 
	}

	.wallet-item-btn img {
		margin-right: 10px; 
	}

	.wallet-item-btn span {
		flex: 1; 
	}
</style>