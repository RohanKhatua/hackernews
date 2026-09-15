"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import type { SendResult } from "./types";

type SendAction = "top5" | "top5-test" | "recommended" | "recommended-test";

export function SendControls({
  hasAdminEmail,
  onSend,
  sending,
  result,
}: {
  hasAdminEmail: boolean;
  onSend: (action: SendAction) => void;
  sending: SendAction | null;
  result: SendResult | null;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Manual send</CardTitle>
        <CardDescription>
          Trigger a send immediately. Test sends go only to your admin email.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Button
            variant="destructive"
            disabled={sending !== null}
            onClick={() => onSend("top5")}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending === "top5" ? "Sending..." : "Send Top 5"}
          </Button>
          <Button
            variant="outline"
            disabled={sending !== null || !hasAdminEmail}
            onClick={() => onSend("top5-test")}
          >
            {sending === "top5-test" ? "Sending..." : "Top 5 to me"}
          </Button>
          <Button
            variant="destructive"
            disabled={sending !== null}
            onClick={() => onSend("recommended")}
          >
            <Send className="mr-2 h-4 w-4" />
            {sending === "recommended" ? "Sending..." : "Send Recommended"}
          </Button>
          <Button
            variant="outline"
            disabled={sending !== null || !hasAdminEmail}
            onClick={() => onSend("recommended-test")}
          >
            {sending === "recommended-test"
              ? "Sending..."
              : "Recommended to me"}
          </Button>
        </div>

        {result && (
          <div
            className={`flex items-start gap-3 rounded-md border p-3 text-sm ${
              result.success
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-900/30 dark:text-green-300"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-900/30 dark:text-red-300"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <p className="font-medium">
                {result.success ? "Send complete" : "Send failed"}
              </p>
              <p className="text-xs opacity-90">{result.message}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
