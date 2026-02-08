# PROMPTS.md

This project uses AI-assisted coding during development

AI usage was limited in scope to
- debugging Cloudflare Workers and Durable Object documentation
- debugging configuration issues in wrangler.toml and durable object exports and imports
- helping me understand platform specific concepts like request routing, fetch, and general syntax

AI was not used to design the system architecture.
The job queue, UI, and the use of durable objects were completely based on my prior distributed job queue project in Go.

# Example AI prompts
- "Where does Wrangler want the entrypoint to be, and what should be exported from there?"
- “Why is my Durable Object losing memory after a few requests or a refresh?”
- “Can you explain the async fetch -> await pattern with the details you mentioned earlier about default vs non default exports?”
- “How can Workers AI be used to parse natural language into structured commands?”
- “Why does wrangler dev --remote behave differently from local mode?”

AI suggestions were reviewed, adapted, and often rewritten to fit the specific design
constraints of this project. All final code reflects my own understanding and decisions.