// Import the Carbon client
import { Client, createHandle } from "@buape/carbon";
import { createHandler } from "@buape/carbon/adapters/cloudflare";
import type { KVNamespace } from "@cloudflare/workers-types";
import PingCommand from "./commands/ping";
import LinksRootCommand from "./commands/link-admin";
import ListLinks from "./commands/list-links";

export type Env = {
	DISCORD_CLIENT_ID: string;
	DISCORD_PUBLIC_KEY: string;
	DISCORD_BOT_TOKEN: string;
	DEPLOY_SECRET: string;
	SHORT_LINKS: KVNamespace;
	ACCESS_KEY: string;
	INTERNAL_LOGS_WEBHOOK: string;
};

const handle = createHandle((env) => {
	const client = new Client(
		{
			baseUrl: String(env.BASE_URL),
			deploySecret: String(env.DEPLOY_SECRET),
			clientId: String(env.DISCORD_CLIENT_ID),
			publicKey: String(env.DISCORD_PUBLIC_KEY),
			token: String(env.DISCORD_BOT_TOKEN),
		},
		[
			new LinksRootCommand(env as unknown as Env),
			new PingCommand(),
			new ListLinks(env as unknown as Env),
		],
	);
	return [client];
});

const handler = createHandler(handle);
export default { fetch: handler };

export const sendToInternalLogs = async (message: string, env: Env) => {
	await fetch(env.INTERNAL_LOGS_WEBHOOK, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: message,
			allowed_mentions: { parse: [] },
		}),
	}).catch((e) => {
		console.error(`Error sending to internal logs: ${e.message}`);
	});
};
