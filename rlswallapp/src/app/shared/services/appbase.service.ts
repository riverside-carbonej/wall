import { Injectable } from '@angular/core';
import { Observable, from, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { 
  Firestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  CollectionReference,
  DocumentData,
  serverTimestamp,
  Timestamp
} from '@angular/fire/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {
  private connected$ = new BehaviorSubject<boolean>(true);

  constructor(private firestore: Firestore) {}

  isConnected(): Observable<boolean> {
    return this.connected$.asObservable();
  }

  // Generic CRUD operations
  create(collectionName: string, data: any): Observable<string> {
    const collectionRef = collection(this.firestore, collectionName);
    const docData = {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    return from(addDoc(collectionRef, docData)).pipe(
      map(docRef => docRef.id),
      catchError(error => {
        console.error('Create error:', error);
        throw error;
      })
    );
  }

  getAll(collectionName: string, orderByField: string = 'createdAt'): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const q = query(collectionRef, orderBy(orderByField, 'desc'));
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertTimestamps(doc.data())
        }))
      ),
      catchError(error => {
        console.error('GetAll error:', error);
        throw error;
      })
    );
  }

  getById(collectionName: string, id: string): Observable<any | null> {
    const docRef = doc(this.firestore, collectionName, id);
    
    return from(getDoc(docRef)).pipe(
      map(docSnap => {
        if (docSnap.exists()) {
          return {
            id: docSnap.id,
            ...this.convertTimestamps(docSnap.data())
          };
        }
        return null;
      }),
      catchError(error => {
        console.error('GetById error:', error);
        throw error;
      })
    );
  }

  update(collectionName: string, id: string, data: any): Observable<void> {
    const docRef = doc(this.firestore, collectionName, id);
    const updateData = {
      ...data,
      updatedAt: serverTimestamp()
    };
    
    return from(updateDoc(docRef, updateData)).pipe(
      catchError(error => {
        console.error('Update error:', error);
        throw error;
      })
    );
  }

  delete(collectionName: string, id: string): Observable<void> {
    const docRef = doc(this.firestore, collectionName, id);
    
    return from(deleteDoc(docRef)).pipe(
      catchError(error => {
        console.error('Delete error:', error);
        throw error;
      })
    );
  }

  search(collectionName: string, field: string, searchTerm: string): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    // Note: Firestore doesn't have full-text search. For production, consider Algolia or similar
    // This is a simple startsWith search
    const q = query(
      collectionRef,
      where(field, '>=', searchTerm),
      where(field, '<=', searchTerm + '\uf8ff'),
      orderBy(field)
    );
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertTimestamps(doc.data())
        }))
      ),
      catchError(error => {
        console.error('Search error:', error);
        throw error;
      })
    );
  }

  getWhere(collectionName: string, field: string, operator: any, value: any): Observable<any[]> {
    const collectionRef = collection(this.firestore, collectionName);
    const q = query(collectionRef, where(field, operator, value));
    
    return from(getDocs(q)).pipe(
      map(snapshot => 
        snapshot.docs.map(doc => ({
          id: doc.id,
          ...this.convertTimestamps(doc.data())
        }))
      ),
      catchError(error => {
        console.error('GetWhere error:', error);
        throw error;
      })
    );
  }

  private convertTimestamps(data: DocumentData): any {
    const result = { ...data };
    
    Object.keys(result).forEach(key => {
      if (result[key] instanceof Timestamp) {
        result[key] = result[key].toDate();
      }
    });
    
    return result;
  }
}