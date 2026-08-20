import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Clock3,
  FolderKanban,
  ListTodo,
  ScanSearch,
  Ticket,
  UserRound,
  XCircle,
} from "lucide-react";

import { StatusBadge } from "@/components/common/status/StatusBadge";
import {
  activityTypeLabel,
  type ActivityEvent,
  type ActivityType,
} from "@/models/ActivityEvent";

interface ActivityTimelineProps {
  events: ActivityEvent[];
  /** Oculta o assunto quando a linha do tempo já pertence a uma entidade. */
  hideSubject?: boolean;
}

const typeIcon: Record<ActivityType, typeof ScanSearch> = {
  ticket_created: Ticket,
  ticket_updated: Ticket,
  ticket_deleted: XCircle,
  analysis_started: ScanSearch,
  analysis_completed: CheckCircle2,
  opportunity_approved: CheckCircle2,
  opportunity_discarded: XCircle,
  opportunity_deferred: Clock3,
  plan_created: ListTodo,
  plan_status_changed: ListTodo,
  plan_updated: ListTodo,
  article_created: BookOpen,
  article_updated: BookOpen,
  article_status_changed: BookOpen,
  project_created: FolderKanban,
  project_updated: FolderKanban,
};

const typeVariant: Record<ActivityType, "success" | "danger" | "warning" | "info" | "default"> = {
  ticket_created: "default",
  ticket_updated: "default",
  ticket_deleted: "danger",
  analysis_started: "info",
  analysis_completed: "success",
  opportunity_approved: "success",
  opportunity_discarded: "danger",
  opportunity_deferred: "warning",
  plan_created: "info",
  plan_status_changed: "warning",
  plan_updated: "default",
  article_created: "default",
  article_updated: "default",
  article_status_changed: "warning",
  project_created: "default",
  project_updated: "default",
};

const subjectHref: Partial<Record<ActivityEvent["subject"]["kind"], (id: string) => string>> = {
  article: (id) => `/library/${id}`,
  project: (id) => `/projects/${id}`,
};

function formatMoment(at: string) {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return "Data desconhecida";

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function ActivityTimeline({ events, hideSubject = false }: ActivityTimelineProps) {
  return (
    <ol className="relative space-y-1 border-l border-border/70 pl-6">
      {events.map((event) => {
        const Icon = typeIcon[event.type];
        const href = subjectHref[event.subject.kind]?.(event.subject.id);

        return (
          <li key={event.id} className="relative py-3">
            <span className="absolute -left-[1.97rem] top-4 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-background text-primary">
              <Icon className="h-3 w-3" />
            </span>

            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge variant={typeVariant[event.type]}>
                {activityTypeLabel[event.type]}
              </StatusBadge>

              <span className="text-xs text-muted-foreground">{formatMoment(event.at)}</span>

              {event.actor && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <UserRound className="h-3 w-3" />
                  {event.actor}
                </span>
              )}
            </div>

            {!hideSubject && (
              <p className="mt-2 text-sm font-medium">
                {href ? (
                  <Link href={href} className="hover:underline">
                    {event.subject.label}
                  </Link>
                ) : (
                  event.subject.label
                )}
              </p>
            )}

            <p className={`text-sm leading-6 text-muted-foreground ${hideSubject ? "mt-2" : "mt-1"}`}>
              {event.detail}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
