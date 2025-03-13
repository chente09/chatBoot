import { Injectable, Inject } from '@angular/core';
import OpenAI from 'openai';
import { RemoteConfig, getValue, fetchAndActivate  } from '@angular/fire/remote-config';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OpenAiService {
  private openai!: OpenAI;
  private threadId: string | null = null;
  private assistantId: string | null = null;
  private apiKey: string | null = null;

  constructor(private remoteConfig: RemoteConfig) { // ✅ Se inyecta por constructor
    this.loadConfig();
  }

  /**
   * Carga las claves desde Firebase Remote Config
   */
  private async loadConfig() {
    try {
      // 🔥 Forzar actualización para obtener valores más recientes
      await fetchAndActivate(this.remoteConfig);

      this.apiKey = (await getValue(this.remoteConfig, 'OPENAI_API_KEY')).asString();
      this.assistantId = (await getValue(this.remoteConfig, 'OPENAI_ASSISTANT_ID')).asString();

      if (!this.apiKey || !this.assistantId) {
        throw new Error("⚠️ No se pudieron obtener las credenciales de OpenAI.");
      }

      this.openai = new OpenAI({
        apiKey: this.apiKey,
        dangerouslyAllowBrowser: true,
      });

    } catch (error) {
      console.error("❌ Error al cargar Firebase Remote Config:", error);
    }
  }

  /**
   * Crea un nuevo hilo (Thread) en OpenAI y guarda su ID
   */
  async createThread(): Promise<string | null> {
    if (!this.openai) {
      console.error("⚠️ OpenAI no está inicializado todavía.");
      return null;
    }

    try {
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
          if (!this.threadId) {
            await this.createThread();
          }
          if (!this.threadId) throw new Error("❌ No se pudo crear el Thread.");

          // Agregar mensaje al thread
          await this.openai.beta.threads.messages.create(this.threadId, {
            role: "user",
            content: message
          });

          // Ejecutar el asistente en el thread con streaming
          const run = await this.openai.beta.threads.runs.create(this.threadId, {
            assistant_id: this.assistantId!,
            stream: true,
          });

          // Procesar los eventos del stream
          for await (const event of run) {
            if (event.event === 'thread.message.delta') {
              const content = event.data.delta.content?.[0];
              if (content?.type === 'text' && content.text?.value) {
                observer.next(content.text.value); // ✅ Emitimos cada chunk de texto recibido
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

  /**
   * Envía un archivo de audio a OpenAI para transcripción (Whisper)
   */
  async transcribeAudio(file: File): Promise<string> {
    if (!this.apiKey) {
      throw new Error("⚠️ API Key no disponible. Asegúrate de que Remote Config está funcionando.");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // ✅ Forzar idioma español (opcional)

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData
      });

      const data = await response.json();
      return data?.text || '❌ No se recibió ninguna transcripción.';
    } catch (error) {
      console.error('❌ Error en OpenAI Audio API:', error);
      throw error;
    }
  }
}
