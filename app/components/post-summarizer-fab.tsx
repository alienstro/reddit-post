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
        <section className="relative mb-3 flex h-[min(42rem,calc(100vh-7rem))] w-[min(30rem,calc(100vw-2.5rem))] flex-col overflow-hidden rounded-md border border-zinc-200 bg-white shadow-xl">
          {loading || summarizing || deletingCache ? (
            <div className="absolute left-0 top-0 h-1 w-full overflow-hidden bg-rose-100">
              <div className="h-full w-1/2 animate-[summary-progress_1.2s_ease-in-out_infinite] bg-rose-700" />
            </div>
          ) : null}
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-zinc-200 p-4">
            <div>
              <h2 className="text-base font-semibold">Local AI summary</h2>
              <p className="mt-1 text-sm leading-5 text-zinc-600">
                Runs in your browser with WebLLM. First model load downloads
                files once.
              </p>
            </div>
            <button
              aria-label="Close local AI summary"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-lg leading-none text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
              onClick={() => setPanelOpen(false)}
              type="button"
            >
              x
            </button>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-b border-zinc-200 p-4">
            <input
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none ring-rose-700/20 focus:border-rose-700 focus:ring-4"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search MLC models"
              value={query}
            />
            <div className="flex items-center justify-between gap-3 text-xs text-zinc-500">
              <span>
                {cachedIds.size} cached model{cachedIds.size === 1 ? "" : "s"}
              </span>
              <button
                className="font-medium text-zinc-700 hover:text-zinc-950 disabled:opacity-50"
                disabled={checkingCache || !cachedWebLLM}
                onClick={() => void refreshCachedModels()}
                type="button"
              >
                {checkingCache ? "Checking..." : "Refresh cache"}
              </button>
            </div>

            <div className="h-40 rounded-md border border-zinc-200 bg-white p-2">
              <div className="h-full space-y-2 overflow-y-auto pr-1">
                {filteredModels.length > 0 ? (
                  filteredModels.map((model) => {
                    const selected = model.id === selectedModelId;
                    return (
                      <button
                        className={`w-full rounded-md border px-3 py-2 text-left text-sm transition ${
                          selected
                            ? "border-zinc-950 bg-zinc-950 text-white"
                            : "border-zinc-200 bg-stone-50 text-zinc-800 hover:border-zinc-300 hover:bg-zinc-100"
                        }`}
                        key={`${model.source}-${model.id}`}
                        onClick={() => setSelectedModelId(model.id)}
                        type="button"
                      >
                        <span className="block font-medium">{model.label}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-2 text-xs opacity-75">
                          <span className="break-all">{model.id}</span>
                          {cachedIds.has(model.id) ? (
                            <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-800">
                              cached
                            </span>
                          ) : null}
                        </span>
                      </button>
                    );
                  })
                ) : (
                  <p className="px-2 py-3 text-sm text-zinc-600">
                    No models match your search.
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                className="rounded-md bg-zinc-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || !selectedModelId || deletingCache}
                onClick={() => void loadModel()}
                type="button"
              >
                {loading ? "Loading..." : "Load model"}
              </button>
              <button
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={summarizing || !engine || !post || deletingCache}
                onClick={() => void summarize()}
                type="button"
              >
                {summarizing ? "Summarizing..." : "Summarize post"}
              </button>
              <button
                className="rounded-md border border-red-200 px-3 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || summarizing || deletingCache}
                onClick={() => setConfirmingCacheDelete(true)}
                type="button"
              >
                {deletingCache ? "Deleting..." : "Delete all cache"}
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs">
              <button
                className="font-medium text-zinc-700 hover:text-zinc-950"
                onClick={() => void checkWebGpu()}
                type="button"
              >
                Check WebGPU
              </button>
              <button
                className="font-medium text-zinc-700 hover:text-zinc-950"
                onClick={resetRuntime}
                type="button"
              >
                Reset runtime
              </button>
            </div>
          </div>

          {confirmingCacheDelete ? (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 p-4 backdrop-blur-sm">
              <section
                aria-modal="true"
                className="w-full max-w-sm rounded-md border border-zinc-200 bg-white p-4 shadow-xl"
                role="dialog"
              >
                <h3 className="text-base font-semibold text-zinc-950">
                  Delete all cached models?
                </h3>
                <p className="mt-2 text-sm leading-6 text-zinc-600">
                  This removes downloaded WebLLM model files from this browser.
                  You will need to download a model again before summarizing.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-800 transition hover:bg-zinc-50"
                    onClick={() => setConfirmingCacheDelete(false)}
                    type="button"
                  >
                    Cancel
                  </button>
                  <button
                    className="rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-red-700"
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
            <p className="text-sm leading-5 text-zinc-600">{status}</p>

            {diagnostic ? (
              <p className="mt-3 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700">
                {diagnostic}
              </p>
            ) : null}

            {error ? (
              <p className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">
                {error}
              </p>
            ) : null}

            {summary ? (
              <article className="mt-3 rounded-md border border-zinc-200 bg-stone-50 p-3">
                <SummaryContent text={summary} />
              </article>
            ) : null}
          </div>
        </section>
      ) : null}

      <button
        aria-label="Open local AI summarizer"
        className="flex h-14 w-14 items-center justify-center rounded-full bg-rose-700 text-sm font-semibold text-white shadow-lg transition hover:bg-rose-800"
        onClick={() => void handleOpen()}
        type="button"
      >
        AI
      </button>
    </div>
  );
}
