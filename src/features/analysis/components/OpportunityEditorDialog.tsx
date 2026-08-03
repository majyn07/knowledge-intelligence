"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { KnowledgeOpportunity } from "@/features/analysis/types/KnowledgeOpportunity";

interface OpportunityEditorDialogProps {
  opportunity: KnowledgeOpportunity | null;
  onOpenChange: (open: boolean) => void;
  onSave: (changes: Pick<KnowledgeOpportunity, "title" | "description" | "justification">) => void;
}

export function OpportunityEditorDialog({ opportunity, onOpenChange, onSave }: OpportunityEditorDialogProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [justification, setJustification] = useState("");

  useEffect(() => {
    setTitle(opportunity?.title ?? "");
    setDescription(opportunity?.description ?? "");
    setJustification(opportunity?.justification ?? "");
  }, [opportunity]);

  return <Dialog open={Boolean(opportunity)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Editar oportunidade</DialogTitle><DialogDescription>Ajuste a proposta antes de registrá-la como uma decisão humana.</DialogDescription></DialogHeader><div className="space-y-4"><div className="space-y-2"><Label htmlFor="opportunity-title">Título</Label><Input id="opportunity-title" value={title} onChange={(event) => setTitle(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="opportunity-description">Descrição</Label><Textarea id="opportunity-description" value={description} onChange={(event) => setDescription(event.target.value)} /></div><div className="space-y-2"><Label htmlFor="opportunity-justification">Justificativa</Label><Textarea id="opportunity-justification" value={justification} onChange={(event) => setJustification(event.target.value)} /></div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button onClick={() => { onSave({ title: title.trim(), description: description.trim(), justification: justification.trim() }); onOpenChange(false); }} disabled={!title.trim() || !description.trim() || !justification.trim()}>Salvar decisão</Button></DialogFooter></DialogContent></Dialog>;
}
