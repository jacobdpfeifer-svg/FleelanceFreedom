import Card from "@/components/Card";
import type { ReactNode } from "react";

interface FeatureCardProps {
  icon: ReactNode;
  headline: string;
  description: string;
}

export default function FeatureCard({ icon, headline, description }: FeatureCardProps) {
  return (
    <Card className="p-6 flex flex-col gap-3">
      <div className="w-10 h-10 rounded-lg bg-raised flex items-center justify-center text-accent">
        {icon}
      </div>
      <h3 className="text-base font-semibold text-text-primary">{headline}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </Card>
  );
}
