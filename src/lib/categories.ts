import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  onSnapshot, 
  writeBatch,
  limit
} from 'firebase/firestore';
import { db } from './firebase';
import { CategoryItem } from '../types';

export const INITIAL_CATEGORY_GROUPS = [
  {
    group: 'اللوحات والرسم',
    items: [
      'لوحات فنية',
      'رسم يدوي',
      'رسم بالقلم الرصاص',
      'رسم بالفحم',
      'رسم بالألوان المائية',
      'رسم بالألوان الزيتية',
      'رسم بالأكريليك',
      'رسم بالباستيل',
      'رسم بالحبر',
      'رسم مختلط',
      'بورتريه',
      'رسم شخصيات',
      'رسم كرتوني',
      'مانجا وأنمي',
      'رسم طبيعة صامتة',
      'رسم معماري',
      'رسم حيوانات',
      'رسم نباتات وزهور',
      'فن الخط العربي',
      'زخارف إسلامية',
    ]
  },
  {
    group: 'أنماط ومدارس الفن',
    items: [
      'فن واقعي',
      'فن سريالي',
      'أعمال تجريدية',
      'فن تشكيلي',
      'فن كلاسيكي',
      'فن معاصر',
      'فن شعبي',
      'فن تجريدي هندسي',
      'فن إسلامي',
    ]
  },
  {
    group: 'التصوير الفوتوغرافي',
    items: [
      'تصوير فوتوغرافي',
      'تصوير طبيعة',
      'تصوير مناظر طبيعية',
      'تصوير بورتريه',
      'تصوير أشخاص',
      'تصوير أطفال',
      'تصوير حيوانات',
      'تصوير طيور',
      'تصوير حشرات',
      'تصوير نباتات وزهور',
      'تصوير معماري',
      'تصوير شوارع',
      'تصوير سفر',
      'تصوير سياحي',
      'تصوير مدن',
      'تصوير ليلي',
      'تصوير غروب وشروق',
      'تصوير ماكرو',
      'تصوير قريب',
      'تصوير منتجات',
      'تصوير طعام',
      'تصوير مناسبات',
      'تصوير حفلات',
      'تصوير رياضي',
      'تصوير سيارات',
      'تصوير بحري',
      'تصوير تحت الماء',
      'تصوير جوي',
      'تصوير درون',
      'تصوير وثائقي',
      'تصوير صحفي',
      'تصوير فني',
      'تصوير أبيض وأسود',
      'تصوير بالألوان',
      'تصوير تجريدي',
      'تصوير بانورامي',
      'تصوير 360 درجة',
      'Photo Sphere',
    ]
  },
  {
    group: 'الفن الرقمي والتصميم',
    items: [
      'فن رقمي',
      'رسم رقمي',
      'تصميم جرافيك',
      'فن ثلاثي الأبعاد 3D',
      'تصميم شخصيات',
      'تصميم ألعاب',
      'تصميم شعارات',
      'تصميم إعلانات',
      'رسوم متحركة',
      'فن مولد بالذكاء الاصطناعي',
      'تعديل ومعالجة الصور',
      'فن مفاهيمي',
      'تصميم واجهات',
      'تصميم أغلفة',
    ]
  },
  {
    group: 'الأعمال اليدوية والفنون الأخرى',
    items: [
      'أعمال فنية أخرى',
      'أعمال يدوية',
      'أشغال فنية',
      'نحت',
      'نحت خشبي',
      'نحت حجري',
      'نحت معدني',
      'خزف وفخار',
      'أعمال من الطين',
      'أعمال خشبية',
      'أعمال معدنية',
      'أعمال زجاجية',
      'فسيفساء',
      'كولاج',
      'إعادة تدوير فني',
      'حياكة وتطريز',
      'مشغولات يدوية',
      'ديكوباج',
      'فن الورق',
      'أوريجامي',
      'تصميم أزياء',
      'حلي وإكسسوارات',
      'فنون تراثية',
      'حرف يدوية',
    ]
  }
];

export function normalizeName(name: string): string {
  if (!name) return '';
  return name
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function generateSlug(name: string): string {
  if (!name) return `cat_${Date.now()}`;
  const clean = name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9\-]/g, '');
  
  if (!clean || clean.length < 2) {
    return `cat-${Date.now()}`;
  }
  return clean;
}

