import { EntityType, type Entity } from "@factory-as-code/factory-config";
import {
  BookOpen,
  Box,
  CircleCheck,
  FileText,
  Folder,
  Gavel,
  GitPullRequest,
  ListTodo,
  Map,
  Megaphone,
  MessageSquareText,
  Scale,
  Ticket,
  UserRound,
  type LucideIcon,
} from "lucide-react";

const NAMED_ICONS: [RegExp, LucideIcon][] = [
  [/blueprint/i, Map],
  [/requirement/i, Box],
  [/work order/i, ListTodo],
  [/pull request/i, GitPullRequest],
  [/feedback/i, MessageSquareText],
  [/test/i, CircleCheck],
  [/profile/i, UserRound],
  [/rule|policy/i, Scale],
  [/release/i, Megaphone],
  [/decision/i, Gavel],
  [/knowledge|guide|handbook/i, BookOpen],
];

const TYPE_ICONS: Record<EntityType, LucideIcon> = {
  [EntityType.Document]: FileText,
  [EntityType.Ticket]: Ticket,
  [EntityType.Files]: Folder,
};

export function entityIcon(entity: Pick<Entity, "name" | "type">): LucideIcon {
  return NAMED_ICONS.find(([pattern]) => pattern.test(entity.name))?.[1] ?? TYPE_ICONS[entity.type];
}

/** "Process Rule" → "Process Rules", for section headings. */
const UNCOUNTABLE = /(feedback|data|evidence|information|research|knowledge|notes)$/i;

export function pluralize(name: string): string {
  if (UNCOUNTABLE.test(name)) return name;
  if (/(ss|x|ch|sh)$/i.test(name)) return `${name}es`;
  if (/s$/i.test(name)) return name;
  if (/[^aeiou]y$/i.test(name)) return `${name.slice(0, -1)}ies`;
  return `${name}s`;
}

export function initials(name: string): string {
  const local = name.split("@")[0];
  const parts = local.split(/[\s._-]+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[1][0] : local.slice(0, 2);
  return letters.toUpperCase();
}

export function displayPerson(name: string): string {
  return name.includes("@") ? name.split("@")[0] : name;
}
