export const GITHUB = "https://github.com/ethan0c";

/** Where to get the extension. Point NEXT_PUBLIC_EXTENSION_URL at the Chrome Web Store listing once it is live. */
export const EXTENSION_URL = process.env.NEXT_PUBLIC_EXTENSION_URL || GITHUB;

/** Where people add Tandem's Discord app, once NEXT_PUBLIC_DISCORD_APP_ID is set. */
export const DISCORD_ADD_URL = process.env.NEXT_PUBLIC_DISCORD_APP_ID
  ? `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_APP_ID}`
  : null;

/** The public site, for sitemaps, structured data and anything else that needs absolute URLs. */
export const SITE_URL = "https://www.ilovemygf.site";
