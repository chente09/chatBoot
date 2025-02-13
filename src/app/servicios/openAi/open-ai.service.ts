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
          if (!this.threadId) {
            await this.createThread();
          }
          if (!this.threadId) throw new Error("No se pudo crear el Thread.");

          // Agregar mensaje al thread
          await this.openai.beta.threads.messages.create(this.threadId, {
            role: "user",
            content: message
          });

          // Ejecutar el asistente en el thread con streaming
          const run = await this.openai.beta.threads.runs.create(this.threadId, {
            assistant_id: this.assistantId,
            stream: true, // ✅ Habilitar streaming
          });

          // Procesar los eventos del stream
          for await (const event of run) {
            if (event.event === 'thread.message.delta') {
              const content = event.data.delta.content?.[0];
              if (content?.type === 'text' && content.text?.value) {
                observer.next(content.text.value); // Emitir cada chunk de texto
              }
            }
          }

          observer.complete();
        } catch (error) {
          observer.error('Error al enviar mensaje al asistente: ' + error);
        }
      })();
    });
  }

  // Enviar audio al backend para transcripción (Whisper)
  async transcribeAudio(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // ✅ Forzar idioma español (opcional)

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openai.apiKey}`,
        },
        body: formData
      });

      const data = await response.json();
      return data?.text || 'No se recibió ninguna transcripción.';
    } catch (error) {
      console.error('Error en OpenAI Audio API:', error);
      throw error;
    }
  }
}