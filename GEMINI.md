# KL0 - Discord Bot Codebase Guide

This document provides a comprehensive structural and architectural overview of the `kl0` Discord bot codebase.

---

## 1. Project Overview & Tech Stack

`kl0` is a modular Discord bot built with TypeScript running on the **Bun** runtime, utilizing **discord.js v14** and **Drizzle ORM** with **PostgreSQL**.

- **Runtime**: [Bun](https://bun.com) (v1.4+)
- **Language**: TypeScript (Strict mode, ESNext, Bundler resolution, Path alias `@/*` -> `./src/*`)
- **Bot Framework**: [discord.js](https://discord.js.org/) (v14.27+)
- **Database & ORM**: PostgreSQL (`pg` driver) + [Drizzle ORM](https://orm.drizzle.team/) & Drizzle Kit
- **Linting & Formatting**: ESLint (v10 flat config) + Prettier
- **Containerization**: Docker (multi-stage build with `oven/bun:1`) and Docker Compose

---

## 2. Directory Structure

> **Note on Constant vs. Dynamic Files**:
>
> - **Constant files**: `src/lib/KClient.ts`, `src/db/index.ts`, and `src/db/schema.ts` are foundational and constant.
> - **Dynamic contents**: `src/commands/` (varies by category & command), `src/db/schemas/`, `src/events/`, and other files under `src/lib/` evolve over time. Do not assume hardcoded lists of dynamic files; inspect the directories at runtime or execute commands to check their presence.

```
KL0/
├── .env                       # Environment configuration (Bot token, DB connection, Guild ID, etc.)
├── .gitignore                 # Git ignore rules
├── .prettierignore            # Files ignored by Prettier
├── .prettierrc.json           # Prettier configuration
├── bun.lock                   # Bun lockfile
├── compose.yaml               # Docker Compose configuration (Web service)
├── Dockerfile                 # Multi-stage Bun Docker image setup
├── drizzle.config.ts          # Drizzle Kit configuration (PostgreSQL dialect, schema paths)
├── eslint.config.ts           # Flat ESLint configuration with typescript-eslint
├── GEMINI.md                  # Project architecture & developer reference (this file)
├── index.ts                   # Application entry point
├── package.json               # Project manifest, dependencies, and lifecycle scripts
├── README.md                  # Quickstart documentation
├── tsconfig.json              # TypeScript configuration & path aliases
└── src/
    ├── commands/              # Dynamic: Slash commands categorized by directory (<category>/<command>.ts)
    ├── db/
    │   ├── index.ts           # Constant: Drizzle client initialization
    │   ├── schema.ts          # Constant: Central schema barrel export
    │   └── schemas/           # Dynamic: Modular table definitions and database enums
    ├── events/                # Dynamic: Discord client event handlers (<eventName>.ts)
    └── lib/
        ├── KClient.ts         # Constant: Extended Client class, command/event loaders & types
        └── ...                # Dynamic: Additional scripts and helper utilities (e.g., command registration)
```

---

## 3. Core Architecture & Patterns

### 3.1 Custom Client (`src/lib/KClient.ts`)

`KClient` extends `discord.js.Client` with automated discovery and typed collections:

- **Intents**: Configured for `Guilds`, `GuildMessages`, `GuildMembers`, `MessageContent`, and `GuildVoiceStates`.
- **Dynamic Event Loader (`loadEvents`)**: Automatically reads all files from `src/events/` and binds them to the client (`once` or `on`).
- **Dynamic Command Loader (`loadCommands`)**: Scans `src/commands/<category>/<command>.ts` and registers command handlers into `this.commands`.
- **Type Definitions & Cooldowns**:
    - `KEvent<T>`: Typed wrapper for Discord client events.
    - `KCommand<T>`: Strongly typed command definition supporting `'chatInput'`, `'contextMenu'`, and `'both'`.
    - `KCommandCooldownLevels`: Enum defining cooldown scopes (`User`, `Server`, `None`).

### 3.2 Commands (`src/commands/` - Dynamic)

- Structured strictly by categories (e.g., `src/commands/<category>/<command_name>.ts`).
- Each command file exports a default object typed as `KCommand<T>` containing:
    - `data`: Discord builder definition (`SlashCommandBuilder` / `ContextMenuCommandBuilder`).
    - `execute(client, interaction)`: Interaction execution callback.
    - Optional properties: `autocomplete`, `dev`, `restricted`, `cooldownMs`, `cooldownLevel`.

### 3.3 Events (`src/events/` - Dynamic)

- Structured per event file (e.g., `src/events/<eventName>.ts`).
- Each event file exports a default object conforming to `KEvent<EventName>`.
- The client binds handlers automatically based on `event.name` and the optional `event.once` flag.

### 3.4 Database Layer (`src/db/`)

- **`src/db/index.ts` (Constant)**: Initializes the Drizzle ORM instance with PostgreSQL (`node-postgres`) using `DATABASE_URL`.
- **`src/db/schema.ts` (Constant)**: Central barrel file that re-exports all modular tables and enums defined in `src/db/schemas/`.
- **`src/db/schemas/` (Dynamic)**: Modular table and enum definitions.

### 3.5 Library Utilities (`src/lib/`)

- In addition to the constant `KClient.ts`, helper utilities and scripts (such as command registration scripts interacting with `@discordjs/rest`) live here.

---

## 4. Development & Operation Commands

| Task                 | Command             | Description                                         |
| -------------------- | ------------------- | --------------------------------------------------- |
| **Development**      | `bun run dev`       | Runs bot in watch mode (`bun --watch run index.ts`) |
| **Start Production** | `bun run start`     | Runs bot in production mode                         |
| **Build**            | `bun run build`     | Bundles and minifies into `./dist`                  |
| **Deploy Commands**  | `bun run reg`       | Registers slash commands with Discord API           |
| **Push DB Schema**   | `bun run db:push`   | Pushes Drizzle schema directly to PostgreSQL        |
| **Drizzle Studio**   | `bun run db:studio` | Opens interactive web UI for database inspection    |
| **Type Checking**    | `bunx tsc --noEmit` | Runs TypeScript compiler type-check                |
| **Linting**          | `bun run lint`      | Runs ESLint across the codebase                     |
| **Formatting**       | `bun run prettier`  | Formats files using Prettier                        |

---

## 5. Environment Variables (`.env`)

The project expects the following environment variables:

- `TOKEN`: Discord bot authorization token.
- `DATABASE_URL`: PostgreSQL connection string (e.g., `postgresql://user:password@host:5432/dbname`).
- `GUILD_ID`: (Optional) Target Discord server ID for fast guild-level command registration.
- `PORT`: (Optional) Port mapping used by Docker / web service (defaults to 9000).

---

## 6. Conventions & Guidelines

1. **Path Aliases**: Always use `@/*` to reference paths inside `./src/` (configured in `tsconfig.json`).
2. **Commands Organization**: Place any new command under an appropriate category folder in `src/commands/<category>/<command_name>.ts`.
3. **Database Schemas**: Add modular tables and enums into `src/db/schemas/` and export them in `src/db/schema.ts`.
4. **Dynamic File Discovery**: Do not rely on hardcoded lists of commands, events, or schema files. Inspect the filesystem dynamically when discovering or working with them.
5. **TypeScript**: Keep strict typing intact; avoid `any`. Ensure `bunx tsc --noEmit` and `bun run lint` pass.
6. **Package Execution**: Always use `bunx` (single word, NEVER `bun x`) when running CLI tools or package binaries (e.g., `bunx tsc --noEmit`).
