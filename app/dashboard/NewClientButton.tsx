"use client";

import ClickSpark from "@/components/bits/ClickSpark";
import { Button } from "@/components/ui";
import { createNewClient } from "./actions";

export default function NewClientButton() {
  return (
    <ClickSpark sparkColor="#2EB896" sparkSize={6} sparkRadius={18} sparkCount={7} duration={400}>
      <form action={createNewClient}>
        <Button type="submit" variant="primary">
          <span className="text-lg leading-none" aria-hidden="true">+</span>
          New client
        </Button>
      </form>
    </ClickSpark>
  );
}
