"use client";

import { cn } from "@/lib/utils";
import type { Person } from "@/models/Assignment";

import { avatarHue, initialsOf } from "../avatar";

interface PersonAvatarProps {
  person: Pick<Person, "name" | "avatarUrl">;
  className?: string;
}

/**
 * O retrato de alguém, ou as iniciais dela.
 *
 * Iniciais não são um estado degradado: elas distinguem sem exigir nada de
 * ninguém, e a maior parte das pessoas nunca vai enviar foto. Por isso a cor é
 * derivada do nome — determinística, igual em qualquer máquina — em vez de
 * sorteada.
 *
 * O retrato é um data URI vindo do próprio perfil, então `img` cru e não
 * `next/image`: não há URL remota a otimizar, e o otimizador só acrescentaria
 * uma ida ao servidor para um dado que já está em memória.
 */
export function PersonAvatar({ person, className }: PersonAvatarProps) {
  const base = cn(
    "flex shrink-0 items-center justify-center overflow-hidden rounded-full",
    className ?? "h-9 w-9"
  );

  if (person.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URI: não há o que otimizar.
      <img src={person.avatarUrl} alt="" className={cn(base, "object-cover")} />
    );
  }

  const hue = avatarHue(person.name);

  return (
    <span
      aria-hidden
      className={cn(base, "text-xs font-semibold")}
      style={{
        backgroundColor: `oklch(0.9 0.05 ${hue})`,
        color: `oklch(0.4 0.12 ${hue})`,
      }}
    >
      {initialsOf(person.name)}
    </span>
  );
}
