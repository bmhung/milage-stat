<script lang="ts">
	import { networkStatus } from '$lib/pwa/network-manager';
</script>

<!-- Network Status Indicator -->
<div
	class="bg-base-100 fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-3 py-2 shadow-md {networkStatus.isOnline
		? 'border-green-500'
		: 'border-red-500'}"
>
	<span class="text-lg">{$networkStatus.isOnline ? '🌐' : '📴'}</span>
	<span class="text-sm font-medium">{$networkStatus.isOnline ? 'Online' : 'Offline'}</span>
</div>
