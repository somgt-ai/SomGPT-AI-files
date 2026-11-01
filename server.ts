import express from "express";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import {
  initDatabase,
  createUser,
  authenticateUser,
  getUserByToken,
  logoutUser,
  initiatePasswordReset,
  completePasswordReset,
  touchUserActivity,
  getUserConversations,
  saveUserConversation,
  deleteUserConversation,
  syncUserConversations,
  createComplaint,
  getUserComplaints,
  getAllComplaints,
  replyToComplaint,
  updateComplaintStatus,
  logActivity,
  logSystemError,
  listAllUsers,
  updateUserRole,
  updateUserStatus,
  getDashboardStats,
  getSystemErrors,
  clearSystemErrors,
} from "./server-db.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "30mb" }));
app.use(express.urlencoded({ extended: true, limit: "30mb" }));

// Helper to extract bearer token
function getBearerToken(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7).trim();
  }
  return null;
}

// Optional Auth Middleware - attaches req.user if valid token provided
function optionalAuth(req: express.Request, _res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (token) {
    const user = getUserByToken(token);
    if (user) {
      (req as any).user = user;
      (req as any).token = token;
      touchUserActivity(user.id);
    }
  }
  next();
}

// Required Auth Middleware
function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Fadlan gal akoonkaaga (Authentication required)." });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: "Fadhigu wuu dhacay. Fadlan dib u gal (Session expired)." });
  }
  (req as any).user = user;
  (req as any).token = token;
  touchUserActivity(user.id);
  next();
}

// Required Admin Middleware (Strict security: normal users can never access)
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const token = getBearerToken(req);
  if (!token) {
    return res.status(401).json({ error: "Fadlan gal akoonkaaga maamulka (Authentication required)." });
  }
  const user = getUserByToken(token);
  if (!user) {
    return res.status(401).json({ error: "Fadhigu wuu dhacay. Fadlan dib u gal." });
  }
  if (user.role !== "admin") {
    logActivity(user.id, user.email, "unauthorized_admin_attempt", "Non-admin user tried to access admin route");
    return res.status(403).json({ error: "Idan uma lihid boggan maamulka (Admin access denied)." });
  }
  (req as any).user = user;
  (req as any).token = token;
  touchUserActivity(user.id);
  next();
}

// Server-side Google GenAI initialization
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Status endpoint
app.get("/api/status", (_req, res) => {
  res.json({
    status: "ok",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    model: "gemini-3.1-flash-lite",
  });
});

// ==========================================
// 1. USER REGISTRATION, LOGIN & AUTH ROUTES
// ==========================================

app.post("/api/auth/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ error: "Magacaagu waa inuu ka koobnaadaa ugu yaraan 2 xaraf." });
  }
  if (!email || typeof email !== "string" || !email.includes("@")) {
    return res.status(400).json({ error: "Fadlan geli email sax ah oo shaqaynaya." });
  }
  if (!password || typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ error: "Furaha sirta ah waa inuu ka koobnaadaa ugu yaraan 6 xaraf." });
  }

  try {
    const result = createUser(name, email, password);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Is-diiwaangelintu way fashilantay." });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Fadlan geli email-kaaga iyo furahaaga sirta ah." });
  }

  try {
    const result = authenticateUser(email, password);
    res.json(result);
  } catch (err: any) {
    res.status(401).json({ error: err.message || "Email-ka ama furaha sirta ah waa qalad." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  const token = getBearerToken(req);
  if (token) {
    logoutUser(token);
  }
  res.json({ success: true });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  res.json({ user: (req as any).user });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== "string") {
    return res.status(400).json({ error: "Fadlan geli email-kaaga." });
  }

  try {
    const result = initiatePasswordReset(email);
    res.json({
      success: true,
      message: "Koodhka soo celinta furaha sirta ah waa la diyaariyay.",
      resetCode: result.resetCode, // Provided for immediate verification
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Khalad ayaa dhacay xilliga soo celinta furaha." });
  }
});

app.post("/api/auth/reset-password", (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: "Email, koodhka, iyo furaha cusub waa lagama maarmaan." });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "Furaha cusub waa inuu ka koobnaadaa ugu yaraan 6 xaraf." });
  }

  try {
    completePasswordReset(email, code, newPassword);
    res.json({ success: true, message: "Furahaaga sirta ah si guul leh ayaa loo cusbooneysiiyay! Hadda waad gali kartaa." });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Koodhka ama macluumaadka la galiyay waa qalad." });
  }
});

app.post("/api/heartbeat", optionalAuth, (_req, res) => {
  res.json({ status: "alive", timestamp: Date.now() });
});

// ==========================================
// 2. USER-SPECIFIC PRIVATE CONVERSATIONS
// ==========================================

app.get("/api/conversations", requireAuth, (req, res) => {
  const user = (req as any).user;
  const conversations = getUserConversations(user.id);
  res.json({ conversations });
});

app.post("/api/conversations", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { conversation } = req.body;
  if (!conversation) {
    return res.status(400).json({ error: "Conversation object required" });
  }
  saveUserConversation(user.id, conversation);
  res.json({ success: true });
});

app.post("/api/conversations/sync", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { conversations } = req.body;
  syncUserConversations(user.id, conversations);
  res.json({ success: true });
});

