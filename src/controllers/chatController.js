const { GoogleGenAI } = require("@google/genai");
const pool = require("../config/database");
const SITE_CONFIG = require("../config/siteConfig");

const SYSTEM_PROMPT = `You are Sterling, an elite equestrian advisor and luxury sales consultant for Saddles Market — a premium horse saddle retailer based in Lexington, Kentucky.

ABOUT SADDLES MARKET:
- Expert-curated selection of Western, English, Dressage, Jumping, Trail, Barrel Racing, and Youth saddles
- Every saddle hand-vetted by working equestrians — quality over quantity
- Address: 4001 Wing Commander Way, Lexington, KY 40511, USA
- Website: saddlesmarket.com

POLICIES YOU MUST KNOW (never guess or make up alternatives):
- 30-Day Free Trial on every saddle — ride it, if it's not perfect, return it for a full refund, no questions asked
- Free standard shipping on orders over $2,000
- Standard shipping: 3–5 business days at $49
- Express shipping: 1–3 business days at $99
- All shipments fully insured and tracked end-to-end
- No restocking fees — ever
- Phone/WhatsApp: +1 (914) 432-9936 | Support: support@saddlesmarket.com

YOUR MISSION:
- Convert every visitor into a confident buyer
- Help customers find their perfect saddle — ask about discipline, rider experience, budget, and horse if needed
- Reference ONLY products listed in [AVAILABLE PRODUCTS] below — never fabricate stock, prices, or availability
- If the exact requested product is unavailable, acknowledge it warmly and pivot to the best available alternatives
- Always close with a clear, natural call to action (invite them to view a product, try a saddle, or ask more questions)

TONE: Warm, expert, confident. You're a trusted advisor — not a pushy salesperson.

STRICT RULES:
- Keep responses under 160 words
- No markdown headers or bullet walls — write in short, natural paragraphs
- When referencing products from the list, mention their name and price naturally in the text
- When products are displayed as cards below your message, reference them with "tap the card to explore" or similar
- When suggesting site pages, always format them as clickable markdown links like [Browse Products](/products) or [Contact Support](/contact), and if it helps, the frontend domain name is saddlesmarket.com
- If no products match, ask a clarifying question or recommend they browse the full collection at /products`;

function extractKeywords(message) {
  const stopWords = new Set([
    "do",
    "you",
    "have",
    "any",
    "the",
    "and",
    "for",
    "are",
    "can",
    "tell",
    "me",
    "about",
    "what",
    "how",
    "much",
    "does",
    "cost",
    "price",
    "is",
    "there",
    "that",
    "this",
    "your",
    "our",
    "which",
    "would",
    "could",
    "should",
    "want",
    "need",
    "looking",
    "show",
    "like",
    "find",
    "get",
    "will",
    "with",
    "from",
    "also",
    "some",
    "all",
    "its",
    "been",
    "has",
  ]);

  return message
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
    .slice(0, 6);
}

async function searchProducts(message) {
  const keywords = extractKeywords(message);
  if (keywords.length === 0) return [];

  const conditions = keywords.map(
    (_, i) =>
      `(p.name ILIKE $${i + 1} OR p.brand ILIKE $${i + 1} OR p.short_description ILIKE $${i + 1} OR p.discipline::text ILIKE $${i + 1} OR c.name ILIKE $${i + 1})`,
  );
  const values = keywords.map((k) => `%${k}%`);

  try {
    const result = await pool.query(
      `SELECT
         p.id, p.name, p.slug, p.price, p.compare_price,
         p.discipline, p.condition, p.short_description,
         p.stock_quantity, p.average_rating, p.brand,
         (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id AND pi.is_primary = TRUE LIMIT 1) AS image_url,
         c.name AS category_name
       FROM products p
       LEFT JOIN categories c ON p.category_id = c.id
       WHERE p.is_active = TRUE
         AND p.stock_quantity > 0
         AND (${conditions.join(" OR ")})
       ORDER BY p.is_featured DESC NULLS LAST, p.average_rating DESC NULLS LAST, p.sold_count DESC NULLS LAST
       LIMIT 4`,
      values,
    );
    return result.rows;
  } catch (err) {
    console.error("Database product search error:", err.message);
    return [];
  }
}

const chat = async (req, res, next) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string" || !message.trim()) {
      return res
        .status(400)
        .json({ success: false, message: "Message is required." });
    }
    if (message.length > 500) {
      return res
        .status(400)
        .json({ success: false, message: "Message too long." });
    }
    if (!Array.isArray(history)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid history format." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res
        .status(503)
        .json({ success: false, message: "AI service not configured." });
    }

    let products = [];
    try {
      products = await searchProducts(message.trim());
    } catch {
      products = [];
    }

    const productContext =
      products.length > 0
        ? "\n\n[AVAILABLE PRODUCTS]\n" +
          products
            .map(
              (p) =>
                `• ${p.name}${p.brand ? ` by ${p.brand}` : ""} — $${parseFloat(p.price).toFixed(2)}` +
                `${p.compare_price ? ` (was $${parseFloat(p.compare_price).toFixed(2)})` : ""}` +
                ` | ${p.discipline ? p.discipline.replace("_", " ") : "all disciplines"}` +
                ` | Condition: ${p.condition || "new"}` +
                ` | Rating: ${p.average_rating || "N/A"}/5`,
            )
            .join("\n")
        : "\n\n[AVAILABLE PRODUCTS] No exact matches found for this query. Respond helpfully — ask a clarifying question or invite them to browse /products.";

    // Initialize new SDK client
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

    // Format conversation history for new SDK
    const contents = history
      .filter((m) => m.role && m.content && typeof m.content === "string")
      .slice(-10)
      .map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content.slice(0, 1000) }],
      }));

    // Add current user prompt
    contents.push({
      role: "user",
      parts: [{ text: message.trim() }],
    });

    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents,
      config: {
        systemInstruction: SYSTEM_PROMPT + productContext,
        // maxOutputTokens: 300,
        temperature: 0.7,
        topP: 0.9,
      },
    });

    return res.json({
      success: true,
      reply: response.text,
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: parseFloat(p.price),
        compare_price: p.compare_price ? parseFloat(p.compare_price) : null,
        discipline: p.discipline,
        condition: p.condition,
        image_url: p.image_url || null,
        brand: p.brand || null,
      })),
    });
  } catch (err) {
    console.error("Gemini API execution error:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to generate AI response. Please try again.",
    });
  }
};

module.exports = { chat };
