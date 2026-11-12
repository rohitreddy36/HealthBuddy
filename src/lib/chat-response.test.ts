import { afterEach, describe, expect, it, vi } from "vitest";

const { generate, configured } = vi.hoisted(() => ({
  generate: vi.fn(),
  configured: { groq: true, gemini: true },
}));
vi.mock("ai", () => ({ generateText: generate }));
vi.mock("./ai.server", () => ({
  gateway: () => () => "gemini-model",
  groqGateway: () => () => "groq-model",
  isGeminiConfigured: () => configured.gemini,
  isGroqConfigured: () => configured.groq,
  MODEL: "gemini-test",
}));
import { answerHealthChat } from "./chat-response.server";

afterEach(() => {
  vi.clearAllMocks();
  configured.groq = true;
  configured.gemini = true;
});
describe("shared chatbot response", () => {
  it("includes website and retrieved medical context, preserves roles and full answers", async () => {
    generate.mockResolvedValueOnce({ text: "Useful explanation. ".repeat(80) });
    const answer = await answerHealthChat({
      message: "Tell me about diabetes",
      history: [{ role: "user", content: "I want general information" }],
    });
    expect(answer.reply.length).toBeGreaterThan(700);
    expect(answer.sources.some((s) => /diabetes/i.test(s.title))).toBe(true);
    const call = generate.mock.calls[0][0];
    expect(call.system).toContain("/documents");
    expect(call.system).toContain("MEDICAL REFERENCES");
    expect(call.system).toContain("Do not diagnose");
    expect(call.messages[0].role).toBe("user");
    expect(call.maxRetries).toBe(0);
  });
  it("falls back to Gemini when Groq fails", async () => {
    generate
      .mockRejectedValueOnce(Object.assign(new Error("quota"), { statusCode: 429 }))
      .mockResolvedValueOnce({ text: "An answer" });
    expect((await answerHealthChat({ message: "What is asthma?" })).degraded).toBe(false);
    expect(generate.mock.calls.map(([call]) => call.model)).toEqual(["groq-model", "gemini-model"]);
  });
  it("treats an empty provider answer as a failure", async () => {
    generate.mockResolvedValueOnce({ text: " " }).mockResolvedValueOnce({ text: "Backup answer" });
    expect((await answerHealthChat({ message: "Hello" })).reply).toBe("Backup answer");
  });
  it("provides website help without any provider credentials", async () => {
    configured.groq = configured.gemini = false;
    const answer = await answerHealthChat({ message: "How do I upload a report?" });
    expect(answer.degraded).toBe(false);
    expect(answer.reply).toContain("/documents");
    expect(generate).not.toHaveBeenCalled();
  });
  it("discloses failure when both providers fail", async () => {
    generate.mockRejectedValue(new Error("unavailable"));
    const answer = await answerHealthChat({ message: "What is diabetes?" });
    expect(answer.degraded).toBe(true);
    expect(answer.reply).toContain("temporarily unavailable");
    expect(answer.sources.length).toBeGreaterThan(0);
  });
});
