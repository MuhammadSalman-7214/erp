const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";
const LOG_PREFIX = "[aiService]";

const SYSTEM_PROMPT = `
You are a Senior Business Intelligence Consultant.

You are analyzing ERP statistics for a company.

Your responsibility is to provide concise, professional, and data-driven business insights.

Rules:

- Never invent numbers.
- Never assume missing information.
- Base every recommendation strictly on the provided statistics.
- Use exact product names, customer names, and values from the statistics whenever possible.
- Never include internal IDs, UUIDs, SKU codes, or product codes in the output. Mention product names only.
- Keep recommendations practical and specific.
- Explain how to improve sales for low selling products with concrete actions.
- Mention the weakest products by name when low selling products are present.
- Suggest actionable tactics such as bundling, targeted discounts, placement changes, cross-selling, or sales focus.
- Do not recommend restocking a product with zero sales and zero stock as if demand is proven.
- For products with zero sales, recommend reviewing listing, pricing, visibility, supplier setup, or removing inactive stock.
- Avoid generic advice like "improve marketing" unless you specify how.
- Write professionally.
- Maximum 6 recommendations.
- Maximum 25 words each.
- Include the total product amount/value when relevant.
- Mention the total number of products when it is relevant to the insight.
- Mention total inventory value when it helps the analysis.
- If low selling products exist, recommend specific actions for those products such as bundling, targeted discounts, placement changes, or sales focus.

Return JSON only.

Format:

{
  "summary": "...",
  "recommendations": [
    "...",
    "...",
    "...",
    "...",
    "...",
    "..."
  ]
}
`.trim();

const normalizeRecommendations = (recommendations = []) =>
  recommendations
    .filter(Boolean)
    .map((item) => String(item).trim().split(/\s+/).slice(0, 25).join(" "))
    .slice(0, 6);

const normalizeCurrencySymbols = (text) =>
  String(text || "")
    .replace(/\$\s*/g, "Rs ")
    .replace(/\bUSD\s*/gi, "Rs ")
    .replace(/\bUS\$\s*/gi, "Rs ")
    .replace(/\s{2,}/g, " ")
    .trim();

const formatProductName = (product) => {
  if (!product) return "Unknown Product";

  return String(product.name || product.productName || "Unknown Product").trim();
};

const pickLowSellingProducts = (stats = {}, limit = 3) => {
  const sources = [
    ...(Array.isArray(stats?.lowestSellingProducts)
      ? stats.lowestSellingProducts.filter(
          (product) => Number(product?.quantitySold || 0) > 0,
        )
      : []),
  ];

  const seen = new Set();
  const selected = [];

  for (const product of sources) {
    const key = String(product?.productId || product?.id || formatProductName(product));
    if (!key || seen.has(key)) continue;
    seen.add(key);
    selected.push(product);
    if (selected.length >= limit) break;
  }

  return selected;
};

const pickNeverSoldProducts = (stats = {}, limit = 3) => {
  const sources = Array.isArray(stats?.productsNeverSold)
    ? stats.productsNeverSold
    : [];

  return sources.slice(0, limit);
};

