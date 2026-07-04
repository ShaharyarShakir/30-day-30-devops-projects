<script lang="ts">
	import { shortenUrl } from "$lib/api";

	let url = $state("");
	let shortCode = $state("");
	let loading = $state(false);
	let error = $state("");

	async function submit() {
		error = "";
		shortCode = "";
		loading = true;

		try {
			const result = await shortenUrl(url);

			shortCode =
				`http://localhost:8080/${result.short_code}`;
		} catch (err) {
			error = "Failed to shorten URL";
		} finally {
			loading = false;
		}
	}
</script>

<div class="max-w-md mx-auto mt-16 p-6 bg-white rounded-xl shadow-md space-y-4">
	<h1 class="text-2xl font-semibold text-gray-800">URL Shortener</h1>

	<div class="flex gap-2">
		<input
			type="text"
			bind:value={url}
			placeholder="https://example.com"
			class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
		/>

		<button
			onclick={submit}
			disabled={loading}
			class="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
		>
			{loading ? "Loading..." : "Shorten"}
		</button>
	</div>

	{#if shortCode}
		<p class="text-sm text-gray-700">
			Short URL:
			
			<a	href={shortCode}
				class="text-blue-600 hover:text-blue-800 underline break-all"
			>
				{shortCode}
			</a>
		</p>
	{/if}

	{#if error}
		<p class="text-sm text-red-600">{error}</p>
	{/if}
</div>