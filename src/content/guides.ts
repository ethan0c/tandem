/**
 * Search guides: each answers one question people actually search, completely, and only then mentions
 * how Tandem helps. A few good pages; never mass-produced ones (Google penalises those).
 */

export type Block =
  | { p: string }
  | { steps: string[] }
  | { list: string[] }
  | { h: string };

export interface Guide {
  slug: string;
  /** The page title and H1: the question, phrased the way people search it. */
  title: string;
  /** Search result snippet and link preview: under ~155 characters. */
  description: string;
  updated: string;
  body: Block[];
}

export const guides: Guide[] = [
  {
    slug: "watch-youtube-together",
    title: "How to watch YouTube together online, in sync, with video chat",
    description:
      "Watch the same YouTube video with someone far away: play, pause and skip together, and see each other in a video call beside the video.",
    updated: "2026-10-14",
    body: [
      { p: "Counting down “3, 2, 1, play” works for about thirty seconds. Then one of you buffers, someone pauses to grab a snack, and you are watching different moments. Here is how to stay in sync for the whole video, and still see each other." },
      { h: "The quickest way: a watch-together extension" },
      { p: "A browser extension can control the YouTube player on both computers at once. When either of you plays, pauses or skips, the other follows within a fraction of a second." },
      { steps: [
        "Both of you install Tandem in Chrome, Edge or Brave. It is free and needs no account.",
        "Open the YouTube video you want to watch.",
        "Click the Tandem button in your browser toolbar and choose “Create a room”. A small call window appears in the corner of the page.",
        "Choose “Copy invite” and send the link to the other person. The link walks them through installing the extension, then opens the same video in your room.",
        "Press play. Either of you can pause or skip, and the call stays visible even when you make the video fullscreen.",
      ] },
      { h: "What about ads?" },
      { p: "YouTube shows ads at different times to different people, which is the most common way a watch session drifts apart. Tandem notices when one of you is watching an ad and pauses the other person’s video until it is over, then you carry on together." },
      { h: "Without installing anything" },
      { p: "If one of you cannot install extensions, the other can share the browser tab instead. Open a Tandem room, choose “Share tab”, pick the YouTube tab and turn on “Also share tab audio”. Only the person sharing needs the video open; the other watches the stream. Picture quality depends on the sharer’s connection, so the extension is the better choice when you both can use it." },
      { h: "Tips for a smoother watch" },
      { list: [
        "Use headphones, so the video’s sound does not echo back through your microphone.",
        "If the call stutters, turn your camera off for a moment: the video sync does not depend on it.",
        "Sign in to YouTube on both computers if the video is age-restricted or members-only; you each need access to it.",
      ] },
    ],
  },
  {
    slug: "watch-movies-together-long-distance",
    title: "How to watch movies together long distance",
    description:
      "Three ways to watch a movie with someone far away, kept in sync, with your video call next to the film. What each needs and when to use it.",
    updated: "2026-10-14",
    body: [
      { p: "Watching a movie together is one of the easiest ways to feel close when you are far apart. The hard part is not the movie: it is keeping both screens at the same moment while still being able to see each other’s reactions. There are three good ways to do it, depending on where the movie is." },
      { h: "1. It is on a streaming site you both use" },
      { p: "Use a watch-together extension. You each play the movie from your own account, so the picture is full quality on both ends, and the extension keeps playback in sync. With Tandem your video call floats over the movie and stays there in fullscreen." },
      { steps: [
        "Both install the Tandem extension (Chrome, Edge or Brave on a computer).",
        "One of you opens the movie, clicks the Tandem button and creates a room.",
        "Send the invite link. The other person lands on the same movie, in the same room.",
      ] },
      { p: "You both need access to the movie on that site, and on some sites ads or regional differences can get you out of step. Pressing pause and play once usually brings you back together." },
      { h: "2. Only one of you can play it" },
      { p: "Share the browser tab playing the movie. In a Tandem room choose “Share tab”, pick the tab, and turn on “Also share tab audio” so the other person hears it. This works for anything that plays in a browser, but some streaming sites block screen sharing and show a black picture to the viewer." },
      { h: "3. You both have the same video file" },
      { p: "If you each have a copy of the same file (a home video, or a film you bought as a download), choose “Video file” in a Tandem room and pick it on both computers. Nothing is uploaded: each of you plays your own copy, and Tandem keeps them in sync." },
      { h: "Make it feel like a date" },
      { list: [
        "Plan it like one: pick a time, and send a calendar invite so it does not get pushed aside. Tandem’s planner shows the time in both of your time zones.",
        "Order the same snack, or cook the same meal before the movie.",
        "Keep your camera on for the first few minutes and the ending, even if you turn it off in the middle.",
        "Send reactions instead of talking over the best scenes.",
      ] },
    ],
  },
  {
    slug: "long-distance-movie-night-ideas",
    title: "Long-distance movie night ideas that actually feel like a date",
    description:
      "Ideas for a long-distance movie night: themes, rituals and small touches that make watching together from two homes feel like the same couch.",
    updated: "2026-10-14",
    body: [
      { p: "A long-distance movie night can feel like two people watching TV in different rooms, or it can feel like a date. The difference is almost never the movie. It is the small rituals around it." },
      { h: "Before the movie" },
      { list: [
        "Put it in the calendar. A planned night with a countdown feels like an event; “let’s watch something later” rarely happens.",
        "Take turns picking, and the picker has to pitch it in one sentence.",
        "Eat the same thing: order from the same chain, or cook the same recipe together on the call first.",
        "Dress for it. Matching pyjamas, or the hoodie you stole from them.",
      ] },
      { h: "Themes worth trying" },
      { list: [
        "The first movie you ever watched together, or the one playing when you met.",
        "Each other’s childhood favourite, on alternating weeks.",
        "A series night: one episode a week of a show neither of you has seen, so you only ever watch it together.",
        "Bad-movie night: the lowest-rated film you can find, with a drinking game for every cliché (or a snack game).",
        "Around the world: a film from a country you want to visit together.",
      ] },
      { h: "During the movie" },
      { list: [
        "Keep the call visible but small, so you can see each other react without blocking the film.",
        "Use reactions for the big moments instead of talking over the dialogue.",
        "If one of you needs a break, pause for both of you. Watching alone while the other is gone defeats the point.",
      ] },
      { h: "After the movie" },
      { list: [
        "Rate it out of ten at the same time, on three: “3, 2, 1”.",
        "Keep a shared list of everything you have watched together, with both ratings.",
        "End the call with plans for the next one.",
      ] },
      { p: "Tandem was built for exactly this: your call floats over the show, playback stays in sync, you can send hearts that float across both screens, and the BRB button pauses the show while one of you steps away. Its planner sends a calendar invite in both of your time zones." },
    ],
  },
  {
    slug: "teleparty-alternative",
    title: "A Teleparty alternative with video chat beside the show",
    description:
      "Looking for a Teleparty alternative? Tandem is a free watch-together extension built around a video call that sits beside the show, for couples and close friends.",
    updated: "2026-10-14",
    body: [
      { p: "Teleparty is one of the best-known watch-party extensions: it keeps playback in sync and gives everyone a chat beside the video. If a chat is what you want, it is a solid choice. But if you are watching with one person you would rather see than text, you might want something built around the call instead." },
      { h: "What Tandem does differently" },
      { list: [
        "The video call is the centre. Your faces float over the show in a small window you can move and resize, and it stays visible in fullscreen.",
        "It is built for two. Planning a watch night, sending a reaction that floats across both screens, pausing for both of you when one steps away: everything assumes a couple or close friends, not a crowd.",
        "Ads do not split you up. On YouTube, when one of you gets an ad, the other’s video waits.",
        "It remembers your shows. Tandem keeps a list of what you watched together and where you stopped, so you can resume in the same room.",
        "No account. Choose a name and join. Your watch history stays in your browser.",
      ] },
      { h: "When another tool is the better fit" },
      { p: "If you host big groups, or you mostly want a text chat beside the show, a chat-first watch party fits better. Tandem works with more than two people, but it is designed and tuned for two." },
      { h: "Try it" },
      { steps: [
        "Install Tandem in Chrome, Edge or Brave.",
        "Open what you want to watch and choose “Create a room” from the Tandem button.",
        "Send the invite. It helps the other person get set up and lands them on the same episode.",
      ] },
    ],
  },
  {
    slug: "watch-a-video-file-together",
    title: "How to watch a video file together online, in sync",
    description:
      "Watch the same video file with someone far away without uploading it: each of you plays your own copy, kept in sync, with a video call alongside.",
    updated: "2026-10-14",
    body: [
      { p: "Home videos, a film you bought as a download, a recording of a concert: sometimes the thing you want to watch together is a file, not a streaming link. You do not need to upload it anywhere, and you do not need to share your screen." },
      { h: "Play your own copies, in sync" },
      { p: "If you both have the same file, each of you can play your own copy and let a watch-together app keep them at the same moment. Because nothing is streamed between you, the picture is perfect on both ends and it barely uses any internet." },
      { steps: [
        "Make sure you both have the same file. Send it ahead of time through a cloud drive if needed.",
        "Create a Tandem room and send the link.",
        "Choose “Video file” and pick the file. Tandem asks the other person to pick the same file on their computer.",
        "Press play. Either of you can pause or skip, and the other follows.",
      ] },
      { p: "MP4 and WebM files play best in a browser. If a file will not open, it may use a format browsers cannot play; converting it to MP4 fixes that." },
      { h: "If only one of you has it" },
      { p: "Open the file in a browser tab on the computer that has it (drag it into Chrome), then share that tab in the Tandem room with “Also share tab audio” turned on. The other person watches the stream. This uses more internet on the sharer’s side, so close other downloads while you watch." },
      { h: "Privacy" },
      { p: "With the first method the file never leaves your computer: Tandem only shares whether the video is playing and where you are in it." },
    ],
  },
  {
    slug: "share-browser-tab-with-sound",
    title: "How to share a browser tab with sound in a video call",
    description:
      "Share a Chrome or Edge tab with its audio in a video call, so the other person hears the video too. Step by step, plus fixes for no sound or a black screen.",
    updated: "2026-10-14",
    body: [
      { p: "The most common problem with sharing a video in a call is that the other person sees it but cannot hear it. That is because sharing the screen and sharing its sound are separate choices, and the sound is off by default." },
      { h: "Share a tab with its sound (Chrome and Edge)" },
      { steps: [
        "Open the video you want to share in its own browser tab.",
        "In your call, choose to share your screen. In Tandem, choose “Share tab”.",
        "In the browser’s picker, select the “Tab” option (not “Window” or “Entire screen”), and pick the tab with your video.",
        "Turn on “Also share tab audio” at the bottom of the picker.",
        "Click Share, then play the video in that tab.",
      ] },
      { p: "Sharing a tab, rather than a window or the whole screen, is what makes the sound option appear. It also means the other person only sees that tab, not your notifications." },
      { h: "If they cannot hear it" },
      { list: [
        "Stop sharing and share again with “Also share tab audio” turned on.",
        "Make sure the tab itself is not muted (right-click the tab).",
        "Safari and Firefox cannot share tab audio. Use Chrome or Edge on a computer.",
      ] },
      { h: "If they see a black screen" },
      { p: "Some streaming services block screen sharing, so viewers only see black. In that case, have each person play the video from their own account and use a watch-together extension to keep you in sync instead of sharing." },
      { h: "Avoid the echo" },
      { p: "When you share sound, your microphone can pick up the video from your speakers and send it back. Wear headphones, and your call stays clear." },
    ],
  },
];

export function guide(slug: string) {
  return guides.find((g) => g.slug === slug) ?? null;
}
