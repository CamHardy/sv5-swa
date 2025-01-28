import { WalletError } from "@solana/wallet-adapter-base";
import { WalletNotConnectedError, WalletNotReadyError, WalletReadyState } from "@solana/wallet-adapter-base";
import { get, writable } from "svelte/store";

/**
 * @typedef { import('@solana/wallet-adapter-base').Adapter } Adapter
 * @typedef { import('@solana/wallet-adapter-base').MessageSignerWalletAdapter } MessageSignerWalletAdapter
 * @typedef { import('@solana/wallet-adapter-base').MessageSignerWalletAdapterProps } MessageSignerWalletAdapterProps
 * @typedef { import('@solana/wallet-adapter-base').SendTransactionOptions } SendTransactionOptions
 * @typedef { import('@solana/wallet-adapter-base').SignerWalletAdapter } SignerWalletAdapter
 * @typedef { import('@solana/wallet-adapter-base').SignerWalletAdapterProps } SignerWalletAdapterProps
 * @typedef { import('@solana/wallet-adapter-base').WalletName } WalletName
 */

/**
 * @typedef { import('@solana/web3.js').Connection } Connection
 * @typedef { import('@solana/web3.js').PublicKey } PublicKey
 * @typedef { import('@solana/web3.js').Transaction } Transaction
 * @typedef { import('@solana/web3.js').TransactionSignature } TransactionSignature
 * @typedef { import('@solana/web3.js').VersionedTransaction } VersionedTransaction
 */

export class WalletNotSelectedError extends WalletError {
	name = "WalletNotSelectedError";
}

/**
 * @template T
 * @param { string } key 
 * @param { T | null } defaultValue 
 * @returns { T | null }
 */
export function getLocalStorage(key, defaultValue = null) {
	try {
		const value = localStorage.getItem(key);
		if (value) return /** @type { T } */ (JSON.parse(value));
	} catch (error) {
		if (typeof window !== "undefined") {
			console.error(error);
		}
	}

	return defaultValue;
}

/**
 * @template T
 * @param { string } key 
 * @param { T | null } value 
 */
export function setLocalStorage(key, value = null) {
	try {
		if (value === null) {
			localStorage.removeItem(key);
		} else {
			localStorage.setItem(key, JSON.stringify(value));
		}
	} catch (error) {
		if (typeof window !== "undefined") {
			console.error(error);
		}
	}
}

/**
 * @typedef { Object } Wallet
 * @property { Adapter } adapter - The wallet adapter instance
 * @property { WalletReadyState } readyState - The current ready state of the wallet
 */

/**
 * @callback ErrorHandler
 * @param { WalletError } error - The wallet error to handle
 * @returns { void }
 */

/**
 * @typedef { Object } WalletPropsConfig
 * @property { boolean } autoConnect - Whether to automatically connect
 * @property { string } localStorageKey - Key used for local storage
 * @property { ErrorHandler } onError - Error handler function
 * @property { Adapter[] } wallets - Array of wallet adapters
 */

/**
 * @typedef {Object} WalletReturnConfig
 * @property {Wallet[]} wallets - Array of wallet configurations
 * @property {boolean} autoConnect - Whether to automatically connect
 * @property {string} localStorageKey - Key used for local storage
 * @property {ErrorHandler} onError - Error handler function
 */

/**
 * @typedef {Object} WalletStatus
 * @property {boolean} connected - Whether the wallet is connected
 * @property {import('@solana/web3.js').PublicKey | null} publicKey - The public key of the connected wallet
 */

/**
 * @typedef {Object} WalletStore
 * @property {boolean} autoConnect - Whether to automatically connect the wallet
 * @property {Wallet[]} wallets - Array of available wallets
 * @property {Adapter|null} adapter - Current wallet adapter
 * @property {boolean} connected - Whether wallet is currently connected
 * @property {boolean} connecting - Whether wallet is in process of connecting
 * @property {boolean} disconnecting - Whether wallet is in process of disconnecting
 * @property {string} localStorageKey - Key used for local storage
 * @property {ErrorHandler} onError - Error handler function
 * @property {PublicKey|null} publicKey - Public key of connected wallet
 * @property {WalletReadyState} ready - Ready state of current wallet
 * @property {Adapter|null} wallet - Current wallet adapter (duplicate of adapter)
 * @property {Record<WalletName, Adapter>} walletsByName - Map of wallet names to adapters
 * @property {WalletName|null} name - Name of selected wallet
 * @property {function(): Promise<void>} connect - Connect to selected wallet
 * @property {function(): Promise<void>} disconnect - Disconnect from current wallet
 * @property {function(WalletName): void} select - Select a wallet by name
 * @property {function(Transaction|VersionedTransaction, Connection, SendTransactionOptions=): Promise<TransactionSignature>} sendTransaction - Send a transaction
 * @property {SignerWalletAdapterProps["signAllTransactions"]|undefined} signAllTransactions - Sign multiple transactions
 * @property {MessageSignerWalletAdapterProps["signMessage"]|undefined} signMessage - Sign a message
 * @property {SignerWalletAdapterProps["signTransaction"]|undefined} signTransaction - Sign a single transaction
 */

