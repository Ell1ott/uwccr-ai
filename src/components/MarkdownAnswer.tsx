import { createContext, useContext, useMemo } from "react";
import Markdown, { type Components } from "react-markdown";
import type { Citation } from "../lib/database.types";
import { handbookHrefPage, linkifyCitations } from "../lib/citations";
import { CitationChip } from "./CitationChip";

const ExcerptContext = createContext<Map<number, string>>(new Map());

const answerComponents: Components = {
  p({ node, ...props }) {
    return <p {...props} />;
  },
  strong({ node, ...props }) {
    return <strong {...props} />;
  },
  em({ node, ...props }) {
    return <em {...props} />;
  },
  ul({ node, ...props }) {
    return <ul {...props} />;
  },
  ol({ node, ...props }) {
    return <ol {...props} />;
  },
  li({ node, ...props }) {
    return <li {...props} />;
  },
  h1({ node, ...props }) {
    return <h2 {...props} />;
  },
  h2({ node, ...props }) {
    return <h2 {...props} />;
  },
  h3({ node, ...props }) {
    return <h3 {...props} />;
  },
  a({ node, href, children, ...props }) {
    const page = handbookHrefPage(href);
    if (page != null) {
      return <CitedPage page={page} />;
    }
    if (!href) return <span>{children}</span>;
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
        {children}
      </a>
    );
  },
};

function CitedPage({ page }: { page: number }) {
  const excerpts = useContext(ExcerptContext);
  return <CitationChip page={page} excerpt={excerpts.get(page)} />;
}

export function MarkdownAnswer({
  content,
  citations,
  streaming = false,
}: {
  content: string;
  citations: Citation[];
  streaming?: boolean;
}) {
  const excerpts = useMemo(() => {
    const map = new Map<number, string>();
    for (const citation of citations) {
      if (citation.page == null || map.has(citation.page)) continue;
      const excerpt = citation.excerpt.replace(/\s+/g, " ").trim();
      if (excerpt) map.set(citation.page, excerpt);
    }
    return map;
  }, [citations]);

  const markdown = useMemo(() => linkifyCitations(content), [content]);

  return (
    <ExcerptContext.Provider value={excerpts}>
      <div className={streaming ? "answer-prose is-streaming" : "answer-prose"}>
        <Markdown components={answerComponents}>{markdown}</Markdown>
        {streaming ? (
          <span
            aria-hidden
            className="caret-blink answer-caret"
          />
        ) : null}
      </div>
    </ExcerptContext.Provider>
  );
}
