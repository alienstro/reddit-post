"use client";

import { useMemo, useState } from "react";

import {
  buildPrompt,
  cleanSummaryText,
  compareModelOptions,
  isFp16Model,
  isRecommendedBrowserModel,
  modelLoadErrorMessage,
  modelLabel,
} from "@/app/application/summary";
import { SummaryContent } from "@/app/components/summary-content";
import type { SummarizerProps } from "@/app/domain/summary";
import type {
  MLCEngine,
  ModelOption,
  WebGpuNavigator,
  WebLLMModule,
} from "@/app/domain/webllm";

let cachedWebLLM: WebLLMModule | null = null;
let cachedEngine: MLCEngine | null = null;
let cachedLoadedModelId = "";
let cachedModels: ModelOption[] = [];
let cachedAllModelIds: string[] = [];
let cachedPanelOpen = false;
let cachedModelIds = new Set<string>();

export function PostSummarizerFab({ post, comments }: SummarizerProps) {
  const [open, setOpen] = useState(cachedPanelOpen);
  const [query, setQuery] = useState("");
  const [models, setModels] = useState<ModelOption[]>(cachedModels);
  const [engine, setEngine] = useState<MLCEngine | null>(cachedEngine);
  const [selectedModelId, setSelectedModelId] = useState(cachedLoadedModelId);
  const [loadedModelId, setLoadedModelId] = useState(cachedLoadedModelId);
  const [status, setStatus] = useState("Choose a model to summarize locally.");
  const [summary, setSummary] = useState("");
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [viewingSummary, setViewingSummary] = useState(false);
  const [deletingCache, setDeletingCache] = useState(false);
  const [confirmingCacheDelete, setConfirmingCacheDelete] = useState(false);
  const [checkingCache, setCheckingCache] = useState(false);
  const [cachedIds, setCachedIds] = useState<Set<string>>(cachedModelIds);
  const [diagnostic, setDiagnostic] = useState("");
  const [error, setError] = useState("");

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return models
      .filter((model) => {
        if (!normalizedQuery) {
          return true;
        }
        return `${model.id} ${model.label}`
          .toLowerCase()
          .includes(normalizedQuery);
      })
      .toSorted((a, b) => {
        const aCached = cachedIds.has(a.id);
        const bCached = cachedIds.has(b.id);
        if (aCached === bCached) {
          return compareModelOptions(a, b);
        }
        return aCached ? -1 : 1;
      })
      .slice(0, 30);
  }, [cachedIds, models, query]);

  function setPanelOpen(nextOpen: boolean) {
    cachedPanelOpen = nextOpen;
    setOpen(nextOpen);
  }

  async function ensureWebLLM() {
    if (!("gpu" in navigator)) {
      throw new Error(
        "WebGPU is not available in this browser. Use Chrome or Edge with hardware acceleration enabled.",
      );
    }

    if (cachedWebLLM) {
      setModels(cachedModels);
      return cachedWebLLM;
    }

    const webllmModule = await import("@mlc-ai/web-llm");
    cachedAllModelIds = webllmModule.prebuiltAppConfig.model_list.map(
      (record) => record.model_id,
    );
    const prebuiltModels: ModelOption[] =
      webllmModule.prebuiltAppConfig.model_list
        .filter(
          (record) =>
            (record.model_type === undefined || record.model_type === 0) &&
            isRecommendedBrowserModel(record.model_id),
        )
        .map((record) => ({
          id: record.model_id,
          label: modelLabel(record.model_id),
          source: "prebuilt" as const,
          record,
        }))
        .toSorted(compareModelOptions);

    cachedModels = prebuiltModels;
    setModels(cachedModels);
    setSelectedModelId((current) => current || prebuiltModels[0]?.id || "");
    cachedWebLLM = webllmModule;
    void refreshCachedModels(webllmModule, prebuiltModels);
    return webllmModule;
  }

  async function refreshCachedModels(
    webllmModule = cachedWebLLM,
    modelOptions = cachedModels,
  ) {
    if (!webllmModule || modelOptions.length === 0) {
      return;
    }

    setCheckingCache(true);
    try {
      const checks = await Promise.all(
        modelOptions.map(async (model) => ({
          id: model.id,
          cached: await webllmModule.hasModelInCache(model.id),
        })),
      );
      cachedModelIds = new Set(
        checks.filter((check) => check.cached).map((check) => check.id),
      );
      setCachedIds(new Set(cachedModelIds));
    } finally {
      setCheckingCache(false);
    }
  }

  async function handleOpen() {
    const nextOpen = !open;
    setPanelOpen(nextOpen);
    if (nextOpen && !cachedWebLLM) {
      try {
        setStatus("Loading WebLLM model catalog...");
        await ensureWebLLM();
        setStatus(
          "Choose a model. Showing smaller q0f32/q4f32 WebLLM models for better browser compatibility.",
        );
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Could not initialize WebLLM.",
        );
      }
    }
  }

  async function loadModel() {
    setError("");
    setSummary("");

    const webllmModule = await ensureWebLLM();
    const selected = models.find((model) => model.id === selectedModelId);
    if (!selectedModelId || !selected) {
      setError("Select a runnable model.");
      return;
    }

    setLoading(true);
    setStatus(
      isFp16Model(selectedModelId)
        ? "Preparing model download/cache. This f16 model may not work on every WebGPU adapter..."
        : "Preparing model download/cache...",
    );
    try {
      const nextEngine = await webllmModule.CreateMLCEngine(selectedModelId, {
        initProgressCallback: (report) => {
          setStatus(report.text || `Loading ${selectedModelId}...`);
        },
      });
      cachedEngine = nextEngine;
      cachedLoadedModelId = selectedModelId;
      cachedModelIds = new Set(cachedModelIds).add(selectedModelId);
      setEngine(cachedEngine);
      setLoadedModelId(cachedLoadedModelId);
      setCachedIds(new Set(cachedModelIds));
      setStatus(`Loaded ${selectedModelId}.`);
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : "Model loading failed.";
      setError(
        modelLoadErrorMessage(selectedModelId, message),
      );
    } finally {
      setLoading(false);
    }
  }

  function resetRuntime() {
    cachedEngine = null;
    cachedLoadedModelId = "";
    setEngine(null);
    setLoadedModelId("");
    setSummary("");
    setError("");
    setStatus("Reset WebLLM runtime. Try loading the model again.");
  }

  async function checkWebGpu() {
    const webGpuNavigator = navigator as WebGpuNavigator;
    const isBrave = webGpuNavigator.brave
      ? await webGpuNavigator.brave.isBrave()
      : false;
    const hasWebGpu = Boolean(webGpuNavigator.gpu);

    if (!hasWebGpu || !webGpuNavigator.gpu) {
      setDiagnostic(
        `${isBrave ? "Brave" : "Browser"}: WebGPU API is not exposed. Check browser flags and hardware acceleration.`,
      );
      return;
    }

    try {
      const adapter = await webGpuNavigator.gpu.requestAdapter();
      setDiagnostic(
        `${isBrave ? "Brave" : "Browser"}: WebGPU API exposed, adapter ${
          adapter ? "available" : "not available"
        }. Secure context: ${window.isSecureContext ? "yes" : "no"}.`,
      );
    } catch (caught) {
      setDiagnostic(
        caught instanceof Error
          ? `WebGPU diagnostic failed: ${caught.message}`
          : "WebGPU diagnostic failed.",
      );
    }
  }

  async function summarize() {
    if (!post) {
      setError("No selected post to summarize.");
      return;
    }
    if (!engine || !loadedModelId) {
      setError("Load a model first.");
      return;
    }

    setError("");
    setSummary("");
    setSummarizing(true);
    setStatus("Summarizing selected post and comments...");

    try {
      const response = await engine.chat.completions.create({
        messages: [
          {
            role: "system",
            content:
              "You are an accurate Reddit discussion summarizer. Summarize only the information, opinions, claims, and examples that are explicitly present in the provided Reddit posts and comments. Do not invent facts, infer unsupported conclusions, or add outside context unless the user specifically asks for it. Clearly distinguish between common themes, minority viewpoints, disagreements, and individual anecdotes. Preserve uncertainty, avoid overstating consensus, and mention when the input does not provide enough evidence to support a conclusion.",
          },
          { role: "user", content: buildPrompt(post, comments) },
        ],
        temperature: 0.2,
        max_tokens: 1000,
      });

      setSummary(
        cleanSummaryText(response.choices[0]?.message.content || "") ||
          "No summary returned.",
      );
      setStatus(`Summary generated with ${loadedModelId}.`);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Summarization failed.",
      );
    } finally {
      setSummarizing(false);
    }
  }

  async function deleteAllModelCaches() {
    setError("");
    setConfirmingCacheDelete(false);

    setDeletingCache(true);
    setStatus("Deleting all cached WebLLM model files...");
    try {
      const webllmModule = await ensureWebLLM();
      const modelIds = cachedAllModelIds.length
        ? cachedAllModelIds
        : cachedModels.map((model) => model.id);
      const results = await Promise.allSettled(
        modelIds.map((modelId) =>
          webllmModule.deleteModelAllInfoInCache(modelId),
        ),
      );
      const failedDeletes = results.filter(
        (result) => result.status === "rejected",
      ).length;

      cachedEngine = null;
      cachedLoadedModelId = "";
      cachedModelIds = new Set();
      setEngine(null);
      setLoadedModelId("");
      setCachedIds(new Set());
      setSummary("");

      if (failedDeletes > 0) {
        setStatus(
          `Deleted cache for ${modelIds.length - failedDeletes} models. ${failedDeletes} cache entries could not be deleted.`,
        );
      } else {
        setStatus(`Deleted cache for ${modelIds.length} WebLLM models.`);
      }
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Could not delete model caches.",
      );
    } finally {
      setDeletingCache(false);
    }
  }

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
      {open ? (
        <section className="relative mb-3 flex h-[min(42rem,calc(100vh-7rem))] w-[min(30rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-xl border border-surface-dark-elevated bg-surface-dark shadow-2xl shadow-ink/20">
          {loading || summarizing || deletingCache ? (
            <div className="absolute left-0 top-0 h-0.5 w-full overflow-hidden bg-primary/20">
              <div className="h-full w-1/2 animate-[summary-progress_1.2s_ease-in-out_infinite] bg-primary" />
            </div>
          ) : null}

          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-surface-dark-elevated p-4">
            <div>
              <h2 className="font-serif text-lg font-normal tracking-[-0.02em] text-on-dark">
                Local AI summary
              </h2>
              <p className="mt-1 font-sans text-xs leading-5 text-on-dark-soft">
                Runs in your browser with WebLLM. First load downloads once.
              </p>
            </div>
            <button
              aria-label="Close local AI summary"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md font-sans text-on-dark-soft transition hover:bg-surface-dark-elevated hover:text-on-dark"
              onClick={() => setPanelOpen(false)}
              type="button"
            >
              ×
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-b border-surface-dark-elevated p-4">
            <input
              className="rounded-md border border-surface-dark-elevated bg-surface-dark-soft px-3 py-2 font-sans text-sm text-on-dark outline-none placeholder:text-on-dark-soft transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search MLC models…"
              value={query}
            />
            <div className="flex items-center justify-between gap-3 font-sans text-xs text-on-dark-soft">
              <span>
                {cachedIds.size} cached model{cachedIds.size === 1 ? "" : "s"}
              </span>
              <button
                className="font-medium text-on-dark-soft transition hover:text-on-dark disabled:opacity-40"
                disabled={checkingCache || !cachedWebLLM}
                onClick={() => void refreshCachedModels()}
                type="button"
              >
                {checkingCache ? "Checking…" : "Refresh cache"}
              </button>
            </div>

            <div className="h-40 rounded-lg border border-surface-dark-elevated bg-surface-dark-soft p-2">
              <div className="h-full space-y-2 overflow-y-auto pr-1">
                {filteredModels.length > 0 ? (
                  filteredModels.map((model) => {
                    const selected = model.id === selectedModelId;
                    return (
                      <button
                        className={`w-full rounded-md border px-3 py-2 text-left font-sans text-sm transition ${
                          selected
                            ? "border-primary/40 bg-primary/10 text-on-dark"
                            : "border-surface-dark-elevated bg-surface-dark-elevated text-on-dark-soft hover:border-surface-dark-soft hover:text-on-dark"
                        }`}
                        key={`${model.source}-${model.id}`}
                        onClick={() => setSelectedModelId(model.id)}
                        type="button"
                      >
                        <span className="block font-medium">{model.label}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-60">
                          <span className="break-all">{model.id}</span>
                          {cachedIds.has(model.id) ? (
                            <span className="rounded-full bg-accent-teal/20 px-2 py-0.5 text-accent-teal">
                              cached
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-3 font-sans text-sm text-on-dark-soft">
                    No models match your search.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                className="rounded-md bg-primary px-3 py-2 font-sans text-sm font-medium text-on-primary transition hover:bg-primary-active disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || !selectedModelId || deletingCache}
                onClick={() => void loadModel()}
                type="button"
              >
                {loading ? "Loading…" : "Load model"}
              </button>
              <button
                className="rounded-md border border-surface-dark-elevated bg-surface-dark-elevated px-3 py-2 font-sans text-sm font-medium text-on-dark transition hover:bg-surface-dark-soft disabled:cursor-not-allowed disabled:opacity-40"
                disabled={summarizing || !engine || !post || deletingCache}
                onClick={() => void summarize()}
                type="button"
              >
                {summarizing ? "Summarizing…" : "Summarize"}
              </button>
              <button
                className="rounded-md border border-error-text/20 px-3 py-2 font-sans text-sm font-medium text-error-text transition hover:bg-error-surface disabled:cursor-not-allowed disabled:opacity-40"
                disabled={loading || summarizing || deletingCache}
                onClick={() => setConfirmingCacheDelete(true)}
                type="button"
              >
                {deletingCache ? "Deleting…" : "Clear cache"}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 font-sans text-xs">
              <button
                className="text-on-dark-soft transition hover:text-on-dark"
                onClick={() => void checkWebGpu()}
                type="button"
              >
                Check WebGPU
              </button>
              <button
                className="text-on-dark-soft transition hover:text-on-dark"
                onClick={resetRuntime}
                type="button"
              >
                Reset runtime
              </button>
            </div>
          </div>

          {confirmingCacheDelete ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-dark/80 p-4 backdrop-blur-sm">
              <section
                aria-modal="true"
                className="w-full max-w-sm rounded-xl border border-surface-dark-elevated bg-surface-dark-elevated p-5 shadow-2xl"
                role="dialog"
              >
                <h3 className="font-serif text-lg font-normal text-on-dark">
                  Delete all cached models?
                </h3>
                <p className="mt-2 font-sans text-sm leading-6 text-on-dark-soft">
                  This removes downloaded WebLLM model files from this browser.
                  You will need to download a model again before summarizing.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="rounded-md border border-surface-dark-soft px-3 py-2 font-sans text-sm font-medium text-on-dark transition hover:bg-surface-dark-soft"
                    onClick={() => setConfirmingCacheDelete(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-error-text px-3 py-2 font-sans text-sm font-medium text-white transition hover:opacity-90"
                    onClick={() => void deleteAllModelCaches()}
                    type="button"
                  >
                    Delete all cache
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            {!summary ? (
              <p className="font-sans text-sm leading-5 text-on-dark-soft">{status}</p>
            ) : null}

            {diagnostic ? (
              <p className="mt-3 rounded-lg border border-surface-dark-elevated bg-surface-dark-elevated px-3 py-2 font-sans text-xs text-on-dark-soft">
                {diagnostic}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-lg border border-error-text/20 bg-error-surface px-3 py-2 font-sans text-sm text-error-text">
                {error}
              </p>
            ) : null}

            {summary ? (
              <div>
                <div className="mb-3 flex items-start justify-between gap-3">
                  <p className="min-w-0 font-sans text-xs leading-5 text-on-dark-soft">
                    {status}
                  </p>
                  <button
                    className="shrink-0 rounded-md border border-surface-dark-elevated px-3 py-1.5 font-sans text-xs font-medium text-on-dark transition hover:bg-surface-dark-elevated"
                    onClick={() => setViewingSummary(true)}
                    type="button"
                  >
                    Expand ↗
                  </button>
                </div>
                <article className="rounded-lg border border-hairline bg-canvas p-4">
                  <SummaryContent text={summary} />
                </article>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      {viewingSummary ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <section
            aria-modal="true"
            className="flex h-[min(48rem,calc(100vh-2rem))] w-[min(56rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-hairline bg-canvas shadow-2xl"
            role="dialog"
          >
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-hairline p-6">
              <div>
                <h2 className="font-serif text-2xl font-normal tracking-[-0.02em] text-ink">
                  Local AI summary
                </h2>
                <p className="mt-1 font-sans text-sm text-muted">
                  Generated with {loadedModelId || "WebLLM"}
                </p>
              </div>
              <button
                aria-label="Close expanded summary"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted transition hover:bg-surface-card hover:text-ink"
                onClick={() => setViewingSummary(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <article className="rounded-lg border border-hairline bg-surface-card p-5">
                <SummaryContent text={summary} />
              </article>
            </div>
          </section>
        </div>
      ) : null}

      <button
        aria-label="Open local AI summarizer"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-primary font-serif text-base font-normal italic text-on-primary shadow-lg shadow-primary/25 transition hover:bg-primary-active"
        onClick={() => void handleOpen()}
        type="button"
      >
        AI
      </button>
    </div>
  );
}
