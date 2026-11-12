export type KnowledgeSource = { title: string; url: string };
export type KnowledgeArticle = KnowledgeSource & { aliases: string[]; summary: string };

export const WEBSITE_KNOWLEDGE: KnowledgeArticle[] = [
  {
    title: "HealthBuddy overview",
    url: "/",
    aliases: ["website", "features", "help", "healthbuddy", "ail"],
    summary:
      "HealthBuddy (AIL Health Advisor) offers a guided symptom checker, AI health chat, medical report explanations, a medicine and symptom explorer, and nearby hospital discovery. It provides educational information, not diagnosis, prescriptions, emergency response, or a substitute for a clinician. The homepage shows a dashboard for signed-in users and an introduction for visitors. The floating helper works without signing in.",
  },
  {
    title: "Sign in and account",
    url: "/sign-in",
    aliases: ["login", "log in", "register", "account", "password", "sign up"],
    summary:
      "Use /sign-in to sign in or /sign-up to create an account using Clerk's on-screen flow. The full AI Assistant, symptom checks, report explainer, and Explorer require signing in. Use the account menu to manage your account or sign out. Never share passwords, verification codes, API keys, or payment details in chat. For password recovery use the sign-in flow's recovery option when available. The helper cannot reset passwords or access account settings for you.",
  },
  {
    title: "Symptom Check",
    url: "/analyze",
    aliases: ["symptom", "symptoms", "analyze", "sick", "assessment"],
    summary:
      "Sign in and open Symptom Check at /analyze. Describe your symptoms, answer the follow-up checklist, and submit for a structured summary of possible concerns, self-care, diet, exercise, and urgency. Results are educational and saved to your account when storage succeeds. Urgent symptoms need immediate medical attention; do not wait for an AI analysis. Results can include Find Nearby Hospitals, Email me this, and Download as PDF.",
  },
  {
    title: "AI Assistant",
    url: "/chat",
    aliases: ["chat", "assistant", "conversation", "history"],
    summary:
      "The AI Assistant at /chat supports longer questions and follow-ups about health, diet, recovery, medical terminology, and HealthBuddy. The floating helper is available across the website for visitors too. Signed-in conversations can be saved to your account. This chat sees the messages you share here; it does not automatically read your medical records, uploaded documents, dashboard, location, or previous symptom analyses. Paste the relevant information or use the report explainer.",
  },
  {
    title: "Medical report explainer",
    url: "/documents",
    aliases: ["report", "reports", "upload", "pdf", "blood", "document", "scan", "prescription"],
    summary:
      "Open /documents, add a title, then paste report text or upload a PDF, image, or .txt file (maximum 12 MB). Select analyze to explain findings, values to discuss, and questions for a clinician. If pasting text, provide at least 10 characters. The explainer can identify medicine mentions and suggest relevant hospital specialties. A medicine match provides external search links; unverified names are labeled. Interpret lab values with units, the lab's reference range, symptoms, and clinician advice; chat alone cannot diagnose from a number.",
  },
  {
    title: "Dashboard and saved activity",
    url: "/dashboard",
    aliases: ["dashboard", "saved", "recent", "profile", "results"],
    summary:
      "Your dashboard at /dashboard and the signed-in homepage summarize recent symptom checks, reports, profile information, and helper conversations. Sign in with the same account to see saved activity. If saving or history is unavailable, answers may still work; retry later. The assistant cannot claim a result was saved unless the application confirms storage succeeded.",
  },
  {
    title: "Medicines and symptoms explorer",
    url: "/explore",
    aliases: ["medicine", "medication", "drug", "explore", "pharmacy", "buy", "tablet"],
    summary:
      "Open /explore to search the site's medicine reference, browse popular medicines, or browse by symptom. Medicine detail pages provide reference information and external Buy Online / Pharmacy Near Me search links where available. HealthBuddy does not sell medicines, process payments, verify live stock, prescribe, or guarantee a product is appropriate for you. Discuss interactions, side effects, pregnancy, child dosing, and treatment changes with a pharmacist or clinician. A database match is not a prescription.",
  },
  {
    title: "Find nearby hospitals",
    url: "/explore/hospitals",
    aliases: ["hospital", "hospitals", "nearby", "location", "map", "doctor", "directions"],
    summary:
      "Open /explore/hospitals. Enter symptoms or a specialty and a location, or allow location access. Results can be ranked by specialty, distance, and available provider data and displayed on an OpenStreetMap map. Get Directions opens external directions. Live results depend on the configured search provider; an empty or not-configured result does not mean no hospitals exist. The assistant cannot access live availability or book appointments. For an emergency, contact local emergency services immediately instead of waiting for rankings.",
  },
  {
    title: "Email reminders and PDF downloads",
    url: "/analyze",
    aliases: ["email", "reminder", "download", "print", "pdf", "daily"],
    summary:
      "After a symptom analysis, Email me this requests an email with that guidance. Download as PDF uses your browser's print dialog: choose Save as PDF. Daily reminders depend on the deployment's email settings and scheduler; the configured schedule is 5:30 AM India time. An enabled setting does not guarantee delivery. Check your inbox and spam folder. The helper cannot send an email or change reminder preferences itself.",
  },
  {
    title: "Privacy and limitations",
    url: "/",
    aliases: ["privacy", "data", "secure", "delete", "medical records", "emergency"],
    summary:
      "Messages are processed by the configured AI provider to produce replies. Signed-in chats may be stored in the app database with account-scoped access. Share only information needed for the question; avoid identity documents and unnecessary personal details. The helper cannot access other users' data, delete an account, read private records, or perform actions on your behalf. No claim of HIPAA compliance, guaranteed privacy, medical accuracy, or emergency monitoring is made.",
  },
];

const STOP = new Set(
  "a an the is are was were i me my you your it its we our to of for in on and or with can could would should do does did have has how what why when where please tell about help some this that from as be get want need all website healthbuddy general information educational explain give topic question".split(
    " ",
  ),
);

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((t) => t.length > 1 && !STOP.has(t));
}

/** BM25-style retrieval: rare terms and titles outrank incidental body matches. */
export function createKnowledgeSearch(articles: KnowledgeArticle[]) {
  const entries = articles.map((article) => {
    const title = new Set(tokens([article.title, ...article.aliases].join(" ")));
    const words = tokens(article.summary);
    const counts = new Map<string, number>();
    for (const word of words) counts.set(word, (counts.get(word) ?? 0) + 1);
    return { article, title, counts, length: words.length };
  });
  const frequency = new Map<string, number>();
  for (const entry of entries) {
    for (const word of new Set([...entry.title, ...entry.counts.keys()])) {
      frequency.set(word, (frequency.get(word) ?? 0) + 1);
    }
  }
  const average =
    entries.reduce((sum, entry) => sum + entry.length, 0) / Math.max(1, entries.length);
  return (query: string, limit = 4): KnowledgeArticle[] => {
    const terms = [...new Set(tokens(query))];
    if (!terms.length) return [];
    return entries
      .map((entry) => {
        let score = 0;
        for (const term of terms) {
          const tf = entry.counts.get(term) ?? 0;
          const idf = Math.log(
            1 +
              (entries.length - (frequency.get(term) ?? 0) + 0.5) /
                ((frequency.get(term) ?? 0) + 0.5),
          );
          score +=
            idf *
            ((entry.title.has(term) ? 5 : 0) +
              (tf * 2.2) / (tf + 1.2 * (0.25 + (0.75 * entry.length) / (average || 1))));
        }
        return { article: entry.article, score };
      })
      .filter((entry) => entry.score > 2)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.article);
  };
}
