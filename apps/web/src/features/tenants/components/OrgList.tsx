import { Link } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { Card } from "@heroui/react";
import type { Org } from "../hooks";

type Props = {
  orgs: Org[];
};

export function OrgList({ orgs }: Props) {
  return (
    <ul className="flex flex-col gap-3">
      {orgs.map((org) => (
        <li key={org.id}>
          <Card className="rounded-md">
            <Card.Content className="flex flex-row justify-between items-center">
              <p className="font-medium">{org.name}</p>
              <Link
                to="/t/$tenantId"
                params={{ tenantId: org.id }}
                className="text-blue-600 hover:text-blue-800 transition-colors"
                aria-label={`${org.name} を開く`}
              >
                <ExternalLink size={18} aria-hidden />
              </Link>
            </Card.Content>
          </Card>
        </li>
      ))}
    </ul>
  );
}
