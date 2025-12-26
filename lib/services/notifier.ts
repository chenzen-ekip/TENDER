/**
 * Notifier Service
 * Handles Telegram and Email alerts.
 */

export async function sendTelegramAlert(message: string) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID;

    if (!botToken || !chatId) {
        console.warn("⚠️ [Notifier] Telegram credentials missing. Skipping alert.");
        return;
    }

    try {
        const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: message,
                parse_mode: 'Markdown'
            })
        });

        if (!response.ok) {
            console.error(`❌ [Notifier] Telegram API error: ${response.status}`);
        }
    } catch (error) {
        console.error("❌ [Notifier] Telegram alert failed:", error);
    }
}

/**
 * Placeholder for Email Service
 * In a real app, use Resend, SendGrid, or nodemailer.
 */
export async function sendClientEmailAlert(clientEmail: string, tenderTitle: string, analysis: string, matchScore: number, tenderId: string, clientId: string) {
    console.log(`📧 [Notifier] Mock Email sent to ${clientEmail} for Tender: ${tenderTitle}`);

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.TENDER_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
    const goLink = `${baseUrl}/api/tender/go?clientId=${clientId}&tenderId=${tenderId}`;

    console.log(`🔗 [Notifier] Invitation Link: ${goLink}`);

    // Logic for sending actual email goes here
    // Example with Resend (if installed):
    // await resend.emails.send({ ... });
}
