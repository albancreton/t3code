import { useAtomValue } from "@effect/atom-react";
import { scopeProjectRef } from "@t3tools/client-runtime/environment";
import { parseNewThreadLink } from "@t3tools/shared/promptLinks";
import { createFileRoute, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { NewThreadLinkView } from "../components/promptLinks/NewThreadLinkView";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "../components/ui/empty";
import { SidebarInset } from "../components/ui/sidebar";
import { useNewThreadHandler } from "../hooks/useHandleNewThread";
import { useProjects } from "../state/entities";
import { allReachableShellsLiveAtom } from "../state/shell";

function LinkError({ message }: { readonly message: string }) {
  return (
    <SidebarInset className="h-dvh min-h-0 overflow-hidden overscroll-y-none">
      <Empty className="flex-1">
        <EmptyHeader className="max-w-md">
          <EmptyTitle>Could not open the link</EmptyTitle>
          <EmptyDescription>{message}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    </SidebarInset>
  );
}

/**
 * Minitel fork: `/new?folder=<absolute path>` opens an empty draft in the project of that folder
 * (the host app adds the project first), so a thread can start without a prompt.
 */
function NewThreadInFolder({ folder }: { readonly folder: string }) {
  const ready = useAtomValue(allReachableShellsLiveAtom);
  const projects = useProjects();
  const handleNewThread = useNewThreadHandler();
  const project = projects.find((candidate) => candidate.workspaceRoot === folder) ?? null;
  const opening = useRef(false);
  const [failed, setFailed] = useState(false);
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- opens the draft once, when the folder's project has arrived from the server
  useEffect(() => {
    if (project === null || opening.current) return;
    opening.current = true;
    void handleNewThread(scopeProjectRef(project.environmentId, project.id), { replace: true })
      .catch(() => null)
      .then((opened) => {
        if (opened === null) setFailed(true);
      });
  }, [project, handleNewThread]);
  if (failed) return <LinkError message="T3 Code could not open a new thread." />;
  if (ready && project === null) return <LinkError message={`${folder} is not a project here.`} />;
  return null;
}

// The query is read raw: the router's own search parsing turns `prompt=123` into a number.
function NewThreadLinkRoute() {
  const search = useLocation({ select: (location) => location.searchStr });
  const folder = new URLSearchParams(search).get("folder");
  if (folder !== null) return <NewThreadInFolder key={folder} folder={folder} />;
  const parsed = parseNewThreadLink(search);
  if (!parsed.ok) return <LinkError message={parsed.error} />;
  return <NewThreadLinkView key={search} link={parsed.value} />;
}

export const Route = createFileRoute("/_chat/new")({
  component: NewThreadLinkRoute,
});
