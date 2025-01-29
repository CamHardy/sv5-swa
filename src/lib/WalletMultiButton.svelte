<script>
  import * as Avatar from "$lib/components/ui/avatar/index.js";
  import { Button, buttonVariants } from "$lib/components/ui/button";
  import * as Dialog from "$lib/components/ui/dialog";
  import * as Popover from "$lib/components/ui/popover";
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
	<Popover.Root>
		<Popover.Trigger class={buttonVariants()}>
			<Avatar.Root class="p-1">
				<Avatar.Image src={$walletStore.adapter.icon} alt={$walletStore.adapter.name} />
				<Avatar.Fallback>{$walletStore.adapter.name[0].toUpperCase()}</Avatar.Fallback>
			</Avatar.Root>
			<span>{abbrAddress($walletStore.publicKey.toBase58())}</span>
		</Popover.Trigger>
		<Popover.Content side="bottom" class="flex flex-col space-y-2">
			<Button onclick={copyToClipboard}>Copy Address</Button>
			<Button onclick={handleDisconnect}>Disconnect</Button>
		</Popover.Content>
	</Popover.Root>
{:else}
	<Dialog.Root>
		<Dialog.Trigger class={buttonVariants()}>Connect Wallet</Dialog.Trigger>
		<Dialog.Content class="sm:max-w-[300px]">
			<Dialog.Header>
				<Dialog.Title>Choose your wallet</Dialog.Title>
			</Dialog.Header>
			<div class="flex flex-col space-y-2">
				{#each $walletStore.wallets as wallet}
					{#if wallet.readyState === "Installed" && !wallet.adapter.connected}
						<Button on:click={async () => { await handleConnect(wallet.adapter);}}>
							<Avatar.Root class="p-1">
								<Avatar.Image src={wallet.adapter.icon} alt={wallet.adapter.name} />
								<Avatar.Fallback class="bg-slate-700">{wallet.adapter.name.substr(0, 2).toUpperCase()}</Avatar.Fallback>
							</Avatar.Root>
							<span>{wallet.adapter.name}</span>
						</Button>
					{:else}
						<Button disabled>
							<Avatar.Root class="p-1">
								<Avatar.Image src={wallet.adapter.icon} alt={wallet.adapter.name} />
								<Avatar.Fallback>{wallet.adapter.name.substr(0, 2).toUpperCase()}</Avatar.Fallback>
							</Avatar.Root>
							<span>{wallet.adapter.name}</span>
						</Button>
					{/if}
				{/each}
			</div>
		</Dialog.Content>
	</Dialog.Root>
{/if}