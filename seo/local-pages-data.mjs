export const business = {
  name: "Better Mood Coffee",
  siteUrl: "https://bmoodcoffee.com",
  addressLine: "13 Poniente 2302/F, Col. La Paz, Puebla",
  mapsUrl: "https://maps.google.com/?q=13+Poniente+2302%2FF,+La+Paz,+Puebla,+Puebla",
  wazeUrl: "https://waze.com/ul?q=13%20Poniente%202302%20F%20La%20Paz%20Puebla",
  whatsappUrl: "https://wa.me/message/WQWEEODGY6H2P1",
  uberEatsUrl:
    "https://www.ubereats.com/store/better-mood-coffee/hPA2fzGUX9WLGGvkeNwCrg?diningMode=DELIVERY",
  rappiUrl:
    "https://www.rappi.com.mx/restaurantes/delivery/495986-better-mood-coffee?utm_source=app&utm_medium=deeplink&utm_campaign=share",
  menuUrl: "/menu/",
  productsUrl: "https://drive.google.com/drive/folders/17h4TmJz7SYwpuY8gR-75qDLrflPmosqd?usp=share_link",
  instagramUrl: "https://instagram.com/bettermood.coffee",
  facebookUrl: "https://facebook.com/bettermoodcoffee",
  reviewsUrl: "https://bmoodcoffee.com/#sucursales",
  hours: [
    { label: "Lunes a Viernes", value: "8:00 – 21:00" },
    { label: "Sábado", value: "9:00 – 20:00" },
    { label: "Domingo", value: "10:00 – 18:00" }
  ],
  amenities: ["Wi‑Fi", "Enchufes", "Pet friendly", "Estacionamiento"]
};

export const footerLocalGuides = [
  { href: "/cafeteria-en-la-paz-puebla/", label: "Cafetería en La Paz Puebla" },
  { href: "/cafeteria-pet-friendly-puebla/", label: "Cafetería pet friendly Puebla" },
  { href: "/cafeteria-para-trabajar-puebla/", label: "Cafetería para trabajar Puebla" },
  { href: "/cafeteria-con-wifi-puebla/", label: "Cafetería con Wi‑Fi Puebla" },
  { href: "/matcha-en-puebla/", label: "Matcha en Puebla" },
  { href: "/cold-brew-en-puebla/", label: "Cold brew en Puebla" },
  { href: "/brunch-en-puebla/", label: "Brunch en Puebla" },
  { href: "/bebidas-funcionales-puebla/", label: "Recetas de la casa Puebla" },
  { href: "/adaptogenos-en-bebidas-puebla/", label: "Ingredientes adaptógenos Puebla" }
];

const guideLookup = Object.fromEntries(footerLocalGuides.map((entry) => [entry.href, entry]));

const staticLinkLabels = {
  "/bienestar/": { label: "Nuestra forma de servir" },
  "/recompensas/": { label: "Recompensas Better Mood" },
  "/recomendador/": { label: "Recomendador de bebidas" },
  "/cafe-de-especialidad-puebla/": { label: "Café de especialidad en Puebla" },
  "/origen-cafe/": { label: "Origen del café" },
  "/recorrido-cafe/": { label: "Recorrido del café" },
  "/eventos/": { label: "Eventos Better Mood" },
  "/como-preparar-cafe-en-casa/": { label: "Cómo preparar café en casa" },
  "/talleres-de-cafe-puebla/": { label: "Talleres de café en Puebla" }
};

const baseCta = {
  title: "Tu pausa, tu ritmo, tu bienestar.",
  text: "Revisa el menú, abre Maps o escribe por WhatsApp para pedir, visitar la sucursal o resolver dudas antes de ir."
};

