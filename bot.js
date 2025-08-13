import { Telegraf } from "telegraf";

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) throw new Error("BOT_TOKEN is required");

// Можно несколько чатов через запятую: 123456789,-1001234567890
const ADMIN_CHAT_IDS = (process.env.ADMIN_CHAT_IDS || "")
  .split(",").map(s => s.trim()).filter(Boolean);

const bot = new Telegraf(BOT_TOKEN, { handlerTimeout: 9000 });

// /id — быстро узнать chat_id (работает и в группах)
bot.command("id", (ctx) => ctx.reply(`chat_id: ${ctx.chat.id}`));

bot.start((ctx) =>
  ctx.reply("Бот запущен. Открой мини-апп через кнопку бота и отправь заявку.")
);

// Ловим данные из WebApp
bot.on("message", async (ctx) => {
  const data = ctx.message?.web_app_data?.data;
  if (!data) return;

  let p; try { p = JSON.parse(data); } catch (e) { return; }

  const text = formatLead(p, ctx.from);

  // Шлём админам/в группу
  if (ADMIN_CHAT_IDS.length) {
    try {
      await Promise.all(
        ADMIN_CHAT_IDS.map(chatId =>
          ctx.telegram.sendMessage(chatId, text, {
            parse_mode: "HTML",
            disable_web_page_preview: true
          })
        )
      );
    } catch (e) {
      console.error("sendMessage error:", e.response?.description || e.message);
    }
  }

  // Ответ пользователю
  await ctx.reply("✅ Заявка принята, скоро свяжемся!");
});

function esc(s=""){ return String(s).replace(/[&<>]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;'}[c])); }
function formatLead(p, from){
  return [
    `<b>Новая заявка</b>`,
    `Категория: <b>${esc(p.category)}</b>`,
    `Марка/модель: <b>${esc(p.brand)} ${esc(p.model)}</b>`,
    p.service ? `Услуга: <b>${esc(p.service)}</b>` : null,
    p.price_from ? `От: <b>${p.price_from} ₽</b>` : null,
    `Имя: <b>${esc(p.name)}</b>`,
    `Телефон: <b>${esc(p.phone)}</b>`,
    p.city ? `Город: <b>${esc(p.city)}</b>` : null,
    p.comment ? `Комментарий: ${esc(p.comment)}` : null,
    ``,
    `От: <a href="tg://user?id=${from.id}">${esc(from.username ? '@'+from.username : from.first_name || 'user')}</a>`,
    `Время: ${new Date(p.ts || Date.now()).toLocaleString("ru-RU")}`
  ].filter(Boolean).join('\n');
}

bot.launch().then(()=>console.log("Bot launched"));
process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
