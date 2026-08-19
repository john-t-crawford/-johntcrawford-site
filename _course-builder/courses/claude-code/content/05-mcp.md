---
title: MCP Servers
icon: i05
gated: true
summary: Connecting outside tools and services — and treating each connection as a trust boundary.
---

MCP (Model Context Protocol) is how Claude Code talks to outside systems in a structured way — email, cloud storage, design tools, a database — instead of you copy-pasting data back and forth by hand. Connect an MCP server and Claude gains whatever capabilities that server exposes.

## Deferred tools and ToolSearch

Not every tool's full definition loads by default. Many MCP tools are "deferred" — only their names are visible until a search step loads the actual parameters. This keeps a session's context lean when dozens of tools might otherwise be available at once, most of them irrelevant to the task at hand.

::: security
Every MCP server is a trust boundary. Once connected, it can act with real credentials on a real system — sending an email, writing to a shared drive, modifying a design file. Before connecting a new one, know what account or credentials it uses, what actions it's actually capable of, and whether it comes from a source you trust. This is the same discipline as the hooks lesson, applied to third-party integrations instead of local automation.
:::

::: exercise Try it
Ask what MCP servers or tools you currently have connected, and walk through what each one could do if misused. This isn't paranoia — it's the same "know what you're approving" habit from Lesson 00, applied to integrations instead of individual commands.
:::

::: checkpoint
If someone handed you a link to install an unfamiliar MCP server, what would you check before connecting it?
:::
