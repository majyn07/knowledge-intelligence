import { Fragment, type ReactNode } from "react";

function inline(text: string): ReactNode[] {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => part.startsWith("**") && part.endsWith("**") ? <strong key={index}>{part.slice(2, -2)}</strong> : <Fragment key={index}>{part}</Fragment>);
}

export function MarkdownContent({ content }: { content: string }) {
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index];
    if (line.startsWith("```")) {
      const code: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
      nodes.push(<pre key={index} className="overflow-x-auto rounded-lg bg-foreground p-4 text-xs text-background"><code>{code.join("\n")}</code></pre>);
    } else if (/^#{1,3}\s/.test(line)) {
      const level = line.match(/^#+/)?.[0].length ?? 1;
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      nodes.push(<Tag key={index} className="mt-4 font-semibold first:mt-0">{inline(line.replace(/^#{1,3}\s/, ""))}</Tag>);
    } else if (/^[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*]\s+/.test(lines[index])) items.push(lines[index++].replace(/^[-*]\s+/, ""));
      nodes.push(<ul key={index} className="list-disc space-y-1 pl-5">{items.map((item, itemIndex) => <li key={itemIndex}>{inline(item)}</li>)}</ul>);
      continue;
    } else if (/^\|/.test(line) && lines[index + 1]?.includes("---")) {
      const cells = (value: string) => value.split("|").slice(1, -1).map((cell) => cell.trim());
      const headers = cells(line);
      index += 2;
      const rows: string[][] = [];
      while (index < lines.length && /^\|/.test(lines[index])) rows.push(cells(lines[index++]));
      nodes.push(<div key={index} className="overflow-x-auto"><table className="w-full border-collapse text-left text-xs"><thead><tr>{headers.map((header) => <th key={header} className="border-b p-2 font-semibold">{header}</th>)}</tr></thead><tbody>{rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, cellIndex) => <td key={cellIndex} className="border-b p-2">{inline(cell)}</td>)}</tr>)}</tbody></table></div>);
      continue;
    } else if (line.trim()) {
      nodes.push(<p key={index}>{inline(line)}</p>);
    }
    index += 1;
  }
  return <div className="space-y-3 text-sm leading-7">{nodes}</div>;
}
