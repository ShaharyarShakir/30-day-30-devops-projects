<script lang="ts">
	import { shortenUrl } from '$lib/api';

	let url = $state('');
	let shortCode = $state('');
	let loading = $state(false);
	let error = $state('');
	let copyStatus = $state('Copy');
	let showQr = $state(false);
	let searchQuery = $state('');
	let copiedItems = $state<Record<string, boolean>>({});

	interface HistoryItem {
		id: string;
		original: string;
		short: string;
		timestamp: number;
		clicks: number;
	}

	let history = $state<HistoryItem[]>([]);

	// Read history on component mount
	$effect(() => {
		if (typeof window !== 'undefined') {
			const stored = localStorage.getItem('shortener_history');
			if (stored) {
				try {
					history = JSON.parse(stored);
				} catch (e) {
					console.error('Failed to parse history from localStorage', e);
				}
			}
		}
	});

	// Persist history changes to localStorage
	$effect(() => {
		if (typeof window !== 'undefined') {
			localStorage.setItem('shortener_history', JSON.stringify(history));
		}
	});

	// Helper to format/validate URL
	function formatAndValidateUrl(inputUrl: string) {
		let cleanUrl = inputUrl.trim();
		if (!cleanUrl) return { valid: false, url: '' };

		// Prepend https:// if protocol is missing
		if (!/^https?:\/\//i.test(cleanUrl)) {
			cleanUrl = 'https://' + cleanUrl;
		}

		try {
			const urlObj = new URL(cleanUrl);
			// Validate simple domain structure
			if (!urlObj.hostname.includes('.')) {
				return { valid: false, url: cleanUrl };
			}
			return { valid: true, url: cleanUrl };
		} catch {
			return { valid: false, url: cleanUrl };
		}
	}

	// Reactive validation status of url
	let urlValidation = $derived(formatAndValidateUrl(url));

	// Submit URL to shortener
	async function submit() {
		error = '';
		shortCode = '';

		const val = formatAndValidateUrl(url);
		if (!val.valid) {
			error = 'Please enter a valid URL (e.g. google.com or https://google.com)';
			return;
		}

		loading = true;

		try {
			const result = await shortenUrl(val.url);
			shortCode = `http://localhost:8080/${result.short_code}`;

			// Add to local history list
			const newItem: HistoryItem = {
				id: Math.random().toString(36).substring(2, 9),
				original: val.url,
				short: shortCode,
				timestamp: Date.now(),
				clicks: 0
			};

			history = [newItem, ...history];
			showQr = false;
		} catch {
			error = 'Failed to shorten URL. Make sure the backend is running.';
		} finally {
			loading = false;
		}
	}

	// Copy to clipboard with success state
	async function copyToClipboard(text: string, isResult = false, item?: HistoryItem) {
		try {
			await navigator.clipboard.writeText(text);
			if (isResult) {
				copyStatus = 'Copied!';
				setTimeout(() => {
					copyStatus = 'Copy';
				}, 2000);
			}
			if (item) {
				copiedItems = { ...copiedItems, [item.id]: true };
				setTimeout(() => {
					copiedItems = { ...copiedItems, [item.id]: false };
				}, 1500);
			}
		} catch (err) {
			console.error('Failed to copy text: ', err);
		}
	}

	// Simulate clicks locally when navigating to short link
	function handleShortUrlClick(item: HistoryItem) {
		item.clicks += 1;
		history = [...history]; // Trigger Svelte state reactivity
	}

	// QR Code download handler
	async function downloadQrCode(urlToQr: string, filename = 'qr-code.png') {
		const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(urlToQr)}`;
		try {
			const response = await fetch(qrUrl);
			const blob = await response.blob();
			const blobUrl = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = blobUrl;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(blobUrl);
		} catch (err) {
			console.error('Failed to download QR code', err);
		}
	}

	// Search filter reactivity
	let filteredHistory = $derived(
		history.filter(
			(item) =>
				item.original.toLowerCase().includes(searchQuery.toLowerCase()) ||
				item.short.toLowerCase().includes(searchQuery.toLowerCase())
		)
	);

	// Delete single item from history
	function deleteItem(id: string) {
		history = history.filter((item) => item.id !== id);
	}

	// Bulk delete
	function clearAllHistory() {
		if (confirm('Are you sure you want to clear all history?')) {
			history = [];
		}
	}

	// CSV and JSON export handler
	function exportHistory(format: 'csv' | 'json') {
		if (history.length === 0) return;

		let content: string;
		let mimeType: string;
		let filename: string;

		if (format === 'json') {
			content = JSON.stringify(history, null, 2);
			mimeType = 'application/json';
			filename = 'url-shortener-history.json';
		} else {
			const headers = 'ID,Original URL,Shortened URL,Timestamp,Clicks\n';
			const rows = history
				.map(
					(item) =>
						`"${item.id}","${item.original.replace(/"/g, '""')}","${item.short}",${item.timestamp},${item.clicks}`
				)
				.join('\n');
			content = headers + rows;
			mimeType = 'text/csv';
			filename = 'url-shortener-history.csv';
		}

		const blob = new Blob([content], { type: mimeType });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
	}

	// Human-readable timestamp utility
	function formatTime(timestamp: number) {
		const diff = Date.now() - timestamp;
		if (diff < 60000) return 'Just now';
		const minutes = Math.floor(diff / 60000);
		if (minutes < 60) return `${minutes}m ago`;
		const hours = Math.floor(minutes / 60);
		if (hours < 24) return `${hours}h ago`;
		return new Date(timestamp).toLocaleDateString();
	}