export const walletStore = createWalletStore();

/** @param { Adapter } adapter */
function addAdapterEventListeners(adapter) {
	const { onError, wallets } = get(walletStore);

	wallets.forEach(({ adapter }) => {
		adapter.on("readyStateChange", onReadyStateChange, adapter);
	});
	adapter.on("connect", onConnect);
	adapter.on("disconnect", onDisconnect);
	adapter.on("error", onError);
}

async function autoConnect() {
	const { adapter } = get(walletStore);

	try {
		walletStore.setConnecting(true);
		await adapter?.connect();
	} catch (/** @type { unknown } */ error) {
		// Clear the selected wallet
		walletStore.resetWallet();
		// Don't throw error, but onError will still be called
	} finally {
		walletStore.setConnecting(false);
	}
}

/** @returns { Promise<void> } */
async function connect() {
	const { connected, connecting, disconnecting, ready, adapter } = get(walletStore);
	if (connected || connecting || disconnecting) return;

	if (!adapter) throw newError(new WalletNotSelectedError());

	if (!(ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable)) {
		walletStore.resetWallet();

		if (typeof window !== "undefined") {
			window.open(adapter.url, "_blank");
		}

		throw newError(new WalletNotReadyError());
	}

	try {
		walletStore.setConnecting(true);
		await adapter.connect();
	} catch (/** @type { unknown } */ error) {
		walletStore.resetWallet();
		throw error;
	} finally {
		walletStore.setConnecting(false);
	}
}

function createWalletStore() {
	const { subscribe, update } = writable({
		autoConnect: false,
		wallets: [],
		adapter: null,
		connected: false,
		connecting: false,
		disconnecting: false,
		localStorageKey: "walletAdapter",
		onError: (/** @type { WalletError } */ error) => console.error(error),
		publicKey: null,
		ready: /** @type { WalletReadyState } */ ("Unsupported"),
		wallet: null,
		name: null,
		walletsByName: {},
		connect,
		disconnect,
		select,
		sendTransaction,
		signTransaction: undefined,
		signAllTransactions: undefined,
		signMessage: undefined,
	});

	/** @param { Adapter | null } adapter */
	function updateWalletState(adapter) {
		updateAdapter(adapter);
		update(/** @param { WalletStore } store */ (store) => ({
			...store,
			name: adapter?.name || null,
			wallet: adapter,
			ready: adapter?.readyState || /** @type { WalletReadyState } */ ("Unsupported"),
			publicKey: adapter?.publicKey || null,
			connected: adapter?.connected || false,
		}));

		if (!adapter) return;

		if (shouldAutoConnect()) {
			autoConnect();
		}
	}

	/** @param { WalletName | null } name */
	function updateWalletName(name) {
		const { localStorageKey, walletsByName } = get(walletStore);

		const adapter = walletsByName?.[/** @type { WalletName } */ (name)] ?? null;

		setLocalStorage(localStorageKey, name);
		updateWalletState(adapter);
	}

	/** @param { Adapter | null } adapter */
	function updateAdapter(adapter) {
		removeAdapterEventListeners();

		/** @type { SignerWalletAdapter["signTransaction"] | undefined } */
		let signTransaction = undefined;
		/** @type { SignerWalletAdapter["signAllTransactions"] | undefined } */
		let signAllTransactions = undefined;
		/** @type { MessageSignerWalletAdapter["signMessage"] | undefined } */
		let signMessage = undefined;

		if (adapter) {
			// Sign a transaction if the wallet supports it
			if ("signTransaction" in adapter) {
				/**
				 * Signs a transaction using the connected wallet adapter
				 * @template {Transaction | VersionedTransaction} T
				 * @param {T} transaction - The transaction to sign
				 */
				signTransaction = async function(transaction) {
					const { connected } = get(walletStore);
					if (!connected) throw newError(new WalletNotConnectedError());
					return await adapter.signTransaction(transaction);
				};
			}

			// Sign multiple transactions if the wallet supports it
			if ("signAllTransactions" in adapter) {
				/**
				 * @template { Transaction | VersionedTransaction } T
				 * @param {T[]} transactions - The transactions to sign
				 */
				signAllTransactions = async function(transactions) {
					const { connected } = get(walletStore);
					if (!connected) throw newError(new WalletNotConnectedError());
					return await adapter.signAllTransactions(transactions);
				};
			}

			// Sign an arbitrary message if the wallet supports it
			if ("signMessage" in adapter) {
				/** @param {Uint8Array} message */
				signMessage = async function (message) {
					const { connected } = get(walletStore);
					if (!connected) throw newError(new WalletNotConnectedError());
					return await adapter.signMessage(message);
				};
			}

			addAdapterEventListeners(adapter);
		}

		/** @param {WalletStore} store */
		update(store => ({ ...store, adapter, signTransaction, signAllTransactions, signMessage }));
	}

	return {
		/** Resets the wallet by setting wallet name to null */
		resetWallet: () => updateWalletName(null),

		/** @param {boolean} connecting */
		setConnecting: (connecting) => update((store) => ({ ...store, connecting })),

		/** @param {boolean} disconnecting */
		setDisconnecting: (disconnecting) => update((store) => ({ ...store, disconnecting })),

		/** @param {WalletReadyState} ready */
		setReady: (ready) => update((store) => ({ ...store, ready })),

		subscribe,

		/** @param {WalletReturnConfig & { walletsByName: Record<WalletName, Adapter> }} walletConfig - New wallet configuration */
		updateConfig: (walletConfig) =>
			update((store) => ({
				...store,
				...walletConfig,
			})),

		/** @param {Wallet[]} wallets */
		updateWallets: (wallets) => update((store) => ({ ...store, ...wallets })),

		/** @param {WalletStatus} walletStatus */
		updateStatus: (walletStatus) => update((store) => ({ ...store, ...walletStatus })),

		/** @param {WalletName} walletName */
		updateWallet: (walletName) => updateWalletName(walletName),
	};
}