const stripIdentifiers = (text) =>
  String(text || "")
    .replace(
      /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi,
      "",
    )
    .replace(/\bSKU[:#]?\s*[\w-]+\b/gi, "")
    .replace(/\bID[:#]?\s*[\w-]+\b/gi, "")
    .replace(/\s+\(\s*\)\s*/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

const isNeverSoldRestockSuggestion = (recommendation, neverSoldProducts) => {
  const text = String(recommendation || "").toLowerCase();
  const hasRestockLanguage = /restock|restocking|replenish|stock up|meet potential demand|meet demand/i.test(
    text,
  );

  if (!hasRestockLanguage) {
    return false;
  }

  return neverSoldProducts.some((product) => {
    const name = formatProductName(product).toLowerCase();
    return name && text.includes(name);
  });
};

const buildNeverSoldReplacement = (product) =>
  `Do not restock ${formatProductName(product)} yet; review pricing, listing quality, and visibility first because there is no sales history.`;

const sanitizeRecommendations = (stats, recommendations = []) => {
  const neverSoldProducts = pickNeverSoldProducts(stats, 3);

  return recommendations.map((recommendation, index) => {
    const cleanedRecommendation = stripIdentifiers(recommendation);

    if (
      neverSoldProducts.length > 0 &&
      isNeverSoldRestockSuggestion(cleanedRecommendation, neverSoldProducts)
    ) {
      const product =
        neverSoldProducts[index % neverSoldProducts.length] || neverSoldProducts[0];
      return buildNeverSoldReplacement(product);
    }

    return cleanedRecommendation;
  });
};

const buildFallbackAnalysis = (stats) => {
  const bestProduct =
    stats?.overallBestSellingProduct?.name || "No sales recorded";
  const revenue = Number(stats?.totalRevenue || 0).toLocaleString();
  const orders = Number(stats?.totalOrders || 0).toLocaleString();
  const totalProducts = Number(stats?.totalProducts || 0).toLocaleString();
  const inventoryValue = Number(
    stats?.totalProductsAmount || stats?.totalInventoryValue || 0,
  ).toLocaleString();
  const lowSellingProducts = pickLowSellingProducts(stats, 3);
  const neverSoldProducts = pickNeverSoldProducts(stats, 2);

  return {
    summary: normalizeCurrencySymbols(
      `All-time revenue is Rs ${revenue} across ${orders} orders. The company has ${totalProducts} products with total product value of Rs ${inventoryValue}. The strongest product is ${bestProduct}.`,
    ),
    recommendations: normalizeRecommendations([
      `Prioritize inventory for ${bestProduct} to protect proven demand.`,
      lowSellingProducts[0]
        ? `Promote ${formatProductName(lowSellingProducts[0])} with a bundle, targeted discount, and better shelf placement to lift sales.`
        : "Review the lowest selling products and reduce exposure on slow-moving stock.",
      lowSellingProducts[1]
        ? `Use staff upselling, product-page visibility, and cross-sell pairing for ${formatProductName(lowSellingProducts[1])} to improve conversion.`
        : "Use staff upselling, better visibility, and cross-selling for slow-moving products to improve conversion.",
      lowSellingProducts[2]
        ? `Test a limited-time offer for ${formatProductName(lowSellingProducts[2])} and track weekly quantity sold for 30 days.`
        : "Test a limited-time offer on slow-moving items and track weekly quantity sold for 30 days.",
      neverSoldProducts[0]
        ? `Do not restock ${formatProductName(neverSoldProducts[0])} yet; review pricing, listing quality, and placement first because no sales history exists.`
        : "Do not restock never-sold items until pricing, listing quality, and placement are reviewed.",
      "Use the highest spending customer profile for targeted retention offers.",
      neverSoldProducts[1]
        ? `If ${formatProductName(neverSoldProducts[1])} stays unsold after review, consider delisting or reclassifying it.`
        : "If never-sold items stay inactive after review, consider delisting or reclassifying them.",
    ]),
  };
};

const logStatsSnapshot = (statistics) => {
  const topProduct = statistics?.overallBestSellingProduct?.name || "n/a";
  const revenue = Number(statistics?.totalRevenue || 0).toLocaleString();
  const orders = Number(statistics?.totalOrders || 0).toLocaleString();

  // console.info(
  //   `${LOG_PREFIX} Preparing AI analysis`,
  //   JSON.stringify({
  //     model: DEFAULT_MODEL,
  //     revenue,
  //     orders,
  //     topProduct,
  //     top10Count: Array.isArray(statistics?.top10SellingProducts)
  //       ? statistics.top10SellingProducts.length
  //       : 0,
  //     lowStockCount: Array.isArray(statistics?.lowStockProducts)
  //       ? statistics.lowStockProducts.length
  //       : 0,
  //   }),
  // );
};

const stripCodeFences = (value) =>
  String(value || "")
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

const parseAnalysisPayload = (statistics, content) => {
  const cleaned = stripCodeFences(content);

  const tryParse = (text) => {
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  };

  let parsed = tryParse(cleaned);
  if (!parsed) {
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      parsed = tryParse(cleaned.slice(firstBrace, lastBrace + 1));
    }
  }

  if (!parsed || typeof parsed !== "object") {
    throw new Error("OpenAI returned an invalid analysis payload");
  }

  const summary = normalizeCurrencySymbols(parsed.summary);
  const recommendations = normalizeRecommendations(
    sanitizeRecommendations(statistics, parsed.recommendations || []),
  );

  if (!summary) {
    throw new Error("OpenAI response did not include a summary");
  }

  return {
    summary,
    recommendations,
  };
};

const requestBusinessAnalysis = async (statistics) => {
  const apiKey = process.env.OPENAI_API_KEY;

  logStatsSnapshot(statistics);

  if (!apiKey) {
    console.warn(
      `${LOG_PREFIX} OPENAI_API_KEY is missing. Using fallback analysis.`,
    );
    throw new Error("OPENAI_API_KEY is not configured");
  }

  // console.info(`${LOG_PREFIX} Sending request to OpenAI`, {
  //   model: DEFAULT_MODEL,
  //   endpoint: OPENAI_ENDPOINT,
  // });

  const response = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT,
        },
        {
          role: "user",
          content: `Statistics:\n${JSON.stringify(statistics, null, 2)}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`${LOG_PREFIX} OpenAI request failed`, {
      status: response.status,
      statusText: response.statusText,
      errorSnippet: errorText.slice(0, 500),
    });
    throw new Error(
      `OpenAI request failed with ${response.status}: ${errorText.slice(0, 500)}`,
    );
  }

  const payload = await response.json();
  const content = payload?.choices?.[0]?.message?.content;

  if (!content) {
    console.error(`${LOG_PREFIX} OpenAI returned an empty completion payload`, {
      payloadKeys: Object.keys(payload || {}),
    });
    throw new Error("OpenAI returned an empty response");
  }

  const parsed = parseAnalysisPayload(statistics, content);

  // console.info(`${LOG_PREFIX} OpenAI analysis completed successfully`, {
  //   summaryLength: parsed.summary.length,
  //   recommendationsCount: parsed.recommendations.length,
  // });

  return parsed;
};

const generateBusinessAnalysis = async (statistics) => {
  try {
    return await requestBusinessAnalysis(statistics);
  } catch (error) {
    console.error(`${LOG_PREFIX} Falling back to deterministic analysis`, {
      reason: error.message,
    });
    return buildFallbackAnalysis(statistics);
  }
};

module.exports = {
  generateBusinessAnalysis,
  buildFallbackAnalysis,
};
