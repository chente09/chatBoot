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
  messages: { text: string, isUser: boolean, timestamp?: Date ,imageUrl?: string}[] = [];
  userInput: string = '';
  currentAssistantMessage: Message | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  classificationResult: string = '';


  readonly CLASSES = ['pie_de_manzana', 'costillas_de_cerdo', 'baklava', 'carpaccio_de_res', 'tartar_de_res',
'ensalada_de_remolacha', 'buñuelos', 'bibimbap', 'pudin_de_pan', 'burrito_de_desayuno',
'bruschetta', 'ensalada_cesar', 'cannoli', 'ensalada_caprese', 'pastel_de_zanahoria',
'ceviche', 'tarta_de_queso', 'tabla_de_quesos', 'curry_de_pollo', 'quesadilla_de_pollo',
'alitas_de_pollo', 'pastel_de_chocolate', 'mousse_de_chocolate', 'churros', 'sopa_de_almejas',
'sandwich_club', 'pasteles_de_cangrejo', 'creme_brulee', 'croque_madame', 'cupcakes',
'huevos_rellenos', 'donas', 'dumplings', 'edamame', 'huevos_benedictinos', 'caracoles',
'falafel', 'filete_mignon', 'pescado_con_papas_fritas', 'foie_gras', 'papas_fritas',
'sopa_de_cebolla_francesa', 'tostadas_francesas', 'calamares_fritos', 'arroz_frito',
'yogur_helado', 'pan_de_ajo', 'ñoquis', 'ensalada_griega', 'sandwich_de_queso_a_la_parrilla',
'salmon_a_la_parrilla', 'guacamole', 'gyoza', 'hamburguesa', 'sopa_agripicante',
'hot_dog', 'huevos_rancheros', 'hummus', 'helado', 'lasaña', 'bisque_de_langosta',
'sandwich_de_langosta', 'macarrones_con_queso', 'macarons', 'sopa_de_miso', 'mejillones',
'nachos', 'omelet', 'aros_de_cebolla', 'ostras', 'pad_thai', 'paella', 'panqueques',
'panna_cotta', 'pato_pekines', 'pho', 'pizza', 'chuleta_de_cerdo', 'poutine', 'costilla_de_res',
'sandwich_de_cerdo_desmenuzado', 'ramen', 'ravioles', 'pastel_red_velvet', 'risotto', 'samosa',
'sashimi', 'vieiras', 'ensalada_de_algas', 'camarones_con_semola', 'espaguetis_a_la_boloñesa',
'espaguetis_a_la_carbonara', 'rollitos_primavera', 'bistec', 'pastel_de_fresas', 'sushi',
'tacos', 'takoyaki', 'tiramisu', 'tartar_de_atun', 'waffles'
];



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
      // Generar vista previa
      const reader = new FileReader();
      reader.onload = (e: any) => {
        const imageUrl = e.target.result;
        // Agrega el mensaje con la vista previa de la imagen
        this.messages.push({
          text: `📂 Imagen seleccionada: ${this.selectedFile!.name}`,
          isUser: true,
          timestamp: new Date(),
          imageUrl: imageUrl
        });
      };
      reader.readAsDataURL(this.selectedFile);

      
    } else {
      this.imagePreview = null;
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