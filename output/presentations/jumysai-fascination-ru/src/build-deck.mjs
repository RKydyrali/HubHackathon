import fs from "node:fs/promises";
import path from "node:path";

import {
  Presentation,
  PresentationFile,
  auto,
  column,
  fill,
  fixed,
  fr,
  grid,
  grow,
  hug,
  image,
  layers,
  panel,
  row,
  rule,
  shape,
  text,
  wrap,
} from "@oai/artifact-tool";
import { drawSlideToCtx } from "@oai/artifact-tool";
import { Canvas } from "skia-canvas";

const workspace = path.resolve(".");
const scratch = path.join(workspace, "scratch");
const output = path.join(workspace, "output");
const W = 1920;
const H = 1080;

const C = {
  ink: "#111827",
  muted: "#5B6472",
  deep: "#111827",
  paper: "#F7F3EA",
  sand: "#EADFCB",
  sea: "#0B8D9A",
  seaDark: "#075D68",
  gold: "#F0B84A",
  coral: "#E85D4A",
  green: "#2F9E6D",
  lilac: "#6D5DFB",
  white: "#FFFFFF",
  line: "#D6CDBD",
};

const font = "Arial";
const display = "Arial";

const presentation = Presentation.create({
  slideSize: { width: W, height: H },
});