/** @returns { Promise<void> } */
async function disconnect() {
	const { disconnecting, adapter } = get(walletStore);
	if (disconnecting) return;

	if (!adapter) return walletStore.resetWallet();

	try {
		walletStore.setDisconnecting(true);
		await adapter.disconnect();
	} finally {
		walletStore.resetWallet();
		walletStore.setDisconnecting(false);
	}
}

/**
 * @param { WalletPropsConfig } config
 * @returns { Promise<void> }
 */
export async function initialize({
	wallets,
	autoConnect = false,
	localStorageKey = "walletAdapter",
	/** @param { WalletError } error */
	onError = (error) => console.error(error),
}) {
	/** @type {Record<WalletName, Adapter>} */
	const walletsByName = wallets.reduce((walletsByName, wallet) => {
			walletsByName[wallet.name] = wallet;
			return walletsByName;
	}, {});

	// Wrap adapters to conform to the `Wallet` interface
	const mapWallets = wallets.map((adapter) => ({
		adapter,
		readyState: adapter.readyState,
	}));

	walletStore.updateConfig({
		wallets: mapWallets,
		walletsByName,
		autoConnect,
		localStorageKey,
		onError,
	});

	const walletName = getLocalStorage(localStorageKey);

	if (walletName) {
		walletStore.updateWallet(walletName);
	}
}

/**
 * @param { WalletError } error
 * @returns { WalletError }
 */
function newError(error) {
	const { onError } = get(walletStore);
	onError(error);
	return error;
}

function onConnect() {
	const { adapter } = get(walletStore);
	if (!adapter) return;

	walletStore.updateStatus({
		publicKey: adapter.publicKey,
		connected: adapter.connected,
	});
}

function onDisconnect() {
	walletStore.resetWallet();
}

/**
 * @param { Adapter } thisAdapter
 * @param { WalletReadyState } readyState
 */
function onReadyStateChange(thisAdapter, readyState) {
	const { adapter, wallets } = get(walletStore);
	if (!adapter) return;

	walletStore.setReady(adapter.readyState);

	// When the wallets change, start to listen for changes to their `readyState`
	const walletIndex = wallets.findIndex(({ adapter }) => adapter.name === thisAdapter.name);
	if (walletIndex === -1) {
		return;
	} else {
		walletStore.updateWallets([
			...wallets.slice(0, walletIndex),
			{ ...wallets[walletIndex], readyState },
			...wallets.slice(walletIndex + 1),
		]);
	}
}

/** @returns { void } */
function removeAdapterEventListeners() {
	const { adapter, onError, wallets } = get(walletStore);
	if (!adapter) return;

	wallets.forEach(({ adapter }) => {
		adapter.off("readyStateChange", onReadyStateChange, adapter);
	});
	adapter.off("connect", onConnect);
	adapter.off("disconnect", onDisconnect);
	adapter.off("error", onError);
}

/**
 * @param { WalletName } walletName
 * @returns { Promise<void> }
 */
async function select(walletName) {
	const { name, adapter } = get(walletStore);
	if (name === walletName) return;

	if (adapter) await disconnect();

	walletStore.updateWallet(walletName);
}

/**
 * @param { Transaction | VersionedTransaction } transaction
 * @param { Connection } connection
 * @param { SendTransactionOptions } options
 * @returns { Promise<TransactionSignature> }
 */
async function sendTransaction(
	transaction,
	connection,
	options
) {
	const { connected, adapter } = get(walletStore);
	if (!connected) throw newError(new WalletNotConnectedError());
	if (!adapter) throw newError(new WalletNotSelectedError());

	return await adapter.sendTransaction(transaction, connection, options);
}

/** @returns { boolean } */
function shouldAutoConnect() {
	const { adapter, autoConnect, ready, connected, connecting } = get(walletStore);

	return !(
		!autoConnect ||
		!adapter ||
		!(ready === WalletReadyState.Installed || ready === WalletReadyState.Loadable) ||
		connected ||
		connecting
	);
}

if (typeof window !== "undefined") {
	// Ensure the adapter listeners are invalidated before refreshing the page.
	window.addEventListener("beforeunload", removeAdapterEventListeners);
}