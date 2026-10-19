import { Component, type ReactNode } from 'react';

/** A missing optional chunk must never take down the brewing app or erase local data. */
export class CoffeeLabBoundary extends Component<{children:ReactNode;onExit:()=>void},{failed:boolean}>{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true}}
 render(){return this.state.failed?<section className="empty-panel" role="alert"><h2>No pudimos abrir el laboratorio.</h2><p>Si estás sin conexión, abre Explorar una vez con internet para guardarlo en este navegador. Tus datos locales se conservan.</p><button className="primary" onClick={()=>window.location.reload()}>Recargar</button><button className="text-button" onClick={this.props.onExit}>Volver al inicio</button></section>:this.props.children}
}
