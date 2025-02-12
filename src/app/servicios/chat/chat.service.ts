import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, from, lastValueFrom, Observable, throwError } from 'rxjs';
import { OpenAiService } from '../openAi/open-ai.service';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  
  private audioApiUrl = 'https://api.openai.com/v1/audio/transcriptions';

  private apiKey = environment.apiKey;
  
  constructor(private http: HttpClient,private openAiService: OpenAiService) { }

  // Enviar mensaje de texto y recibir respuesta
  sendMessage(message: string): Observable<string> {
    return from(this.openAiService.sendMessage(message));
  }

// Enviar audio al backend para transcripción (Whisper)transcribeAudio(file: File): Promise<string> {
  async transcribeAudio(file: File): Promise<string> {   
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