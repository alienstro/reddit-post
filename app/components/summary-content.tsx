import { cleanSummaryText } from "@/app/application/summary";

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    return <span key={index}>{part}</span>;
  });
}

export function SummaryContent({ text }: { text: string }) {
  const lines = cleanSummaryText(text)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return (
    <div className="space-y-3">
      {lines.map((line, index) => {
        if (line.startsWith("### ")) {
          return (
            <h3 className="text-sm font-semibold text-zinc-950" key={index}>
              {line.replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (line.startsWith("* ") || line.startsWith("- ")) {
          return (
            <p
              className="pl-4 text-sm leading-6 text-zinc-800 before:mr-2 before:content-['*']"
              key={index}
            >
              {renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}
            </p>
          );
        }

        return (
          <p className="text-sm leading-6 text-zinc-800" key={index}>
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}
