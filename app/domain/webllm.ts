export type WebLLMModule = typeof import("@mlc-ai/web-llm");
export type MLCEngine = Awaited<ReturnType<WebLLMModule["CreateMLCEngine"]>>;
export type ModelRecord =
  WebLLMModule["prebuiltAppConfig"]["model_list"][number];

export type ModelOption = {
  id: string;
  label: string;
  source: "prebuilt";
  record?: ModelRecord;
};

export type WebGpuNavigator = Navigator & {
  gpu?: {
    requestAdapter: () => Promise<unknown>;
  };
  brave?: {
    isBrave: () => Promise<boolean>;
  };
};
