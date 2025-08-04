const { initializeApp } = require('firebase/app');
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require('firebase/firestore');

// Firebase config - replace with your actual config
const firebaseConfig = {
  // Add your Firebase config here
  // You can find this in your Firebase project settings
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Test users to create
const testUsers = [
  {
    uid: 'test-user-1',
    email: 'john.doe@riversideschools.net',
    displayName: 'John Doe',
    photoURL: null,
    active: true
  },
  {
    uid: 'test-user-2', 
    email: 'jane.smith@riversideschools.net',
    displayName: 'Jane Smith',
    photoURL: null,
    active: true
  },
  {
    uid: 'test-user-3',
    email: 'bob.johnson@riversideschools.net', 
    displayName: 'Bob Johnson',
    photoURL: null,
    active: true
  },
  {
    uid: 'test-user-4',
    email: 'sarah.wilson@riversideschools.net',
    displayName: 'Sarah Wilson', 
    photoURL: null,
    active: true
  },
  {
    uid: 'test-user-5',
    email: 'mike.davis@riversideschools.net',
    displayName: 'Mike Davis',
    photoURL: null,
    active: true
  }
];

async function createTestUsers() {
  console.log('Creating test users...');
  
  try {
    for (const user of testUsers) {
      const userDoc = {
        ...user,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      await setDoc(doc(db, 'users', user.uid), userDoc);
      console.log(`Created user: ${user.displayName} (${user.email})`);
    }
    
    console.log('✅ All test users created successfully!');
    console.log('You can now test the user search functionality.');
    
  } catch (error) {
    console.error('❌ Error creating test users:', error);
  }
}

// Run the script
createTestUsers();