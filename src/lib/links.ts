export const GITHUB = "https://github.com/ethan0c";

/** The extension's Chrome Web Store listing (Edge and Brave install from it too). NEXT_PUBLIC_EXTENSION_URL overrides it. */
export const EXTENSION_URL =
  process.env.NEXT_PUBLIC_EXTENSION_URL || "https://chromewebstore.google.com/detail/cbllpgpbalhffmpnalmmehkcgcjajjck";

/** Where people add Tandem's Discord app, once NEXT_PUBLIC_DISCORD_APP_ID is set. */
export const DISCORD_ADD_URL = process.env.NEXT_PUBLIC_DISCORD_APP_ID
  ? `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_DISCORD_APP_ID}`
  : null;

/** The public site, for sitemaps, structured data and anything else that needs absolute URLs. */
export const SITE_URL = "https://www.ilovemygf.site";
