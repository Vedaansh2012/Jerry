
export default async (request) => {
  // Only accept POST requests
  if (request.method !== "POST") {
    return Response.json(
      { error: "Please use POST to send a message." },
      { status: 405 }
    );
  }

  // Check request format
  if (!request.headers.get("content-type")?.includes("application/json")) {
    return Response.json(
      { error: "Request must contain JSON." },
      { status: 415 }
    );
  }

  try {
    const body = await request.json();
    const message = body?.message;

    // Validate the user's message
    if (typeof message !== "string" || !message.trim()) {
      return Response.json(
        { error: "Please enter a message." },
        { status: 400 }
      );
    }

    if (message.length > 4000) {
      return Response.json(
        { error: "Please keep your message under 4000 characters." },
        { status: 413 }
      );
    }

    // Read the secret key from Netlify, never from the website
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      return Response.json(
        { error: "JERRY's AI connection has not been configured yet." },
        { status: 503 }
      );
    }

    // Contact the AI
    const response = await fetch(
      "https://api.openai.com/v1/responses",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },

        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4.1-mini",

          instructions: `
You are JERRY, a friendly, intelligent personal AI assistant.

Your personality:
- Friendly, lively, helpful and intelligent.
- Speak naturally, not like a robot.
- Keep answers clear and easy to understand.
- Avoid unnecessary long explanations.
- Understand and respond in the user's language.
- Support multilingual conversations.
- Help with writing, learning, planning, research and creativity.

Important rules:
- Never pretend that an action was completed.
- Never claim to have accessed an application unless an actual integration
  is connected and the action succeeded.
- Explain when a requested capability is not connected yet.
- Never invent information.
- Ask for clarification when an instruction is ambiguous.
`,

          input: message,
          max_output_tokens: 600,
          store: false
        })
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("AI provider error:", data.error?.message);

      return Response.json(
        { error: "JERRY couldn't process that request. Please try again." },
        { status: 502 }
      );
    }

    // Extract the assistant's actual reply
    const answer = (data.output || [])
      .filter(item => item.type === "message")
      .flatMap(item => item.content || [])
      .filter(item => item.type === "output_text")
      .map(item => item.text)
      .join("\n")
      .trim();

    if (!answer) {
      return Response.json(
        { error: "JERRY received an empty response. Please try again." },
        { status: 502 }
      );
    }

    return Response.json({ reply: answer });

  } catch (error) {
    console.error("JERRY function error:", error);

    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
};
