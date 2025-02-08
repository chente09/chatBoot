import { NgClass, NgForOf, DatePipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatService } from './servicios/chat/chat.service';


interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp?: Date;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [FormsModule, NgClass, NgForOf, DatePipe,CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  isNightMode: boolean = false;
  messages: { text: string, isUser: boolean, timestamp?: Date }[] = [];
  userInput: string = '';
  currentAssistantMessage: Message | null = null;

  // Controles para modelos de visión
  enableImageClassification = false;
  enableObjectDetection = false;

  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  constructor(private chatService: ChatService) {}

  toggleNightMode() {
    this.isNightMode = !this.isNightMode;
    this.applyTheme();
  }

  applyTheme() {
    const body = document.body;
    if (this.isNightMode) {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.setAttribute('data-theme', 'light');
    }
  }

  sendMessage() {
    if (!this.userInput.trim()) return;

    // Agregar mensaje del usuario
    this.messages.push({ text: this.userInput, isUser: true, timestamp: new Date() });

    const inputText = this.userInput;
    this.userInput = '';

    // Llamada al servicio para enviar el mensaje y recibir respuesta en streaming
    this.chatService.sendMessage(inputText).subscribe({
      next: (response) => {
        const botReply = response.choices[0].message.content;
        this.messages.push({ text: botReply, isUser: false, timestamp: new Date() });
      },
      error: (err) => console.error(err),
    });
  }

  // Método para iniciar/detener la grabación
  async toggleRecording() {
    if (this.isRecording) {
      this.stopRecording();
      
    } else {
      await this.startRecording();
    }
    this.isRecording = !this.isRecording;
  }

  // Iniciar la grabación
  async startRecording() {
    this.audioChunks = [];
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.mediaRecorder = new MediaRecorder(stream);
      this.mediaRecorder.ondataavailable = (event) => {
        this.audioChunks.push(event.data);
      };
      this.mediaRecorder.onstop = () => {
        
      };
      this.mediaRecorder.start();
    } catch (error) {
      console.error('Error al acceder al micrófono:', error);
      alert('No se pudo acceder al micrófono. Asegúrate de permitir el acceso.');
    }
  }

  // Detener la grabación
  stopRecording() {
    if (this.mediaRecorder) {
      this.mediaRecorder.stop();
      this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
  
      // ✅ Enviar el audio automáticamente al finalizar la grabación
      setTimeout(() => this.sendAudioToAPI(), 500);
    }
  }
  

  // Enviar el audio grabado a la API de OpenAI para transcribirlo
  async sendAudioToAPI() {
    const file = new File([new Blob(this.audioChunks, { type: 'audio/webm' })], 'grabacion.webm', { type: 'audio/webm' });
  
    try {
      const transcription = await this.chatService.transcribeAudio(file);
      if (!transcription?.trim()) return;
  
      this.messages.push({ text: transcription, isUser: true, timestamp: new Date() });
  
      this.chatService.sendMessage(transcription).subscribe({
        next: (response) => {
          this.messages.push({ text: response.choices[0].message.content, isUser: false, timestamp: new Date() });
        },
        error: (err) => console.error('Error en respuesta del chatbot:', err),
      });
  
    } catch (error) {
      console.error('Error transcribiendo el audio:', error);
    }
  }
  

  onFileUpload(event: any) {
    const file = event.target.files[0];
    if (file) {
      alert(`File uploaded: ${file.name}`);
      // Handle file upload logic here
    }
  }
  
  
}