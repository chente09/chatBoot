import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = 'https://us-central1-true-velocity-440119-s3.cloudfunctions.net/img_vn_classification';

  constructor(private http: HttpClient) {}

  classifyImage(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image); // 📷 Enviar imagen en el body

    const headers = new HttpHeaders({
      'Accept': 'application/json' // Asegurar que el servidor acepte JSON
    });

    return this.http.post<any>(this.apiUrl, formData, { headers });
  }
}
