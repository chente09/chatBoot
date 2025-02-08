import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { catchError, lastValueFrom, Observable, throwError } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = 'https://api.openai.com/v1/chat/completions'; // ✅ URL correcta
  private audioApiUrl = 'https://api.openai.com/v1/audio/transcriptions';

  private apiKey = ''; // ⚠️ No expongas tu API Key en el código
  
  constructor(private http: HttpClient) { }

  // Enviar mensaje de texto y recibir respuesta
  sendMessage(message: string): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
    });

    const body = {
      model: 'gpt-4',  // Asegúrate de que el modelo es válido
      messages: [{ role: 'user', content: message }],
      max_tokens: 150
    };

    return this.http.post(this.apiUrl, body, { headers });
  }

// Enviar audio al backend para transcripción (Whisper)transcribeAudio(file: File): Promise<string> {
  async transcribeAudio(file: File): Promise<string> {   
    const formData = new FormData();
    formData.append('file', file);
    formData.append('model', 'whisper-1');
    formData.append('language', 'es'); // ✅ Forzar idioma español (opcional)
  
    try {
      const response = await lastValueFrom(  // 👈 Reemplaza toPromise() por lastValueFrom()
        this.http.post<{ text: string }>(this.audioApiUrl, formData, {
          headers: { 'Authorization': `Bearer ${this.apiKey}` }, // ❌ NO agregues 'Content-Type'
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