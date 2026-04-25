import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { ConvexBotClient, ConvexBotHttpError, formatConvexErrorMessage, } from "./convexBotClient.js";
const PAGE = 5;
const applyDrafts = new Map();
export function linkedMenuLabels() {
    return ["Вакансии", "Мои отклики", "Уведомления", "Настройки"];
}
export function unlinkedMenuLabels() {
    return ["Подключить Telegram"];
}
export function parseStartPayload(text) {
    const match = text?.trim().match(/^\/start(?:@\w+)?(?:\s+(.+))?$/);
    const payload = match?.[1]?.trim();
    return payload || null;
}
export function menuActionFromText(text) {
    if (text === "Вакансии")
        return { type: "jobs" };
    if (text === "Мои отклики")
        return { type: "applications" };
    if (text === "Уведомления")
        return { type: "notifications" };
    if (text === "Настройки")
        return { type: "settings" };
    return null;
}
function linkedMenuKeyboard() {
    return new Keyboard()
        .text("Вакансии")
        .text("Мои отклики")
        .row()
        .text("Уведомления")
        .text("Настройки")
        .resized();
}
function unlinkedMenuKeyboard() {
    return new Keyboard().text("Подключить Telegram").resized();
}
function jobsMenuKeyboard() {
    return new Keyboard()
        .text("Вакансии Актау (все)")
        .row()
        .text("Только на платформе")
        .text("Только с HH")
        .row()
        .text("Настройки")
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
    const srcTag = params.source === "native" ? "n" : params.source === "hh" ? "h" : "a";
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
function linkedWelcomeText(username) {
    const name = username ? ` @${username}` : "";
    return `JumysAI подключён${name}. Выберите раздел ниже.`;
}
function unlinkedWelcomeText() {
    return [
        "Здравствуйте! Чтобы связать Telegram с вашим веб-аккаунтом JumysAI, откройте профиль или настройки на сайте и нажмите «Подключить Telegram».",
        "",
        "Обычный /start больше не создаёт отдельный Telegram-аккаунт, поэтому ваши отклики и уведомления останутся в одном профиле.",
    ].join("\n");
}
function formatApplications(items) {
    if (items.length === 0) {
        return "Откликов пока нет. Откройте вакансии и отправьте первую заявку.";
    }
    return [
        "Последние отклики:",
        "",
        ...items.map((item, index) => {
            const title = item.vacancy?.title ?? "Вакансия";
            return `${index + 1}. ${title} — ${item.application.status}`;
        }),
    ].join("\n");
}
function formatNotifications(items) {
    if (items.length === 0) {
        return "Новых уведомлений пока нет.";
    }
    return [
        "Последние уведомления:",
        "",
        ...items.map((item, index) => {
            const unread = item.readAt ? "" : " • новое";
            return `${index + 1}. ${item.title}${unread}\n${item.body}`;
        }),
    ].join("\n\n");
}
async function isLinked(client, chatId) {
    try {
        await client.getNotificationPreferences(chatId);
        return true;
    }
    catch (e) {
        if (e instanceof ConvexBotHttpError && e.status === 404) {
            return false;
        }
        throw e;
    }
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
            await ctx.reply(unlinkedWelcomeText(), { reply_markup: unlinkedMenuKeyboard() });
            return;
        }
        await ctx.reply(`Не удалось загрузить настройки: ${formatConvexErrorMessage(e)}`);
    }
}
async function showApplications(ctx, client, chatId) {
    await ctx.replyWithChatAction("typing");
    try {
        const rows = await client.listApplications(chatId);
        await ctx.reply(formatApplications(rows), { reply_markup: linkedMenuKeyboard() });
    }
    catch (e) {
        if (e instanceof ConvexBotHttpError && e.status === 404) {
            await ctx.reply(unlinkedWelcomeText(), { reply_markup: unlinkedMenuKeyboard() });
            return;
        }
        await ctx.reply(`Не удалось загрузить отклики: ${formatConvexErrorMessage(e)}`);
    }
}
async function showNotifications(ctx, client, chatId) {
    await ctx.replyWithChatAction("typing");
    try {
        const rows = await client.listNotifications(chatId);
        await ctx.reply(formatNotifications(rows), { reply_markup: linkedMenuKeyboard() });
    }
    catch (e) {
        if (e instanceof ConvexBotHttpError && e.status === 404) {
            await ctx.reply(unlinkedWelcomeText(), { reply_markup: unlinkedMenuKeyboard() });
            return;
        }
        await ctx.reply(`Не удалось загрузить уведомления: ${formatConvexErrorMessage(e)}`);
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
        const token = parseStartPayload(ctx.message?.text);
        await ctx.replyWithChatAction("typing");
        try {
            if (token) {
                await client.linkTelegram({
                    token,
                    telegramChatId: chatId,
                    telegramUsername: ctx.from?.username,
                });
                await ctx.reply(linkedWelcomeText(ctx.from?.username), {
                    reply_markup: linkedMenuKeyboard(),
                });
                return;
            }
            const linked = await isLinked(client, chatId);
            await ctx.reply(linked ? linkedWelcomeText(ctx.from?.username) : unlinkedWelcomeText(), { reply_markup: linked ? linkedMenuKeyboard() : unlinkedMenuKeyboard() });
        }
        catch (e) {
            console.error("start", e);
            const message = formatConvexErrorMessage(e);
            const hint = /expired/i.test(message)
                ? "Ссылка истекла. Вернитесь на сайт и нажмите «Подключить Telegram» ещё раз."
                : /already linked|already used|already/i.test(message)
                    ? "Эта ссылка или Telegram-чат уже использованы. Проверьте подключение в настройках сайта."
                    : "Не удалось подключить Telegram. Попробуйте создать новую ссылку в настройках сайта.";
            await ctx.reply(`${hint}\n\n${message}`, { reply_markup: unlinkedMenuKeyboard() });
        }
    });
    bot.command("settings", async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        await showSettings(ctx, client, chatId);
    });
    bot.hears("Подключить Telegram", async (ctx) => {
        await ctx.reply(unlinkedWelcomeText(), { reply_markup: unlinkedMenuKeyboard() });
    });
    bot.hears("Настройки уведомлений", async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        await showSettings(ctx, client, chatId);
    });
    bot.on("message:text").filter((ctx) => menuActionFromText(ctx.message?.text ?? "") !== null, async (ctx) => {
        const chatId = String(ctx.chat?.id ?? "");
        if (!chatId)
            return;
        const action = menuActionFromText(ctx.message.text);
        if (action.type === "jobs") {
            await ctx.reply("Выберите список вакансий:", { reply_markup: jobsMenuKeyboard() });
            return;
        }
        if (action.type === "applications") {
            await showApplications(ctx, client, chatId);
            return;
        }
        if (action.type === "notifications") {
            await showNotifications(ctx, client, chatId);
            return;
        }
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
