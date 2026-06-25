<script lang="ts">
    import { canvasStore } from './stores';
    
    let title = '';
    let author = '';
    let text = '';
    
    function handleSubmit() {
        if (!text.trim()) return;
        canvasStore.createAndAnalyze(text, title, author);
        title = '';
        author = '';
        text = '';
    }
</script>

<div class="h-full flex flex-col max-w-4xl mx-auto p-6 lg:p-12 w-full">
    <div class="mb-8">
        <h2 class="text-3xl font-bold text-slate-100">New Canvas</h2>
        <p class="text-slate-400 mt-2">Paste any text (poetry, prose, lyrics) to get a dense literary analysis.</p>
    </div>
    
    <div class="flex flex-col gap-4 flex-1">
        <div class="flex gap-4">
            <input 
                type="text" 
                placeholder="Title (optional)" 
                bind:value={title}
                class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                disabled={$canvasStore.isAnalyzing}
            />
            <input 
                type="text" 
                placeholder="Author (optional)" 
                bind:value={author}
                class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-3 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors"
                disabled={$canvasStore.isAnalyzing}
            />
        </div>
        
        <textarea 
            placeholder="Paste your text here..." 
            bind:value={text}
            class="flex-1 bg-slate-900 border border-slate-700 rounded-lg p-4 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-primary-500 transition-colors resize-none font-mono text-sm"
            disabled={$canvasStore.isAnalyzing}
        ></textarea>
        
        <div class="flex justify-end pt-2">
            <button 
                class="px-6 py-3 bg-primary-600 hover:bg-primary-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 shadow-lg shadow-primary-900/20"
                on:click={handleSubmit}
                disabled={!text.trim() || $canvasStore.isAnalyzing}
            >
                {#if $canvasStore.isAnalyzing}
                    <div class="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Analyzing...
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
                    </svg>
                    Analyze Text
                {/if}
            </button>
        </div>
    </div>
</div>
