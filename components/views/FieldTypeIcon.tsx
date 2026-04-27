import {
  Type,
  Hash,
  Calendar,
  Clock,
  ChevronDown,
  CheckSquare,
  Link,
  Mail,
  List,
  Link2,
  Sigma,
  FunctionSquare,
  UserCircle2,
  Paperclip,
} from "lucide-react";
import { FieldType } from "@prisma/client";

const icons: Record<FieldType, React.ReactNode> = {
  TEXT: <Type size={14} />,
  NUMBER: <Hash size={14} />,
  DATE: <Calendar size={14} />,
  TIME: <Clock size={14} />,
  SELECT: <ChevronDown size={14} />,
  MULTI_SELECT: <List size={14} />,
  CHECKBOX: <CheckSquare size={14} />,
  URL: <Link size={14} />,
  EMAIL: <Mail size={14} />,
  RELATION: <Link2 size={14} />,
  ROLLUP: <Sigma size={14} />,
  FORMULA: <FunctionSquare size={14} />,
  PERSON: <UserCircle2 size={14} />,
  FILE: <Paperclip size={14} />,
};

export function FieldTypeIcon({ type }: { type: FieldType }) {
  return <span className="text-gray-400">{icons[type]}</span>;
}