</script>

<svelte:head>
	<title>Developer URL Shortener & Analytics Dashboard</title>
</svelte:head>

<div class="min-h-screen flex flex-col items-center py-8 px-4 sm:px-6 lg:px-8">
	<div class="w-full max-w-6xl space-y-8">
		<!-- Hero Section -->
		<header class="text-center space-y-4">
			<div
				class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-indigo-400 font-medium mb-2 shadow-sm"
			>
				<span class="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
				URL shortener v2.0
			</div>
			<h1
				class="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-indigo-400 tracking-tight"
			>
				Trim Links. Track Clicks.
			</h1>
			<p class="text-sm md:text-base text-slate-400 max-w-md mx-auto">
				Instantly create shortened links and manage your local analytics in one privacy-respecting
				dashboard.
			</p>
		</header>

		<!-- Main Dashboard Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
			<!-- Left Side: Shortener controls & analytics overview (5/12 cols) -->
			<div class="lg:col-span-5 space-y-6">
				<!-- Quick Analytics Cards -->
				<div class="grid grid-cols-2 gap-4">
					<div
						class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md"
					>
						<div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
							Total Shortened
						</div>
						<div class="text-2xl font-bold text-indigo-400">{history.length}</div>
					</div>
					<div
						class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 shadow-lg backdrop-blur-md"
					>
						<div class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
							Simulated Clicks
						</div>
						<div class="text-2xl font-bold text-violet-400">
							{history.reduce((sum, item) => sum + item.clicks, 0)}
						</div>
					</div>
				</div>

				<!-- Shortener Form Card -->
				<div
					class="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden"
				>
					<!-- Accent background glow -->
					<div
						class="absolute -top-24 -left-24 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"
					></div>

					<h2 class="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
						<svg
							xmlns="http://www.w3.org/2000/svg"
							class="w-5 h-5 text-indigo-400"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
							stroke-width="2"
						>
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Shorten a New URL
					</h2>

					<form
						onsubmit={(e) => {
							e.preventDefault();
							submit();
						}}
						class="space-y-4"
					>
						<div class="space-y-2">
							<div class="relative flex items-center">
								<!-- Link Icon decoration -->
								<span class="absolute left-4 text-slate-500">
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-5 h-5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
										/>
									</svg>
								</span>

								<input
									type="text"
									bind:value={url}
									placeholder="Paste link here (e.g. google.com)"
									class="w-full bg-slate-950/50 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-3.5 pl-12 pr-10 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition-all duration-200"
								/>

								<!-- Clear Input Button -->
								{#if url}
									<button
										type="button"
										onclick={() => (url = '')}
										class="absolute right-3.5 p-1 rounded-md text-slate-500 hover:text-slate-300 transition-colors"
										title="Clear input"
									>
										<svg
											xmlns="http://www.w3.org/2000/svg"
											class="w-4 h-4"
											fill="none"
											viewBox="0 0 24 24"
											stroke="currentColor"
											stroke-width="2"
										>
											<path
												stroke-linecap="round"
												stroke-linejoin="round"
												d="M6 18L18 6M6 6l12 12"
											/>
										</svg>
									</button>
								{/if}
							</div>

							<!-- URL validation visual guide -->
							<div class="flex justify-between items-center text-xs mt-1 px-1">
								{#if url}
									{#if urlValidation.valid}
										<span class="text-emerald-400 flex items-center gap-1">
											<svg
												class="w-3.5 h-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2.5"
											>
												<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
											</svg>
											Valid format:
											<span class="font-mono text-[10px] opacity-90">{urlValidation.url}</span>
										</span>
									{:else}
										<span class="text-amber-400 flex items-center gap-1">
											<svg
												class="w-3.5 h-3.5"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
												/>
											</svg>
											Please enter a valid domain name
										</span>
									{/if}
								{:else}
									<span class="text-slate-500">Auto-prepends https:// if needed</span>
								{/if}
							</div>
						</div>

						<button
							type="submit"
							disabled={loading || !url.trim()}
							class="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-indigo-950/50 disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] transition-all duration-150 flex items-center justify-center gap-2"
						>
							{#if loading}
								<svg
									class="animate-spin h-5 w-5 text-white"
									xmlns="http://www.w3.org/2000/svg"
									fill="none"
									viewBox="0 0 24 24"
								>
									<circle
										class="opacity-25"
										cx="12"
										cy="12"
										r="10"
										stroke="currentColor"
										stroke-width="4"
									></circle>
									<path
										class="opacity-75"
										fill="currentColor"
										d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
									></path>
								</svg>
								Generating Link...
							{:else}
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2.5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
									/>
								</svg>
								Shorten URL
							{/if}
						</button>
					</form>

					{#if error}
						<div
							class="mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-start gap-2"
						>
							<svg
								class="w-4 h-4 text-rose-400 shrink-0 mt-0.5"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							<span>{error}</span>
						</div>
					{/if}
				</div>

				<!-- Result Box -->
				{#if shortCode}
					<div
						class="bg-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 shadow-xl backdrop-blur-md relative overflow-hidden transition-all duration-300"
					>
						<div
							class="absolute -top-12 -right-12 w-24 h-24 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"
						></div>
						<h3
							class="text-xs font-semibold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-1.5"
						>
							<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
							Short Link Created Successfully
						</h3>

						<div
							class="flex items-center gap-2 p-3 bg-slate-950/60 rounded-xl border border-slate-800"
						>
							<input
								type="text"
								readonly
								value={shortCode}
								class="flex-1 bg-transparent border-none text-slate-100 text-sm focus:outline-none select-all overflow-hidden text-ellipsis font-medium"
							/>
							<button
								onclick={() => copyToClipboard(shortCode, true)}
								class="px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 {copyStatus ===
								'Copied!'
									? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
									: 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white'}"
							>
								{#if copyStatus === 'Copied!'}
									<svg
										class="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2.5"
									>
										<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
									</svg>
									Copied!
								{:else}
									<svg
										class="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
										/>
									</svg>
									Copy
								{/if}
							</button>
						</div>

						<!-- Result Actions -->
						<div class="mt-4 flex items-center justify-between gap-4">
							<button
								onclick={() => (showQr = !showQr)}
								class="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1.5"
							>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
									/>
								</svg>
								{showQr ? 'Hide QR Code' : 'Generate QR Code'}
							</button>

							<a
								href={shortCode}
								target="_blank"
								rel="external"
								class="text-xs text-slate-400 hover:text-indigo-400 transition-colors flex items-center gap-1"
								onclick={() => {
									if (history.length > 0) {
										handleShortUrlClick(history[0]);
									}
								}}
							>
								Test link
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-3.5 h-3.5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
									/>
								</svg>
							</a>
						</div>

						<!-- QR Code Block -->
						{#if showQr}
							<div
								class="mt-4 p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col items-center gap-3"
							>
								<img
									src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={encodeURIComponent(
										shortCode
									)}"
									alt="QR Code for short link"
									class="w-36 h-36 bg-white p-2 rounded-lg"
								/>
								<button
									onclick={() => downloadQrCode(shortCode, `qr-${shortCode.split('/').pop()}.png`)}
									class="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors"
								>
									<svg
										xmlns="http://www.w3.org/2000/svg"
										class="w-3.5 h-3.5"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
										/>
									</svg>
									Download QR Image
								</button>
							</div>
						{/if}
					</div>
				{/if}
			</div>

			<!-- Right Side: History Sidebar (7/12 cols) -->
			<div
				class="lg:col-span-7 bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 shadow-xl backdrop-blur-md h-[550px] lg:h-[600px] flex flex-col"
			>
				<!-- History Header -->
				<div class="pb-4 border-b border-slate-800/80 space-y-4">
					<div class="flex items-center justify-between gap-4">
						<h2 class="text-lg font-bold text-slate-100 flex items-center gap-2">
							<svg
								xmlns="http://www.w3.org/2000/svg"
								class="w-5 h-5 text-indigo-400"
								fill="none"
								viewBox="0 0 24 24"
								stroke="currentColor"
								stroke-width="2"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
								/>
							</svg>
							Shorten History
						</h2>

						<!-- Action buttons for history -->
						{#if history.length > 0}
							<div class="flex items-center gap-1.5">
								<!-- Export Dropdown / Buttons -->
								<button
									onclick={() => exportHistory('csv')}
									class="px-2.5 py-1.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
									title="Export CSV"
								>
									<svg
										class="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
										/>
									</svg>
									CSV
								</button>
								<button
									onclick={() => exportHistory('json')}
									class="px-2.5 py-1.5 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1"
									title="Export JSON"
								>
									<svg
										class="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
										/>
									</svg>
									JSON
								</button>
								<!-- Clear All -->
								<button
									onclick={clearAllHistory}
									class="px-2.5 py-1.5 rounded-lg border border-rose-900/30 hover:border-rose-955 bg-rose-955/10 hover:bg-rose-955/30 text-rose-400 text-xs font-semibold transition-colors flex items-center gap-1"
								>
									<svg
										class="w-3.5 h-3.5"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
										stroke-width="2"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										/>
									</svg>
									Clear All
								</button>
							</div>
						{/if}
					</div>

					<!-- Search Bar -->
					{#if history.length > 0}
						<div class="relative flex items-center">
							<span class="absolute left-3 text-slate-500">
								<svg
									xmlns="http://www.w3.org/2000/svg"
									class="w-4 h-4"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
									stroke-width="2"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
									/>
								</svg>
							</span>
							<input
								type="text"
								bind:value={searchQuery}
								placeholder="Search shortened links or original URLs..."
								class="w-full bg-slate-950/40 border border-slate-800/80 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl py-2 pl-9 pr-4 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all duration-200"
							/>
						</div>
					{/if}
				</div>

				<!-- Scrollable History List -->
				<div class="flex-1 overflow-y-auto pr-1 mt-4 custom-scrollbar space-y-3">
					{#if history.length === 0}
						<div class="h-full flex flex-col items-center justify-center text-center p-8 space-y-3">
							<div class="p-4 bg-slate-950/40 border border-slate-800 rounded-full text-slate-500">
								<svg
									class="w-8 h-8"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
									stroke-width="1.5"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
									/>
								</svg>
							</div>
							<div class="space-y-1">
								<h3 class="text-sm font-semibold text-slate-300">No shortened links yet</h3>
								<p class="text-xs text-slate-500 max-w-xs mx-auto">
									Create your first shortened link and it will show up here in your personal
									dashboard.
								</p>
							</div>
						</div>
					{:else}
						{#if filteredHistory.length === 0}
							<div class="py-12 flex flex-col items-center justify-center text-center space-y-2">
								<p class="text-sm text-slate-400 font-medium">No search results found</p>
								<p class="text-xs text-slate-600">
									Try searching for a different keyword or domain.
								</p>
							</div>
						{:else}
							{#each filteredHistory as item (item.id)}
								<div
									class="group flex items-center justify-between p-3.5 bg-slate-950/20 hover:bg-slate-950/40 border border-slate-800/80 hover:border-slate-700/60 rounded-xl transition-all duration-200 gap-4"
								>
									<div class="flex-1 min-w-0 space-y-1">
										<div class="flex items-center gap-2">
											<span class="text-slate-500 group-hover:text-indigo-400 transition-colors">
												<svg
													class="w-3.5 h-3.5"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
													/>
												</svg>
											</span>
											<!-- Link redirect opens in new tab and increments click simulation counter -->
											<a
												href={item.short}
												target="_blank"
												rel="external"
												onclick={() => handleShortUrlClick(item)}
												class="text-sm font-bold text-indigo-400 hover:text-indigo-300 hover:underline truncate"
											>
												{item.short}
											</a>
										</div>
										<p class="text-xs text-slate-400 truncate" title={item.original}>
											{item.original}
										</p>
										<div class="flex items-center gap-2.5 text-[10px] text-slate-500">
											<span>{formatTime(item.timestamp)}</span>
											<span>•</span>
											<span class="flex items-center gap-1.5">
												<svg
													class="w-3 h-3"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
													/>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
													/>
												</svg>
												{item.clicks} clicks
											</span>
										</div>
									</div>

									<!-- Actions -->
									<div class="flex items-center gap-1">
										<!-- Copy button -->
										<button
											onclick={() => copyToClipboard(item.short, false, item)}
											class="p-2 rounded-lg border border-slate-800/80 hover:border-slate-700 bg-slate-950/40 text-slate-400 hover:text-indigo-400 active:scale-95 transition-all duration-150 relative"
											title="Copy short link"
										>
											{#if copiedItems[item.id]}
												<svg
													class="w-4 h-4 text-emerald-400"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2.5"
												>
													<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
												</svg>
											{:else}
												<svg
													class="w-4 h-4"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													stroke-width="2"
												>
													<path
														stroke-linecap="round"
														stroke-linejoin="round"
														d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 002 2h2a2 2 0 002-2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
													/>
												</svg>
											{/if}
										</button>

										<!-- Delete button -->
										<button
											onclick={() => deleteItem(item.id)}
											class="p-2 rounded-lg border border-slate-800/80 hover:border-rose-955 bg-slate-950/40 hover:bg-rose-955/20 text-slate-400 hover:text-rose-400 active:scale-95 transition-all duration-150"
											title="Delete from history"
										>
											<svg
												class="w-4 h-4"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
												stroke-width="2"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
												/>
											</svg>
										</button>
									</div>
								</div>
							{/each}
						{/if}
					{/if}
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	/* Custom scrollbar for history container */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background: #1e293b;
		border-radius: 3px;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb:hover {
		background: #334155;
	}
</style>