// In-memory caching & seeding lock
let isSeeding = false;

export async function seedInitialCategories(existing: CategoryItem[]): Promise<void> {
  if (isSeeding) return;
  
  const existingNamesSet = new Set(existing.map((c) => normalizeName(c.name)));
  
  // Build items that need to be created
  const itemsToCreate: { name: string; group: string; sortOrder: number }[] = [];
  let orderCounter = existing.length > 0 ? Math.max(...existing.map(c => c.sortOrder || 0)) + 1 : 1;

  for (const groupObj of INITIAL_CATEGORY_GROUPS) {
    for (const itemName of groupObj.items) {
      const norm = normalizeName(itemName);
      if (!existingNamesSet.has(norm)) {
        itemsToCreate.push({
          name: itemName.trim(),
          group: groupObj.group,
          sortOrder: orderCounter++
        });
        existingNamesSet.add(norm);
      }
    }
  }

  if (itemsToCreate.length === 0) return;

  isSeeding = true;
  try {
    const now = new Date().toISOString();
    
    // Process in batches of 450 (Firestore limit is 500)
    const batchSize = 400;
    for (let i = 0; i < itemsToCreate.length; i += batchSize) {
      const chunk = itemsToCreate.slice(i, i + batchSize);
      const batch = writeBatch(db);

      for (const item of chunk) {
        const slug = generateSlug(item.name);
        // Use a clean document ID based on slug or timestamp
        const docId = `cat_${slug}_${Math.random().toString(36).substring(2, 7)}`;
        const docRef = doc(db, 'categories', docId);

        const newCategory: CategoryItem = {
          id: docId,
          name: item.name,
          slug: slug,
          group: item.group,
          description: '',
          isActive: true,
          sortOrder: item.sortOrder,
          isDefault: true,
          createdAt: now,
          updatedAt: now,
          createdBy: 'system'
        };

        batch.set(docRef, newCategory);
      }

      await batch.commit();
    }
  } catch (err) {
    console.error('Error seeding initial categories to Firestore:', err);
  } finally {
    isSeeding = false;
  }
}

/**
 * Subscribe to realtime categories from Firestore
 */
export function subscribeToCategories(
  callback: (categories: CategoryItem[]) => void,
  includeHidden: boolean = true
): () => void {
  const categoriesRef = collection(db, 'categories');

  const unsubscribe = onSnapshot(
    categoriesRef,
    (snapshot) => {
      const list: CategoryItem[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as CategoryItem;
        list.push({
          ...data,
          id: docSnap.id
        });
      });

      // Sort by sortOrder ascending
      list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      // Trigger seed check if empty or missing initial categories
      if (list.length === 0 || list.filter(c => c.isDefault).length < 20) {
        seedInitialCategories(list);
      }

      const filtered = includeHidden ? list : list.filter((c) => c.isActive !== false);
      callback(filtered);
    },
    (error) => {
      console.warn('Error subscribing to categories:', error);
      callback([]);
    }
  );

  return unsubscribe;
}

/**
 * Fetch categories once from Firestore
 */
export async function fetchCategories(includeHidden: boolean = false): Promise<CategoryItem[]> {
  try {
    const snapshot = await getDocs(collection(db, 'categories'));
    const list: CategoryItem[] = [];
    snapshot.forEach((docSnap) => {
      list.push({ ...(docSnap.data() as CategoryItem), id: docSnap.id });
    });

    list.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    if (list.length === 0) {
      await seedInitialCategories(list);
      return fetchCategories(includeHidden);
    }

    return includeHidden ? list : list.filter((c) => c.isActive !== false);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return [];
  }
}

/**
 * Add a new category (Admin/Owner only)
 */