async function pngDataUrl(file) {
  const buffer = await fs.readFile(file);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

const homeScreenshot = await pngDataUrl(path.join(scratch, "jumysai-home-full.png"));
const vacanciesScreenshot = await pngDataUrl(path.join(scratch, "jumysai-vacancies.png"));
const detailScreenshot = await pngDataUrl(path.join(scratch, "jumysai-vacancy-detail.png"));
const mobileHomeScreenshot = await pngDataUrl(path.join(scratch, "jumysai-home-mobile-live.png"));
const mobileVacanciesScreenshot = await pngDataUrl(path.join(scratch, "jumysai-vacancies-mobile.png"));

function tx(value, opts = {}) {
  return text(value, {
    width: opts.width ?? fill,
    height: opts.height ?? hug,
    name: opts.name,
    columnSpan: opts.columnSpan,
    rowSpan: opts.rowSpan,
    style: {
      fontFace: opts.fontFace ?? font,
      fontSize: opts.size ?? 32,
      bold: opts.bold ?? false,
      color: opts.color ?? C.ink,
      lineHeight: opts.lineHeight ?? 1.12,
      ...opts.style,
    },
  });
}

function kicker(value, color = C.sea) {
  return tx(value, {
    name: "kicker",
    size: 19,
    bold: true,
    color,
    style: { charSpacing: 1.6 },
  });
}

function title(value, opts = {}) {
  return tx(value, {
    name: "slide-title",
    width: opts.width ?? fill,
    size: opts.size ?? 64,
    bold: true,
    color: opts.color ?? C.ink,
    fontFace: display,
    lineHeight: opts.lineHeight ?? 1.03,
  });
}

function body(value, opts = {}) {
  return tx(value, {
    name: opts.name,
    width: opts.width ?? fill,
    size: opts.size ?? 28,
    color: opts.color ?? C.muted,
    lineHeight: opts.lineHeight ?? 1.28,
  });
}

function pill(value, fillColor, textColor = C.ink) {
  return panel(
    {
      name: "pill",
      fill: fillColor,
      line: { fill: fillColor, width: 1 },
      borderRadius: "rounded-full",
      padding: { x: 18, y: 8 },
      width: hug,
      height: hug,
    },
    tx(value, { size: 18, bold: true, color: textColor, width: hug }),
  );
}

function mark(label, fillColor = C.sea, textColor = C.white) {
  return panel(
    {
      name: "mark",
      fill: fillColor,
      line: { fill: fillColor, width: 1 },
      borderRadius: "rounded-full",
      padding: { x: 0, y: 0 },
      width: fixed(58),
      height: fixed(58),
      align: "center",
      justify: "center",
    },
    tx(label, { size: 25, bold: true, color: textColor, width: hug }),
  );
}

function screenshotFrame(source, alt, opts = {}) {
  return panel(
    {
      name: opts.name ?? "screenshot-frame",
      fill: C.white,
      line: { fill: opts.line ?? "#FFFFFF", width: opts.lineWidth ?? 0 },
      borderRadius: opts.radius ?? "rounded-lg",
      padding: 0,
      width: opts.width ?? fill,
      height: opts.height ?? fill,
    },
    image({
      name: opts.imageName ?? "screenshot",
      dataUrl: source,
      contentType: "image/png",
      fit: opts.fit ?? "cover",
      width: fill,
      height: fill,
      alt,
    }),
  );
}

function stage(children, bg = C.paper) {
  const slide = presentation.slides.add();
  slide.background.fill = bg;
  slide.compose(
    layers({ name: "slide-root", width: fill, height: fill }, [
      shape({ name: "bg", fill: bg, line: { fill: bg, width: 0 }, width: fill, height: fill }),
      ...children,
    ]),
    { frame: { left: 0, top: 0, width: W, height: H }, baseUnit: 8 },
  );
  return slide;
}

function openTextSlide({ bg = C.paper, left = [], right = [], footer }) {
  return stage([
    grid(
      {
        name: "content-grid",
        width: fill,
        height: fill,
        columns: [fr(1.02), fr(0.98)],
        rows: [fr(1), auto],
        columnGap: 72,
        rowGap: 18,
        padding: { x: 92, y: 78 },
      },
      [
        column({ name: "left-stack", width: fill, height: fill, gap: 22, justify: "center" }, left),
        column({ name: "right-stack", width: fill, height: fill, gap: 24, justify: "center" }, right),
        footer
          ? tx(footer, {
              name: "source",
              columnSpan: 2,
              size: 13,
              color: "#7A756B",
              width: fill,
            })
          : shape({ width: fixed(1), height: fixed(1), fill: bg, line: { fill: bg, width: 0 }, columnSpan: 2 }),
      ],
    ),
  ], bg);
}

function statLine(number, label, accent) {
  return row({ name: "stat-line", width: fill, height: hug, align: "center", gap: 18 }, [
    tx(number, { size: 58, bold: true, color: accent, width: fixed(270), lineHeight: 0.95 }),
    body(label, { size: 24, color: C.ink }),
  ]);
}

function processStep(num, heading, copy, color) {
  return row({ width: fill, height: hug, gap: 18, align: "start" }, [
    mark(num, color),
    column({ width: fill, height: hug, gap: 7 }, [
      tx(heading, { size: 29, bold: true, color: C.ink }),
      body(copy, { size: 21, color: C.muted, lineHeight: 1.22 }),
    ]),
  ]);
}

function smallNode(label, detail, fillColor, textColor = C.ink) {
  return panel(
    {
      fill: fillColor,
      line: { fill: fillColor, width: 1 },
      borderRadius: "rounded-lg",
      padding: { x: 24, y: 18 },
      width: fill,
      height: fixed(132),
      justify: "center",
    },
    column({ width: fill, height: hug, gap: 8 }, [
      tx(label, { size: 26, bold: true, color: textColor }),
      tx(detail, { size: 17, color: textColor === C.white ? "#DFF7F8" : C.muted, lineHeight: 1.18 }),
    ]),
  );
}

function cover() {
  return stage(
    [
      grid(
        {
          name: "cover-grid",
          width: fill,
          height: fill,
          columns: [fr(0.95), fr(1.05)],
          columnGap: 56,
          padding: { x: 92, y: 76 },
        },
        [
          column({ width: fill, height: fill, justify: "center", gap: 28 }, [
            row({ width: fill, gap: 12, align: "center" }, [
              pill("АКТАУ / МАНГИСТАУ", C.sand),
              pill("AI + CONVEX + TELEGRAM", "#D7F4F1", C.seaDark),
            ]),
            tx("JumysAI", {
              name: "cover-brand",
              size: 112,
              bold: true,
              color: C.ink,
              fontFace: display,
              lineHeight: 0.94,
            }),
            tx("городской слой найма, который понимает людей обычными словами", {
              name: "cover-title",
              size: 51,
              bold: true,
              color: C.ink,
              lineHeight: 1.04,
              width: wrap(760),
            }),
            body("Проект превращает локальный поиск работы в объяснимый диалог: от вакансии рядом до отклика, интервью и уведомления в Telegram.", {
              size: 26,
              width: wrap(700),
              color: C.muted,
            }),
          ]),
          panel(
            {
              name: "cover-screenshot-mask",
              fill: C.white,
              line: { fill: "#FFFFFF", width: 0 },
              borderRadius: "rounded-lg",
              padding: 0,
              width: fill,
              height: fill,
            },
            image({
              name: "home-screenshot",
              dataUrl: homeScreenshot,
              contentType: "image/png",
              fit: "cover",
              width: fill,
              height: fill,
              alt: "Главная страница JumysAI",
            }),
          ),
        ],
      ),
    ],
    C.paper,
  );
}

function problem() {
  return stage([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(0.95), fr(1.05)],
        columnGap: 64,
        padding: { x: 88, y: 70 },
      },
      [
        column({ width: fill, height: fill, justify: "center", gap: 22 }, [
          kicker("ПРОБЛЕМА"),
          title("Люди ищут не “вакансию”.", { size: 64 }),
          title("Они ищут нормальный день.", { size: 58, color: C.coral }),
          body("Где рядом. Где понятная смена. Где не страшно откликнуться. JumysAI превращает этот бытовой контекст в понятный маршрут.", {
            size: 30,
            color: C.ink,
            width: wrap(720),
          }),
          row({ width: fill, gap: 12 }, [
            pill("район", "#D7F4F1", C.seaDark),
            pill("график", "#FFF0C7", C.ink),
            pill("доверие", "#DFF6E9", C.green),
          ]),
        ]),
        row({ width: fill, height: fill, gap: 24, align: "center", justify: "center" }, [
          screenshotFrame(mobileHomeScreenshot, "Мобильная главная JumysAI", {
            width: fixed(330),
            height: fixed(760),
            radius: "rounded-lg",
          }),
          screenshotFrame(mobileVacanciesScreenshot, "Мобильный каталог JumysAI", {
            width: fixed(330),
            height: fixed(760),
            radius: "rounded-lg",
          }),
        ]),
      ],
    ),
  ]);
}

