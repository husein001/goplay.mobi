/**
 * SMS-провайдер. Интерфейс намеренно простой — подставьте своего провайдера
 * (для Таджикистана это обычно OSON SMS / smsc.tj / Babilon, либо Twilio/Vonage
 * для международного покрытия).
 *
 * Выбор провайдера и креды задаются через env:
 *   SMS_PROVIDER = console | oson | twilio
 *   SMS_SENDER   = "Goplay"
 *   OSON_API_URL, OSON_LOGIN, OSON_HASH   (пример для OSON SMS)
 *   TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM (пример для Twilio)
 */

export interface SmsSender {
  send(phone: string, text: string): Promise<void>;
}

/** Dev-режим: код просто печатается в лог, реальная SMS не уходит. */
class ConsoleSms implements SmsSender {
  async send(phone: string, text: string): Promise<void> {
    console.log(`[SMS:console] -> ${phone}: ${text}`);
  }
}

/** Пример интеграции с OSON SMS (oson.tj). Уточните формат запроса в их доке. */
class OsonSms implements SmsSender {
  async send(phone: string, text: string): Promise<void> {
    const url = process.env.OSON_API_URL!;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        login: process.env.OSON_LOGIN,
        hash: process.env.OSON_HASH,
        sender: process.env.SMS_SENDER || 'Goplay',
        phone_number: phone,
        msg: text,
      }),
    });
    if (!res.ok) throw new Error(`OSON SMS failed: ${res.status}`);
  }
}

/** Пример интеграции с Twilio. */
class TwilioSms implements SmsSender {
  async send(phone: string, text: string): Promise<void> {
    const sid = process.env.TWILIO_SID!;
    const token = process.env.TWILIO_TOKEN!;
    const from = process.env.TWILIO_FROM!;
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: phone, From: from, Body: text }).toString(),
    });
    if (!res.ok) throw new Error(`Twilio SMS failed: ${res.status}`);
  }
}

export function getSmsSender(): SmsSender {
  switch ((process.env.SMS_PROVIDER || 'console').toLowerCase()) {
    case 'oson':
      return new OsonSms();
    case 'twilio':
      return new TwilioSms();
    default:
      return new ConsoleSms();
  }
}
