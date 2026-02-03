import RunHubClient from "./run-hub-client";

export default function RunHubPage({ params }: { params: { id: string } }) {
  return <RunHubClient runId={params.id} />;
}
