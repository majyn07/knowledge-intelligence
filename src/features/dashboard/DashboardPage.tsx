import {
  ArrowRight,
  Clock3,
  FileText,
  Lightbulb,
  FolderKanban,
  Ticket,
  BookOpen,
  CheckCircle2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DashboardPage() {
  return (
    <div className="space-y-8">
      <section className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            Dashboard
          </p>

          <h1 className="text-3xl font-bold tracking-tight">
            Base Visus Produção
          </h1>

          <p className="mt-2 text-muted-foreground">
            Visão geral do projeto e das atividades em andamento.
          </p>
        </div>

        <Button>
          Abrir análise
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Atendimentos
              </p>

              <p className="mt-1 text-3xl font-bold">
                128
              </p>
            </div>

            <Ticket className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Artigos
              </p>

              <p className="mt-1 text-3xl font-bold">
                324
              </p>
            </div>

            <BookOpen className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Projetos
              </p>

              <p className="mt-1 text-3xl font-bold">
                6
              </p>
            </div>

            <FolderKanban className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center justify-between pt-6">
            <div>
              <p className="text-sm text-muted-foreground">
                Melhorias
              </p>

              <p className="mt-1 text-3xl font-bold">
                17
              </p>
            </div>

            <CheckCircle2 className="h-8 w-8 text-primary" />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>
            Continue trabalhando
          </CardTitle>
        </CardHeader>

        <CardContent>
          <div className="flex items-center justify-between rounded-lg border p-5">
            <div>
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-primary" />

                <span className="text-sm text-muted-foreground">
                  Última atividade
                </span>
              </div>

              <h3 className="mt-2 text-lg font-semibold">
                Workflow KB - Atendimento #45812
              </h3>

              <p className="mt-1 text-sm text-muted-foreground">
                Revisão iniciada ontem • 45% concluída
              </p>
            </div>

            <Button>
              Abrir

              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />

              Últimas análises
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              Workflow KB • Hoje
            </div>

            <div className="rounded-lg border p-4">
              Collab • Ontem
            </div>

            <div className="rounded-lg border p-4">
              Planning 4D • Segunda-feira
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-primary" />

              Plano de melhorias
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="rounded-lg border p-4">
              3 artigos aguardando revisão
            </div>

            <div className="rounded-lg border p-4">
              2 categorias sem cobertura
            </div>

            <div className="rounded-lg border p-4">
              5 sugestões pendentes
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}