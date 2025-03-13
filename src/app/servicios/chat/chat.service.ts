import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, lastValueFrom, Observable, throwError } from 'rxjs';
import { OpenAiService } from '../openAi/open-ai.service';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  
  private audioApiUrl = 'https://api.openai.com/v1/audio/transcriptions';
  private apiKey: string | null = null; // Clave API de OpenAI
  
  constructor(private http: HttpClient, private openAiService: OpenAiService) { 
    // Se obtiene la API key a través del servicio OpenAiService
    this.openAiService.getApiKey().then(key => {
      this.apiKey = key;
    }).catch(error => {
      console.error("Error al cargar la API key de Remote Config:", error);
    });
  }

  // Enviar mensaje de texto y recibir respuesta
  sendMessage(message: string): Observable<string> {
    return from(this.openAiService.sendMessage(message));
  }

  // Enviar audio al backend para transcripción (Whisper)
  async transcribeAudio(file: File): Promise<string> {   
    if (!this.apiKey) {
      console.error("API Key no disponible. No se puede realizar la transcripción.");
      throw new Error("API Key no disponible");
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // Forzar idioma español (opcional)
  
    try {
      const response = await lastValueFrom(
        this.http.post<{ text: string }>(this.audioApiUrl, formData, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` } // No se agrega Content-Type
        })
      );
  
      console.log("Transcripción recibida:", response);  
      return response?.text ?? "No se recibió ninguna transcripción.";
    } catch (error) {
      console.error("Error en OpenAI Audio API:", error);
      throw error;
    }
  }
}
