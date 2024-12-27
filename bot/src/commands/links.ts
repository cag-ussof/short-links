import {
	type APIApplicationCommandBasicOption,
	ApplicationCommandOptionType,
	type AutocompleteInteraction,
	Command,
	type CommandInteraction,
	type CommandOptions,
	CommandWithSubcommands,
	Embed,
	LinkButton,
	Row,
} from "@buape/carbon";
import { sendToInternalLogs, type Env } from "../index";
import urlRegexSafe from "url-regex-safe";

type ShortLink = {
	redirect_url: string;
	hits: number;
};

const mainDomain = "go.cag-ussof.org";

const handleShortLinkAutocomplete = async (
	interaction: AutocompleteInteraction,
	env: Env,
) => {
	const domain = interaction.options.getString("domain");
	const links = await env.SHORT_LINKS.list({ prefix: `${domain}:` });

	if (!links.keys.length) {
		return interaction.respond([
			{ name: "No links found!", value: "NO_LINKS_FOUND_FOR_DOMAIN" },
		]);
	}

	const options = links.keys.map((key) => {
		const slug = key.name.split(":")[1];
		return {
			name: slug,
			value: slug,
		};
	});

	return interaction.respond(options);
};

class CreateLink extends Command {
	private env: Env;

	constructor(env: Env) {
		super();
		this.env = env;
	}

	name = "create";
	description = "Create a short-link via Buape Link";
	options: APIApplicationCommandBasicOption[] = [
		{
			name: "domain",
			type: ApplicationCommandOptionType.String,
			description:
				"The domain this short-link should be created on (e.g. 'go.xanderxx.xyz')",
			required: true,
			choices: [
				{
					name: mainDomain,
					value: mainDomain,
				},
			],
		},
		{
			name: "url",
			type: ApplicationCommandOptionType.String,
			description: "The URL the short-link should redirect to",
			required: true,
		},
		{
			name: "slug",
			type: ApplicationCommandOptionType.String,
			description: "The slug for the short-link",
			required: true,
		},
	];

	async run(interaction: CommandInteraction) {
		const domain = interaction.options.getString("domain");
		const url = interaction.options.getString("url");
		const slug = interaction.options.getString("slug");

		if (!domain || !url || !slug) {
			return interaction.reply({ content: "Missing required options" });
		}

		const isValidLink = urlRegexSafe().test(url);
		if (!isValidLink) {
			return interaction.reply({
				content: "Invalid URL. Please provide a valid URL",
			});
		}

		const value = {
			redirect_url: url,
			hits: 0,
		};
		await this.env.SHORT_LINKS.put(
			`${domain}:${slug}`,
			JSON.stringify(value),
		).catch((e) => {
			return interaction.reply({
				content: `Error creating short-link: ${e.message}`,
			});
		});
		await sendToInternalLogs(
			`Short-link created by <@${interaction.user?.id}> (${interaction.user?.id}): <https://${domain}/${slug}> -> <${url}>`,
			this.env,
		);
		return interaction.reply({
			content: `Short-link created: https://${domain}/${slug}`,
		});
	}
}

class DeleteLink extends Command {
	private env: Env;

	constructor(env: Env) {
		super();
		this.env = env;
	}

	name = "delete";
	description = "Delete a short-link via Buape Link";
	options: APIApplicationCommandBasicOption[] = [
		{
			name: "domain",
			type: ApplicationCommandOptionType.String,
			description:
				"The domain this short-link should be deleted from (e.g. 'go.xanderxx.xyz')",
			required: true,
			choices: [
				{
					name: mainDomain,
					value: mainDomain,
				},
			],
		},
		{
			name: "link",
			type: ApplicationCommandOptionType.String,
			description:
				"The link to be deleted (e.g. `cag (https://cag-ussof.org)`)",
			required: true,
			autocomplete: true,
		},
	];

	async run(interaction: CommandInteraction) {
		const domain = interaction.options.getString("domain");
		const link = interaction.options.getString("link");

		if (!domain || !link) {
			return interaction.reply({ content: "Missing required options" });
		}

		const key = `${domain}:${link}`;
		const url = await this.env.SHORT_LINKS.get(key);

		if (!url) {
			return interaction.reply({
				content: `Short-link not found: ${key}`,
			});
		}

		await this.env.SHORT_LINKS.delete(key).catch((e) => {
			return interaction.reply({
				content: `Error deleting short-link: ${e.message}`,
			});
		});
		await sendToInternalLogs(
			`Short-link deleted by <@${interaction.user?.id}> (${interaction.user?.id}): <https://${domain}/${link}> -> <${url}>`,
			this.env,
		);
		return interaction.reply({
			content: `Short-link deleted: \`https://${domain}/${link}\``,
		});
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		return handleShortLinkAutocomplete(interaction, this.env);
	}
}

