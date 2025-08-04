import { Injectable } from '@angular/core';
import { Observable, of, delay } from 'rxjs';

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class MockAuthSearchService {

  // Mock users for testing - replace with real Firebase Auth search
  private mockUsers: AuthUser[] = [
    {
      uid: 'user1',
      email: 'john.doe@riversideschools.net',
      displayName: 'John Doe',
      photoURL: 'https://api.dicebear.com/7.x/personas/svg?seed=john'
    },
    {
      uid: 'user2',
      email: 'jane.smith@riversideschools.net',
      displayName: 'Jane Smith',
      photoURL: 'https://api.dicebear.com/7.x/personas/svg?seed=jane'
    },
    {
      uid: 'user3',
      email: 'bob.johnson@riversideschools.net',
      displayName: 'Bob Johnson',
      photoURL: null
    },
    {
      uid: 'user4',
      email: 'sarah.wilson@riversideschools.net',
      displayName: 'Sarah Wilson',
      photoURL: 'https://api.dicebear.com/7.x/personas/svg?seed=sarah'
    },
    {
      uid: 'user5',
      email: 'mike.davis@riversideschools.net',
      displayName: 'Mike Davis',
      photoURL: null
    },
    {
      uid: 'user6',
      email: 'lisa.brown@riversideschools.net',
      displayName: 'Lisa Brown',
      photoURL: 'https://api.dicebear.com/7.x/personas/svg?seed=lisa'
    },
    {
      uid: 'user7',
      email: 'david.miller@riversideschools.net',
      displayName: 'David Miller',
      photoURL: null
    },
    {
      uid: 'user8',
      email: 'emily.jones@riversideschools.net',
      displayName: 'Emily Jones',
      photoURL: 'https://api.dicebear.com/7.x/personas/svg?seed=emily'
    }
  ];

  /**
   * Search users - simulates Firebase Auth search
   * In production, replace this with a Cloud Function or backend API call
   */
  searchUsers(searchTerm: string): Observable<AuthUser[]> {
    if (!searchTerm || searchTerm.length < 3) {
      return of([]);
    }

    const searchLower = searchTerm.toLowerCase();
    const results = this.mockUsers.filter(user => {
      const email = user.email.toLowerCase();
      const displayName = user.displayName?.toLowerCase() || '';
      
      return email.includes(searchLower) || displayName.includes(searchLower);
    });

    // Simulate network delay
    return of(results).pipe(delay(300));
  }
}