app.delete("/api/conversations/:id", requireAuth, (req, res) => {
  const user = (req as any).user;
  deleteUserConversation(user.id, req.params.id);
  res.json({ success: true });
});

// ==========================================
// 3. USER COMPLAINT & FEEDBACK SUBMISSION
// ==========================================

app.post("/api/complaints", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { subject, category, message } = req.body;

  if (!subject || !message) {
    return res.status(400).json({ error: "Ciwaanka iyo fariinta cabashada waa lagama maarmaan." });
  }

  try {
    const complaint = createComplaint(
      user.id,
      user.name,
      user.email,
      subject.trim(),
      category || "other",
      message.trim()
    );
    res.status(201).json({ success: true, complaint });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Cabashada lama gudbin karin." });
  }
});

app.get("/api/complaints/my", requireAuth, (req, res) => {
  const user = (req as any).user;
  const complaints = getUserComplaints(user.id);
  res.json({ complaints });
});

// ==========================================
// 4. ADMIN PANEL (STRICT SERVER-SIDE SECURITY)
// ==========================================

app.get("/api/admin/dashboard", requireAdmin, (_req, res) => {
  try {
    const stats = getDashboardStats();
    res.json(stats);
  } catch (err: any) {
    console.error("Admin dashboard error:", err);
    res.status(500).json({ error: err.message || "Failed to load dashboard stats" });
  }
});

app.get("/api/admin/users", requireAdmin, (req, res) => {
  const search = typeof req.query.search === "string" ? req.query.search : "";
  const role = typeof req.query.role === "string" ? req.query.role : "";
  const status = typeof req.query.status === "string" ? req.query.status : "";

  try {
    const users = listAllUsers(search, role, status);
    res.json({ users });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to list users" });
  }
});

app.patch("/api/admin/users/:id/role", requireAdmin, (req, res) => {
  const currentAdmin = (req as any).user;
  const { id } = req.params;
  const { role } = req.body;

  if (id === currentAdmin.id && role !== "admin") {
    return res.status(400).json({ error: "Ma iska saari kartid maamulnimada naftaada." });
  }
  if (!["admin", "user"].includes(role)) {
    return res.status(400).json({ error: "Dooro doorka saxda ah (admin ama user)." });
  }

  try {
    updateUserRole(id, role, currentAdmin.email);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update role" });
  }
});

