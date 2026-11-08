import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js';
import { collection, getDocs, query, where, doc, writeBatch, serverTimestamp } from 'https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js';

const $ = selector => document.querySelector(selector);
const eur = value => new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value) || 0);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[char]);

const CLOUDINARY_CLOUD_NAME = 'vjq9mwnh';
const CLOUDINARY_UPLOAD_PRESET = 'gestion_products';

$('#login-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  $('#login-msg').textContent = 'Conectando…';
  try {
    await signInWithEmailAndPassword(auth, String(form.get('email')).trim(), form.get('password'));
    $('#login-msg').textContent = '';
  } catch (error) {
    console.error('Login:', error);
    $('#login-msg').textContent = 'No se pudo entrar. Comprueba el correo y la contraseña.';
  }
});

$('#logout').addEventListener('click', () => signOut(auth));

onAuthStateChanged(auth, async user => {
  $('#login').hidden = Boolean(user);
  $('#dashboard').hidden = !user;
  $('#logout').hidden = !user;
  if (user) {
    try { await refreshInventory(); }
    catch (error) {
      console.error('Cargando productos:', error);
      $('#inventory-msg').textContent = 'No se pudieron cargar los productos. Comprueba las reglas de Firestore.';
    }
  }
});

async function refreshInventory() {
  const [productsSnapshot, batchesSnapshot] = await Promise.all([
    getDocs(query(collection(db, 'products'), where('active', '==', true))),
    getDocs(query(collection(db, 'batches'), where('active', '==', true)))
  ]);
  const stockByProduct = {};
  const today = new Date().toISOString().slice(0, 10);
  batchesSnapshot.forEach(snapshot => {
    const batch = snapshot.data();
    if (!batch.expiryDate || batch.expiryDate >= today) {
      stockByProduct[batch.productId] = (stockByProduct[batch.productId] || 0) + Number(batch.quantityAvailable || 0);
    }
  });
  $('#inventory').innerHTML = productsSnapshot.docs.map(snapshot => {
    const product = snapshot.data();
    return `<tr><td>${escapeHtml(product.name)}</td><td>${eur(product.price)}</td><td>${Number(product.discount || 0)}%</td><td>${stockByProduct[snapshot.id] || 0}</td></tr>`;
  }).join('') || '<tr><td colspan="4">Todavía no hay productos.</td></tr>';
  $('#inventory-msg').textContent = `${productsSnapshot.size} producto(s)`;
}

const imageInput = $('#product-image');
const imagePreview = $('#image-preview');
imageInput.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file) {
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    return;
  }
  if (!file.type.startsWith('image/')) {
    $('#product-msg').textContent = 'Selecciona una imagen válida.';
    imageInput.value = '';
    imagePreview.hidden = true;
    return;
  }
  imagePreview.src = URL.createObjectURL(file);
  imagePreview.hidden = false;
});

async function optimizeImage(file) {
  if (!file.type.startsWith('image/')) throw new Error('El archivo no es una imagen válida.');
  if (file.size > 10 * 1024 * 1024) throw new Error('La imagen debe pesar menos de 10 MB.');
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext('2d', { alpha: false }).drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', 0.78));
  if (!blob) throw new Error('No se pudo preparar la imagen.');
  if (blob.size > 2 * 1024 * 1024) throw new Error('La imagen optimizada supera 2 MB.');
  return blob;
}

async function uploadProductImage(file, sku) {
  const optimized = await optimizeImage(file);
  const data = new FormData();
  data.append('file', optimized, `${sku}.webp`);
  data.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: data });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error?.message || 'No se pudo subir la foto.');
  return { imageUrl: result.secure_url, imagePath: result.public_id, imageProvider: 'cloudinary' };
}

$('#product-form').addEventListener('submit', async event => {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const message = $('#product-msg');
  const name = String(form.get('name') || '').trim();
  const price = Number(form.get('price'));
  const discount = Number(form.get('discount') || 0);
  const productionDate = String(form.get('productionDate') || '');
  const expiryDate = String(form.get('expiryDate') || '');
  const quantity = Number(form.get('quantity'));
  const imageFile = imageInput.files?.[0] || null;

  if (!name || !Number.isFinite(price) || price <= 0) { message.textContent = 'Escribe el nombre y un precio válido.'; return; }
  if (!Number.isFinite(discount) || discount < 0 || discount > 100) { message.textContent = 'El descuento debe estar entre 0 y 100.'; return; }
  if (!productionDate || !expiryDate || expiryDate < productionDate) { message.textContent = 'Comprueba las fechas: la caducidad debe ser posterior a producción.'; return; }
  if (!Number.isInteger(quantity) || quantity <= 0) { message.textContent = 'Escribe una cantidad mayor que cero.'; return; }

  const button = formElement.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const stamp = Date.now();
    const sku = `GC-${stamp}`;
    const productRef = doc(collection(db, 'products'));
    const batchRef = doc(collection(db, 'batches'));
    let imageData = {};
    if (imageFile) {
      message.textContent = 'Preparando la foto…';
      imageData = await uploadProductImage(imageFile, sku);
    }

    const batch = writeBatch(db);
    batch.set(productRef, {
      name, sku, category: 'Producto', price, discount,
      ...imageData,
      active: true,
      createdAt: serverTimestamp()
    });
    batch.set(batchRef, {
      productId: productRef.id,
      lotCode: `LOTE-${stamp}`,
      productionDate,
      expiryDate,
      quantityReceived: quantity,
      quantityAvailable: quantity,
      active: true,
      createdAt: serverTimestamp()
    });
    message.textContent = 'Guardando producto…';
    await batch.commit();
    message.textContent = '¡Producto guardado correctamente!';
    formElement.reset();
    imagePreview.hidden = true;
    imagePreview.removeAttribute('src');
    await refreshInventory();
  } catch (error) {
    console.error('Guardando producto:', error);
    message.textContent = error.message || 'No se pudo guardar. Comprueba Firebase y vuelve a intentarlo.';
  } finally {
    button.disabled = false;
  }
});