function magic() {
  return openTextSlide({
    bg: "#F2FBFA",
    left: [
      kicker("МАГИЯ ПРОДУКТА"),
      title("Пользователь пишет как человек. Система отвечает как сервис.", { color: C.seaDark }),
      body("Это выглядит просто: фраза, подсказка, подходящие варианты, отклик. Но именно эта простота и производит впечатление на нетехническую аудиторию.", {
        size: 28,
        color: C.ink,
      }),
    ],
    right: [
      processStep("1", "Фраза", "“Хочу рядом, вечером, без опыта, с понятной оплатой.”", C.sea),
      processStep("2", "Критерии", "район, график, опыт, зарплата, источник вакансии", C.gold),
      processStep("3", "Совпадения", "векторный поиск + бизнес-правила Convex", C.lilac),
      processStep("4", "Действие", "отклик на native, внешний переход на HH, статус и Telegram", C.green),
    ],
    footer: "AI в JumysAI помогает искать и объяснять, но не принимает решение вместо работодателя.",
  });
}

function demo() {
  return stage([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(0.82), fr(1.18)],
        columnGap: 54,
        padding: { x: 82, y: 68 },
      },
      [
        column({ width: fill, height: fill, justify: "center", gap: 22 }, [
          kicker("ЖИВОЙ ПРОДУКТ"),
          title("Каталог уже выглядит как рабочий инструмент, а не макет.", { size: 58 }),
          body("Публичный пользователь видит вакансии сразу. В таблице уже есть локации, зарплаты, источник и ориентировочное совпадение.", {
            size: 27,
            color: C.ink,
          }),
          row({ width: fill, gap: 12, align: "center" }, [
            pill("50 вакансий в демо-выборке", "#FFF0C7", C.ink),
            pill("Актау и районы", "#D7F4F1", C.seaDark),
          ]),
        ]),
        panel(
          {
            fill: C.white,
            line: { fill: "#FFFFFF", width: 0 },
            borderRadius: "rounded-lg",
            padding: 0,
            width: fill,
            height: fixed(760),
          },
          image({
            name: "vacancies-screenshot",
            dataUrl: vacanciesScreenshot,
            contentType: "image/png",
            fit: "cover",
            width: fill,
            height: fill,
            alt: "Каталог вакансий JumysAI",
          }),
        ),
      ],
    ),
  ]);
}

