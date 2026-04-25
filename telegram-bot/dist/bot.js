import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { ConvexBotClient, ConvexBotHttpError, formatConvexErrorMessage, } from "./convexBotClient.js";
const PAGE = 5;
const applyDrafts = new Map();
function mainMenuKeyboard() {
    return new Keyboard()
        .text("Вакансии Актау (все)")
        .row()
        .text("Только на платформе")
        .text("Только с HH")
        .row()
        .text("Настройки уведомлений")
        .resized();
}
function sourceFromMenuKey(key) {
    if (key === "Вакансии Актау (все)")
        return { region: "aktau" };
    if (key === "Только на платформе")
        return { region: "aktau", source: "native" };
    if (key === "Только с HH")
        return { region: "aktau", source: "hh" };
    return null;
}
function salaryLine(v) {
    if (v.salaryMin != null || v.salaryMax != null) {
        const cur = v.salaryCurrency ? ` ${v.salaryCurrency}` : "";
        if (v.salaryMin != null && v.salaryMax != null) {
            return `${v.salaryMin}–${v.salaryMax}${cur}`;
        }
        if (v.salaryMin != null)
            return `от ${v.salaryMin}${cur}`;
        return `до ${v.salaryMax}${cur}`;
    }
    return "Зарплата не указана";
}
function vacancyCard(v) {
    const src = v.source === "native" ? "На платформе" : "HH";
    return `«${v.title}»\n${src} · ${v.city}\n${salaryLine(v)}`;
}
async function sendVacancyList(ctx, client, params, offset) {
    await ctx.replyWithChatAction("typing");
    const all = await client.listVacancies({ ...params, limit: 50 });
    const slice = all.slice(offset, offset + PAGE);
    if (slice.length === 0) {
        await ctx.reply("Подходящих вакансий сейчас нет. Загляните позже.");
        return;
    }
    const srcTag = params.source ?? "a";
    let kb = new InlineKeyboard();
    for (const v of slice) {
        kb = kb.text(v.title.slice(0, 28), `d:${v._id}`).row();
    }
    if (offset + PAGE < all.length) {
        kb = kb.text("Ещё…", `l:${srcTag}:${offset + PAGE}`);
    }
    const header = params.source === "native"
        ? "Вакансии в Актау (на платформе)"
        : params.source === "hh"
            ? "Вакансии в Актау (HH)"
            : "Вакансии в Актау";
    await ctx.reply(`${header} (${slice.length} из ${all.length - offset} на странице):`, {
        reply_markup: kb,
    });
}
function prefKeyLabel(key) {
    const labels = {
        inApp: "В приложении",
        telegram: "Telegram",
        newApplications: "Новые отклики",
        statusChanges: "Статусы откликов",
        interviews: "Собеседования",
        aiRecommendations: "ИИ-рекомендации",
    };
    return labels[key];
}
function settingsText(p) {
    const lines = [
        "Настройки уведомлений (нажмите, чтобы переключить):",
        "",
        ...[
            "inApp",
            "telegram",
            "newApplications",
            "statusChanges",
            "interviews",
            "aiRecommendations",
        ].map((k) => {
            const on = p[k] ? "вкл" : "выкл";
            return `· ${prefKeyLabel(k)}: ${on}`;
        }),
    ];
    return lines.join("\n");
}
function settingsKeyboard(p) {
    let kb = new InlineKeyboard();
    for (const key of [
        "telegram",
        "newApplications",
        "statusChanges",
        "interviews",
        "aiRecommendations",
        "inApp",
    ]) {
        const mark = p[key] ? "✓" : "○";
        kb = kb.text(`${mark} ${prefKeyLabel(key)}`, `pf:${key}`).row();
    }
    return kb;
}
async function showSettings(ctx, client, chatId) {
    await ctx.replyWithChatAction("typing");
    try {
        const row = await client.getNotificationPreferences(chatId);
        const text = settingsText(row.preferences);
        const kb = settingsKeyboard(row.preferences);
        if (ctx.callbackQuery?.message) {
            await ctx.editMessageText(text, { reply_markup: kb });
        }
        else {
            await ctx.reply(text, { reply_markup: kb });
        }
    }
    catch (e) {
        if (e instanceof ConvexBotHttpError && e.status === 404) {
            await ctx.reply("Сначала выполните /start, чтобы привязать аккаунт.");
            return;
        }
        await ctx.reply(`Не удалось загрузить настройки: ${formatConvexErrorMessage(e)}`);
    }
}
async function showVacancyDetail(ctx, client, vacancyId) {
    await ctx.answerCallbackQuery();
    await ctx.replyWithChatAction("typing");
    const list = await client.listVacancies({ region: "aktau", limit: 50 });
    const v = list.find((x) => x._id === vacancyId);
    if (!v) {
        await ctx.reply("Вакансия не найдена или снята с публикации.");
        return;
    }
    const desc = (v.description ?? "").slice(0, 3500);
    const text = desc ? `${vacancyCard(v)}\n\n${desc}` : vacancyCard(v);
    if (v.source === "hh") {
        if (v.externalApplyUrl) {
            const kb = new InlineKeyboard().url("Отклик на HH", v.externalApplyUrl);
            await ctx.reply(text, { reply_markup: kb });
        }
        else {
            await ctx.reply(`${text}\n\nСсылка для отклика на HH недоступна. Откройте вакансию на hh.ru вручную.`);
        }
        return;
    }
    const kb = new InlineKeyboard().text("Подать заявку", `apply:${v._id}`);
    await ctx.reply(text, { reply_markup: kb });
}
function ruApplyError(msg) {
    if (/already exists|duplicate/i.test(msg)) {
        return "Вы уже откликались на эту вакансию.";
    }
    if (/not open for in-app|not open/i.test(msg)) {
        return "Эта вакансия не принимает отклики в приложении.";
    }
    if (/User not found/i.test(msg)) {
        return "Пользователь не найден. Выполните /start.";
    }
    return msg;
}
export function createBot(token, convexBase, secret) {
    const client = new ConvexBotClient(convexBase, secret);
    const bot = new Bot(token);
    bot.command("start", async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        await ctx.replyWithChatAction("typing");
        try {
            await client.upsertUser({
                telegramChatId: chatId,
                telegramUsername: ctx.from?.username,
                role: "seeker",
            });
            await ctx.reply("Добро пожаловать в JumysAI. Вы подключены. Выберите действие ниже или откройте /settings.", { reply_markup: mainMenuKeyboard() });
        }
        catch (e) {
            console.error("upsertUser", e);
            await ctx.reply(`Не удалось связать аккаунт: ${formatConvexErrorMessage(e)}. Попробуйте позже.`);
        }
    });
    bot.command("settings", async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        await showSettings(ctx, client, chatId);
    });
    bot.hears("Настройки уведомлений", async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        await showSettings(ctx, client, chatId);
    });
    bot.on("message:text", async (ctx, next) => {
        const chatId = String(ctx.chat?.id ?? "");
        const draft = applyDrafts.get(chatId);
        if (!draft) {
            return next();
        }
        const text = ctx.message?.text?.trim() ?? "";
        if (!text) {
            return next();
        }
        const q = draft.questions[draft.step];
        draft.answers.push({ question: q, answer: text });
        draft.step += 1;
        if (draft.step < draft.questions.length) {
            const nq = draft.questions[draft.step];
            await ctx.reply(`${draft.step + 1}/${draft.questions.length}: ${nq}`);
            return;
        }
        applyDrafts.delete(chatId);
        try {
            await client.submitApplication({
                telegramChatId: chatId,
                vacancyId: draft.vacancyId,
                screeningAnswers: draft.answers,
            });
            await ctx.reply("Заявка отправлена. Удачи!");
        }
        catch (e) {
            applyDrafts.delete(chatId);
            await ctx.reply(ruApplyError(formatConvexErrorMessage(e)));
        }
    });
    bot.on("message:text").filter((ctx) => sourceFromMenuKey(ctx.message?.text ?? "") !== null, async (ctx) => {
        const p = sourceFromMenuKey(ctx.message.text);
        await sendVacancyList(ctx, client, p, 0);
    });
    bot.callbackQuery(/^l:([anh]):(\d+)$/, async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        const src = ctx.match[1];
        const offset = Number(ctx.match[2]);
        const params = src === "n"
            ? { region: "aktau", source: "native" }
            : src === "h"
                ? { region: "aktau", source: "hh" }
                : { region: "aktau" };
        await ctx.answerCallbackQuery();
        await sendVacancyList(ctx, client, params, offset);
    });
    bot.callbackQuery(/^d:(.+)$/, async (ctx) => {
        const id = ctx.match[1];
        if (!id)
            return;
        await showVacancyDetail(ctx, client, id);
    });
    bot.callbackQuery(/^apply:(.+)$/, async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        const vacancyId = ctx.match[1];
        if (!chatId || !vacancyId)
            return;
        await ctx.answerCallbackQuery();
        await ctx.replyWithChatAction("typing");
        const list = await client.listVacancies({ region: "aktau", limit: 50 });
        const v = list.find((x) => x._id === vacancyId);
        if (!v || v.source !== "native") {
            await ctx.reply("Можно откликаться только на вакансии платформы.");
            return;
        }
        const qs = v.screeningQuestions?.length ? v.screeningQuestions : [];
        if (qs.length === 0) {
            try {
                await client.submitApplication({
                    telegramChatId: chatId,
                    vacancyId,
                    screeningAnswers: [],
                });
                await ctx.reply("Заявка отправлена. Удачи!");
            }
            catch (e) {
                await ctx.reply(ruApplyError(formatConvexErrorMessage(e)));
            }
            return;
        }
        applyDrafts.set(chatId, {
            vacancyId,
            questions: qs,
            answers: [],
            step: 0,
        });
        await ctx.reply(`Ответьте на вопросы одним сообщением за раз.\n\n1/${qs.length}: ${qs[0]}`);
    });
    bot.callbackQuery(/^pf:(\w+)$/, async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        const raw = ctx.match[1];
        if (!chatId || !raw)
            return;
        const key = raw;
        const allowed = [
            "inApp",
            "telegram",
            "newApplications",
            "statusChanges",
            "interviews",
            "aiRecommendations",
        ];
        if (!allowed.includes(key)) {
            await ctx.answerCallbackQuery();
            return;
        }
        await ctx.answerCallbackQuery();
        try {
            const row = await client.getNotificationPreferences(chatId);
            const next = !row.preferences[key];
            await client.patchNotificationPreferences({ telegramChatId: chatId, [key]: next });
            const updated = await client.getNotificationPreferences(chatId);
            const text = settingsText(updated.preferences);
            const kb = settingsKeyboard(updated.preferences);
            await ctx.editMessageText(text, { reply_markup: kb });
        }
        catch (e) {
            await ctx.reply(`Ошибка: ${formatConvexErrorMessage(e)}`);
        }
    });
    return bot;
}
