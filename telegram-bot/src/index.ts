import { loadEnv, logStartupBanner } from "./env.js";
import { createBot } from "./bot.js";

async function main(): Promise<void> {
  const env = loadEnv();
  logStartupBanner(env);
  const convexBase = `${env.CONVEX_SITE_URL}/v1/bot`;
  // #region agent log
  console.log(
    JSON.stringify({
      event: "telegram_bot_runtime_config",
      convexBase,
      timestamp: Date.now(),
    }),
  );
  // #endregion
  const bot = createBot(env.TELEGRAM_BOT_TOKEN, convexBase, env.BOT_SHARED_SECRET);
  await bot.api.setMyCommands([
    { command: "start", description: "Подключить или проверить аккаунт" },
    { command: "settings", description: "Настройки уведомлений" },
  ]);
  console.log(JSON.stringify({ event: "telegram_bot_polling_start" }));
  try {
    await bot.start();
  } catch (err) {
    // #region agent log
    console.error(
      JSON.stringify({
        event: "telegram_bot_start_failed",
        error: String(err),
        timestamp: Date.now(),
      }),
    );
    // #endregion
    throw err;
  }
}

main().catch((err) => {
  console.error(JSON.stringify({ event: "telegram_bot_fatal", error: String(err) }));
  process.exit(1);
});