function seekerJourney() {
  return stage([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(0.86), fr(1.14)],
        columnGap: 58,
        padding: { x: 84, y: 66 },
      },
      [
        column({ width: fill, height: fill, justify: "center", gap: 22 }, [
          kicker("ЧТО ВИДИТ СОИСКАТЕЛЬ", C.gold),
          title("Это не анкета. Это спокойный путь к отклику.", { color: C.white, size: 60 }),
          body("Сначала человек просто смотрит. Потом уточняет запрос с AI. Потом видит понятные карточки и кнопку действия. Интерфейс не давит, а ведет.", {
            color: "#D8DEE9",
            size: 27,
          }),
          row({ width: fill, gap: 12, align: "center" }, [
            pill("без входа можно смотреть", "#243044", C.white),
            pill("AI объясняет", C.sea, C.white),
          ]),
        ]),
        row({ width: fill, height: fill, gap: 26, align: "center", justify: "center" }, [
          screenshotFrame(mobileHomeScreenshot, "Мобильная главная JumysAI", {
            width: fixed(330),
            height: fixed(760),
          }),
          screenshotFrame(mobileVacanciesScreenshot, "Мобильные вакансии JumysAI", {
            width: fixed(330),
            height: fixed(760),
          }),
        ]),
      ],
    ),
  ], "#121826");
}

function employerJourney() {
  return stage([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(0.86), fr(1.14)],
        columnGap: 58,
        padding: { x: 84, y: 66 },
      },
      [
        column({ width: fill, height: fill, justify: "center", gap: 22 }, [
          kicker("ЧТО ВИДИТ РАБОТОДАТЕЛЬ", C.coral),
          title("Вакансия выглядит аккуратно, а решение остается человеческим.", { size: 58 }),
          body("На карточке сразу видно главное: источник, статус, зарплата, локация, действие и честная пометка, что AI-подсказка вспомогательная.", {
            size: 28,
            color: C.ink,
          }),
          row({ width: fill, gap: 12, align: "center" }, [
            pill("понятная карточка", "#FFF0C7", C.ink),
            pill("AI не решает за людей", "#D7F4F1", C.seaDark),
          ]),
        ]),
        screenshotFrame(detailScreenshot, "Детальная страница вакансии JumysAI", {
          height: fixed(760),
          fit: "contain",
        }),
      ],
    ),
  ], "#FFF8EA");
}

