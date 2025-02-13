import { Injectable } from '@angular/core';
import OpenAI from 'openai';
import { environment } from '../../../environments/environments';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private openai: OpenAI;
  private threadId: string | null = null; // ✅ Guardamos el Thread ID
  private assistantId = environment.assistantId; // 🟢 Reemplaza con tu Assistant ID

  constructor() {
    this.openai = new OpenAI({
      apiKey: environment.apiKey, // 🔴 Usa una API Key válida y segura
      dangerouslyAllowBrowser: true, // ⚠️ NO RECOMENDADO para producción
    });
  }

  async createThread() {
    try {
      const thread = await this.openai.beta.threads.create();
      this.threadId = thread.id;
      console.log("Nuevo Thread ID:", this.threadId);
      return this.threadId;
    } catch (error) {
      console.error("Error al crear el thread:", error);
      return null;
    }
  }

  sendMessage(message: string): Observable<string> {
    return new Observable(observer => {
      (async () => {
        try {
          // Crear un hilo y ejecutar el asistente con streaming
          const stream = await this.openai.beta.threads.createAndRun({
            assistant_id: 'asst_uYT0oGvRKoFeHymfZ4MBgKl0',
            thread: {
              messages: [{ role: 'user', content: message }]
            },
            stream: true, // Habilitar streaming
          });

          // Procesar los eventos del stream
          for await (const event of stream) {
            if (event.event === 'thread.message.delta') {
              const content = event.data.delta.content?.[0];
              if (content?.type === 'text' && content.text?.value) {
                observer.next(content.text.value); // Emitir cada chunk de texto
              }
            }
          }
          observer.complete(); // Finalizar el stream
        } catch (error) {
          observer.error('Error al enviar mensaje al asistente: ' + error);
        }
      })();
    });
  }
  
}