app.patch("/api/admin/users/:id/status", requireAdmin, (req, res) => {
  const currentAdmin = (req as any).user;
  const { id } = req.params;
  const { status } = req.body;

  if (id === currentAdmin.id && status === "suspended") {
    return res.status(400).json({ error: "Ma xiri kartid akoonka aad hadda ku jirto." });
  }
  if (!["active", "suspended"].includes(status)) {
    return res.status(400).json({ error: "Dooro heerka saxda ah (active ama suspended)." });
  }

  try {
    updateUserStatus(id, status, currentAdmin.email);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

app.get("/api/admin/complaints", requireAdmin, (req, res) => {
  const status = typeof req.query.status === "string" ? req.query.status : "all";
  try {
    const complaints = getAllComplaints(status);
    res.json({ complaints });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch complaints" });
  }
});

app.post("/api/admin/complaints/:id/reply", requireAdmin, (req, res) => {
  const currentAdmin = (req as any).user;
  const { id } = req.params;
  const { reply, status } = req.body;

  if (!reply || !reply.trim()) {
    return res.status(400).json({ error: "Fadlan qor jawaabta aad u dirayso qofka cabashada qaba." });
  }

  try {
    const updated = replyToComplaint(id, reply.trim(), currentAdmin.email, status);
    res.json({ success: true, complaint: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reply to complaint" });
  }
});

app.patch("/api/admin/complaints/:id/status", requireAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!["pending", "in_progress", "resolved"].includes(status)) {
    return res.status(400).json({ error: "Invalid status" });
  }

  try {
    updateComplaintStatus(id, status);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update status" });
  }
});

app.get("/api/admin/errors", requireAdmin, (_req, res) => {
  try {
    const errors = getSystemErrors(100);
    res.json({ errors });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to get error logs" });
  }
});

app.delete("/api/admin/errors", requireAdmin, (_req, res) => {
  try {
    clearSystemErrors();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to clear error logs" });
  }
});

// Comprehensive system prompt with SomGPT AI Official Identity & Project Ownership
function getSystemInstruction(mode?: string, language?: string) {
  let basePrompt = `You are SomGPT AI, a modern, highly intelligent, multimodal, and reliable digital assistant with your own unique Somali and global identity ("SG").

==================================================
OFFICIAL PROJECT IDENTITY & OWNERSHIP (STRICT RULES):
==================================================
1. THE PERSON BEHIND THE PROJECT IDEA:
When asked who created SomGPT AI, who owns it, who came up with the idea, who initiated the design concept, or who started this project (e.g., "Who created you?", "Who made SomGPT AI?", "Yaa ku sameeyay?", "Yaa iska leh SomGPT AI?", "Yaa bilaabay mashruucan?"):
You MUST respond with:
"SomGPT AI is a project whose original idea and initiative belong to Abdifatah Ahmed Shaqlane. The project is being developed with the assistance of artificial intelligence technologies and services, including Google services, alongside appropriate tools for building and developing the application."

In Somali (Af-Soomaali):
"SomGPT AI waa mashruuc fikraddiisa asalka ah iyo hindisihiisu ay leeyihiin Cabdifitaax Axmed Shaqlaane (Abdifatah Ahmed Shaqlane). Mashruuca waxaa lagu horumarinayaa iyadoo la kaashanayo teknoolojiyadda iyo adeegyada caqliga macmalka ah, oo ay ku jiraan adeegyada Google, iyo aaladaha kale ee ku habboon dhismaha iyo horumarinta codsigan."

In Arabic (العربية):
"SomGPT AI هو مشروع تعود فكرته ومبادرته الأصلية إلى عبد الفتاح أحمد شقلانه (Abdifatah Ahmed Shaqlane). ويجري تطوير المشروع بالاستفادة من تقنيات وخدمات الذكاء الاصطناعي، بما في ذلك خدمات Google، إلى جانب الأدوات البرمجية المناسبة لبناء وتطوير هذا التطبيق."

2. WHERE SOMGPT AI WAS FOUNDED:
When asked where SomGPT AI was founded, in which city the project was started, where the idea originated, or which country/city it comes from (e.g., "Where was SomGPT AI founded?", "Xaggee lagu aasaasay?", "Magaaladee laga bilaabay?"):
You MUST respond with:
"SomGPT AI was founded in the city of Jigjiga. The original idea for the project belongs to Abdifatah Ahmed Shaqlane, and it is being developed with the assistance of modern artificial intelligence technologies and services provided by technology companies."

In Somali (Af-Soomaali):
"SomGPT AI waxaa lagu aasaasay magaalada Jigjiga. Fikradda asalka ah ee mashruucan waxaa iska leh Cabdifitaax Axmed Shaqlaane (Abdifatah Ahmed Shaqlane), waxaana lagu horumarinayaa kaalmada teknoolojiyadda casriga ah ee caqliga macmalka ah iyo adeegyada ay bixiyaan shirkadaha tiknoolajiyadda."

3. WHY SOMGPT AI WAS CREATED & DESIGN INITIATIVE:
When asked why SomGPT AI was created or who designed it:
"SomGPT AI is a project initiated by Abdifatah Ahmed Shaqlane, with the goal of creating a modern artificial intelligence assistant that helps people with education, research, everyday questions, and understanding different fields of knowledge. The project prioritizes Somali language support, easy conversations, knowledge, and access to useful information."
Explain that the original idea and overall direction belong to Abdifatah Ahmed Shaqlane, while the technical implementation relies on modern AI services and software development tools.

4. COMPANIES AND TECHNOLOGIES USED:
When asked what companies or technologies were used to build SomGPT AI:
Explain that the project uses tools and services including:
- Google AI Studio: A platform for developing and testing AI applications.
- Google Gemini: A family of artificial intelligence models used to understand user requests and generate responses.
- Web & App Technologies: React, TypeScript, Tailwind CSS, and Node.js/Express.
- Web Speech API and Text-to-Speech (TTS) tools for voice interactions.
IMPORTANT CLARIFICATIONS:
- If asked whether Google owns SomGPT AI: Clarify that using Google AI Studio or Gemini does NOT mean that Google owns SomGPT AI.
- If asked about OpenAI: Clarify that OpenAI does NOT own, fund, sponsor, or have an official partnership with SomGPT AI.
- Never fabricate business agreements, investments, certifications, or corporate sponsorships.

==================================================
LANGUAGE GUIDELINES:
==================================================
1. First-class Somali language capability: When the user communicates in Somali (Af-Soomaali), you MUST respond in natural, grammatically sound, eloquent, and friendly Somali.
2. Multilingual: If the user communicates in English, Arabic (العربية), or any other language, respond in that language.
3. If requested to translate or switch languages, do so fluently.

==================================================
CORE RELIABILITY, ETHICS & SAFETY:
==================================================
- Never fabricate facts, citations, fake research results, or inaccurate religious rulings.
- Acknowledge uncertainty when a fact cannot be conclusively verified.
- Distinguish verified facts from theories, hypotheses, and personal interpretations.
- Maintain conversation context cleanly for follow-up questions.
- Organize responses clearly with headings, bullet points, clean numbered steps, and syntax-highlighted code blocks where appropriate.

SAFETY REFUSALS (Strict, respectful, non-judgmental):
- If asked for instructions to kill, seriously harm, or violently attack someone or commit dangerous illegal acts:
  Politely and firmly refuse: "I'm sorry, but I cannot provide instructions or assistance for harming another person. If you or someone you know is in distress or dealing with a crisis, please seek immediate help from local emergency services or support lines."
  In Somali: "Waan ka xumahay, laakiin kuma caawin karo tilmaamo ama talooyin la xiriira waxyeelo, dhibaato ama dhimasho loo geysto qof. Haddii aad ku jirto xaalad adag ama degdeg ah, fadlan la xiriir adeegyada gurmadka degdegga ah ama dadka kugu dhow ee aad ku kalsoontahay."

SPECIALIZED KNOWLEDGE MODES:
1. Religious Studies: Treat all religions with high respect. For Islamic studies, explain Qur'an and Sunnah accurately, distinguish between unambiguous textual evidence and scholarly opinions (ijtihad/madhhabs), present differing scholarly viewpoints fairly, cite trustworthy sources, and advise consulting qualified religious scholars on personalized fatwas.
2. Academic & STEM Tutor: Teach mathematics, physics, biology, chemistry, computer science, and social sciences with intuitive step-by-step logic, clear formulas, and relatable real-world analogies.
3. Deep Research: Synthesize multiple viewpoints, highlight key findings, list limitations, and reference sources.`;

  if (mode === "research") {
    basePrompt += `\n\nCURRENT MODE: DEEP RESEARCH. Structure your answer with:
- Summary of Findings
- Verified Facts & Analysis
- Different Perspectives / Nuances
- Clear Conclusions & References`;
  } else if (mode === "study") {
    basePrompt += `\n\nCURRENT MODE: EDUCATIONAL TUTOR. Break concepts down into simple, digestible steps. Include practice examples and verify the learner's comprehension.`;
  } else if (mode === "religion") {
    basePrompt += `\n\nCURRENT MODE: RELIGIOUS KNOWLEDGE & STUDIES. Be respectful, scholarly, accurate with Arabic terms and their translations, and cite classical and reputable references where applicable.`;
  } else if (mode === "code") {
    basePrompt += `\n\nCURRENT MODE: CODE & SOFTWARE LAB. Provide clean, well-commented, modern code with explanations of algorithmic trade-offs and edge cases.`;
  }

  if (language === "so") {
    basePrompt += `\n\nUSER PREFERENCE: Please prioritize answering in Somali (Af-Soomaali) unless specifically asked otherwise.`;
  } else if (language === "ar") {
    basePrompt += `\n\nUSER PREFERENCE: Please prioritize answering in Arabic (العربية) unless specifically asked otherwise.`;
  }

  return basePrompt;
}

// Helper to detect if user prompt requests image generation or image editing
function detectImageIntent(text: string, hasAttachment: boolean, mode?: string): { isImageRequest: boolean; isEdit: boolean } {
  if (mode === "image") {
    return { isImageRequest: true, isEdit: hasAttachment };
  }

  const lower = text.toLowerCase().trim();

  // Explicit edit triggers
  const editTriggers = [
    "edit this image", "improve this image", "change the background", "change background",
    "make it look 3d", "convert it into a 3d", "enhance the image", "make it sharper",
    "make this picture", "improve the lighting", "restore this photo", "convert into a 3d",
    "hagaaji sawirkan", "beddel asalka", "ka dhig 3d", "qurxi sawirkan", "sawirka beddel",
    "تعديل الصورة", "تغيير الخلفية", "تحسين الصورة"
  ];
  if (editTriggers.some((t) => lower.includes(t)) || (hasAttachment && /\b(edit|improve|enhance|modify|restore|change|convert|style|3d|lighting|background)\b/i.test(lower))) {
    return { isImageRequest: true, isEdit: true };
  }

  // Generation triggers with flexible regex patterns
  const genPattern = /\b(generate|create|design|draw|make|render|produce|paint|illustrate)\b.*(image|picture|photo|photograph|portrait|logo|poster|illustration|wallpaper|avatar|3d design|landscape|graphic|artwork|visual)/i;
  const somaliGenPattern = /\b(sawir|naqshad|calaamad)\b.*(samee|abuur|hagaaji|beddel|qurxi|3d|dhig)\b|\b(samee|abuur|hagaaji|beddel|qurxi|ii sawir|waxaad ii sawirtaa)\b.*(sawir|naqshad|calaamad|logo|waraabe|geel|guri|qof)\b/i;
  const arabicGenPattern = /\b(توليد|إنشاء|تصميم|رسم|اصنع|صمم|ارسم)\b.*(صورة|شعار|تصميم|بوستر|رسمة|لوحة)\b/i;

  const genTriggers = [
    "generate an image", "create an image", "generate a picture", "create a picture",
    "generate a photo", "create a photo", "make an image", "make a photo", "make a picture",
    "draw an image", "draw a picture", "draw a", "draw an",
    "generate a modern", "create a modern", "design a professional", "design a logo",
    "generate a realistic", "create a realistic", "make a realistic", "render a realistic",
    "generate a 3d", "create a 3d", "make a 3d design", "create an illustration",
    "create a beautiful landscape", "give me an image", "can you generate an image", "can you create an image",
    "sawir ii samee", "sawir ka samee", "sawir abuur", "sawir u samee", "sawir samee", "ii sawir",
    "sawir labo", "sawir hal", "sawir guri", "sawir nin", "sawir qof",
    "توليد صورة", "إنشاء صورة", "رسم صورة", "اصنع صورة", "ارسم لي"
  ];

  if (
    genTriggers.some((t) => lower.includes(t)) ||
    genPattern.test(lower) ||
    somaliGenPattern.test(lower) ||
    arabicGenPattern.test(lower) ||
    lower.startsWith("sawir ") ||
    lower.startsWith("sawirka ")
  ) {
    return { isImageRequest: true, isEdit: hasAttachment };
  }

  return { isImageRequest: false, isEdit: false };
}

// Advanced Real AI Image Generation & Editing Engine
async function generateOrEditImage({
  prompt,
  style = "photorealistic",
  aspectRatio = "1:1",
  referenceImage,
}: {
  prompt: string;
  style?: string;
  aspectRatio?: string;
  referenceImage?: { data: string; mimeType: string };
}): Promise<{
  id: string;
  url: string;
  prompt: string;
  expandedPrompt?: string;
  style: string;
  isEdited: boolean;
  aspectRatio: string;
}> {
  const isEdit = Boolean(referenceImage?.data);
  const id = Math.random().toString(36).slice(2);

  // Calculate resolution dimensions based on requested aspect ratio
  let width = 1024;
  let height = 1024;
  if (aspectRatio === "16:9") {
    width = 1280;
    height = 720;
  } else if (aspectRatio === "9:16") {
    width = 720;
    height = 1280;
  } else if (aspectRatio === "4:3") {
    width = 1024;
    height = 768;
  } else if (aspectRatio === "3:4") {
    width = 768;
    height = 1024;
  }

  // 1. Synthesize an ultra-high-detail, photorealistic English visual prompt using Gemini
  let expandedPrompt = prompt;
  try {
    const promptEngineeringParts: any[] = [];
    if (isEdit && referenceImage) {
      promptEngineeringParts.push({
        inlineData: {
          mimeType: referenceImage.mimeType || "image/jpeg",
          data: referenceImage.data,
        },
      });
      promptEngineeringParts.push({
        text: `You are an expert photographic visual director. The user provided this reference image and wants to edit/transform it with these instructions: "${prompt}".
Style: ${style}.
Analyze the reference image's subjects, composition, and lighting.
Write a single, highly detailed, photorealistic prompt in English (35-50 words) describing the transformed, improved image.
Unless the user explicitly asks for cartoon/anime, the output MUST be genuine photorealistic photography with natural human skin textures, authentic lighting, and Hasselblad 8k optical clarity.
Output ONLY the raw descriptive prompt string. No quotes, no markdown, no intro.`,
      });
    } else {
      promptEngineeringParts.push({
        text: `You are an expert visual director for world-class photorealistic image generation (like Midjourney v6 / Flux Realism).
User request: "${prompt}"
Requested Style: ${style || "photorealistic"}

CRITICAL RULES:
1. THE DEFAULT STYLE MUST ALWAYS BE ULTRA-REALISTIC PHOTOGRAPHY, NEVER CARTOON, NEVER ANIME, NEVER ILLUSTRATION (unless explicitly requested).
2. For human subjects: Describe authentic natural human skin texture with pores and natural details, expressive realistic eyes with sharp catchlights, natural hair strands, and authentic facial anatomy.
3. For scenes/landscapes/architecture/products: Describe real-world optical lighting, depth of field, physical shadows, reflections, and rich textures.
4. Optical Specifications: State that it is a professional RAW photograph shot on Hasselblad H6D-100c medium format camera with 85mm f/1.4 lens (for portraits/people) or 24mm f/2.8 lens (for landscapes/buildings), natural studio or golden hour lighting, 8k resolution, award-winning photography.
5. If the user explicitly requested non-photographic styles (like 3d, cartoon, anime, or digital_art), tailor faithfully to that specific genre.
6. Convert any Somali, Arabic, or other language descriptions into rich, descriptive English.

Output ONLY the final raw prompt string (40-55 words) with NO quotation marks, NO prefixes, and NO introductory text.`,
      });
    }

    const expansionRes = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: { parts: promptEngineeringParts },
    });

    const candidateText = expansionRes.text?.trim()?.replace(/^["']|["']$/g, "");
    if (candidateText && candidateText.length > 10) {
      expandedPrompt = candidateText;
    }
  } catch (err: any) {
    console.warn("Prompt expansion fallback to user prompt:", err?.message || err);
    expandedPrompt = `Award-winning RAW photograph of ${prompt}, shot on Hasselblad medium format camera, natural skin texture, 85mm lens, realistic studio lighting, 8k resolution, photorealistic masterpiece, highly detailed`;
  }

  // 2. Fetch real neural AI image from high-resolution neural generation pipeline
  const seed = Math.floor(Math.random() * 900000) + 100000;
  // Use flux-realism model for photorealistic/portrait/cinematic/landscape/product photography
  const isStylized = ["cartoon", "anime", "digital_art", "render3d"].includes(style);
  const chosenModel = isStylized ? "flux" : "flux-realism";
  const primaryUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(expandedPrompt)}?seed=${seed}&width=${width}&height=${height}&model=${chosenModel}&nologo=true`;
  const secondaryUrl = `https://pollinations.ai/p/${encodeURIComponent(expandedPrompt)}?seed=${seed}&width=${width}&height=${height}`;

  // Attempt server-side fetch to convert to self-contained Base64 JPEG
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    const res = await fetch(primaryUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "image/jpeg,image/png,image/*",
      },
    });
    clearTimeout(timeout);

    if (res.ok) {
      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("image")) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 1000) {
          const base64Data = Buffer.from(buffer).toString("base64");
          const mime = contentType.includes("png") ? "image/png" : "image/jpeg";
          return {
            id,
            url: `data:${mime};base64,${base64Data}`,
            prompt,
            expandedPrompt,
            style,
            isEdited: isEdit,
            aspectRatio,
          };
        }
      }
    }
  } catch (fetchErr: any) {
    console.warn("Direct server fetch encountered rate-limit or timeout, returning direct client URL:", fetchErr?.message || fetchErr);
  }

  // When server IP hits the 45s cooldown, return the direct URL.
  // The client's browser will fetch the image directly with the user's IP address (bypassing the server container's IP limit)!
  return {
    id,
    url: primaryUrl,
    prompt,
    expandedPrompt,
    style,
    isEdited: isEdit,
    aspectRatio,
  };
}

