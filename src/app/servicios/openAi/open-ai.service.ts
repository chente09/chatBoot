import { Injectable } from '@angular/core';
import OpenAI from 'openai';
import { environment } from '../../../environments/environments';


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

  async sendMessage(message: string): Promise<string> {
    try {
      if (!this.threadId) {
        await this.createThread();
      }
      if (!this.threadId) throw new Error("No se pudo crear el Thread.");
  
      // ✅ Enviar el mensaje al hilo
      await this.openai.beta.threads.messages.create(this.threadId, {
        role: "user",
        content: message,
      });
  
      // ✅ Ejecutar el asistente en el thread
      const run = await this.openai.beta.threads.runs.create(this.threadId, {
        assistant_id: this.assistantId,
      });
  
      // ✅ Esperar a que el asistente genere la respuesta
      let runStatus;
      do {
        runStatus = await this.openai.beta.threads.runs.retrieve(this.threadId, run.id);
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Esperar 2s antes de verificar el estado
      } while (runStatus.status === "in_progress" || runStatus.status === "queued");
  
      // ✅ Obtener la respuesta del asistente
      const messages = await this.openai.beta.threads.messages.list(this.threadId);
      const lastMessage = messages.data.find(msg => msg.role === "assistant");
  
      // 🛠 Filtrar el contenido del mensaje para obtener solo los bloques de texto
      const textBlock = lastMessage?.content.find(block => "text" in block) as { text: { value: string } } | undefined;
  
      return textBlock?.text.value || "No se encontró una respuesta válida.";
    } catch (error) {
      console.error("Error en OpenAI:", error);
      return "Hubo un error al procesar la solicitud.";
    }
  }
  
}