function oldSeekerJourney() {
  return openTextSlide({
    bg: "#121826",
    left: [
      kicker("СЦЕНАРИЙ СОИСКАТЕЛЯ", C.gold),
      title("Поиск работы становится разговором, который помнит контекст.", {
        color: C.white,
        size: 61,
      }),
      body("Открытый каталог снижает порог входа. AI-подбор делает запрос точнее. Профиль и история откликов превращают поиск в персональную ленту.", {
        color: "#D8DEE9",
        size: 27,
      }),
    ],
    right: [
      smallNode("Смотреть без входа", "вакансии, район, зарплата, источник", "#243044", C.white),
      smallNode("Спросить AI", "обычные слова вместо сложной формы", "#0B8D9A", C.white),
      smallNode("Откликнуться", "только на native-вакансии внутри JumysAI", "#F0B84A", C.ink),
      smallNode("Не потерять статус", "уведомления в приложении и Telegram", "#2F9E6D", C.white),
    ],
    footer: "Маршрут отражает web/src/App.tsx, PROJECT_SCOPE.md и публичную страницу продукта.",
  });
}

function oldEmployerJourney() {
  return openTextSlide({
    bg: "#FFF8EA",
    left: [
      kicker("СЦЕНАРИЙ РАБОТОДАТЕЛЯ", C.coral),
      title("Вакансия собирается из одного человеческого описания.", { size: 59 }),
      body("Работодатель не обязан начинать с идеального текста. AI помогает собрать черновик, вопросы скрининга и понятный путь просмотра откликов.", {
        size: 28,
        color: C.ink,
      }),
    ],
    right: [
      processStep("A", "Черновик вакансии", "должность, район, график, оплата и обязанности", C.coral),
      processStep("B", "Три вопроса", "скрининг под конкретную вакансию, который можно редактировать", C.gold),
      processStep("C", "AI-анализ", "оценка и резюме как подсказка, не как финальный вердикт", C.sea),
      processStep("D", "Воронка", "проверка, интервью, найм или отказ по строгой машине статусов", C.green),
    ],
    footer: "Серверные правила: convex/applications.ts, convex/vacancies.ts, convex/lib/domain.ts.",
  });
}

function architecture() {
  return stage([
    column({ width: fill, height: fill, padding: { x: 78, y: 58 }, gap: 26 }, [
      column({ width: fill, height: hug, gap: 12 }, [
        kicker("АРХИТЕКТУРА"),
        row({ width: fill, height: hug, align: "end", gap: 28 }, [
          title("Под красивым интерфейсом уже есть серьезная логика продукта.", { size: 48 }),
          pill("не просто макет", "#D7F4F1", C.seaDark),
        ]),
      ]),
      grid(
        {
          width: fill,
          height: grow(1),
          columns: [fr(0.9), fr(1.2), fr(0.9)],
          rows: [fr(1), fr(1), fr(1)],
          columnGap: 26,
          rowGap: 22,
        },
        [
          smallNode("Пользователи", "вход, роли, onboarding и разные сценарии для каждого", "#FFFFFF"),
          smallNode("Живые вакансии", "каталог, карточка, поиск, район, зарплата и источник", "#0B8D9A", C.white),
          smallNode("AI-помощник", "понимает запрос обычными словами и объясняет совпадения", "#FFFFFF"),
          smallNode("Работодатель", "черновик вакансии, отклики, вопросы и интервью", "#FFFFFF"),
          smallNode("Правила найма", "кто может редактировать, где можно откликнуться, какие статусы допустимы", "#111827", C.white),
          smallNode("HH.kz", "вакансии для поиска, но отклик только по внешней ссылке", "#FFFFFF"),
          smallNode("Telegram", "статусы и уведомления приходят туда, где человек уже отвечает", "#FFFFFF"),
          smallNode("Надежность", "события не теряются, повторные уведомления не спамят", "#2F9E6D", C.white),
          smallNode("Админка", "операционная поддержка и обзор ключевых сущностей", "#FFFFFF"),
        ],
      ),
    ]),
  ]);
}

