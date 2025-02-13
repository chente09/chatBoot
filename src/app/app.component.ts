import { NgClass, NgForOf, DatePipe, CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ChatService } from './servicios/chat/chat.service';
import { ApiService } from './servicios/api/api.service';


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
  selectedFile: File | null = null;
  classificationResult: string = '';


  readonly CLASSES = ['apple_pie', 'baby_back_ribs', 'baklava', 'beef_carpaccio', 'beef_tartare',
    'beet_salad', 'beignets', 'bibimbap', 'bread_pudding', 'breakfast_burrito',
    'bruschetta', 'caesar_salad', 'cannoli', 'caprese_salad', 'carrot_cake',
    'ceviche', 'cheesecake', 'cheese_plate', 'chicken_curry', 'chicken_quesadilla',
    'chicken_wings', 'chocolate_cake', 'chocolate_mousse', 'churros', 'clam_chowder',
    'club_sandwich', 'crab_cakes', 'creme_brulee', 'croque_madame', 'cup_cakes',
    'deviled_eggs', 'donuts', 'dumplings', 'edamame', 'eggs_benedict', 'escargots',
    'falafel', 'filet_mignon', 'fish_and_chips', 'foie_gras', 'french_fries',
    'french_onion_soup', 'french_toast', 'fried_calamari', 'fried_rice',
    'frozen_yogurt', 'garlic_bread', 'gnocchi', 'greek_salad', 'grilled_cheese_sandwich',
    'grilled_salmon', 'guacamole', 'gyoza', 'hamburger', 'hot_and_sour_soup',
    'hot_dog', 'huevos_rancheros', 'hummus', 'ice_cream', 'lasagna', 'lobster_bisque',
    'lobster_roll_sandwich', 'macaroni_and_cheese', 'macarons', 'miso_soup', 'mussels',
    'nachos', 'omelette', 'onion_rings', 'oysters', 'pad_thai', 'paella', 'pancakes',
    'panna_cotta', 'peking_duck', 'pho', 'pizza', 'pork_chop', 'poutine', 'prime_rib',
    'pulled_pork_sandwich', 'ramen', 'ravioli', 'red_velvet_cake', 'risotto', 'samosa',
    'sashimi', 'scallops', 'seaweed_salad', 'shrimp_and_grits', 'spaghetti_bolognese',
    'spaghetti_carbonara', 'spring_rolls', 'steak', 'strawberry_shortcake', 'sushi',
    'tacos', 'takoyaki', 'tiramisu', 'tuna_tartare', 'waffles'];



  // Controles para modelos de visión
  enableImageClassification = false;
  enableObjectDetection = false;

  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  constructor(private chatService: ChatService, private apiService: ApiService) {}

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

  async sendMessage() {
    if (!this.userInput.trim()) return;

    // Añadir el mensaje del usuario
    this.messages.push({ text: this.userInput, isUser: true, timestamp: new Date() });
    const inputText = this.userInput;
    this.userInput = '';

    // Añadir un mensaje de "Generando respuesta..."
    this.messages.push({ text: 'Generando respuesta...', isUser: false, timestamp: new Date() });

    try {
      // Obtener el observable de streaming
      const botReply$ = this.chatService.sendMessage(inputText);

      // Reemplazar el mensaje "Generando respuesta..." con la respuesta real
      const lastMessageIndex = this.messages.length - 1;

      // Suscribirse al observable para recibir los chunks
      let isFirstChunk = true; // Bandera para identificar el primer chunk
      botReply$.subscribe({
        next: (chunk) => {
          if (isFirstChunk) {
            // Reemplazar el mensaje "Generando respuesta..." con el primer chunk
            this.messages[lastMessageIndex].text = chunk;
            isFirstChunk = false;
          } else {
            // Añadir los siguientes chunks al mensaje
            this.messages[lastMessageIndex].text += chunk;
          }
        },
        error: (error) => {
          console.error('Error al recibir la respuesta del asistente:', error);
          this.messages[lastMessageIndex].text = 'Error al procesar la solicitud.';
        },
        complete: () => {
          console.log('Streaming completado');
        }
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      this.messages[this.messages.length - 1].text = 'Error al procesar la solicitud.';
    }
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
    const file = new File(
      [new Blob(this.audioChunks, { type: 'audio/webm' })],
      'grabacion.webm',
      { type: 'audio/webm' }
    );
  
    try {
      const transcription = await this.chatService.transcribeAudio(file);
      if (!transcription?.trim()) return;
  
      // Añadir el mensaje del usuario (transcripción)
      this.messages.push({
        text: transcription,
        isUser: true,
        timestamp: new Date()
      });
  
      // Añadir un mensaje de "Generando respuesta..." para la respuesta del bot
      this.messages.push({
        text: 'Generando respuesta...',
        isUser: false,
        timestamp: new Date()
      });
      const lastMessageIndex = this.messages.length - 1;
  
      // Suscribirse al observable de streaming de respuesta
      this.chatService.sendMessage(transcription).subscribe({
        next: (chunk: string) => {
          // Si es el primer chunk, reemplaza el mensaje
          if (this.messages[lastMessageIndex].text === 'Generando respuesta...') {
            this.messages[lastMessageIndex].text = chunk;
          } else {
            // Sino, concatena el siguiente chunk
            this.messages[lastMessageIndex].text += chunk;
          }
        },
        error: (err) => {
          console.error('Error en respuesta del chatbot:', err);
          this.messages[lastMessageIndex].text = 'Error al procesar la solicitud.';
        },
        complete: () => {
          console.log('Streaming completado');
        }
      });
    } catch (error) {
      console.error('Error transcribiendo el audio:', error);
    }
  }
  
  // Método para clasificar la imagen y responder con el asistente
  async askAssistant() {
    if (!this.userInput.trim() && !this.selectedFile) return;
  
    if (this.selectedFile) {
      this.messages.push({ text: "🔍 Clasificando imagen...", isUser: false, timestamp: new Date() });

      this.apiService.classifyImage(this.selectedFile).subscribe({
        next: (response) => {
          const predictedIndex = parseInt(response.predictions); // Recibe un número
          const predictedLabel = this.CLASSES[predictedIndex] || "Desconocido"; // Convierte a nombre
          this.messages.push({ text: `📸 Imagen clasificada como: ${predictedLabel}`, isUser:false, timestamp: new Date() });
          this.selectedFile = null; 
        },
        error: () => {
          this.messages.push({ text: "❌ Error al clasificar la imagen.", isUser:false, timestamp: new Date()});
          this.selectedFile = null;
        }
      });
      return;
    }
  }

  onFileSelected(event: any) {
    this.selectedFile = event.target.files[0] || null;
    if (this.selectedFile) {
      this.messages.push({ text: `📂 Imagen seleccionada: ${this.selectedFile.name}`, isUser:true, timestamp: new Date() });
    }
  }

  async classifyImage() {
    if (!this.selectedFile) {
      alert("Por favor, selecciona una imagen.");
      return;
    }

    this.apiService.classifyImage(this.selectedFile).subscribe({
      next: (response) => {
        const predictedIndex = parseInt(response.predictions);
        this.classificationResult = this.CLASSES[predictedIndex] || "Desconocido";
      },
      error: (error) => {
        console.error("Error en la clasificación:", error);
        this.classificationResult = "Error al clasificar la imagen.";
      }
    });
  }
}