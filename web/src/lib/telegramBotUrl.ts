type TelegramBotEnv = Record<string, string | undefined>;

const DEFAULT_TELEGRAM_BOT_URL = "https://t.me/JumysAIBot";

export function getTelegramBotUrl(env: TelegramBotEnv): string {
  const configured = env.VITE_TELEGRAM_BOT_URL?.trim();
  return configured || DEFAULT_TELEGRAM_BOT_URL;
}

export function buildTelegramBotStartUrl(botUrl: string, token: string): string {
  const url = new URL(botUrl);
  url.searchParams.set("start", token);
  return url.toString();
}