export const localPagesData = [
  {
    slug: "cafeteria-en-la-paz-puebla",
    title: "Cafetería en La Paz Puebla | Better Mood Coffee",
    description:
      "Descubre Better Mood Coffee en La Paz, Puebla: café de especialidad, bebidas funcionales y una pausa clara para pedir, trabajar o visitar.",
    keywords:
      "cafetería en La Paz Puebla, café en La Paz Puebla, coffee shop La Paz Puebla, Better Mood Coffee La Paz",
    h1: "Cafetería en La Paz, Puebla para una pausa bien pensada.",
    heroText:
      "Si estás buscando una cafetería en La Paz, Puebla, Better Mood combina café de especialidad, bebidas funcionales y una experiencia clara desde la primera visita.",
    eyebrow: "Guía local Better Mood",
    image: "/assets/hero-coffee.jpg",
    imageAlt: "Barra y fachada de Better Mood Coffee en La Paz, Puebla",
    benefits: [
      "Ubicación clara en 13 Poniente 2302/F, Col. La Paz, Puebla.",
      "Café de especialidad con menú rápido de entender y opciones funcionales.",
      "Amenidades visibles para visita cómoda: Wi‑Fi, enchufes, pet friendly y estacionamiento."
    ],
    sections: [
      {
        heading: "Por qué esta búsqueda importa en Puebla",
        paragraphs: [
          "Quien busca una <strong>cafetería en La Paz Puebla</strong> casi nunca está buscando solo una dirección. Normalmente necesita resolver algo más concreto: encontrar una buena taza cerca, ubicar un lugar cómodo para reunirse, pedir algo rápido en una zona bien conectada o descubrir una cafetería que se sienta más cuidada que una parada genérica.",
          "La colonia La Paz funciona precisamente para ese tipo de plan. Es una zona que concentra oficinas, trayectos cortos, reuniones informales y pausas entre pendientes. Better Mood encaja bien en ese patrón porque no se presenta solo como un café bonito: combina una barra clara, bebidas de especialidad, funcionales entendibles y opciones para pedir o visitar sin fricción."
        ]
      },
      {
        heading: "Qué hace distinta la experiencia Better Mood",
        paragraphs: [
          "La diferencia principal está en la claridad. En vez de saturar con términos difíciles o promesas vacías, Better Mood parte desde una base sólida: café de especialidad, carta simple, productos visibles y una conversación responsable sobre bienestar. Eso permite que la experiencia funcione igual de bien si llegas por un espresso rápido, por una bebida fría o por curiosidad sobre el lado funcional del menú.",
          "También importa el contexto de la visita. Si vienes en coche, a pie o entre reuniones, la ubicación en La Paz resulta práctica. Si quieres sentarte un rato, hay amenidades visibles en el sitio como Wi‑Fi, enchufes, espacio pet friendly y estacionamiento. Esa combinación ayuda a que la visita no dependa de un solo motivo."
        ]
      },
      {
        heading: "Qué pedir si visitas Better Mood por primera vez",
        paragraphs: [
          "Para una primera visita en La Paz conviene arrancar con algo muy claro en taza. Si vienes por café, un <strong>flat white</strong>, un <strong>americano</strong> o un <strong>café filtrado</strong> te dejan leer mejor la base de especialidad. Si prefieres una bebida con un perfil más suave, el <strong>latte cocochata</strong> o el <strong>matcha cocochata</strong> funcionan bien como entrada al menú.",
          "Si llegas con más tiempo o quieres una bebida distintiva de la marca, Better Mood también tiene creaciones propias como <strong>Nirvana Lavanda</strong> y <strong>Cold Berry Days</strong>. En ambos casos conviene revisar el menú PDF o preguntar por disponibilidad para elegir con criterio y no a ciegas."
        ]
      },
      {
        heading: "Una cafetería local que convierte visita en relación",
        paragraphs: [
          "Lo valioso de una cafetería bien ubicada en La Paz no es solo que te quede cerca. Es que te dé razones para volver. Better Mood trabaja ese punto desde varios ángulos: pedir a domicilio por Uber Eats o Rappi, registrarte en recompensas, revisar el recomendador de bebidas y consultar las guías del sitio antes de elegir.",
          "Eso hace que la experiencia no dependa de una sola visita improvisada. Puedes llegar por cercanía, quedarte por el café y seguir conectado por menú, recompensas o contenido educativo. Desde SEO local, esa es la diferencia entre una ficha más y una marca que sí responde a lo que la búsqueda necesita."
        ]
      }
    ],
    recommendationsTitle: "Qué pedir si vienes por primera vez",
    recommendations: [
      {
        name: "Flat White",
        meta: "Café de especialidad",
        description: "Buen punto de partida si quieres evaluar la base de espresso sin demasiada intervención."
      },
      {
        name: "Café filtrado",
        meta: "V60, Aeropress o prensa francesa",
        description: "Ideal si quieres una taza más limpia y leer mejor el perfil del café."
      },
      {
        name: "Matcha Cocochata",
        meta: "$95 · matcha",
        description: "Entrada amable al lado funcional del menú con un perfil más cremoso y fácil de tomar."
      },
      {
        name: "Nirvana Lavanda",
        meta: "$95 · creación Better Mood",
        description: "Una de las bebidas firma si quieres entender el universo de la marca más allá del café clásico."
      }
    ],
    faqs: [
      {
        question: "¿Dónde está Better Mood Coffee en La Paz, Puebla?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      },
      {
        question: "¿Puedo pedir sin quedarme en tienda?",
        answer: "Sí. Puedes revisar el menú, escribir por WhatsApp o pedir por Uber Eats y Rappi."
      },
      {
        question: "¿Hay opciones además del café clásico?",
        answer: "Sí. Better Mood combina café de especialidad, matcha, fríos y bebidas funcionales con información más clara."
      }
    ],
    related: [
      "/cafeteria-para-trabajar-puebla/",
      "/cafeteria-con-wifi-puebla/",
      "/cafe-de-especialidad-puebla/",
      "/recompensas/"
    ],
    cta: baseCta,
    keyword: "cafetería en La Paz Puebla",
    searchIntent: "navegacional local y visita presencial"
  },
  {
    slug: "cafeteria-pet-friendly-puebla",
    title: "Cafetería pet friendly Puebla | Better Mood Coffee",
    description:
      "Conoce Better Mood Coffee, cafetería pet friendly en Puebla con café de especialidad, bebidas claras de entender y una visita cómoda en La Paz.",
    keywords:
      "cafetería pet friendly Puebla, café pet friendly Puebla, lugar pet friendly con café Puebla, Better Mood Coffee mascotas",
    h1: "Cafetería pet friendly en Puebla con una experiencia más clara.",
    heroText:
      "Si buscas una cafetería pet friendly en Puebla, Better Mood ofrece una visita cuidada en La Paz con café de especialidad, bebidas funcionales y una atmósfera que no se siente improvisada.",
    eyebrow: "Ruta local",
    image: "/assets/hero-coffee.jpg",
    imageAlt: "Better Mood Coffee en Puebla para una visita pet friendly",
    benefits: [
      "Amenidad pet friendly visible en el sitio y fácil de ubicar antes de salir.",
      "Café de especialidad, matcha, bebidas frías y menú simple para acompañar la visita.",
      "Ubicación práctica en La Paz con Maps, Waze y WhatsApp para planear mejor la salida."
    ],
    sections: [
      {
        heading: "Lo que realmente espera quien busca una cafetería pet friendly",
        paragraphs: [
          "La intención detrás de <strong>cafetería pet friendly Puebla</strong> no es solo confirmar que “sí aceptan mascotas”. Lo que la gente quiere resolver es si la visita va a ser cómoda, si el lugar tiene un ritmo tranquilo, si vale la pena quedarse y si la propuesta no sacrifica la calidad del café por el concepto.",
          "En Better Mood el enfoque no se construye como una ocurrencia de marketing. La señal pet friendly está integrada a una experiencia más amplia: café de especialidad, bebidas funcionales claras de entender y una ubicación que funciona para pasar, quedarte un rato o combinar la visita con otros planes en La Paz."
        ]
      },
      {
        heading: "Pet friendly no debería significar caos",
        paragraphs: [
          "Una buena visita pet friendly se siente ordenada, no improvisada. Importa que el menú sea fácil de leer, que el servicio sea claro y que la salida tenga lógica desde antes de llegar. Better Mood ayuda en eso porque el sitio deja visibles la dirección, horarios, amenidades y opciones rápidas para escribir por WhatsApp o abrir Maps y Waze.",
          "Eso también reduce fricción cuando sales con tu mascota. En vez de depender de una búsqueda de último minuto, ya llegas con una idea clara de lo que vas a encontrar: una cafetería seria, con identidad propia y con una propuesta que no necesita exagerar para sentirse distinta."
        ]
      },
      {
        heading: "Qué pedir para una visita tranquila",
        paragraphs: [
          "Si vas con tiempo y quieres una experiencia ligera, funcionan muy bien un <strong>cold brew</strong>, un <strong>matcha latte</strong> o un <strong>latte cocochata</strong>. Son bebidas fáciles de recomendar porque equilibran sabor, claridad y ritmo. Si prefieres algo más distintivo de la marca, <strong>Tango Zen</strong> y <strong>Cold Berry Days</strong> ofrecen un perfil fresco y más experiencial.",
          "También conviene combinar la visita con algo sencillo del menú si quieres alargar la pausa. Better Mood no necesita convertirse en restaurante para que la salida funcione: basta con una carta clara, buen café y un entorno donde la visita con tu mascota no compita con la calidad del lugar."
        ]
      },
      {
        heading: "Una búsqueda local que también construye marca",
        paragraphs: [
          "El interés por espacios pet friendly en Puebla ya no es marginal. Artículos de lifestyle y guías locales han mantenido viva esa búsqueda, lo que la vuelve una oportunidad real para captar a personas que quieren una experiencia más amable y bien diseñada en la ciudad.",
          "Para Better Mood, esta ruta de búsqueda encaja de forma natural con la marca: pausa, claridad, bienestar responsable y una visita que sí invita a volver. No hace falta prometer de más. Basta con explicar bien la experiencia y facilitar la conversión con ubicación, menú, WhatsApp y pedidos."
        ]
      }
    ],
    recommendationsTitle: "Recomendados para una visita pet friendly",
    recommendations: [
      {
        name: "Cold Brew",
        meta: "$60 · frío",
        description: "Ligero y fácil de tomar si buscas una parada rápida sin perder la base de café."
      },
      {
        name: "Matcha Latte",
        meta: "$75 / $85",
        description: "Buena opción si vienes por algo suave, visualmente limpio y distinto al espresso."
      },
      {
        name: "Latte Cocochata",
        meta: "$90 · firma Better Mood",
        description: "Más amable en textura y sabor si buscas una visita relajada."
      },
      {
        name: "Tango Zen",
        meta: "$95 · creación fría",
        description: "Una bebida fresca y más distintiva si quieres salir de lo habitual."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood Coffee es pet friendly?",
        answer: "Sí. El sitio la presenta como una amenidad visible junto con Wi‑Fi, enchufes y estacionamiento."
      },
      {
        question: "¿Dónde está la cafetería?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      },
      {
        question: "¿También puedo pedir a domicilio?",
        answer: "Sí. Además de la visita presencial, Better Mood mantiene salida por Uber Eats, Rappi y WhatsApp."
      }
    ],
    related: [
      "/cafeteria-en-la-paz-puebla/",
      "/cafeteria-para-trabajar-puebla/",
      "/matcha-en-puebla/",
      "/recompensas/"
    ],
    cta: {
      title: "Haz la salida más simple desde antes.",
      text: "Abre Maps, revisa el menú o escribe por WhatsApp antes de llegar para planear mejor tu visita a Better Mood."
    },
    keyword: "cafetería pet friendly Puebla",
    searchIntent: "descubrimiento local y visita con mascota"
  },
  {
    slug: "cafeteria-para-trabajar-puebla",
    title: "Cafetería para trabajar en Puebla | Better Mood Coffee",
    description:
      "Better Mood Coffee en Puebla: café de especialidad, Wi‑Fi, enchufes y un ritmo cómodo para trabajar, reunirte o tomar una pausa clara en La Paz.",
    keywords:
      "cafetería para trabajar Puebla, café para trabajar Puebla, trabajar en cafetería Puebla, coffee shop para laptop Puebla",
    h1: "Cafetería para trabajar en Puebla sin perder el gusto por una buena taza.",
    heroText:
      "Better Mood funciona como una pausa útil para laptop, reuniones ligeras o sesiones de trabajo con café de especialidad, enchufes y Wi‑Fi visibles en La Paz, Puebla.",
    eyebrow: "Trabajo + café",
    image: "/assets/hero-coffee.jpg",
    imageAlt: "Better Mood Coffee en Puebla como cafetería para trabajar",
    benefits: [
      "Amenidades visibles para jornadas prácticas: Wi‑Fi, enchufes y estacionamiento.",
      "Carta clara para pedir rápido y seguir trabajando sin interrupciones largas.",
      "Ubicación en La Paz, Puebla, útil para reuniones, pendientes o trabajo remoto de media jornada."
    ],
    sections: [
      {
        heading: "Lo que sí importa cuando buscas una cafetería para trabajar",
        paragraphs: [
          "La intención detrás de <strong>cafetería para trabajar en Puebla</strong> no es solo encontrar una silla y una bebida. Lo que realmente se busca es concentración razonable, una base de café confiable, conectividad simple y un ritmo de servicio que no rompa la sesión cada veinte minutos.",
          "Better Mood responde bien a esa necesidad porque el sitio ya deja claras las amenidades clave: Wi‑Fi, enchufes, estacionamiento y ubicación en La Paz. No se presenta como coworking, pero sí como una cafetería donde la pausa productiva tiene sentido si necesitas avanzar en pendientes, tener una reunión ligera o simplemente salir de la rutina."
        ]
      },
      {
        heading: "Café de especialidad sin fricción operativa",
        paragraphs: [
          "Una cafetería para trabajar necesita algo más que buen diseño. Debe dejarte pedir rápido, entender la carta sin demasiada explicación y seguir con tu sesión. En Better Mood esa claridad es parte de la experiencia. Puedes ir por un <strong>americano</strong>, un <strong>flat white</strong>, un <strong>cold brew tonic</strong> o un <strong>matcha ceremonial</strong> sin navegar un menú confuso.",
          "Ese orden también importa comercialmente. Cuando la carta y los accesos son claros, la visita se vuelve más repetible. Por eso Better Mood conecta el espacio físico con rutas rápidas de menú PDF, WhatsApp, Maps, Uber Eats, Rappi y recompensas. No necesitas resolver todo desde cero cada vez."
        ]
      },
      {
        heading: "Qué conviene pedir si vas a quedarte un rato",
        paragraphs: [
          "Si tu idea es trabajar una hora o más, conviene elegir una bebida que acompañe bien el ritmo y no te sature. El <strong>americano</strong> y el <strong>flat white</strong> son buenas bases si prefieres café caliente y directo. Si vas por algo frío, el <strong>cold brew tonic</strong> y el <strong>cold brew</strong> funcionan muy bien para jornadas más largas.",
          "Si quieres salir del café clásico, el <strong>matcha ceremonial</strong> y el <strong>chai latte</strong> son opciones razonables. Y si necesitas algo más de alimento sin convertir la visita en comida pesada, el menú también tiene salidas prácticas como avo toast, molletes o croissants."
        ]
      },
      {
        heading: "Una mejor alternativa a la búsqueda genérica",
        paragraphs: [
          "En Puebla ya existen propuestas explícitas de cowork café y espacios para trabajo flexible. Eso confirma que la intención de búsqueda es real y que vale la pena competirla. La oportunidad de Better Mood está en otra parte: ofrecer un entorno más cálido y de marca, con mejor integración entre café de especialidad y bienestar responsable.",
          "Eso la hace atractiva para una audiencia que no necesariamente quiere un coworking formal. Quiere trabajar un rato, pedir bien, tener enchufe y salir con una experiencia más cuidada. Desde SEO local, esa diferencia ayuda a construir tráfico más calificado y con mayor probabilidad de visita recurrente."
        ]
      }
    ],
    recommendationsTitle: "Qué pedir si vienes a trabajar",
    recommendations: [
      {
        name: "Americano",
        meta: "$55",
        description: "La opción más directa si quieres una base de café limpia para una sesión de trabajo."
      },
      {
        name: "Flat White",
        meta: "$60",
        description: "Buen balance si prefieres algo con leche pero aún enfocado en el café."
      },
      {
        name: "Cold Brew Tonic",
        meta: "$75 · frío",
        description: "Más ligero y refrescante para jornadas largas o tardes calurosas en Puebla."
      },
      {
        name: "Matcha Ceremonial",
        meta: "$85",
        description: "Alternativa clara si no quieres irte por espresso desde el inicio."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood sirve para trabajar con laptop?",
        answer: "Sí. El sitio presenta Wi‑Fi y enchufes como amenidades visibles, además de una carta fácil de pedir."
      },
      {
        question: "¿Es coworking?",
        answer: "No se presenta como coworking formal. Funciona mejor como cafetería cómoda para sesiones de trabajo, reuniones ligeras o pausas productivas."
      },
      {
        question: "¿Qué bebida conviene si me voy a quedar un rato?",
        answer: "Americano, flat white, cold brew o matcha ceremonial suelen funcionar bien según tu ritmo y tolerancia al café."
      }
    ],
    related: [
      "/cafeteria-con-wifi-puebla/",
      "/cafeteria-en-la-paz-puebla/",
      "/cold-brew-en-puebla/",
      "/recompensas/"
    ],
    cta: {
      title: "Resuelve tu pausa de trabajo sin complicarla.",
      text: "Consulta ubicación, menú y pedidos rápidos para convertir una búsqueda de laptop en una visita clara a Better Mood."
    },
    keyword: "cafetería para trabajar en Puebla",
    searchIntent: "trabajo remoto y visita prolongada"
  },
  {
    slug: "cafeteria-con-wifi-puebla",
    title: "Cafetería con Wi‑Fi en Puebla | Better Mood Coffee",
    description:
      "Busca una cafetería con Wi‑Fi en Puebla y encuentra Better Mood Coffee en La Paz con café de especialidad, enchufes y una visita clara para trabajar o reunirte.",
    keywords:
      "cafetería con wifi Puebla, café con wifi Puebla, cafetería con enchufes Puebla, coffee shop internet Puebla",
    h1: "Cafetería con Wi‑Fi en Puebla y una visita más útil de principio a fin.",
    heroText:
      "Better Mood Coffee en La Paz reúne Wi‑Fi, enchufes, café de especialidad y salidas rápidas para menú, Maps, Waze y pedidos a domicilio.",
    eyebrow: "Conectividad local",
    image: "/assets/hero-coffee.jpg",
    imageAlt: "Better Mood Coffee en Puebla con Wi‑Fi y enchufes",
    benefits: [
      "Wi‑Fi y enchufes visibles como parte de las amenidades del sitio.",
      "Café de especialidad y bebidas frías o funcionales para pausas de distinto ritmo.",
      "Dirección, horarios, Maps y Waze claros para planear la visita sin fricción."
    ],
    sections: [
      {
        heading: "Wi‑Fi en una cafetería no debería ser información escondida",
        paragraphs: [
          "Muchas búsquedas como <strong>cafetería con wifi Puebla</strong> no buscan el “mejor internet del mundo”. Lo que intentan resolver es algo más simple: dónde sentarse con confianza para mandar correos, abrir una videollamada corta, revisar pendientes o no depender de los datos móviles durante una reunión.",
          "Better Mood ya deja esa señal visible dentro de sus amenidades junto con enchufes, estacionamiento y pet friendly. Esa claridad importa porque evita que la persona llegue con suposiciones. Si vas a elegir una cafetería por conectividad, saberlo antes cambia por completo la experiencia."
        ]
      },
      {
        heading: "Una visita útil necesita más que internet",
        paragraphs: [
          "La conectividad resuelve una parte del problema. La otra es operativa: que el lugar te permita pedir rápido, quedarte el tiempo razonable y entender la carta sin distracciones. En Better Mood eso se apoya en una estructura simple: menú PDF, WhatsApp, pedidos a domicilio, ubicación precisa y una carta que separa café, fríos y funcionales con más claridad.",
          "Eso hace que la búsqueda de Wi‑Fi termine convirtiéndose en algo mejor: una experiencia local útil, con café de especialidad y una identidad más consistente. No solo vas por señal. Vas por un entorno que realmente acompaña el plan."
        ]
      },
      {
        heading: "Qué pedir si vienes por conectividad y ritmo",
        paragraphs: [
          "Si vienes por una pausa práctica, conviene ir por bebidas que no te compliquen la sesión. El <strong>cold brew</strong>, el <strong>americano</strong> y el <strong>matcha latte</strong> funcionan muy bien porque son directos, reconocibles y mantienen un ritmo claro durante la visita. Si quieres una bebida más distintiva, <strong>Cold Berry Days</strong> y <strong>Dragon’s Blood</strong> aportan un perfil más de marca.",
          "También ayuda pensar la visita por horario. En la mañana suele funcionar mejor una base más café. En la tarde, una bebida fría o un matcha puede encajar mejor. La ventaja es que la carta de Better Mood deja ese tipo de decisiones más fáciles de tomar."
        ]
      },
      {
        heading: "Una oportunidad SEO que sí conecta con visita real",
        paragraphs: [
          "Existen cafeterías y cowork cafés en Puebla que usan el argumento de internet y trabajo como parte central de su oferta. Eso confirma que la búsqueda tiene intención comercial y local. Better Mood no necesita copiar esa narrativa completa; le conviene posicionarse como una opción más cálida, con mejor equilibrio entre funcionalidad, café y bienestar responsable.",
          "Ese posicionamiento le permite competir con un matiz diferente: conectividad útil sin perder personalidad. Desde contenido orgánico, esa combinación genera una ruta natural hacia el menú, la visita en La Paz y los canales de conversión más directos."
        ]
      }
    ],
    recommendationsTitle: "Qué pedir si necesitas quedarte conectado",
    recommendations: [
      {
        name: "Cold Brew",
        meta: "$60",
        description: "Fresco y práctico si necesitas una pausa funcional con café claro."
      },
      {
        name: "Americano",
        meta: "$55",
        description: "Directo para una reunión rápida o una sesión corta con laptop."
      },
      {
        name: "Matcha Latte",
        meta: "$75 / $85",
        description: "Alternativa clara si quieres variar del espresso sin perder estructura."
      },
      {
        name: "Cold Berry Days",
        meta: "$95 · creación Better Mood",
        description: "Una opción distintiva si quieres una bebida más ligada al universo de marca."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood Coffee tiene Wi‑Fi?",
        answer: "Sí. El sitio la presenta como amenidad visible junto con enchufes, estacionamiento y pet friendly."
      },
      {
        question: "¿También hay enchufes?",
        answer: "Sí. Los enchufes aparecen dentro de las amenidades visibles del sitio."
      },
      {
        question: "¿Dónde está la sucursal?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla, con botones directos a Maps y Waze."
      }
    ],
    related: [
      "/cafeteria-para-trabajar-puebla/",
      "/cafeteria-en-la-paz-puebla/",
      "/cold-brew-en-puebla/",
      "/matcha-en-puebla/"
    ],
    cta: baseCta,
    keyword: "cafetería con Wi‑Fi Puebla",
    searchIntent: "visita práctica y conectividad"
  },
  {
    slug: "matcha-en-puebla",
    title: "Matcha en Puebla | Better Mood Coffee",
    description:
      "Explora matcha en Puebla con Better Mood Coffee: matcha ceremonial, matcha latte y recetas propias en una cafetería de especialidad en La Paz.",
    keywords:
      "matcha en Puebla, matcha latte Puebla, cafetería con matcha Puebla, matcha ceremonial Puebla",
    h1: "Matcha en Puebla con una lectura más clara del sabor y la experiencia.",
    heroText:
      "Better Mood reúne matcha ceremonial, matcha latte y creaciones propias como Matcha Cocochata y Matcha Tropic dentro de una propuesta de café de especialidad y bienestar responsable.",
    eyebrow: "Matcha Better Mood",
    image: "/assets/hero-coffee.jpg",
    imageAlt: "Better Mood Coffee en Puebla con bebidas de matcha",
    benefits: [
      "Varias formas de entrar al matcha: ceremonial, latte y recetas propias.",
      "Contexto claro para elegir entre café, matcha y bebidas funcionales sin confusión.",
      "Ubicación en La Paz, Puebla, con menú PDF, Maps, Waze y pedidos rápidos."
    ],
    sections: [
      {
        heading: "Por qué la búsqueda de matcha está creciendo en Puebla",
        paragraphs: [
          "El interés por <strong>matcha en Puebla</strong> ya no depende solo de cafeterías virales o espacios fotogénicos. También hay una búsqueda más madura: personas que quieren una buena bebida de matcha sin que todo dependa del interior “instagrameable”. Ahí Better Mood tiene espacio para diferenciarse.",
          "La propuesta no gira alrededor del matcha como moda aislada. Lo integra a una carta donde conviven café de especialidad, bebidas funcionales y opciones más de marca. Eso ayuda a que quien llega por curiosidad encuentre una experiencia más completa y menos frágil."
        ]
      },
      {
        heading: "Cómo elegir entre matcha ceremonial, latte y recetas de la casa",
        paragraphs: [
          "Si quieres una lectura más limpia del ingrediente, el <strong>matcha ceremonial</strong> es la mejor entrada. Si prefieres una textura más amable, el <strong>matcha latte</strong> funciona mejor. Y si buscas una bebida con perfil más propio de Better Mood, hay dos rutas claras: <strong>Matcha Cocochata</strong> y <strong>Matcha Tropic</strong>.",
          "Esa variedad importa porque la intención de búsqueda no siempre es la misma. A veces la persona quiere calidad y sencillez. A veces busca algo más creativo. Tener ambas opciones dentro de una misma cafetería en Puebla hace más fácil convertir curiosidad en visita o pedido."
        ]
      },
      {
        heading: "Qué distingue la experiencia de Better Mood",
        paragraphs: [
          "Better Mood no se vende como “templo del matcha”. Se presenta como una cafetería de especialidad con bienestar responsable. Esa diferencia parece menor, pero ayuda mucho en la práctica. Significa que puedes llegar por matcha y seguir encontrando buen café, fríos, menú claro y una narrativa más sólida de marca.",
          "También significa que no hace falta exagerar el discurso alrededor del ingrediente. Aquí el matcha se trabaja como una bebida que puede acompañar distintos momentos del día, dentro de una experiencia de marca más amplia y más útil para el usuario local."
        ]
      },
      {
        heading: "Cómo convertir la búsqueda en una visita real",
        paragraphs: [
          "Si alguien ya está buscando dónde tomar matcha en Puebla, la conversión depende de detalles concretos: menú visible, dirección clara, horario, opciones de pedido y un motivo razonable para quedarse o volver. Better Mood ya tiene esos puntos dentro del ecosistema del sitio.",
          "Por eso esta página no compite solo por una keyword. También conecta con otras rutas útiles: bebidas funcionales, CBD no psicoactivo, recomendador y recompensas. Eso le da más profundidad al tráfico y hace que una visita por matcha no se quede aislada."
        ]
      }
    ],
    recommendationsTitle: "Qué probar si llegas buscando matcha",
    recommendations: [
      {
        name: "Matcha ceremonial",
        meta: "$85",
        description: "La mejor opción si quieres una lectura más directa del ingrediente."
      },
      {
        name: "Matcha latte",
        meta: "$75 / $85",
        description: "Más amable y cotidiana si prefieres una entrada simple al matcha."
      },
      {
        name: "Matcha Cocochata",
        meta: "$95 · firma Better Mood",
        description: "Una receta propia con perfil más cremoso y distintivo."
      },
      {
        name: "Matcha Tropic",
        meta: "$95 · creación fría",
        description: "Una opción más fresca y frutal si quieres un matcha distinto en Puebla."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood Coffee tiene varias opciones de matcha?",
        answer: "Sí. La carta incluye matcha ceremonial, matcha latte y recetas propias como Matcha Cocochata y Matcha Tropic."
      },
      {
        question: "¿Dónde está Better Mood si quiero ir por matcha?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      },
      {
        question: "¿Puedo ver el menú antes de ir?",
        answer: "Sí. Hay acceso directo al menú PDF y también puedes escribir por WhatsApp si quieres confirmar opciones."
      }
    ],
    related: [
      "/bebidas-funcionales-puebla/",
      "/cbd-en-el-cafe/",
      "/cafeteria-en-la-paz-puebla/",
      "/recomendador/"
    ],
    cta: {
      title: "Ve de la curiosidad al pedido con menos fricción.",
      text: "Abre el menú, revisa Maps o escribe por WhatsApp para elegir mejor tu próxima bebida de matcha en Better Mood."
    },
    keyword: "matcha en Puebla",
    searchIntent: "descubrimiento de producto y visita"
  },
  {
    slug: "cold-brew-en-puebla",
    title: "Cold brew en Puebla | Better Mood Coffee",
    description:
      "Encuentra cold brew en Puebla en Better Mood Coffee: café frío, cold brew tonic y bebidas frescas con una base de especialidad en La Paz.",
    keywords:
      "cold brew en Puebla, cold brew Puebla, café frío Puebla, cold brew tonic Puebla, Better Mood cold brew",
    h1: "Cold brew en Puebla para quienes quieren café frío bien resuelto.",
    heroText:
      "Better Mood Coffee ofrece cold brew, cold brew tonic y bebidas frías con base de especialidad para una pausa más fresca y mejor pensada en Puebla.",
    eyebrow: "Fríos Better Mood",
    image: "/assets/Coldbarry.jpg",
    imageAlt: "Bebida fría Better Mood Coffee estilo cold brew en Puebla",
    benefits: [
      "Varias rutas frías dentro de una carta con base de café de especialidad.",
      "Cold brew y cold brew tonic visibles junto con creaciones frescas de la casa.",
      "Ubicación clara en La Paz con menú PDF, Maps, Waze y pedidos a domicilio."
    ],
    sections: [
      {
        heading: "Qué suele buscar quien escribe cold brew en Puebla",
        paragraphs: [
          "La búsqueda de <strong>cold brew en Puebla</strong> suele mezclar dos intenciones. La primera es estacional: encontrar una bebida fría y más refrescante que un latte caliente. La segunda es sensorial: encontrar un café que no se sienta improvisado, sobreextraído o tapado por azúcar innecesaria.",
          "Better Mood tiene espacio claro para responder a esa intención porque el menú ya incluye <strong>cold brew</strong> y <strong>cold brew tonic</strong>, además de creaciones frías propias. Eso permite hablarle a quien busca café frío puro y también a quien quiere una bebida más experiencial."
        ]
      },
      {
        heading: "Cold brew no es lo mismo que cualquier café con hielo",
        paragraphs: [
          "La diferencia no está solo en la temperatura. Un cold brew bien trabajado se siente más suave, más redondo y mejor balanceado para el contexto de clima y ritmo de la ciudad. Por eso en una cafetería de especialidad en Puebla conviene buscar no solo que haya “fríos”, sino que exista una base de café pensada para esas bebidas.",
          "En Better Mood esa base se integra con una carta donde también aparecen opciones como <strong>Cold Berry Days</strong>. Eso amplía la conversación: no se trata solo de bajar la temperatura de la taza, sino de construir una experiencia fría que siga teniendo identidad."
        ]
      },
      {
        heading: "Qué pedir si vienes por café frío",
        paragraphs: [
          "Si quieres la ruta más directa, el <strong>cold brew</strong> es la entrada natural. Si quieres algo más brillante y efervescente, el <strong>cold brew tonic</strong> suele funcionar mejor. Si prefieres una bebida más vinculada al universo visual y sensorial de Better Mood, <strong>Cold Berry Days</strong> y <strong>Dragon’s Blood</strong> son dos caminos más creativos.",
          "Esa variedad es útil porque el tráfico frío no siempre es experto. Hay quien solo sabe que quiere algo helado. Hay quien quiere comparar perfiles. Tener opciones claras ayuda a convertir mejor la búsqueda y a dejar una experiencia más memorable."
        ]
      },
      {
        heading: "Cómo convertir este interés en visita o pedido",
        paragraphs: [
          "La ventaja de una búsqueda como esta es que la intención comercial suele ser alta. Si alguien está buscando cold brew en Puebla, probablemente quiere resolver una decisión de consumo en el corto plazo. Por eso el contenido debe conectar rápido con menú, ubicación y pedidos.",
          "Better Mood ya tiene esa infraestructura: menú PDF, WhatsApp, Uber Eats, Rappi, Maps y Waze. El papel de la página es ordenar la decisión y demostrar que la categoría fría sí tiene una base bien construida dentro de la marca."
        ]
      }
    ],
    recommendationsTitle: "Qué pedir si vienes por fríos",
    recommendations: [
      {
        name: "Cold Brew",
        meta: "$60",
        description: "Entrada más directa al café frío si quieres claridad y balance."
      },
      {
        name: "Cold Brew Tonic",
        meta: "$75",
        description: "Más brillante y ligero si quieres una bebida fresca con carácter."
      },
      {
        name: "Cold Berry Days",
        meta: "$95 · creación Better Mood",
        description: "Ruta creativa si quieres una bebida fría más de marca."
      },
      {
        name: "Dragon’s Blood",
        meta: "$95 · soda con CBD calming",
        description: "Una salida más experimental si prefieres algo frío y distinto al cold brew clásico."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood Coffee tiene cold brew?",
        answer: "Sí. El menú visible incluye cold brew y cold brew tonic."
      },
      {
        question: "¿Dónde está la sucursal?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      },
      {
        question: "¿También hay otras bebidas frías además del cold brew?",
        answer: "Sí. Better Mood combina café frío con creaciones propias, matcha frío y bebidas funcionales."
      }
    ],
    related: [
      "/cafeteria-para-trabajar-puebla/",
      "/matcha-en-puebla/",
      "/bebidas-funcionales-puebla/",
      "/recompensas/"
    ],
    cta: baseCta,
    keyword: "cold brew en Puebla",
    searchIntent: "producto frío y consumo inmediato"
  },
  {
    slug: "brunch-en-puebla",
    title: "Brunch en Puebla | Better Mood Coffee",
    description:
      "Explora una pausa de brunch en Puebla en Better Mood Coffee: café de especialidad, chilaquiles, avo toast, croissants y bebidas claras de entender.",
    keywords:
      "brunch en Puebla, cafetería brunch Puebla, brunch La Paz Puebla, café y brunch Puebla",
    h1: "Brunch en Puebla para una pausa más clara, rica y bien diseñada.",
    heroText:
      "Better Mood no necesita sobreactuar el brunch: combina café de especialidad, desayunos amplios y una atmósfera cálida para ir de desayuno tardío a comida ligera en La Paz, Puebla.",
    eyebrow: "Brunch Better Mood",
    image: "/assets/evento-corporativo.jpg",
    imageAlt: "Mesa de Better Mood Coffee para una experiencia de brunch en Puebla",
    benefits: [
      "Café de especialidad y alimentos claros de entender en una misma experiencia.",
      "Opciones como chilaquiles, avo toast, molletes, croissants y waffles dentro de la carta.",
      "Ubicación en La Paz con menú PDF, Maps, Waze y una visita más fácil de planear."
    ],
    sections: [
      {
        heading: "Por qué brunch sigue siendo una búsqueda fuerte en Puebla",
        paragraphs: [
          "La conversación alrededor de <strong>brunch en Puebla</strong> se ha fortalecido en medios locales, pasaportes gastronómicos y rutas de descubrimiento. Eso muestra una intención clara: la gente quiere lugares donde la comida y la bebida convivan en una pausa cómoda, no solo desayunos rápidos ni restaurantes pesados.",
          "Better Mood puede entrar bien en esa búsqueda porque la carta ya mezcla café de especialidad, fríos, matcha y una línea de alimentos suficiente para una experiencia de brunch ligera: <strong>chilaquiles</strong>, <strong>molletes</strong>, <strong>avo toast</strong>, <strong>croissants</strong>, waffles y postres."
        ]
      },
      {
        heading: "Qué hace distinto un brunch bien resuelto",
        paragraphs: [
          "Un brunch útil no depende de un menú infinito. Depende de ritmo, sabor y claridad. Debe permitir que alguien llegue por desayuno tardío, tenga buenas bebidas, encuentre algo salado o dulce y no sienta que la experiencia se rompe entre un platillo y una taza. Better Mood encaja en esa lógica porque el café no es relleno; es parte central del plan.",
          "Eso también le da una ventaja frente a propuestas más centradas solo en la estética o en platos muy cargados. Aquí la experiencia se siente más ligera y versátil: puedes armar una visita más simple o más completa según el momento del día."
        ]
      },
      {
        heading: "Qué pedir si vienes por brunch",
        paragraphs: [
          "Si quieres una base salada, los <strong>chilaquiles</strong>, <strong>molletes</strong> y el <strong>avo toast</strong> resuelven muy bien una visita de brunch. Si prefieres algo más de panadería, los <strong>croissants Golden</strong> o <strong>El Ibérico</strong> empatan muy bien con un flat white, un matcha latte o un cold brew.",
          "Para cerrar con algo dulce o volver la pausa más completa, los <strong>waffles con frutos rojos</strong>, el <strong>croissant de Nutella</strong> y algunos pasteles completan bien la experiencia. La ventaja es que puedes moverte entre café clásico, matcha o bebidas funcionales sin sentir que estás cambiando de lugar."
        ]
      },
      {
        heading: "Cómo convertir la búsqueda en visita real",
        paragraphs: [
          "La intención de brunch suele ser más de descubrimiento que una búsqueda puramente utilitaria. Por eso la página no solo debe decir “sí tenemos comida”. Debe ayudar a imaginar la experiencia: una pausa larga, una mesa cómoda, una buena bebida y una ubicación práctica en La Paz.",
          "Better Mood ya tiene los elementos para cerrar esa conversión: menú PDF, Maps, Waze, WhatsApp y delivery. El contenido solo ordena la decisión y la conecta con el posicionamiento principal de la marca: café de especialidad y bienestar responsable."
        ]
      }
    ],
    recommendationsTitle: "Qué pedir si vienes por brunch",
    recommendations: [
      {
        name: "Chilaquiles",
        meta: "$85 · salado",
        description: "Una base completa si buscas un brunch más tradicional con café de especialidad al lado."
      },
      {
        name: "Avo Toast",
        meta: "$75",
        description: "Más ligero si quieres una pausa clara y no una comida pesada."
      },
      {
        name: "Croissant Golden",
        meta: "$110",
        description: "Buen punto medio entre panadería, salado y experiencia de brunch."
      },
      {
        name: "Waffles con frutos rojos",
        meta: "$95 · dulce",
        description: "Una salida más indulgente si quieres cerrar la visita con algo dulce."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood tiene opciones tipo brunch?",
        answer: "Sí. La carta visible incluye chilaquiles, molletes, avo toast, croissants, waffles y otros acompañamientos."
      },
      {
        question: "¿Puedo combinar brunch con matcha o bebidas funcionales?",
        answer: "Sí. Ese es uno de los diferenciales de Better Mood: puedes combinar desayuno o comida ligera con café, matcha o creaciones funcionales."
      },
      {
        question: "¿Dónde está la sucursal?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      }
    ],
    related: [
      "/cafeteria-en-la-paz-puebla/",
      "/matcha-en-puebla/",
      "/cafe-de-especialidad-puebla/",
      "/recompensas/"
    ],
    cta: {
      title: "Arma tu próxima pausa larga con mejor contexto.",
      text: "Consulta menú, abre Maps o escribe por WhatsApp para convertir una búsqueda de brunch en una visita clara a Better Mood."
    },
    keyword: "brunch en Puebla",
    searchIntent: "descubrimiento gastronómico y visita"
  },
  {
    slug: "bebidas-funcionales-puebla",
    title: "Bebidas funcionales en Puebla | Better Mood Coffee",
    description:
      "Descubre bebidas funcionales en Puebla en Better Mood Coffee: café de especialidad, matcha, CBD no psicoactivo y una guía responsable para elegir mejor.",
    keywords:
      "bebidas funcionales Puebla, café funcional Puebla, wellness coffee Puebla, bebidas con CBD Puebla, Better Mood Coffee",
    h1: "Bebidas funcionales en Puebla con una guía más clara para elegir.",
    heroText:
      "Better Mood combina café de especialidad, matcha y recetas funcionales con CBD no psicoactivo dentro de una experiencia premium, cálida y responsable en La Paz, Puebla.",
    eyebrow: "Funcionales Better Mood",
    image: "/assets/dragon.jpg",
    imageAlt: "Bebida funcional de Better Mood Coffee en Puebla",
    benefits: [
      "Carta funcional visible con recetas propias y mejor contexto antes de elegir.",
      "Conexión natural entre café de especialidad, matcha y bienestar responsable.",
      "Ruta clara hacia guía educativa, menú, ubicación, WhatsApp y pedidos."
    ],
    sections: [
      {
        heading: "Qué busca realmente quien escribe bebidas funcionales en Puebla",
        paragraphs: [
          "La búsqueda de <strong>bebidas funcionales en Puebla</strong> suele mezclar curiosidad, deseo de novedad y una necesidad real de claridad. Muchas personas ya escucharon de CBD no psicoactivo, adaptógenos o wellness coffee, pero no quieren caer en marcas que prometen demasiado o explican demasiado poco.",
          "Ese es el punto donde Better Mood encaja bien. La marca no vende una fantasía médica ni una moda vacía. Presenta una carta donde los funcionales conviven con café de especialidad, matcha y una narrativa más responsable sobre lo que sí vale la pena revisar antes de pedir."
        ]
      },
      {
        heading: "Por qué Better Mood tiene una posición distinta",
        paragraphs: [
          "Hay cafeterías en Puebla que destacan por brunch, coworking o diseño visual. Better Mood compite desde otro ángulo: una mezcla clara de especialidad, bienestar responsable y producto accesible de entender. Eso hace que la categoría funcional no se sienta aislada, sino integrada al resto del negocio.",
          "También ayuda que ya exista conversación local alrededor de la marca y de su propuesta con adaptógenos y bebidas funcionales. Eso valida la intención de búsqueda y vuelve más fácil construir páginas útiles que conviertan mejor tanto en Google como en visita física."
        ]
      },
      {
        heading: "Qué bebidas resumen mejor esta categoría",
        paragraphs: [
          "Si quieres entender la parte funcional del menú, conviene empezar con recetas donde la identidad de Better Mood ya está muy marcada. <strong>Nirvana Lavanda</strong>, <strong>Dragon’s Blood</strong>, <strong>Tango Zen</strong>, <strong>Cold Berry Days</strong> y <strong>Matcha Tropic</strong> resumen bastante bien ese universo.",
          "Cada una entra desde un ángulo distinto: algunas son más frescas, otras más suaves, otras más visuales. Por eso es útil mantener una guía y un recomendador. No todas las personas llegan buscando lo mismo, y una categoría funcional bien planteada tiene que dejar espacio para esa diferencia."
        ]
      },
      {
        heading: "Cómo elegir con más criterio",
        paragraphs: [
          "Lo responsable es separar experiencia de promesa. Una bebida funcional puede ser interesante, rica y alineada a tu rutina sin necesidad de hablar como si fuera tratamiento médico. Better Mood trabaja precisamente sobre esa línea: explicar mejor, no exagerar, y dejar visible que si tomas medicamentos o tienes dudas conviene revisar primero la guía de bienestar.",
          "Eso vuelve más sólida la conversión. Quien llega por búsqueda orgánica encuentra información útil, productos visibles y rutas claras hacia menú, ubicación, delivery o WhatsApp. Esa combinación hace que la categoría funcional no se quede en curiosidad sino que sí mueva visitas y pedidos."
        ]
      }
    ],
    recommendationsTitle: "Bebidas que representan mejor el universo funcional",
    recommendations: [
      {
        name: "Nirvana Lavanda",
        meta: "$95 · CBD calming",
        description: "Una de las recetas firma si quieres entender el lado funcional de Better Mood."
      },
      {
        name: "Dragon’s Blood",
        meta: "$95 · fría",
        description: "Ruta visual y fresca para quien busca una bebida más distinta desde la primera visita."
      },
      {
        name: "Tango Zen",
        meta: "$95 · soda italiana",
        description: "Ideal si quieres una bebida funcional con perfil más frutal y ligero."
      },
      {
        name: "Matcha Tropic",
        meta: "$95 · matcha + wellness",
        description: "Buena opción si vienes por matcha y funcionalidad en una sola bebida."
      }
    ],
    faqs: [
      {
        question: "¿Qué entiende Better Mood por bebidas funcionales?",
        answer: "Bebidas donde café, matcha o recetas propias conviven con ingredientes como CBD no psicoactivo dentro de una comunicación responsable."
      },
      {
        question: "¿Hay una guía para entender CBD y adaptógenos antes de pedir?",
        answer: "Sí. La página de bienestar funciona como hub para revisar contexto, uso responsable y preguntas frecuentes."
      },
      {
        question: "¿Dónde está la sucursal?",
        answer: "En 13 Poniente 2302/F, Col. La Paz, Puebla."
      }
    ],
    related: [
      "/bienestar/",
      "/cbd-no-psicoactivo-puebla/",
      "/adaptogenos-en-bebidas-puebla/",
      "/recomendador/"
    ],
    cta: {
      title: "Elige mejor antes de pedir.",
      text: "Explora el menú funcional, abre la guía de bienestar o escribe por WhatsApp si quieres contexto antes de visitar Better Mood."
    },
    keyword: "bebidas funcionales en Puebla",
    searchIntent: "educación de producto y visita"
  },
  {
    slug: "cbd-no-psicoactivo-puebla",
    title: "CBD no psicoactivo en Puebla | Better Mood Coffee",
    description:
      "Aprende sobre CBD no psicoactivo en Puebla con Better Mood Coffee: bebidas claras de entender, uso responsable y contexto real antes de elegir.",
    keywords:
      "CBD no psicoactivo Puebla, cafetería con CBD Puebla, café con CBD Puebla, bebidas con CBD Puebla",
    h1: "CBD no psicoactivo en Puebla con una explicación más clara y responsable.",
    heroText:
      "Better Mood presenta CBD no psicoactivo dentro de una cafetería de especialidad en Puebla, con guía educativa, bebidas visibles y un tono responsable antes de pedir.",
    eyebrow: "CBD responsable",
    image: "/assets/dragon.jpg",
    imageAlt: "Bebida Better Mood Coffee con CBD no psicoactivo en Puebla",
    benefits: [
      "Explicación responsable sobre CBD no psicoactivo sin promesas médicas ni lenguaje recreativo.",
      "Bebidas visibles dentro del menú y rutas claras hacia bienestar, recomendador y productos.",
      "Conversión sencilla con ubicación, menú, WhatsApp y pedidos."
    ],
    sections: [
      {
        heading: "Qué implica buscar CBD no psicoactivo en Puebla",
        paragraphs: [
          "La intención detrás de <strong>CBD no psicoactivo Puebla</strong> suele ser doble. Una parte del público quiere saber qué significa realmente. Otra parte ya tiene interés en probarlo, pero necesita una marca que lo explique sin exagerar, sin tono recreativo y sin discursos pseudocientíficos.",
          "Better Mood responde bien a ese punto porque el CBD aparece dentro de una propuesta más amplia: café de especialidad, bebidas funcionales y bienestar responsable. Eso evita que la conversación se vuelva sensacionalista y la aterriza en algo mucho más útil para el usuario."
        ]
      },
      {
        heading: "Cómo lo presenta Better Mood",
        paragraphs: [
          "Aquí el CBD no se usa para construir misterio. Se presenta como <strong>no psicoactivo</strong> y como parte de una carta que también necesita contexto, lectura responsable y límites claros. Por eso el sitio conecta esta categoría con una guía específica de bienestar y preguntas frecuentes visibles.",
          "Ese enfoque es importante a nivel SEO y conversión. Google y el usuario valoran mejor un contenido que explica con mesura que una página que solo repite claims ambiguos. Better Mood ya tiene esa base y esta página la aterriza a una intención local concreta en Puebla."
        ]
      },
      {
        heading: "Qué bebidas pueden interesarte si vienes por esta búsqueda",
        paragraphs: [
          "Si el interés principal es conocer el lado de CBD no psicoactivo dentro del menú, conviene empezar por bebidas donde el ingrediente ya aparece de forma visible. <strong>Nirvana Lavanda</strong>, <strong>Dragon’s Blood</strong>, <strong>Tango Zen</strong> y <strong>Cold Berry Days</strong> son ejemplos claros dentro de la carta actual.",
          "Aun así, el criterio sigue importando. No todas las personas deberían elegir de la misma manera, ni todas buscan el mismo momento o tipo de bebida. Por eso la mejor ruta sigue siendo combinar esta página con la guía de bienestar y el recomendador de bebidas."
        ]
      },
      {
        heading: "Uso responsable antes que promesa",
        paragraphs: [
          "Better Mood evita tratar el CBD como una solución total. La conversación responsable habla de contexto: si tomas medicamentos, si estás embarazada, si tienes dudas sobre hígado o interacciones, conviene revisar primero la guía y consultar a un profesional cuando aplique.",
          "Eso no enfría la conversión; la vuelve más sólida. Una marca que explica mejor genera más confianza para visita, pedido y recomendación. Desde SEO local, ese criterio también ayuda a sostener el posicionamiento en el tiempo."
        ]
      }
    ],
    recommendationsTitle: "Qué ver si llegas por CBD no psicoactivo",
    recommendations: [
      {
        name: "Nirvana Lavanda",
        meta: "$95 · CBD calming",
        description: "Una de las bebidas más claras para entender cómo aparece el CBD dentro del menú."
      },
      {
        name: "Dragon’s Blood",
        meta: "$95 · soda italiana",
        description: "Buena opción si quieres una bebida fría y distintiva de la marca."
      },
      {
        name: "Cold Berry Days",
        meta: "$95 · berries + CBD",
        description: "Ruta más fresca si prefieres una experiencia menos clásica."
      },
      {
        name: "Guía de bienestar",
        meta: "Ruta educativa",
        description: "Úsala antes de pedir si quieres entender contexto, preguntas frecuentes y uso responsable."
      }
    ],
    faqs: [
      {
        question: "¿CBD no psicoactivo significa que no coloca?",
        answer: "Sí. Better Mood lo explica como CBD no psicoactivo y lo diferencia claramente de un enfoque recreativo."
      },
      {
        question: "¿Puedo pedir una bebida con CBD en Better Mood?",
        answer: "Sí. Hay bebidas de la carta donde el CBD aparece de forma visible, además de un hub de bienestar para elegir con más claridad."
      },
      {
        question: "¿Qué conviene revisar antes de probarlo?",
        answer: "Si tomas medicamentos, tienes dudas médicas, embarazo o lactancia, conviene revisar primero la guía de bienestar y actuar con prudencia."
      }
    ],
    related: [
      "/bienestar/",
      "/cbd-en-el-cafe/",
      "/bebidas-funcionales-puebla/",
      "/recomendador/"
    ],
    cta: {
      title: "Pide con más contexto y menos ruido.",
      text: "Abre la guía de bienestar, revisa el menú o escribe por WhatsApp antes de elegir tu bebida en Better Mood."
    },
    keyword: "CBD no psicoactivo Puebla",
    searchIntent: "educación local y decisión de producto"
  },
  {
    slug: "adaptogenos-en-bebidas-puebla",
    title: "Adaptógenos en bebidas en Puebla | Better Mood Coffee",
    description:
      "Qué significa adaptógeno, cómo leer estos ingredientes y cómo elegir una bebida en Better Mood Coffee sin promesas médicas.",
    keywords:
      "adaptógenos en bebidas Puebla, adaptógenos Puebla, melena de león Puebla, cordyceps Puebla, reishi Puebla, ashwagandha Puebla, rhodiola Puebla",
    h1: "Adaptógenos en tu bebida, explicados con claridad.",
    heroText:
      "En Better Mood nombramos lo que lleva cada receta y evitamos prometer resultados. El sabor, la preparación y una elección informada van primero.",
    eyebrow: "Adaptógenos Better Mood",
    image: "/assets/spaceman.jpg",
    imageAlt: "Experiencia Better Mood Coffee relacionada con adaptógenos y bebidas funcionales en Puebla",
    benefits: [
      "Una definición clara, sin convertir el término en una promesa.",
      "Ingredientes y recetas explicados con lenguaje sencillo.",
      "Acceso equilibrado a nuestras sucursales de La Paz y Cholula."
    ],
    sections: [
      {
        heading: "Qué significa el término adaptógeno",
        paragraphs: [
          "<strong>Adaptógeno</strong> es un término amplio usado para algunos ingredientes botánicos que tradicionalmente se relacionan con la respuesta del cuerpo ante distintos tipos de estrés.",
          "No describe un efecto garantizado ni una categoría médica uniforme: la evidencia, la preparación y la seguridad cambian según cada ingrediente, extracto y cantidad."
        ]
      },
      {
        heading: "Lo importante está en la receta específica",
        paragraphs: [
          "Que un ingrediente aparezca bajo este término no permite asumir qué hará en una bebida. Importan la especie, la parte usada, el tipo de extracto, la cantidad y la combinación completa.",
          "Por eso en Better Mood preferimos decir qué lleva una receta y cómo sabe. Si quieres revisar un ingrediente antes de pedir, pregunta a nuestro equipo."
        ]
      },
      {
        heading: "Cómo hablamos de estos ingredientes",
        paragraphs: [
          "No presentamos los adaptógenos como tratamiento ni prometemos resultados. Nuestra conversación parte del sabor, la preparación, la transparencia y la curiosidad informada.",
          "Si tomas medicamentos, estás embarazada o lactando, tienes una condición médica o dudas sobre un ingrediente, consulta a un profesional de salud antes de consumirlo."
        ]
      },
      {
        heading: "Ven a conocer las recetas",
        paragraphs: [
          "La mejor forma de descubrir Better Mood sigue siendo probar una bebida y conversar con el equipo. Puedes revisar el menú antes de ir o elegir la sucursal que te quede mejor.",
          "La Paz y Cholula tienen la misma importancia para nosotros: encuentra la ruta, consulta la carta y elige tu próxima pausa."
        ]
      }
    ],
    recommendationsTitle: "Rutas útiles si te interesa este tema",
    recommendations: [
      {
        name: "Guía de bienestar",
        meta: "Hub principal",
        description: "La mejor entrada si quieres revisar CBD, adaptógenos y uso responsable en un solo lugar."
      },
      {
        name: "Bebidas funcionales Better Mood",
        meta: "Ruta de producto",
        description: "Útil para aterrizar la conversación en bebidas reales y no solo en teoría."
      },
      {
        name: "Recomendador de bebidas",
        meta: "Ruta rápida",
        description: "Sirve si ya quieres pasar del tema educativo a una sugerencia concreta."
      },
      {
        name: "Menú + productos",
        meta: "Exploración práctica",
        description: "Para revisar carta y catálogo funcional antes de visitar la sucursal."
      }
    ],
    faqs: [
      {
        question: "¿Better Mood habla de adaptógenos como tratamiento médico?",
        answer: "No. La comunicación se mantiene en bienestar responsable, claridad y contexto antes de elegir."
      },
      {
        question: "¿Qué ingredientes suelen interesar más en esta búsqueda?",
        answer: "Melena de león, cordyceps, reishi, ashwagandha y rhodiola suelen aparecer con más frecuencia."
      },
      {
        question: "¿Dónde puedo profundizar más antes de pedir?",
        answer: "En la guía de bienestar, la página de CBD en el café, bebidas funcionales y el recomendador de Better Mood."
      }
    ],
    related: [
      "/bienestar/",
      "/bebidas-funcionales-puebla/",
      "/cbd-no-psicoactivo-puebla/",
      "/cbd-en-el-cafe/"
    ],
    cta: baseCta,
    keyword: "adaptógenos en bebidas Puebla",
    searchIntent: "educación avanzada y consideración"
  }
];

export function findPageByHref(href) {
  const localPage = localPagesData.find((page) => `/${page.slug}/` === href);
  if (localPage) {
    return { label: localPage.title.split("|")[0].trim() };
  }
  return guideLookup[href] ?? staticLinkLabels[href];
}
