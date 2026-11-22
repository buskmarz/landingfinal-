import { hasNativeCafeDirections, openNativeCafeDirections } from '@/lib/coffee/native-links';
import { toast } from 'sonner';
import { DialogDescription, DialogTitle } from '@/components/ui/dialog';

// Direct directions to the UPAEP branch, as published by Better Mood.
const CAFE_MAP = 'https://maps.app.goo.gl/Cx8Rz7zSEPTYzUxr6';
const SUPPORT = 'https://wa.me/message/WQWEEODGY6H2P1';

const menu = [
 ['Café', ['Espresso doble', 'Americano', 'Filtrado V60', 'Cappuccino']],
 ['Sin café', ['Matcha', 'Chocolate', 'Té e infusiones']],
 ['Para comer', ['Chilaquiles', 'Molletes', 'Croissant', 'Brownie']],
] as const;

export function CoffeeDirections(){
 if(hasNativeCafeDirections())return <button className="subtle" onClick={()=>void openNativeCafeDirections()
  .catch(()=>toast.error('No se pudo abrir Mapas. Visítanos en Av. 13 Poniente 2302/F, Puebla.'))}>Cómo llegar</button>;
 return <a className="subtle" href={CAFE_MAP} target="_blank" rel="noopener noreferrer">Cómo llegar</a>;
}

export function CoffeeMenu(){
 return <>
  <DialogTitle>Menú de la cafetería</DialogTitle>
  <DialogDescription>Una selección de la carta de Better Mood UPAEP.</DialogDescription>
  <div className="coffee-visit-list">{menu.map(([group, items])=>
   <section key={group}><h3>{group}</h3><ul>{items.map(item=><li key={item}>{item}</li>)}</ul></section>
  )}</div>
  <p className="muted">Av. 13 Poniente 2302/F, Puebla. Consulta precios y alérgenos en barra.</p>
  <CoffeeDirections/>
 </>;
}

export function CoffeePrivacy(){
 return <>
  <DialogTitle>Privacidad de Coffee Lab</DialogTitle>
  <DialogDescription>Preparar y catar café no requiere una cuenta.</DialogDescription>
  <div className="coffee-visit-list">
   <section><h3>En tu dispositivo</h3><p>Tus recetas, bolsas, fotos, historial y preferencias se guardan aquí. Puedes exportar una copia desde Actividad.</p></section>
   <section><h3>Si conectas una cuenta</h3><p>Google o Apple confirman tu identidad. Better Mood usa tu nombre, correo e identificador para gestionar la sesión y guardar las recetas que decidas copiar o sincronizar. Las bolsas, fotos y el historial no se sincronizan.</p></section>
   <section><h3>Si usas Barista IA</h3><p>OpenAI procesa tus mensajes y los datos de la receta que decidas adjuntar. Evita incluir información personal.</p></section>
   <section><h3>Tú eliges qué conservar</h3><p>En Preferencias puedes desactivar la sincronización o iniciar la eliminación de tu cuenta y su copia. Las recetas locales se conservan. La cuenta y su biblioteca se mantienen hasta que solicites su eliminación.</p></section>
  </div>
  <a className="text-button" href={SUPPORT} target="_blank" rel="noopener noreferrer">Contactar a Better Mood</a>
 </>;
}
