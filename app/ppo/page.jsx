import PPOClient from "../../components/ppo/PPOClient.jsx";
import { PPO_REQUEST_TYPES } from "../../lib/ppo/store.mjs";

export const metadata = { title: "PPO · LOOPER" };

export default function PPOPage() {
  return (
    <main className="wrap py-8 space-y-6">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">GOVERNANCE</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Team, access, Product Context, and automation requests — approval-gated, receipted on the
          chain. Local store (no Jira required).
        </p>
      </header>
      <PPOClient types={PPO_REQUEST_TYPES} />
    </main>
  );
}