function trust() {
  return openTextSlide({
    bg: "#F6F7FB",
    left: [
      kicker("ДОВЕРИЕ"),
      title("Самое интересное: система умная, но с тормозами.", { size: 62 }),
      body("JumysAI не пытается заменить рынок труда автопилотом. Он делает путь видимым, а критические решения оставляет людям и backend-правилам.", {
        size: 29,
        color: C.ink,
      }),
    ],
    right: [
      statLine("AI", "только подсказка для скрининга и сопоставления", C.lilac),
      statLine("JumysAI", "можно откликнуться внутри продукта", C.green),
      statLine("HH", "только поиск и внешний URL для отклика", C.coral),
      statLine("сервер", "роль, владелец и статус проверяются в Convex", C.sea),
    ],
    footer: "Правила взяты из PROJECT_SCOPE.md, docs/jumysai-technical-scope.md и Convex modules.",
  });
}

function finale() {
  return stage([
    grid(
      {
        width: fill,
        height: fill,
        columns: [fr(1.1), fr(0.9)],
        columnGap: 58,
        padding: { x: 86, y: 72 },
      },
      [
        column({ width: fill, height: fill, justify: "center", gap: 26 }, [
          kicker("ПОЧЕМУ ЭТО ЗАПОМИНАЕТСЯ", C.gold),
          title("JumysAI ощущается не как еще одна доска вакансий.", { color: C.white, size: 68 }),
          title("Он ощущается как локальная инфраструктура найма.", { color: C.gold, size: 55 }),
          body("У проекта есть редкая комбинация: реальный город, реальные ограничения, AI-диалог, строгий backend, Telegram-канал и ясная граница между подсказкой и решением.", {
            color: "#E8EDF7",
            size: 28,
            width: wrap(840),
          }),
        ]),
        column({ width: fill, height: fill, justify: "center", gap: 18 }, [
          smallNode("Город", "Актау и Мангистау как конкретный рынок, а не абстрактная аудитория", "#FFFFFF"),
          smallNode("Контекст", "район, график, опыт, зарплата и источник вакансии", "#D7F4F1"),
          smallNode("Доказательство", "работающий web UI, Convex backend, bot HTTP contract, тесты", "#FFF0C7"),
          smallNode("Следующий шаг", "демо: AI-поиск, native apply, employer review, Telegram status", "#2F9E6D", C.white),
        ]),
      ],
    ),
  ], "#121826");
}

cover();
problem();
magic();
demo();
seekerJourney();
employerJourney();
architecture();
trust();
finale();

await fs.mkdir(output, { recursive: true });
await fs.mkdir(path.join(scratch, "renders"), { recursive: true });

const pptxBlob = await PresentationFile.exportPptx(presentation);
await pptxBlob.save(path.join(output, "output.pptx"));

async function renderPresentation(deck, dir) {
  await fs.mkdir(dir, { recursive: true });
  const files = [];
  for (let i = 0; i < deck.slides.items.length; i += 1) {
    const slide = deck.slides.items[i];
    const canvas = new Canvas(W, H);
    const ctx = canvas.getContext("2d");
    await drawSlideToCtx(slide, deck, ctx);
    const buffer = await canvas.toBuffer("png");
    const file = path.join(dir, `slide-${String(i + 1).padStart(2, "0")}.png`);
    await fs.writeFile(file, buffer);
    files.push(file);
  }
  return files;
}

const renderFiles = await renderPresentation(presentation, path.join(scratch, "renders"));
await fs.writeFile(
  path.join(scratch, "build-summary.json"),
  JSON.stringify(
    {
      slideCount: presentation.slides.items.length,
      pptx: path.join(output, "output.pptx"),
      renders: renderFiles,
      screenshots: [
        path.join(scratch, "jumysai-home-full.png"),
        path.join(scratch, "jumysai-vacancies.png"),
        path.join(scratch, "jumysai-login.png"),
      ],
    },
    null,
    2,
  ),
);

console.log(JSON.stringify({ pptx: path.join(output, "output.pptx"), renders: renderFiles }, null, 2));
