import { Injectable, Inject } from '@angular/core';
import OpenAI from 'openai';
import { RemoteConfig, getValue, fetchAndActivate } from '@angular/fire/remote-config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private openai!: OpenAI;
  private threadId: string | null = null;
  private assistantId: string | null = null;
  private apiKey: string | null = null;
  private configLoaded: Promise<void>;

  // 📌 Menú de "Sabor Ecuatoriano"
  private menu = {
    platos: [
      { nombre: "Encebollado de Pescado", precio: 6.00, descripcion: "Sopa de albacora con yuca y cebolla encurtida." },
      { nombre: "Seco de Chivo", precio: 7.50, descripcion: "Carne de chivo cocinada con chicha de jora y especias." },
      { nombre: "Guatita", precio: 6.50, descripcion: "Mondongo en salsa de maní acompañado de arroz." },
      { nombre: "Fritada con Mote", precio: 8.00, descripcion: "Cerdo frito con mote, llapingachos y ensalada." },
      { nombre: "Bolón de Verde (Queso o Chicharrón)", precio: 3.50, descripcion: "Masa de plátano verde rellena de queso o chicharrón." }
    ],
    bebidas: [
      { nombre: "Jugo de Naranjilla", precio: 2.00 },
      { nombre: "Colada Morada", precio: 3.00 },
      { nombre: "Café ecuatoriano filtrado", precio: 1.50 }
    ],
    postres: [
      { nombre: "Queso con Dulce de Higos", precio: 3.50 },
      { nombre: "Espumilla", precio: 2.00 }
    ],
    promociones: [
      { nombre: "Combo Encebollado + Jugo de Naranjilla", precio: 7.00 },
      { nombre: "Dos Bolones + Café filtrado", precio: 5.00 },
      { nombre: "Seco de Chivo + Colada Morada", precio: 9.00 }
    ]
  };

  constructor(private remoteConfig: RemoteConfig) {
    this.configLoaded = this.loadConfig();
  }

  // 📌 Método para obtener el menú
  getMenu(): any {
    return this.menu;
  }

  private async loadConfig(): Promise<void> {
    try {
      await fetchAndActivate(this.remoteConfig);

      this.apiKey = (await getValue(this.remoteConfig, 'OPENAI_API_KEY')).asString();
      this.assistantId = (await getValue(this.remoteConfig, 'OPENAI_ASSISTANT_ID')).asString();

      console.log("🔑 API Key obtenida:", this.apiKey ? "✅ Cargada" : "❌ No disponible");
      console.log("🤖 Assistant ID obtenido:", this.assistantId ? "✅ Cargado" : "❌ No disponible");

      if (!this.apiKey || !this.assistantId) {
        throw new Error("⚠️ No se pudieron obtener las credenciales de OpenAI.");
      }

      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });

      console.log("✅ Configuración de OpenAI cargada correctamente.");
    } catch (error) {
      console.error("❌ Error al cargar Firebase Remote Config:", error);
    }
  }

  // Obtener la API Key
  getApiKey(): Promise<string | null> {
    return this.configLoaded.then(() => this.apiKey);
  }


  /**
   * Crea un nuevo hilo (Thread) en OpenAI y guarda su ID
   */
  async createThread(): Promise<string | null> {
    await this.configLoaded;

    if (!this.openai) {
      console.error("⚠️ OpenAI no está inicializado todavía.");
      return null;
    }

    try {
      console.log("⏳ Creando un nuevo Thread...");
      const thread = await this.openai.beta.threads.create();
      this.threadId = thread.id;
      console.log("📌 Nuevo Thread ID:", this.threadId);
      return this.threadId;
    } catch (error) {
      console.error("❌ Error al crear el thread:", error);
      return null;
    }
  }


  /**
   * Envía un mensaje al asistente de OpenAI y devuelve la respuesta en tiempo real
   */
  sendMessage(message: string): Observable<string> {
    return new Observable<string>(observer => {
      (async () => {
        try {
          await this.configLoaded;

          // Si el mensaje del usuario incluye "menú", "qué ofrecen", "qué hay para comer", etc.
          const lowerMessage = message.toLowerCase();
          if (lowerMessage.includes("menú") || lowerMessage.includes("qué ofrecen") || lowerMessage.includes("qué tienen para comer")) {
            const menuText = this.formatMenu();
            observer.next(menuText);
            observer.complete();
            return;
          }

          if (!this.threadId) {
            await this.createThread();
          }
          if (!this.threadId) throw new Error("❌ No se pudo crear el Thread.");

          await this.openai.beta.threads.messages.create(this.threadId, {
            role: "user",
            content: message
          });

          const run = await this.openai.beta.threads.runs.create(this.threadId, {
            assistant_id: this.assistantId!,
            stream: true,
          });

          for await (const event of run) {
            if (event.event === 'thread.message.delta') {
              const content = event.data.delta.content?.[0];
              if (content?.type === 'text' && content.text?.value) {
                observer.next(content.text.value);
              }
            }
          }

          observer.complete();
        } catch (error) {
          observer.error('❌ Error al enviar mensaje al asistente: ' + error);
        }
      })();
    });
  }

  // 📌 Formatear el menú para mostrarlo como respuesta
  private formatMenu(): string {
    let respuesta = "🍽 *Menú de Sabor Ecuatoriano*\n\n";

    respuesta += "🌟 *Platos principales:*\n";
    this.menu.platos.forEach(plato => {
      respuesta += `- ${plato.nombre} ($${plato.precio.toFixed(2)})\n  _${plato.descripcion}_\n`;
    });

    respuesta += "\n🥤 *Bebidas:*\n";
    this.menu.bebidas.forEach(bebida => {
      respuesta += `- ${bebida.nombre} ($${bebida.precio.toFixed(2)})\n`;
    });

    respuesta += "\n🍮 *Postres:*\n";
    this.menu.postres.forEach(postre => {
      respuesta += `- ${postre.nombre} ($${postre.precio.toFixed(2)})\n`;
    });

    respuesta += "\n🎉 *Promociones del Día:*\n";
    this.menu.promociones.forEach(promo => {
      respuesta += `- ${promo.nombre} ($${promo.precio.toFixed(2)})\n`;
    });

    return respuesta;
  }
}
