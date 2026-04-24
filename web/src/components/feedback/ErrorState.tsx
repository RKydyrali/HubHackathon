import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useI18n } from "@/lib/i18n";

export function ErrorState({ message }: { message: string }) {
  const { copy } = useI18n();
  return (
    <Alert variant="destructive" className="rounded-lg bg-card shadow-card">
      <AlertTitle>{copy.common.error}</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}