// Dedicated Image Generation & Editing API Endpoint
app.post("/api/generate-image", async (req, res) => {
  const { prompt, style, aspectRatio, referenceImage } = req.body;

  if (!prompt && !referenceImage) {
    return res.status(400).json({ error: "Prompt or reference image is required" });
  }

  try {
    const imageResult = await generateOrEditImage({
      prompt: prompt || "High quality enhancement",
      style: style || "photorealistic",
      aspectRatio: aspectRatio || "1:1",
      referenceImage,
    });

    res.json({ success: true, image: imageResult });
  } catch (err: any) {
    console.error("Image generation error:", err);
    res.status(500).json({ error: err?.message || "Failed to generate image" });
  }
});

// Fast streaming chat endpoint with instant TTFT (<500ms) and inline image generation
app.post("/api/chat", async (req, res) => {
  const { messages, mode, useSearch, language, style } = req.body;

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Missing or invalid messages parameter" });
  }

  const latestMessage = messages[messages.length - 1];
  const userText = latestMessage?.text || latestMessage?.content || "";
  const hasAttachment = Boolean(latestMessage?.image?.data);

  // Extract user info if logged in
  const authHeader = req.headers.authorization;
  let chatUserId: string | null = null;
  let chatUserEmail: string | null = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    const user = getUserByToken(token);
    if (user) {
      chatUserId = user.id;
      chatUserEmail = user.email;
      touchUserActivity(user.id);
    }
  }

  // Log real user activity
  logActivity(chatUserId, chatUserEmail, "chat_message", userText.slice(0, 120));

  // Check if a previous message had an image we can use as reference for editing
  let previousImageAttachment = latestMessage?.image;
  if (!previousImageAttachment) {
    for (let i = messages.length - 2; i >= 0; i--) {
      if (messages[i]?.image?.data) {
        previousImageAttachment = messages[i].image;
        break;
      }
    }
  }

  // Detect image generation or editing intent
  const { isImageRequest, isEdit } = detectImageIntent(userText, hasAttachment || Boolean(previousImageAttachment), mode);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  // If this is an image generation or editing request, generate image first
  let generatedImageData: any = null;
  if (isImageRequest) {
    const statusMsg = isEdit
      ? language === "so" ? "SomGPT AI waxay hagaajinaysaa sawirkaaga..." : "SomGPT AI is editing your image..."
      : language === "so" ? "SomGPT AI waxay abuuraysaa sawirkaaga dabiiciga ah..." : "SomGPT AI is creating your realistic image...";

    res.write(`data: ${JSON.stringify({ type: "status", message: statusMsg })}\n\n`);
    (res as any).flush?.();

    try {
      generatedImageData = await generateOrEditImage({
        prompt: userText,
        referenceImage: isEdit ? previousImageAttachment : undefined,
        style: style || undefined,
      });

      if (generatedImageData) {
        res.write(`data: ${JSON.stringify({ type: "image", image: generatedImageData })}\n\n`);
        (res as any).flush?.();
      }
    } catch (err: any) {
      console.warn("Direct image generation skipped, continuing with text response:", err?.message || err);
    }
  }

  // Format contents for @google/genai SDK
  const contents = messages.map((m: any, idx: number) => {
    const parts: any[] = [];

    // Multimodal image attachment
    if (m.image && m.image.data) {
      parts.push({
        inlineData: {
          mimeType: m.image.mimeType || "image/jpeg",
          data: m.image.data,
        },
      });
    }

    const messageContent = typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "";
    if (messageContent) {
      if (idx === messages.length - 1 && isImageRequest && generatedImageData) {
        parts.push({
          text: `[System Note: The image for this user prompt has ALREADY been generated and rendered directly on screen. Do NOT output any JSON, actions, or thoughts. Speak directly and naturally to the user in ${
            language === "so" ? "Af-Soomaali" : language === "ar" ? "Arabic" : "English"
          }, warmly presenting the visual design highlights of the generated image and inviting any adjustments or 3D improvements.]\n\n${messageContent}`,
        });
      } else {
        parts.push({ text: messageContent });
      }
    }

    return {
      role: m.role === "assistant" || m.role === "model" ? "model" : "user",
      parts: parts.length > 0 ? parts : [{ text: "" }],
    };
  });

  let systemInstruction = getSystemInstruction(mode, language);
  systemInstruction += `\n\nCRITICAL OUTPUT FORMATTING: Always output clean, natural, human-readable markdown directly without any raw JSON action blocks, thoughts, or internal tool syntax. Never output curly braces containing "action" or "thought".`;
  if (isImageRequest && generatedImageData) {
    systemInstruction += `\n\nSYSTEM NOTICE: You have already successfully generated and rendered the requested image directly in the chat interface for the user (${isEdit ? "edited version" : "new image"}). In your text reply, speak enthusiastically as SomGPT AI: briefly highlight the creative design elements, color palette, or symbolism of the generated image, and invite the user to let you know if they want to adjust the style, background, lighting, or 3D appearance. Never say you cannot generate images.`;
  }

  // Send status event if not already sent
  if (!isImageRequest) {
    const statusMsg =
      hasAttachment
        ? language === "so" ? "Falanqeynta sawirka..." : "Analyzing uploaded image..."
        : language === "so"
        ? "SomGPT AI waxay diyaarinaysaa jawaabtaada..."
        : language === "ar"
        ? "SomGPT AI يقوم بتجهيز إجابتك..."
        : "SomGPT AI is preparing your answer...";

    res.write(`data: ${JSON.stringify({ type: "status", message: statusMsg })}\n\n`);
    (res as any).flush?.();
  }

  try {
    const config: any = { systemInstruction };
    if (useSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    let responseStream: any = null;

    try {
      responseStream = await ai.models.generateContentStream({
        model: "gemini-3.1-flash-lite",
        contents,
        config,
      });
    } catch (err: any) {
      if (useSearch) {
        responseStream = await ai.models.generateContentStream({
          model: "gemini-3.1-flash-lite",
          contents,
          config: { systemInstruction },
        });
      } else {
        throw err;
      }
    }

    let fullText = "";
    let extractedGroundingChunks: any[] = [];
    let initialFilterBuffer = "";
    let hasCleanedInitialAction = false;

    for await (const chunk of responseStream) {
      const text = chunk.text;
      if (text) {
        if (!hasCleanedInitialAction) {
          initialFilterBuffer += text;
          const trimmed = initialFilterBuffer.trimStart();
          const isJsonPreamble = /^[,\s"'{]*"?(action|thought|content|response)"?\s*:/i.test(trimmed) || trimmed.startsWith("{");
          if (isJsonPreamble) {
            const closingBraceIdx = initialFilterBuffer.indexOf("}");
            if (closingBraceIdx !== -1) {
              const rest = initialFilterBuffer
                .slice(closingBraceIdx + 1)
                .replace(/^(\*\*\*|\-\-\-)\s*/m, "")
                .trimStart();

              hasCleanedInitialAction = true;
              if (rest) {
                fullText += rest;
                res.write(`data: ${JSON.stringify({ type: "chunk", text: rest })}\n\n`);
                (res as any).flush?.();
              }
              initialFilterBuffer = "";
            } else if (initialFilterBuffer.length > 800) {
              hasCleanedInitialAction = true;
              fullText += initialFilterBuffer;
              res.write(`data: ${JSON.stringify({ type: "chunk", text: initialFilterBuffer })}\n\n`);
              (res as any).flush?.();
              initialFilterBuffer = "";
            }
            continue;
          } else {
            hasCleanedInitialAction = true;
            fullText += initialFilterBuffer;
            res.write(`data: ${JSON.stringify({ type: "chunk", text: initialFilterBuffer })}\n\n`);
            (res as any).flush?.();
            initialFilterBuffer = "";
            continue;
          }
        }

        fullText += text;
        res.write(`data: ${JSON.stringify({ type: "chunk", text })}\n\n`);
        (res as any).flush?.();
      }

      const candidate = chunk.candidates?.[0];
      const gMetadata = candidate?.groundingMetadata;
      if (gMetadata?.groundingChunks && gMetadata.groundingChunks.length > 0) {
        extractedGroundingChunks = gMetadata.groundingChunks;
      }
    }

    if (!hasCleanedInitialAction && initialFilterBuffer) {
      const cleanedText = initialFilterBuffer.replace(/^\{\s*"action":[\s\S]*?\}\s*(\*\*\*|\-\-\-)?\s*/i, '').trimStart();
      if (cleanedText) {
        fullText += cleanedText;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: cleanedText })}\n\n`);
        (res as any).flush?.();
      }
    }

    if (!fullText.trim()) {
      let defaultReply = "";
      if (isImageRequest && generatedImageData) {
        if (language === "so") {
          defaultReply = isEdit
            ? "Waa kan sawirkaagii oo dib loo hagaajiyay! Waxaan hagaajiyay iftiinka, faahfaahinta, iyo tayada guud sida aad codsatay. Haddii aad rabto wax ka beddel kale, fadlan ii sheeg!"
            : "Waa kan sawirkaagii aan kuu diyaariyay! Waxaan diiradda saaray in nashqaddu noqoto mid dhab ah, qurux badan, oo leh iftiin iyo midabbo dabiici ah. Haddii aad doonayso inaad beddesho qaabka, asalka, ama aad ka dhigto 3D, fadlan ii sheeg!";
        } else if (language === "ar") {
          defaultReply = isEdit
            ? "إليك صورتك بعد التعديل والتحسين! لقد قمت بتحديث الإضاءة والتفاصيل بناءً على طلبك. أخبرني إذا كنت ترغب في أي تعديلات أخرى."
            : "إليك صورتك المولدة بالذكاء الاصطناعي! لقد ركزت على إبراز التفاصيل والواقعية والألوان الطبيعية. أخبرني إذا كنت تريد ضبط الإضاءة أو تحويلها إلى نمط ثلاثي الأبعاد.";
        } else {
          defaultReply = isEdit
            ? "Here is your enhanced and edited image! I have updated the composition, lighting, and textures according to your instructions. Let me know if you would like any further adjustments!"
            : "Here is your generated image! I focused on rich textures, realistic lighting, and composition to bring your vision to life. Let me know if you would like any style adjustments or 3D enhancements!";
        }
        fullText = defaultReply;
        res.write(`data: ${JSON.stringify({ type: "chunk", text: defaultReply })}\n\n`);
        (res as any).flush?.();
      }
    }

    // Process grounding sources into clean structure
    const sources: Array<{ title: string; url: string; domain?: string }> = [];
    if (extractedGroundingChunks && extractedGroundingChunks.length > 0) {
      for (const item of extractedGroundingChunks) {
        const web = item.web;
        if (web && web.uri) {
          let domain = "";
          try {
            domain = new URL(web.uri).hostname.replace(/^www\./, "");
          } catch {
            domain = "web";
          }
          sources.push({
            title: web.title || domain || "Source",
            url: web.uri,
            domain,
          });
        }
      }
    }

    if (sources.length > 0) {
      res.write(`data: ${JSON.stringify({ type: "grounding", sources })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: "done", fullText })}\n\n`);
    res.end();
  } catch (err: any) {
    console.error("Gemini Chat generation error:", err);
    logSystemError("/api/chat", err?.message || "Chat generation error", err?.stack, chatUserId || undefined);
    const errorMessage = err?.message || "Failed to generate AI response. Please try again.";
    res.write(`data: ${JSON.stringify({ type: "error", error: errorMessage })}\n\n`);
    res.end();
  }
});

// Text-to-Speech endpoint using gemini-3.8-flash-lite-tts with graceful fallback
app.post("/api/tts", async (req, res) => {
  const { text, voice } = req.body;

  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text string is required" });
  }

  const cleanText = text
    .replace(/```[\s\S]*?```/g, "Code block omitted for speech.")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/[#*_~\[\]]/g, "")
    .trim()
    .slice(0, 1000);

  try {
    const selectedVoice = voice || "Kore";
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash-lite-tts",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: cleanText,
              speechMetadata: {
                style: "Friendly, natural, articulate voice assistant",
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: selectedVoice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

    if (!base64Audio) {
      return res.json({ fallbackToBrowser: true });
    }

    res.json({
      audioBase64: base64Audio,
      mimeType: "audio/wav",
    });
  } catch (err: any) {
    console.warn("Gemini TTS unavailable, falling back to browser synthesis:", err?.message || err);
    res.json({ fallbackToBrowser: true });
  }
});

// Audio transcription endpoint using gemini-3.5-transcribe
app.post("/api/transcribe", async (req, res) => {
  const { audioBase64, mimeType } = req.body;

  if (!audioBase64) {
    return res.status(400).json({ error: "audioBase64 is required" });
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-transcribe",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || "audio/webm",
              data: audioBase64,
            },
          },
          {
            text: "Transcribe the spoken audio faithfully. Automatically detect if the user spoke Somali, English, Arabic, or another language. Return only the transcription text.",
          },
        ],
      },
    });

    const text = response.text || "";
    res.json({ text: text.trim() });
  } catch (err: any) {
    console.error("Transcription error:", err);
    logSystemError("/api/transcribe", err?.message || "Transcription failed", err?.stack);
    res.status(500).json({ error: err?.message || "Audio transcription failed" });
  }
});

// Helper to locate production build dist directory
function findDistDirectory(): string | null {
  const possiblePaths = [
    path.resolve(__dirname, "dist"),
    path.resolve(process.cwd(), "dist"),
    path.resolve(__dirname, "../dist"),
    path.resolve(process.cwd(), "../dist"),
    path.resolve(__dirname, "src/dist"),
    path.resolve(process.cwd(), "src/dist"),
  ];

  for (const candidate of possiblePaths) {
    try {
      const indexHtml = path.join(candidate, "index.html");
      if (fs.existsSync(candidate) && fs.existsSync(indexHtml)) {
        return candidate;
      }
    } catch {
      // ignore check error
    }
  }
  return null;
}

// Vite middleware in dev or static files in production
async function startServer() {
  // Initialize SQLite database and seed default admin
  initDatabase();

  const isProd = process.env.NODE_ENV === "production";
  let distPath = findDistDirectory();

  // If in production and dist is not found, attempt build so the server never fails
  if (isProd && !distPath) {
    console.warn("⚠️ Production mode detected, but dist/index.html was not found.");
    console.log("🚀 Building frontend on startup to create dist/index.html...");
    try {
      const { execSync } = await import("child_process");
      execSync("npx vite build", { stdio: "inherit", cwd: process.cwd() });
      distPath = findDistDirectory();
    } catch (buildErr: any) {
      console.error("Vite build on startup failed, falling back to Vite middleware:", buildErr?.message || buildErr);
    }
  }

  if (distPath) {
    console.log(`📦 Serving production build from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res, next) => {
      if (req.path.startsWith("/api/")) {
        return next();
      }
      const indexFile = path.join(distPath!, "index.html");
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send("SomGPT AI: index.html not found. Please build the application.");
      }
    });
  } else {
    // Development mode or fallback to Vite dev server in middleware mode
    console.log("⚡ Starting Vite in middleware mode...");
    try {
      const { createServer } = await import("vite");
      const vite = await createServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (viteErr: any) {
      console.error("Failed to start Vite middleware:", viteErr?.message || viteErr);
    }
  }

  app.listen(PORT, () => {
    console.log(`SomGPT AI Server running on port ${PORT} (NODE_ENV=${process.env.NODE_ENV || "development"})`);
  });
}

startServer();
