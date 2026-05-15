import type { SummaryComment, SummaryPost } from "@/app/domain/summary";
import type { ModelOption } from "@/app/domain/webllm";

export function buildPrompt(post: SummaryPost, comments: SummaryComment[]) {
  const topComments = comments
    .slice(0, 20)
    .map((comment, index) => {
      return `${index + 1}. u/${comment.author ?? "unknown"} (${comment.score} points): ${comment.body}`;
    })
    .join("\n\n");

  return [
    "Summarize this Reddit post and its comments for a technical reader.",
    "Return concise sections: Key points, Community sentiment, Notable details, Open questions.",
    "",
    `Title: ${post.title}`,
    `Author: u/${post.author ?? "unknown"}`,
    `Score: ${post.score}`,
    `Comment count: ${post.num_comments}`,
    post.url ? `URL: ${post.url}` : "",
    "",
    "Post body:",
    post.selftext || "(No self text; use title and comments.)",
    "",
    "Top comments:",
    topComments || "(No comments loaded.)",
  ]
    .filter(Boolean)
    .join("\n");
}

export function modelLabel(modelId: string) {
  return modelId
    .replace(/-MLC$/i, "")
    .replace(/-/g, " ")
    .replace(/\bq\d[a-z0-9_]+\b/gi, (match) => match.toUpperCase());
}

export function modelCompatibilityRank(modelId: string) {
  const normalized = modelId.toLowerCase();
  if (normalized.includes("q4f32") || normalized.includes("q0f32")) {
    return 0;
  }
  if (normalized.includes("q4f16") || normalized.includes("q0f16")) {
    return 1;
  }
  return 2;
}

export function isRecommendedBrowserModel(modelId: string) {
  const normalized = modelId.toLowerCase();
  const isSmallEnough =
    normalized.includes("0.5b") ||
    normalized.includes("0.8b") ||
    normalized.includes("1b") ||
    normalized.includes("1.5b") ||
    normalized.includes("2b") ||
    normalized.includes("3b");
  const usesBroadlySupportedPrecision =
    normalized.includes("q4f32") || normalized.includes("q0f32");

  return isSmallEnough && usesBroadlySupportedPrecision;
}

export function compareModelOptions(a: ModelOption, b: ModelOption) {
  const rankDifference =
    modelCompatibilityRank(a.id) - modelCompatibilityRank(b.id);
  if (rankDifference !== 0) {
    return rankDifference;
  }
  return a.label.localeCompare(b.label);
}

export function isFp16Model(modelId: string) {
  const normalized = modelId.toLowerCase();
  return normalized.includes("q4f16") || normalized.includes("q0f16");
}

export function modelLoadErrorMessage(modelId: string, fallback: string) {
  if (isFp16Model(modelId) && fallback.toLowerCase().includes("gpu")) {
    return `${modelId} could not run on this WebGPU adapter. This model uses an f16 variant, which can fail on some integrated GPUs or drivers. Try a q4f32 or q0f32 model such as Llama-3.2-1B-Instruct-q0f32-MLC.`;
  }
  if (fallback.toLowerCase().includes("compatible gpu")) {
    return `WebLLM could not get a compatible WebGPU adapter while loading ${modelId}. If this worked earlier, the browser GPU process or selected GPU adapter may be stuck. Fully close and reopen the browser, then try the same q0f32/q4f32 model again. Original error: ${fallback}`;
  }
  return fallback;
}

export function cleanSummaryText(text: string) {
  return text
    .replace(/<think>\s*<\/think>/gi, "")
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .trim();
}
