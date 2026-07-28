import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from './firebase';
import { ContactMessage } from '../types';

export async function sendContactMessage(data: {
  name?: string;
  senderName?: string;
  email?: string;
  senderEmail?: string;
  message: string;
  userId?: string;
}): Promise<string> {
  const nameVal = data.name || data.senderName || 'زائر المعرض';
  const emailVal = data.email || data.senderEmail || '';

  const docRef = await addDoc(collection(db, 'contact_messages'), {
    name: nameVal,
    senderName: nameVal,
    email: emailVal,
    senderEmail: emailVal,
    message: data.message,
    status: 'new',
    createdAt: new Date().toISOString(),
    ...(data.userId ? { userId: data.userId } : {})
  });
  return docRef.id;
}

export async function fetchContactMessages(): Promise<ContactMessage[]> {
  try {
    const q = query(collection(db, 'contact_messages'), orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);
    const messages: ContactMessage[] = [];
    snapshot.forEach((d) => {
      const data = d.data();
      messages.push({
        id: d.id,
        senderName: data.senderName || data.name || 'زائر المعرض',
        senderEmail: data.senderEmail || data.email || '',
        message: data.message || '',
        subject: data.subject || 'رسالة تواصل',
        status: (data.status === 'replied' ? 'replied' : 'unread') as 'unread' | 'replied',
        replyText: data.replyText,
        repliedAt: data.repliedAt,
        createdAt: data.createdAt || new Date().toISOString(),
        userId: data.userId
      });
    });
    return messages;
  } catch (err) {
    console.error('Error fetching contact messages:', err);
    return [];
  }
}

export async function replyToContactMessage(
  messageId: string, 
  replyText: string
): Promise<void> {
  const ref = doc(db, 'contact_messages', messageId);
  await updateDoc(ref, {
    status: 'replied',
    replyText,
    repliedAt: new Date().toISOString()
  });
}

export async function deleteContactMessage(messageId: string): Promise<void> {
  await deleteDoc(doc(db, 'contact_messages', messageId));
}
