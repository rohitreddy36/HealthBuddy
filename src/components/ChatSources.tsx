import type { KnowledgeSource } from "@/lib/chat-knowledge";

export function ChatSources({ sources }: { sources?: KnowledgeSource[] }) {
  if (!sources?.length) return null;
  return (
    <div className="mt-3 border-t border-border/60 pt-2 text-xs space-y-1">
      <p className="text-muted-foreground">
        Related references · MedlinePlus, National Library of Medicine
      </p>
      {sources.map((source) => (
        <a
          key={source.url}
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-primary underline underline-offset-2"
        >
          {source.title}
        </a>
      ))}
    </div>
  );
}
