import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { provideHttpClient } from '@angular/common/http';
import { AppComponent } from './app/app.component';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getAuth, provideAuth } from '@angular/fire/auth';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { getStorage, provideStorage } from '@angular/fire/storage';
import { getRemoteConfig, provideRemoteConfig } from '@angular/fire/remote-config';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    ...appConfig.providers, 

    // Inicializar Firebase primero
    provideFirebaseApp(() => initializeApp({ 
      projectId: "tallerweb2-afd27", 
      appId: "1:53449917018:web:b26e46d5a94d8dfb534e63", 
      databaseURL: "https://tallerweb2-afd27-default-rtdb.firebaseio.com", 
      storageBucket: "tallerweb2-afd27.firebasestorage.app", 
      apiKey: "AIzaSyAzIL3sEMj6SeeR_SxSiA9NZI_4jYwqS_o", 
      authDomain: "tallerweb2-afd27.firebaseapp.com", 
      messagingSenderId: "53449917018" 
    })), 

    // Luego inicializar los demás servicios de Firebase
    provideAuth(() => getAuth()), 
    provideFirestore(() => getFirestore()), 
    provideStorage(() => getStorage()), 
    
    // Finalmente, RemoteConfig (para evitar errores de contexto)
    provideRemoteConfig(() => getRemoteConfig())
  ]
}).catch((err) => console.error(err));
