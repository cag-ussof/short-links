import { Command, type CommandInteraction, Embed } from "@buape/carbon";
import type { Env } from "../index";

type ShortLink = {
	redirect_url: string;
	hits: number;
};

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

export default class ListLinks extends Command {
	private env: Env;

	constructor(env: Env) {
		super();
		this.env = env;
	}

	name = "list-links";
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
