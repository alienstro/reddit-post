import { cleanSummaryText } from "@/app/application/summary";

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={index}>{part.slice(1, -1)}</em>;
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
            <h3 className="font-serif text-base font-normal tracking-[-0.01em] text-ink" key={index}>
              {line.replace(/^###\s+/, "")}
            </h3>
          );
        }

        if (line.startsWith("* ") || line.startsWith("- ")) {
          return (
            <div
              className="flex gap-2 pl-4 font-sans text-sm leading-6 text-body"
              key={index}
            >
              <span className="shrink-0 text-muted">•</span>
              <p>{renderInlineMarkdown(line.replace(/^[-*]\s+/, ""))}</p>
            </div>
          );
        }

        return (
          <p className="font-sans text-sm leading-6 text-body" key={index}>
            {renderInlineMarkdown(line)}
          </p>
        );
      })}
    </div>
  );
}
