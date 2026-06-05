"use client";

import { useState } from "react";
import Link from "next/link";
import MemoryEditor from "./MemoryEditor";
import VoiceCard from "@/components/VoiceCard";
import type { VoiceEditorState } from "./MemoryEditor";
import type { ClientMemory, Plan, SentenceStyle } from "@/lib/types";

interface Props {
  clientId: string;
  clientName: string;
  clientIndustry: string;
  chatHref: string;
  memory: ClientMemory | null;
  userPlan: Plan;
}

function initialVoiceState(
  clientName: string,
  clientIndustry: string,
  memory: ClientMemory | null
): VoiceEditorState {
  return {
    name: clientName,
    industry: clientIndustry,
    brandVoice: memory?.brand_voice ?? "",
    toneRules: memory?.tone_rules ?? [],
    vocabUse: memory?.vocab_use ?? [],
    vocabAvoid: memory?.vocab_avoid ?? [],
    sentenceStyle: (memory?.sentence_style as SentenceStyle) ?? {},
    samplesCount: (memory?.samples ?? []).length,
  };
}

export default function ClientEditorLayout({
  clientId,
  clientName,
  clientIndustry,
  chatHref,
  memory,
  userPlan,
}: Props) {
  const [voiceState, setVoiceState] = useState<VoiceEditorState>(() =>
    initialVoiceState(clientName, clientIndustry, memory)
  );

  return (
    <>
      {/* Page header — full width, above the grid */}
      <div className="max-w-6xl mx-auto px-6 pt-10 pb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{clientName}</h1>
          {clientIndustry && (
            <p className="text-text-muted text-sm mt-1">{clientIndustry}</p>
          )}
        </div>
        <Link
          href={chatHref}
          className="bg-accent hover:bg-accent-press text-text-primary px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          Open Chat →
        </Link>
      </div>

      {/* Two-column grid */}
      <main className="max-w-6xl mx-auto px-6 pb-10 grid grid-cols-1 md:grid-cols-[1fr_300px] gap-8 items-start">
        <MemoryEditor
          clientId={clientId}
          clientName={clientName}
          clientIndustry={clientIndustry}
          memory={memory}
          userPlan={userPlan}
          onStateChange={setVoiceState}
        />

        <div className="md:sticky md:top-6">
          <VoiceCard {...voiceState} />
        </div>
      </main>
    </>
  );
}
