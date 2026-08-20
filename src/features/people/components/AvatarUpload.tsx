"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Person } from "@/models/Assignment";

import { AVATAR_ACCEPT, avatarErrorMessage, resizeAvatar } from "../avatar";
import { PersonAvatar } from "./PersonAvatar";

interface AvatarUploadProps {
  person: Person;
  onChange: (avatarUrl: string) => Promise<void> | void;
}

/**
 * Envio do retrato do próprio perfil.
 *
 * A imagem é reduzida **no navegador** antes de sair daqui: nada de mandar 4 MB
 * para o servidor cortar depois. O que sobe já é o que fica gravado, e o teto é
 * conferido sobre o resultado, não sobre o arquivo escolhido — o tamanho do
 * original não diz nada sobre o tamanho do retrato.
 */
export function AvatarUpload({ person, onChange }: AvatarUploadProps) {
  const input = useRef<HTMLInputElement>(null);
  const [isBusy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;

    setBusy(true);

    const result = await resizeAvatar(file);

    setBusy(false);

    /*
      Limpa o campo em qualquer caso: sem isso, escolher o mesmo arquivo de
      novo depois de um erro não dispara evento nenhum, e a tela pareceria
      travada.
    */
    if (input.current) input.current.value = "";

    if (!result.ok) {
      toast.error(avatarErrorMessage[result.error]);
      return;
    }

    await onChange(result.dataUrl);
  }

  return (
    <div className="flex items-center gap-4">
      <PersonAvatar person={person} className="h-16 w-16 text-lg" />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={isBusy}
            onClick={() => input.current?.click()}
          >
            <Upload className="mr-1.5 h-3.5 w-3.5" />
            {person.avatarUrl ? "Trocar retrato" : "Enviar retrato"}
          </Button>

          {person.avatarUrl && (
            <Button
              size="sm"
              variant="ghost"
              disabled={isBusy}
              onClick={() => void onChange("")}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Remover
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          Recortado no centro e reduzido a 128 pixels. Sem retrato, aparecem as
          suas iniciais — o que já distingue.
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept={AVATAR_ACCEPT}
        className="hidden"
        onChange={(event) => void handleFile(event.target.files?.[0])}
      />
    </div>
  );
}