export async function addCategory(
  data: {
    name: string;
    group: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  userId: string,
  existingCategories: CategoryItem[] = []
): Promise<{ success: boolean; message?: string; category?: CategoryItem }> {
  const cleanName = data.name.trim();
  if (!cleanName) {
    return { success: false, message: 'يرجى إدخال اسم التصنيف.' };
  }

  const norm = normalizeName(cleanName);

  // Check duplicate name
  const isDuplicate = existingCategories.some(
    (c) => normalizeName(c.name) === norm
  );

  if (isDuplicate) {
    return { success: false, message: 'هذا التصنيف موجود بالفعل.' };
  }

  try {
    const slug = generateSlug(cleanName);
    const docId = `cat_${slug}_${Date.now().toString(36)}`;
    const now = new Date().toISOString();

    const newCat: CategoryItem = {
      id: docId,
      name: cleanName,
      slug: slug,
      group: data.group.trim() || 'اللوحات والرسم',
      description: data.description?.trim() || '',
      isActive: data.isActive !== undefined ? data.isActive : true,
      sortOrder: data.sortOrder || existingCategories.length + 1,
      isDefault: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId || 'admin'
    };

    await setDoc(doc(db, 'categories', docId), newCat);
    return { success: true, category: newCat };
  } catch (error: any) {
    console.error('Error adding category:', error);
    return { success: false, message: error?.message || 'تعذر إضافة التصنيف.' };
  }
}

/**
 * Update an existing category
 */
export async function updateCategory(
  id: string,
  data: {
    name?: string;
    group?: string;
    description?: string;
    sortOrder?: number;
    isActive?: boolean;
  },
  existingCategories: CategoryItem[] = []
): Promise<{ success: boolean; message?: string }> {
  try {
    const current = existingCategories.find((c) => c.id === id);
    if (!current) {
      return { success: false, message: 'التصنيف غير موجود.' };
    }

    if (data.name && data.name.trim() !== current.name) {
      const norm = normalizeName(data.name);
      const isDuplicate = existingCategories.some(
        (c) => c.id !== id && normalizeName(c.name) === norm
      );
      if (isDuplicate) {
        return { success: false, message: 'هذا التصنيف موجود بالفعل.' };
      }
    }

    const updates: Partial<CategoryItem> = {
      updatedAt: new Date().toISOString()
    };

    if (data.name !== undefined) {
      updates.name = data.name.trim();
      updates.slug = generateSlug(data.name);
    }
    if (data.group !== undefined) updates.group = data.group.trim();
    if (data.description !== undefined) updates.description = data.description.trim();
    if (data.sortOrder !== undefined) updates.sortOrder = Number(data.sortOrder);
    if (data.isActive !== undefined) updates.isActive = Boolean(data.isActive);

    await updateDoc(doc(db, 'categories', id), updates);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating category:', error);
    return { success: false, message: error?.message || 'تعذر تحديث التصنيف.' };
  }
}

/**
 * Toggle category active/hidden status
 */
export async function toggleCategoryStatus(
  id: string,
  currentStatus: boolean
): Promise<{ success: boolean; message?: string }> {
  try {
    await updateDoc(doc(db, 'categories', id), {
      isActive: !currentStatus,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (error: any) {
    console.error('Error toggling category status:', error);
    return { success: false, message: error?.message || 'تعذر تغيير حالة التصنيف.' };
  }
}

/**
 * Delete category safely (only if not used in any artwork)
 */
export async function deleteCategory(
  categoryItem: CategoryItem
): Promise<{ success: boolean; message?: string }> {
  try {
    const catName = categoryItem.name.trim();

    // Check if category is used as primaryCategory or in categories array or category
    const artworksRef = collection(db, 'artworks');
    
    // Query by primaryCategory
    const q1 = query(artworksRef, where('primaryCategory', '==', catName), limit(1));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return { 
        success: false, 
        message: 'هذا التصنيف مرتبط بأعمال موجودة، يمكنك إخفاؤه بدلًا من حذفه.' 
      };
    }

    // Query by legacy category
    const q2 = query(artworksRef, where('category', '==', catName), limit(1));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return { 
        success: false, 
        message: 'هذا التصنيف مرتبط بأعمال موجودة، يمكنك إخفاؤه بدلًا من حذفه.' 
      };
    }

    // Query by categories array
    const q3 = query(artworksRef, where('categories', 'array-contains', catName), limit(1));
    const snap3 = await getDocs(q3);
    if (!snap3.empty) {
      return { 
        success: false, 
        message: 'هذا التصنيف مرتبط بأعمال موجودة، يمكنك إخفاؤه بدلًا من حذفه.' 
      };
    }

    // If no artworks use it, proceed to delete document
    await deleteDoc(doc(db, 'categories', categoryItem.id));
    return { success: true };
  } catch (error: any) {
    console.error('Error deleting category:', error);
    return { success: false, message: error?.message || 'تعذر حذف التصنيف.' };
  }
}
