import AssistantClient from "../../components/assistant/AssistantClient.jsx";

export const metadata = { title: "Assistant · LOOPER" };

export default function AssistantPage() {
  return (
    <main className="wrap py-8 space-y-6">
      <header>
        <h1 className="font-headline-sm text-headline-sm text-primary">LOOPER ASSISTANT</h1>
        <p className="mt-2 text-on-surface-variant font-body-md text-body-md max-w-2xl">
          Cite-or-refuse across LOOPER content and Product Context. Every claim carries a
          source receipt — or it says it doesn&apos;t have one. No bluffing. No LLM in the answer path.
        </p>
      </header>
      <AssistantClient />
    </main>
  );
}