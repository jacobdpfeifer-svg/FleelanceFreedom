"use client";

import Link from "next/link";
import { Card } from "@/components/ui";
import VoicePrint from "@/components/VoicePrint";
import AnimatedContent from "@/components/bits/AnimatedContent";
import ClickSpark from "@/components/bits/ClickSpark";
import type { Client } from "@/lib/types";

interface ClientGridProps {
  clients: Client[];
}

export default function ClientGrid({ clients }: ClientGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client, index) => (
        <AnimatedContent
          key={client.id}
          direction="vertical"
          distance={12}
          delay={index * 60}
          duration={0.4}
        >
          <ClickSpark
            sparkColor="#2EB896"
            sparkSize={6}
            sparkRadius={18}
            sparkCount={7}
            duration={400}
          >
            <Card className="group relative p-5 hover:border-accent transition-colors w-full">
              <Link
                href={`/clients/${client.id}`}
                className="absolute inset-0 z-0 rounded-md"
                aria-label={`Open ${client.name}`}
              />
              <div className="relative z-10 pointer-events-none">
                <div className="flex items-start justify-between mb-3">
                  <VoicePrint seed={client.name + (client.industry ?? "")} />
                  <span className="text-xs text-text-muted">
                    {new Date(client.created_at).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                  {client.name}
                </h2>
                {client.industry && (
                  <p className="text-text-muted text-sm mt-1">{client.industry}</p>
                )}
                <div className="flex gap-2 mt-4">
                  <span className="text-xs text-text-muted bg-raised px-2 py-1 rounded">
                    Memory
                  </span>
                  <Link
                    href={`/clients/${client.id}/chat`}
                    className="pointer-events-auto text-xs text-text-primary bg-raised hover:bg-raised px-2 py-1 rounded transition-colors"
                  >
                    Chat →
                  </Link>
                </div>
              </div>
            </Card>
          </ClickSpark>
        </AnimatedContent>
      ))}
    </div>
  );
}
