import { YouTube, Util } from "youtube-sr";

// youtube-sr lit browseId sans garde : une vidéo en collab (plusieurs
// chaînes) fait planter toute la recherche. On saute juste cette vidéo.
if (Util?.parseVideo && !Util.parseVideo.__zikSafe) {
  const parse = Util.parseVideo.bind(Util);
  Util.parseVideo = (data) => {
    try {
      return parse(data);
    } catch {
      return undefined;
    }
  };
  Util.parseVideo.__zikSafe = true;
}

export { YouTube };
