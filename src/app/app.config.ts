import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withHashLocation } from '@angular/router';
import { routes } from './app.routes';
import { initializeApp, provideFirebaseApp } from '@angular/fire/app';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { provideAnimations } from '@angular/platform-browser/animations';
import { CDK_DRAG_CONFIG } from '@angular/cdk/drag-drop';
import { provideAuth, getAuth } from '@angular/fire/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withHashLocation()),
    provideFirebaseApp(() =>
      initializeApp({
        projectId: 'join-6125f',
        appId: '1:703986298510:web:8cb9707daf583f2153a3df',
        storageBucket: 'join-6125f.firebasestorage.app',
        apiKey: 'AIzaSyAWyoU260eXmo3445mLTsqCjzRhEG6aq9A',
        authDomain: 'join-6125f.firebaseapp.com',
        messagingSenderId: '703986298510',
      })
    ),
    provideFirestore(() => getFirestore()),
    provideAnimations(),
    provideAuth(() => getAuth()),
    {
      provide: CDK_DRAG_CONFIG,
      useValue: {
        dragStartThreshold: 5,
        pointerDirectionChangeThreshold: 5,
        zIndex: 1000,
        scrollSpeed: 30,          
        scrollProximity: 100,
      },
    },
  ],
};
