const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080';

export async function shortenUrl(url: string) {
	const response = await fetch(`${API_URL}/api/v1/shorten`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify({ url })
	});

	if (!response.ok) {
		throw new Error('Request failed');
	}

	return response.json();
}
