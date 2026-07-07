(function () {
  window.BETTER_MOOD_SITE_DATA = {
    business: {
      name: 'Better Mood Coffee',
      neighborhood: 'La Paz y Cholula',
      city: 'Puebla',
      address: '13 Poniente 2302/F, Col. La Paz, Puebla',
      branches: [
        {
          id: 'la-paz',
          name: 'Better Mood Coffee La Paz',
          shortName: 'La Paz',
          address: '13 Poniente 2302/F, Col. La Paz, Puebla',
          maps: 'https://maps.google.com/?q=13+Poniente+2302%2FF,+La+Paz,+Puebla,+Puebla',
          waze: 'https://waze.com/ul?q=13%20Poniente%202302%2FF%2C%20La%20Paz%2C%20Puebla',
          hoursNote: 'Lun-Vie 8:00-21:00 · Sab 9:00-20:00 · Dom 10:00-18:00'
        },
        {
          id: 'cholula',
          name: 'Better Mood Coffee Cholula',
          shortName: 'Cholula',
          address: '4 Norte 1203, San Andrés Cholula',
          maps: 'https://maps.google.com/?q=Better+Mood+Coffee+4+Norte+1203+San+Andr%C3%A9s+Cholula',
          waze: 'https://waze.com/ul?q=4%20Norte%201203%2C%20San%20Andr%C3%A9s%20Cholula',
          hoursNote: 'Horarios por confirmar en Google Maps'
        }
      ],
      googleRating: '4.4',
      googleReviewCount: '168',
      amenities: ['Wi-Fi', 'Enchufes', 'Pet friendly', 'Estacionamiento'],
      hours: [
        { label: 'Lunes a Viernes', visible: '8:00 – 21:00', opens: '08:00', closes: '21:00' },
        { label: 'Sábado', visible: '9:00 – 20:00', opens: '09:00', closes: '20:00' },
        { label: 'Domingo', visible: '10:00 – 18:00', opens: '10:00', closes: '18:00' }
      ]
    },
    links: {
      menu: '/menu/',
      rewards: '/recompensas/',
      balance: '/recompensas/#consulta-saldo',
      maps: 'https://maps.google.com/?q=13+Poniente+2302%2FF,+La+Paz,+Puebla,+Puebla',
      mapsCholula: 'https://maps.google.com/?q=Better+Mood+Coffee+4+Norte+1203+San+Andr%C3%A9s+Cholula',
      waze: 'https://waze.com/ul?q=13%20Poniente%202302%2FF%2C%20La%20Paz%2C%20Puebla',
      wazeCholula: 'https://waze.com/ul?q=4%20Norte%201203%2C%20San%20Andr%C3%A9s%20Cholula',
      uberEats: 'https://www.ubereats.com/store/better-mood-coffee/hPA2fzGUX9WLGGvkeNwCrg?diningMode=DELIVERY',
      rappi: 'https://www.rappi.com.mx/restaurantes/delivery/495986-better-mood-coffee?utm_source=app&utm_medium=deeplink&utm_campaign=share',
      whatsappGeneral: 'https://wa.me/message/WQWEEODGY6H2P1'
    },
    featuredDrinks: [
      { name: "Dragon's Blood", price: 95, source: 'menu/index.html' },
      { name: 'Cold Berry Days', price: 95, source: 'menu/index.html' },
      { name: 'Sweet Trip', price: null, source: 'REVISAR: no localizado en menu/index.html' },
      { name: 'Spaceman', price: 150, source: 'menu/index.html' }
    ],
    notes: {
      scheduleConflict: 'OK: home, menu, schema y SEO quedan alineados a Lunes a Viernes 8:00 - 21:00. Confirmar si el negocio cambia horario oficial.',
      parking: 'REVISAR: confirmar si estacionamiento es propio, compartido o sujeto a disponibilidad.'
    }
  };
})();
