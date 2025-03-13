import { DatePipe, CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild } from '@angular/core';
import { ChatService } from './servicios/chat/chat.service';
import { ApiService } from './servicios/api/api.service';
import { FormsModule } from '@angular/forms';
import { marked } from 'marked';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

interface Message {
  text: string;
  sender: 'user' | 'bot';
  timestamp?: Date;
  imageUrl?: string;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  isNightMode: boolean = true;
  isChatVisible = false;

  messages: { text: string; isUser: boolean; timestamp?: Date; imageUrl?: string }[] = [];
  userInput: string = '';
  currentAssistantMessage: Message | null = null;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  classificationResult: string = '';
  isLoading: boolean = false; // Para mostrar un indicador de carga

  @ViewChild('userInputRef') userInputRef!: ElementRef;
  @ViewChild('imageClassificationRef') imageClassificationRef!: ElementRef;
  @ViewChild('objectDetectionRef') objectDetectionRef!: ElementRef;

  readonly CLASSES = [
    'pie_de_manzana', 'costillas_de_cerdo', 'baklava', 'carpaccio_de_res', 'tartar_de_res',
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
    'tacos', 'takoyaki', 'tiramisu', 'tartar_de_atun', 'waffles',
  ];

  // Controles para modelos de visión
  enableImageClassification = false;
  enableObjectDetection = false;
  resultMessage = '';

  isRecording: boolean = false;
  mediaRecorder: MediaRecorder | null = null;
  audioChunks: Blob[] = [];

  

  constructor(private chatService: ChatService, private apiService: ApiService) { }

  
  // Cambiar entre modo noche/día
  toggleNightMode() {
    this.isNightMode = !this.isNightMode;
    this.applyTheme();
  }

  toggleChat() {
    this.isChatVisible = !this.isChatVisible;
  }

  // Función para iniciar un nuevo chat
  startNewChat() {
    this.messages = []; // Limpia la lista de mensajes
    this.isLoading = false; // Reinicia el estado de carga
    this.isRecording = false; // Detiene la grabación si está activa
    this.selectedFile = null; // Limpia el archivo seleccionado
    console.log("Nuevo chat iniciado"); // Mensaje de depuración
  }

  // Aplicar el tema actual
  applyTheme() {
    const body = document.body;
    if (this.isNightMode) {
      body.setAttribute('data-theme', 'dark');
    } else {
      body.setAttribute('data-theme', 'light');
    }
  }

  // Enviar mensaje de texto
  async sendMessage() {
    // Obtener el valor del input usando @ViewChild
    const userInput = this.userInputRef.nativeElement.value.trim();

    // Validar que el mensaje no esté vacío
    if (!userInput) return;

    // Añadir el mensaje del usuario
    this.messages.push({ text: userInput, isUser: true, timestamp: new Date() });

    // Limpiar el input después de enviar el mensaje
    this.userInputRef.nativeElement.value = '';

    // Añadir un mensaje de "Generando respuesta..."
    this.messages.push({ text: 'Generando respuesta...', isUser: false, timestamp: new Date() });
    this.isLoading = true;

    try {
      // Obtener el observable de streaming
      const botReply$ = this.chatService.sendMessage(userInput);

      // Reemplazar el mensaje "Generando respuesta..." con la respuesta real
      const lastMessageIndex = this.messages.length - 1;

      // Suscribirse al observable para recibir los chunks
      botReply$.subscribe({
        next: (chunk) => {
          if (this.messages[lastMessageIndex].text === 'Generando respuesta...') {
            this.messages[lastMessageIndex].text = chunk;
          } else {
            this.messages[lastMessageIndex].text += chunk;
          }
        },
        error: (error) => {
          console.error('Error al recibir la respuesta del asistente:', error);
          this.messages[lastMessageIndex].text = 'Error al procesar la solicitud.';
          this.isLoading = false;
        },
        complete: () => {
          console.log('Streaming completado');
          this.isLoading = false;
        },
      });
    } catch (error) {
      console.error('Error al enviar mensaje:', error);
      this.messages[this.messages.length - 1].text = 'Error al procesar la solicitud.';
      this.isLoading = false;
    }
  }

  // Método para obtener el estado de los checkboxes
  toggleCheckbox(type: 'classification' | 'detection', event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (type === 'classification') {
      this.enableImageClassification = isChecked;
    } else if (type === 'detection') {
      this.enableObjectDetection = isChecked;
    }

    // Si ambos están desactivados, reiniciar resultado
    if (!this.enableImageClassification && !this.enableObjectDetection) {
      this.resultMessage = '';
    }
  }

  // Método para establecer el estado de los checkboxes
  setCheckboxStates(imageClassification: boolean, objectDetection: boolean) {
    this.imageClassificationRef.nativeElement.checked = imageClassification;
    this.objectDetectionRef.nativeElement.checked = objectDetection;
  }


  // Iniciar/detener la grabación
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
      this.mediaRecorder.stream.getTracks().forEach((track) => track.stop());

      // Enviar el audio automáticamente al finalizar la grabación
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
      // Validar tipo de archivo antes de proceder
      const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(this.selectedFile.type)) {
        this.messages.push({ text: '❌ Solo se permiten archivos de imagen (JPG, PNG).', isUser: false, timestamp: new Date() });
        this.selectedFile = null;
        return;
      }

      // Añadir mensaje de carga
      this.messages.push({ text: '🔍 Clasificando imagen...', isUser: false, timestamp: new Date() });

      this.isLoading = true;  // Indicador de carga

      this.apiService.classifyImage(this.selectedFile).subscribe({
        next: (response) => {
          const predictedIndex = parseInt(response.predictions); // Recibe un número
          const predictedLabel = this.CLASSES[predictedIndex] || 'Desconocido'; // Convierte a nombre
          this.messages.push({
            text: `✅ Puedo asegurar que es una: ${predictedLabel}`,
            isUser: false,
            timestamp: new Date(),
          });
          this.selectedFile = null;
          this.isLoading = false;  // Ocultar el indicador de carga
        },
        error: () => {
          this.messages.push({ text: '❌ Error al clasificar la imagen.', isUser: false, timestamp: new Date() });
          this.selectedFile = null;
          this.isLoading = false;  // Ocultar el indicador de carga
        },
      });
      return;
    }
  }


  // Manejar la selección de archivos
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
          imageUrl: imageUrl,
        });
      };
      reader.readAsDataURL(this.selectedFile);
    } else {
      this.imagePreview = null;
    }
  }

  // Iniciar el modo demostración
  startDemoMode() {
    this.messages = []; // Limpiar mensajes anteriores
    this.messages.push({
      text: '¡Bienvenido al modo demostración! Prueba las capacidades del asistente.',
      isUser: false,
      timestamp: new Date(),
    });
  }
}