class StatsLink extends Command {
	private env: Env;

	constructor(env: Env) {
		super();
		this.env = env;
	}

	name = "stats";
	description = "Get stats of a short-link via Buape Link";
	options: APIApplicationCommandBasicOption[] = [
		{
			name: "domain",
			type: ApplicationCommandOptionType.String,
			description:
				"The domain this short-link is served from (e.g. 'go.xanderxx.xyz')",
			required: true,
			choices: [
				{
					name: mainDomain,
					value: mainDomain,
				},
			],
		},
		{
			name: "link",
			type: ApplicationCommandOptionType.String,
			description:
				"The link to get stats on (e.g. `kiai-docs (https://docs.kiai.app)`)",
			required: true,
			autocomplete: true,
		},
	];

	async run(interaction: CommandInteraction) {
		const domain = interaction.options.getString("domain");
		const link = interaction.options.getString("link");

		if (!domain || !link) {
			return interaction.reply({ content: "Missing required options" });
		}

		const key = `${domain}:${link}`;
		const url = await this.env.SHORT_LINKS.get(key);

		if (!url) {
			return interaction.reply({
				content: `Short-link not found: ${key}`,
			});
		}

		const parsedValue = JSON.parse(url) as ShortLink;

		return interaction.reply({
			content: `Stats for short-link: \`https://${domain}/${link}\`\n\n**Link**: \`${parsedValue.redirect_url}\`\n**Total Hits**: ${parsedValue.hits}`,
		});
	}

	async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
		return handleShortLinkAutocomplete(interaction, this.env);
	}
}

class ListLinks extends Command {
	private env: Env;

	constructor(env: Env) {
		super();
		this.env = env;
	}

	name = "list";
	description = "List all short-links";

	async run(interaction: CommandInteraction) {
		const links = await this.env.SHORT_LINKS.list();

		const footer = links.keys.length;

		if (!links.keys.length) {
			return interaction.reply({
				content: "No short-links found",
			});
		}

		const shortLinks: Record<
			string,
			Array<{ slug: string; link: ShortLink }>
		> = {};

		for (const key of links.keys) {
			if (!key.name.includes(":")) {
				console.warn(`Skipping invalid key format: ${key.name}`);
				continue;
			}

			const [domain, slug] = key.name.split(":");

			if (!domain || !slug) {
				console.warn(`Skipping invalid key format: ${key.name}`);
				continue;
			}

			const value = await this.env.SHORT_LINKS.get(key.name);
			if (!value) {
				console.warn(`No value found for key: ${key.name}`);
				continue;
			}

			let parsedValue: ShortLink;
			try {
				parsedValue = JSON.parse(value) as ShortLink;
				if (!parsedValue.redirect_url || typeof parsedValue.hits !== "number") {
					console.warn(`Invalid value format for key: ${key.name}`);
					continue;
				}
			} catch (error) {
				console.error(`Error parsing value for key ${key.name}:`, error);
				continue;
			}

			if (!shortLinks[domain]) {
				shortLinks[domain] = [];
			}

			shortLinks[domain].push({
				slug,
				link: parsedValue,
			});
		}

		let content = "";
		let title = "";

		for (const [domain, links] of Object.entries(shortLinks)) {
			title += `${domain}`;
			for (const { slug, link } of links) {
				content += `**Link:** https://${domain}/${slug}\n **Target:** ${link.redirect_url} (Uses: ${link.hits})\n\n`;
			}
			content += "\n";
		}

		const mainEmbed = new MainEmbed(title, content, `${footer} Link(s)`);

		return interaction.reply({
			embeds: [mainEmbed],
		});
	}
}

let mainEmbed: Embed;

class MainEmbed extends Embed {
	constructor(title: string, description: string, footerText: string) {
		super({});
		this.description = description;
		this.title = title;
		this.color = 0x454b1b;
		this.footer = {
			text: footerText,
		};
	}
}

export default class LinksRootCommand extends CommandWithSubcommands {
	private env: Env;
	name = "links";
	description = "Short-link root command";
	defer = true;
	subcommands: Command[];

	constructor(env: Env) {
		super();
		this.env = env;
		this.subcommands = [
			new CreateLink(this.env),
			new DeleteLink(this.env),
			new StatsLink(this.env),
			new ListLinks(this.env),
		];
	}
}
