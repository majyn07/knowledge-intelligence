"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { UserRound, Users } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { usePeople } from "@/features/people/providers/PeopleProvider";

import { insertMention, mentionQuery } from "../mentions";

interface MentionFieldProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}

interface Candidate {
  ref: string;
  name: string;
  detail: string;
  kind: "person" | "team";
}

function comparable(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/**
 * Campo de comentário com menção a pessoa ou equipe.
 *
 * O `@` abre a lista de quem existe; escolher alguém insere identificador e
 * rótulo. Digitar o nome à mão continua funcionando (é texto), só não vira
 * vínculo, e é essa a diferença que a lista existe para oferecer.
 *
 * Equipes aparecem junto de propósito: enquanto a maior parte do time não
 * entrou no produto, mencionar a equipe é o caminho que de fato existe.
 */
export function MentionField({
  id,
  value,
  onChange,
  placeholder,
  rows = 3,
}: MentionFieldProps) {
  const { people, teams } = usePeople();
  const field = useRef<HTMLTextAreaElement>(null);

  const [query, setQuery] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const candidates: Candidate[] =
    query === null
      ? []
      : [
          ...teams.map((team) => ({
            ref: team.id,
            name: team.name,
            detail: "equipe",
            kind: "team" as const,
          })),
          ...people
            .filter((person) => person.isActive)
            .map((person) => ({
              ref: person.id,
              name: person.name,
              detail: person.role,
              kind: "person" as const,
            })),
        ]
          .filter((item) => comparable(item.name).includes(comparable(query)))
          .slice(0, 6);

  const isOpen = candidates.length > 0;

  function refresh(text: string, cursor: number) {
    setQuery(mentionQuery(text, cursor));
    setHighlighted(0);
  }

  function choose(candidate: Candidate) {
    const element = field.current;
    if (!element) return;

    const { text, cursor } = insertMention(
      value,
      element.selectionStart,
      candidate.ref,
      candidate.name
    );

    onChange(text);
    setQuery(null);

    /*
      O cursor precisa voltar para depois da menção. O React só reescreve o
      valor no próximo quadro, então o posicionamento acontece depois dele,
      fazê-lo agora seria sobre o texto antigo.
    */
    requestAnimationFrame(() => {
      element.focus();
      element.setSelectionRange(cursor, cursor);
    });
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!isOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => (current + 1) % candidates.length);
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => (current - 1 + candidates.length) % candidates.length);
      return;
    }

    if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      choose(candidates[highlighted]);
      return;
    }

    if (event.key === "Escape") {
      // Fecha a lista sem apagar o que já foi digitado.
      event.preventDefault();
      setQuery(null);
    }
  }

  return (
    <div className="relative">
      <Textarea
        id={id}
        ref={field}
        rows={rows}
        value={value}
        placeholder={placeholder}
        aria-expanded={isOpen}
        aria-autocomplete="list"
        onChange={(event) => {
          onChange(event.target.value);
          refresh(event.target.value, event.target.selectionStart);
        }}
        onKeyDown={handleKeyDown}
        onClick={(event) => refresh(value, event.currentTarget.selectionStart)}
        onBlur={() => setQuery(null)}
      />

      {isOpen && (
        <ul
          role="listbox"
          aria-label="Mencionar"
          className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-md"
        >
          {candidates.map((candidate, index) => (
            <li key={candidate.ref}>
              <button
                type="button"
                role="option"
                aria-selected={index === highlighted}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm ${
                  index === highlighted ? "bg-accent" : ""
                }`}
                /*
                  `onMouseDown` e não `onClick`: o clique tira o foco do campo
                  antes, e o `onBlur` fecharia a lista sem que a escolha
                  acontecesse.
                */
                onMouseDown={(event) => {
                  event.preventDefault();
                  choose(candidate);
                }}
              >
                {candidate.kind === "team" ? (
                  <Users className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                ) : (
                  <UserRound className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                )}

                <span className="min-w-0 truncate">{candidate.name}</span>

                {candidate.detail && (
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {candidate.detail}
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
