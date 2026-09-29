/**
 * Pages /blind-test/<slug> : une page par recherche Google visée
 * (« blind test années 80 », « blind test disney »…). Chaque thème pointe sur
 * des playlists officielles existantes et, si elle existe, la room officielle.
 * Le texte est propre à chaque thème : une page sans contenu utile serait
 * ignorée par Google.
 */

const PL = {
  annees7080: "c2ed2b7f-bacf-46aa-a48f-bbaecd68b763",
  annees8090: "cece7dc8-5f26-42e0-b5f4-793504ade387",
  annees2000: "9a291b3d-bb06-4b5e-a5c0-260405900deb",
  rapFr: "6e9ccdc8-1257-4977-8ad3-9e4db3691cdd",
  rapUs: "7ae776b5-8fa7-4966-8150-8bb3b84a7544",
  rock: "122c8f5b-3232-49a5-97bb-861144a8b953",
  chanson: "09a2742e-121d-4b99-8e94-290b7f4b5eb4",
  techno: "5b750720-117b-4ece-bb2d-a9131e930842",
  films: "c09cab38-a21e-4589-b5d5-3a0799dad001",
  disney: "ea9c3f7d-36aa-402d-be11-24ad09bab2b1",
};

export const BLIND_TEST_THEMES = [
  {
    slug: "annees-80",
    name: "Années 80",
    emoji: "💽",
    title: "Blind test années 80 gratuit — en ligne ou en soirée | ZIK",
    h1: "Blind test années 80",
    description:
      "Blind test années 80 gratuit : plus de 700 tubes des années 80 et 90 à deviner en ligne ou en soirée sur la TV. Sans téléchargement, sans compte pour les joueurs.",
    intro: [
      "Synthés, boîtes à rythmes et refrains que tout le monde connaît sans savoir d'où : les années 80 sont le terrain idéal d'un blind test. Les plus jeunes reconnaissent les tubes repris partout, les plus âgés retrouvent leurs souvenirs de boum, et tout le monde chante.",
      "La playlist officielle ZIK « Années 1980-1990 » réunit plus de 700 titres, de la variété française à la pop anglo-saxonne. Chaque manche lance un extrait à un moment différent du morceau : impossible de tout deviner dès l'intro.",
    ],
    tips: [
      "Pour une soirée familiale, choisissez le mode « Choix multiples » : quatre propositions par manche, personne ne reste bloqué.",
      "Entre connaisseurs, passez en texte libre et exigez l'artiste et le titre pour marquer tous les points.",
      "Dix manches de 30 secondes font une partie d'environ 8 minutes : parfait pour enchaîner plusieurs parties.",
    ],
    faq: [
      {
        q: "Les chansons des années 80 sont-elles françaises ou internationales ?",
        a: "Les deux. La playlist mélange variété française et tubes internationaux, ce qui équilibre les chances entre joueurs.",
      },
      {
        q: "Peut-on ne jouer que sur les années 90 ?",
        a: "Oui : créez une playlist personnalisée ou importez une playlist Spotify ou Deezer des années 90, puis lancez-la en salon.",
      },
    ],
    playlists: [PL.annees8090],
    room: "FT4Y3R",
  },
  {
    slug: "annees-2000",
    name: "Années 2000",
    emoji: "💿",
    title: "Blind test années 2000 gratuit — tubes à deviner | ZIK",
    h1: "Blind test années 2000",
    description:
      "Blind test années 2000 : près de 700 tubes de la décennie à deviner entre amis, en ligne ou sur la TV du salon. Gratuit, les joueurs répondent depuis leur téléphone.",
    intro: [
      "R'n'B, pop, électro et premiers tubes rap : les années 2000 sont la décennie des 25-40 ans, celle des soirées au collège et des clips en boucle à la télé. Un blind test années 2000 fait toujours son effet, parce que tout le monde a une chanson qui lui rappelle quelque chose.",
      "La playlist officielle « Années 2000 » compte près de 700 titres. Les extraits démarrent à un endroit aléatoire du morceau : le refrain que vous attendez n'arrive pas forcément.",
    ],
    tips: [
      "Idéal pour un anniversaire de trentenaire : lancez le Mode Salon sur la TV et laissez les invités répondre depuis leur téléphone.",
      "Mélangez « Années 2000 » et « Années 1980-1990 » dans le même salon pour une partie intergénérationnelle.",
      "Activez l'avancement manuel pour commenter chaque réponse entre deux manches.",
    ],
    faq: [
      {
        q: "Quels styles de musique contient le blind test années 2000 ?",
        a: "Principalement pop, R'n'B, rap et électro, français et internationaux, sortis entre 2000 et 2009.",
      },
      {
        q: "Combien de joueurs peuvent participer ?",
        a: "En Mode Salon, autant de joueurs que de téléphones dans la pièce. En ligne, une room accueille aussi plusieurs joueurs en même temps.",
      },
    ],
    playlists: [PL.annees2000],
    room: "KM2H86",
  },
  {
    slug: "annees-70",
    name: "Années 70",
    emoji: "🕺",
    title: "Blind test années 70 gratuit — disco, rock et variété | ZIK",
    h1: "Blind test années 70",
    description:
      "Blind test années 70 : disco, rock et variété française, plus de 300 titres à deviner en ligne ou en soirée. Gratuit, sans application à installer.",
    intro: [
      "Disco, rock progressif, variété à paillettes : les années 70 ont produit une quantité de classiques qui passent encore en soirée. C'est la décennie parfaite pour faire jouer parents et grands-parents, qui prennent souvent leur revanche sur les plus jeunes.",
      "La playlist officielle « Années 1970 » rassemble plus de 300 titres. Comme sur toutes les playlists ZIK, l'extrait ne commence pas forcément au début du morceau.",
    ],
    tips: [
      "Pour un repas de famille, le mode « Choix multiples » garde tout le monde dans la partie.",
      "Associez-la à « Chanson Française » pour une soirée variété française.",
      "Sur un vidéoprojecteur, pensez à monter le son de l'écran hôte : c'est lui qui diffuse la musique.",
    ],
    faq: [
      {
        q: "Le blind test années 70 convient-il aux enfants ?",
        a: "Oui, en mode choix multiples : les propositions aident ceux qui ne connaissent pas les titres, et les parents s'en donnent à cœur joie.",
      },
      {
        q: "Faut-il télécharger une application ?",
        a: "Non. L'hôte ouvre ZIK dans un navigateur, les joueurs scannent un QR code avec leur téléphone.",
      },
    ],
    playlists: [PL.annees7080],
    room: "U22N49",
  },
  {
    slug: "rap-fr",
    name: "Rap français",
    emoji: "🇫🇷",
    title: "Blind test rap français gratuit — rap FR à deviner | ZIK",
    h1: "Blind test rap français",
    description:
      "Blind test rap FR : plus de 600 sons de rap français, des classiques aux sorties récentes. Jouez en ligne ou en soirée, gratuitement, sur ZIK.",
    intro: [
      "Du rap français des années 90 aux sons qui tournent en ce moment, un blind test rap FR départage vite les vrais connaisseurs. Reconnaître une prod en deux secondes, retrouver le featuring caché : c'est tout le sel du jeu.",
      "La playlist officielle « RAP FR » contient plus de 600 titres. Sur ZIK, les featurings rapportent des points en plus : citer tous les artistes d'un morceau fait la différence au classement.",
    ],
    tips: [
      "En texte libre, ZIK tolère les petites fautes de frappe : pas besoin d'écrire parfaitement le nom d'un rappeur.",
      "Les points de rapidité récompensent ceux qui trouvent dans les premières secondes.",
      "Pour une soirée rap complète, ajoutez « Rap US » dans le même salon.",
    ],
    faq: [
      {
        q: "Les featurings comptent-ils ?",
        a: "Oui. Chaque artiste invité trouvé rapporte des points supplémentaires, en plus de l'artiste principal et du titre.",
      },
      {
        q: "Peut-on jouer sur un seul rappeur ?",
        a: "Oui : importez une playlist Spotify ou Deezer consacrée à cet artiste, puis lancez-la dans une room ou un salon.",
      },
    ],
    playlists: [PL.rapFr],
    room: "KDP2G9",
  },
  {
    slug: "rap-us",
    name: "Rap US",
    emoji: "📀",
    title: "Blind test rap US gratuit — hip-hop américain | ZIK",
    h1: "Blind test rap US",
    description:
      "Blind test rap US : 400 sons de hip-hop américain, des classiques old school aux hits récents. Gratuit, en ligne ou en soirée sur la TV.",
    intro: [
      "Old school, trap, G-funk ou hits des charts : le rap américain a une histoire longue et des prods reconnaissables entre toutes. Un blind test rap US met à l'épreuve autant l'oreille que la culture hip-hop.",
      "La playlist officielle « Rap US » compte plus de 400 titres, avec des extraits pris à des moments différents du morceau pour éviter que les intros cultes rendent tout trop facile.",
    ],
    tips: [
      "Les noms d'artistes américains sont souvent longs : ZIK accepte les réponses approchantes.",
      "Mode choix multiples conseillé si tous les joueurs ne sont pas fans de hip-hop.",
      "Combinez « Rap US » et « RAP FR » pour une battle France / États-Unis.",
    ],
    faq: [
      {
        q: "Le blind test rap US contient-il des titres récents ?",
        a: "Oui, la playlist mélange classiques et titres plus récents pour que chaque génération ait ses repères.",
      },
      {
        q: "Est-ce vraiment gratuit ?",
        a: "Oui, ZIK est entièrement gratuit, sans publicité ni abonnement.",
      },
    ],
    playlists: [PL.rapUs],
    room: "T7J2PT",
  },
  {
    slug: "rock",
    name: "Rock & Metal",
    emoji: "🤘",
    title: "Blind test rock et metal gratuit — riffs à deviner | ZIK",
    h1: "Blind test rock & metal",
    description:
      "Blind test rock et metal : plus de 400 riffs et refrains à reconnaître, du rock classique au metal. Gratuit, en ligne ou en soirée.",
    intro: [
      "Un riff de guitare, un roulement de batterie, et la moitié de la pièce hurle déjà le nom du groupe : le rock est fait pour le blind test. Du rock classique au metal, les morceaux ont une identité forte qui se reconnaît en quelques notes.",
      "La playlist officielle « Rock / Metal » rassemble plus de 400 titres. Les extraits commencent à un endroit aléatoire : parfois le solo, parfois le couplet.",
    ],
    tips: [
      "Réglez des manches courtes (15 à 20 secondes) : les amateurs de rock reconnaissent vite.",
      "En texte libre, seul le nom du groupe suffit pour marquer l'artiste.",
      "Pour une soirée plus douce, mélangez avec « Années 1980-1990 ».",
    ],
    faq: [
      {
        q: "Y a-t-il du metal extrême ?",
        a: "La playlist officielle reste accessible au grand public. Pour du metal plus pointu, importez votre propre playlist Spotify ou Deezer.",
      },
      {
        q: "Peut-on jouer depuis un téléphone ?",
        a: "Oui, ZIK fonctionne dans le navigateur du téléphone, en ligne comme en Mode Salon.",
      },
    ],
    playlists: [PL.rock],
    room: "7GWTC6",
  },
  {
    slug: "chanson-francaise",
    name: "Chanson française",
    emoji: "🇫🇷",
    title: "Blind test chanson française gratuit — variété | ZIK",
    h1: "Blind test chanson française",
    description:
      "Blind test chanson française : près de 300 classiques de la variété, de Brel à aujourd'hui. Gratuit, idéal en famille sur la TV avec les téléphones.",
    intro: [
      "Les grands noms de la chanson et de la variété française ont une place à part dans les soirées : tout le monde connaît au moins le refrain. C'est le blind test qui réunit le plus facilement toutes les générations autour de la table.",
      "La playlist officielle « Chanson Française » contient près de 300 titres. En Mode Salon, la musique passe sur la TV et chacun répond sur son téléphone, sans compte.",
    ],
    tips: [
      "Parfait pour un repas de famille ou un anniversaire : lancez le mode choix multiples.",
      "Les titres de chansons françaises sont souvent longs : ZIK accepte les réponses proches.",
      "Associez « Chanson Française » et « Années 1970 » pour un voyage dans la variété.",
    ],
    faq: [
      {
        q: "Quelles époques couvre le blind test chanson française ?",
        a: "Des classiques d'après-guerre aux artistes actuels, avec une majorité de titres connus du grand public.",
      },
      {
        q: "Les joueurs doivent-ils créer un compte ?",
        a: "Non. Ils entrent un code et un pseudo. Un compte sert seulement à garder ses statistiques.",
      },
    ],
    playlists: [PL.chanson],
    room: "36952P",
  },
  {
    slug: "techno",
    name: "Techno",
    emoji: "💥",
    title: "Blind test techno et électro gratuit | ZIK",
    h1: "Blind test techno",
    description:
      "Blind test techno : plus de 200 bangers hard techno et électro à reconnaître. Un défi pour les oreilles entraînées, gratuit, en ligne ou en soirée.",
    intro: [
      "Deviner un morceau de techno sans paroles, c'est le niveau expert du blind test. Il faut reconnaître un kick, une montée, un sample : un vrai défi pour les habitués des festivals et des clubs.",
      "La playlist officielle « Hard Techno Bangers » compte plus de 200 titres. Ici l'artiste compte autant que le titre, et les producteurs ont souvent des noms qu'on ne voit qu'en line-up.",
    ],
    tips: [
      "Le mode choix multiples rend le thème jouable par des non-spécialistes.",
      "Allongez les manches à 45 secondes pour laisser le temps à la montée d'arriver.",
      "Idéal en before de soirée électro, sur l'enceinte du salon.",
    ],
    faq: [
      {
        q: "Le blind test techno est-il difficile ?",
        a: "Oui, c'est l'un des plus exigeants de ZIK. Le mode choix multiples le rend accessible à tous.",
      },
      {
        q: "Peut-on importer sa propre playlist électro ?",
        a: "Oui, depuis Spotify ou Deezer, puis la lancer en room ou en salon.",
      },
    ],
    playlists: [PL.techno],
    room: "LA4TWK",
  },
  {
    slug: "films",
    name: "Musiques de films",
    emoji: "🎬",
    title: "Blind test musiques de films gratuit — BO à deviner | ZIK",
    h1: "Blind test musiques de films",
    description:
      "Blind test musiques de films : plus de 160 bandes originales et chansons de films à reconnaître. Gratuit, parfait pour une soirée cinéma entre amis.",
    intro: [
      "Quelques notes d'une bande originale suffisent souvent à faire revenir une scène entière. Le blind test musiques de films plaît aussi bien aux cinéphiles qu'à ceux qui ne connaissent aucun titre de chanson : on devine le film, pas forcément l'artiste.",
      "La playlist officielle « Musiques de Films » rassemble plus de 160 bandes originales, signées Hans Zimmer, John Williams, Ennio Morricone ou Howard Shore. En Mode Salon, projetez-la sur grand écran pour une vraie ambiance cinéma.",
    ],
    tips: [
      "Précisez la règle avant de commencer : on cherche le compositeur, l'interprète ou le film ?",
      "Le mode choix multiples fonctionne très bien sur ce thème.",
      "Associez « Musiques de Films » et « Disney » pour une soirée familiale.",
    ],
    faq: [
      {
        q: "Faut-il trouver le nom du film ou de la chanson ?",
        a: "Sur ZIK, on répond l'artiste et le titre du morceau. En choix multiples, les propositions guident les joueurs.",
      },
      {
        q: "Y a-t-il des musiques de dessins animés ?",
        a: "Oui, et la playlist « Disney » est entièrement consacrée aux classiques animés.",
      },
    ],
    playlists: [PL.films],
    room: null,
  },
  {
    slug: "disney",
    name: "Disney",
    emoji: "🏰",
    title: "Blind test Disney gratuit — chansons de dessins animés | ZIK",
    h1: "Blind test Disney",
    description:
      "Blind test Disney : plus de 100 chansons de dessins animés et films Disney à deviner en famille. Gratuit, sur la TV avec les téléphones, sans compte pour les joueurs.",
    intro: [
      "Du Roi Lion à La Reine des neiges, les chansons Disney traversent les générations. C'est le blind test préféré des familles et des anniversaires d'enfants, mais les adultes sont souvent les plus acharnés.",
      "La playlist officielle « Disney » compte plus de 100 chansons. En Mode Salon, les enfants répondent depuis un téléphone ou une tablette, sans créer de compte.",
    ],
    tips: [
      "Avec des enfants, mode choix multiples et manches de 30 secondes.",
      "Pas assez de téléphones ? Faites des équipes : un appareil par équipe.",
      "Mélangez avec « Musiques de Films » pour les plus grands.",
    ],
    faq: [
      {
        q: "Le blind test Disney est-il adapté aux enfants ?",
        a: "Oui. En choix multiples, même les plus petits peuvent jouer, et l'interface est utilisable sur tablette.",
      },
      {
        q: "Les chansons sont-elles en français ?",
        a: "En grande majorité, oui : la playlist reprend les versions françaises des films.",
      },
    ],
    playlists: [PL.disney],
    room: "4XUQ94",
  },
  {
    slug: "anniversaire",
    name: "Anniversaire",
    emoji: "🎂",
    title: "Blind test anniversaire — animation musicale gratuite | ZIK",
    h1: "Blind test pour un anniversaire",
    description:
      "Organisez un blind test d'anniversaire en 2 minutes : la TV diffuse, les invités répondent sur leur téléphone. Gratuit, sans application ni compte pour les invités.",
    intro: [
      "Un blind test est l'animation d'anniversaire la plus simple à organiser : pas de matériel, pas de préparation, et tous les âges peuvent jouer. Avec le Mode Salon de ZIK, l'écran principal (TV, ordinateur ou vidéoprojecteur) diffuse la musique et le classement, et chaque invité répond depuis son téléphone.",
      "Choisissez les playlists selon l'âge de la personne fêtée : « Années 2000 » pour des trentenaires, « Années 1980-1990 » pour des quadras, « Disney » pour les enfants. Vous pouvez aussi importer sa playlist Spotify ou Deezer préférée.",
    ],
    tips: [
      "Préparez une playlist avec les chansons préférées de la personne fêtée : effet garanti.",
      "Enchaînez plusieurs courtes parties plutôt qu'une longue : le podium relance l'ambiance.",
      "Le QR code reste affiché en haut de l'écran : les retardataires rejoignent même en pleine partie.",
    ],
    faq: [
      {
        q: "Combien de temps faut-il pour préparer le blind test ?",
        a: "Deux minutes : choisir une ou plusieurs playlists, le nombre de manches, et afficher le QR code aux invités.",
      },
      {
        q: "Faut-il un compte pour organiser ?",
        a: "Non. Sans compte, vous accédez aux playlists publiques et officielles. Un compte permet en plus d'utiliser vos propres playlists.",
      },
    ],
    playlists: [PL.annees2000, PL.annees8090],
    room: null,
  },
  {
    slug: "mariage",
    name: "Mariage",
    emoji: "💍",
    title: "Blind test mariage — animation pour la soirée | ZIK",
    h1: "Blind test pour un mariage",
    description:
      "Animez un mariage avec un blind test : la musique passe sur l'écran de la salle, les invités jouent depuis leur téléphone. Gratuit, sans inscription pour les invités.",
    intro: [
      "Entre le dîner et l'ouverture du bal, un blind test fait participer toute la salle : les tables s'affrontent, les générations se mélangent, et le classement s'affiche en direct sur l'écran. Avec le Mode Salon de ZIK, il suffit d'un vidéoprojecteur ou d'une TV reliée à la sono.",
      "Préparez une playlist aux couleurs des mariés : les chansons de leur rencontre, leurs tubes de soirée, leurs années lycée. Importez-la depuis Spotify ou Deezer et lancez-la en salon le jour J.",
    ],
    tips: [
      "Jouez par table : un téléphone par table, un pseudo par table.",
      "Glissez dans la playlist les chansons qui ont marqué l'histoire des mariés.",
      "Testez le son et le QR code la veille, dans la salle si possible.",
    ],
    faq: [
      {
        q: "Combien d'invités peuvent jouer en même temps ?",
        a: "Autant que de téléphones connectés au salon. Pour un grand mariage, faire jouer par table reste le plus lisible.",
      },
      {
        q: "Faut-il une connexion internet dans la salle ?",
        a: "Oui, l'écran principal et les téléphones doivent être connectés (Wi-Fi ou réseau mobile).",
      },
    ],
    playlists: [PL.annees8090, PL.chanson],
    room: null,
  },
];

export function findTheme(slug) {
  return BLIND_TEST_THEMES.find((t) => t.slug === slug) ?? null;
}
