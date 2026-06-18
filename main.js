import './style.css';
import { createClient } from '@supabase/supabase-js';

// =====================
// Supabase Configuration
// =====================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing Supabase configuration. Please check your environment variables.');
}

const supabase = createClient(SUPABASE_URL || '', SUPABASE_ANON_KEY || '');

// =====================
// State Management
// =====================
let currentUser = null;
let meals = [];
let shoppingItems = [];

const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

let currentLanguage = 'en';

const DAY_LABELS = {
  en: { monday: 'Monday', tuesday: 'Tuesday', wednesday: 'Wednesday', thursday: 'Thursday', friday: 'Friday', saturday: 'Saturday', sunday: 'Sunday' },
  es: { monday: 'Lunes', tuesday: 'Martes', wednesday: 'Miércoles', thursday: 'Jueves', friday: 'Viernes', saturday: 'Sábado', sunday: 'Domingo' },
  pt: { monday: 'Segunda-feira', tuesday: 'Terça-feira', wednesday: 'Quarta-feira', thursday: 'Quinta-feira', friday: 'Sexta-feira', saturday: 'Sábado', sunday: 'Domingo' },
  fr: { monday: 'Lundi', tuesday: 'Mardi', wednesday: 'Mercredi', thursday: 'Jeudi', friday: 'Vendredi', saturday: 'Samedi', sunday: 'Dimanche' },
  de: { monday: 'Montag', tuesday: 'Dienstag', wednesday: 'Mittwoch', thursday: 'Donnerstag', friday: 'Freitag', saturday: 'Samstag', sunday: 'Sonntag' },
  it: { monday: 'Lunedì', tuesday: 'Martedì', wednesday: 'Mercoledì', thursday: 'Giovedì', friday: 'Venerdì', saturday: 'Sabato', sunday: 'Domenica' },
  nl: { monday: 'Maandag', tuesday: 'Dinsdag', wednesday: 'Woensdag', thursday: 'Donderdag', friday: 'Vrijdag', saturday: 'Zaterdag', sunday: 'Zondag' }
};

const MEAL_TYPE_LABELS = {
  en: { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' },
  es: { breakfast: 'Desayuno', lunch: 'Almuerzo', dinner: 'Cena', snack: 'Colación' },
  pt: { breakfast: 'Café da manhã', lunch: 'Almoço', dinner: 'Jantar', snack: 'Lanche' },
  fr: { breakfast: 'Petit déjeuner', lunch: 'Déjeuner', dinner: 'Dîner', snack: 'Collation' },
  de: { breakfast: 'Frühstück', lunch: 'Mittagessen', dinner: 'Abendessen', snack: 'Snack' },
  it: { breakfast: 'Colazione', lunch: 'Pranzo', dinner: 'Cena', snack: 'Spuntino' },
  nl: { breakfast: 'Ontbijt', lunch: 'Lunch', dinner: 'Diner', snack: 'Snack' }
};

function getLanguage() {
  return currentLanguage;
}

const UI_LABELS = {
  en: {
    dietSectionTitle: 'My Diet',
    dietViewName: 'My Diet',
    shoppingTitle: 'Shopping List',
    emptyTitle: 'Welcome!',
    emptyLine1: "You don't have any diet planned yet.",
    emptyLine2: 'Import your weekly meal plan to get started.',
    emptyButton: 'Import Diet',
    addMeal: 'Add Meal',
    addItem: 'Add',
    generateList: 'Generate from meals',
    filterAll: 'All',
    filterPending: 'Pending',
    filterCompleted: 'Completed',
    shoppingEmpty: 'Your shopping list is empty. Generate from meals or add items manually.',
    navDiet: 'My Diet',
    navImport: 'Import Diet',
    navShopping: 'Shopping List',
    navAssistant: 'AI Assistant',
    navImportMobile: 'Import',
    navShoppingMobile: 'Shopping',
    navAssistantMobile: 'AI'
  },
  es: {
    dietSectionTitle: 'Mi Dieta',
    dietViewName: 'Mi Dieta',
    shoppingTitle: 'Lista de la Compra',
    emptyTitle: '¡Bienvenido!',
    emptyLine1: 'No tienes ninguna dieta planificada todavía.',
    emptyLine2: 'Importa tu plan de alimentación semanal para empezar.',
    emptyButton: 'Importar Dieta',
    addMeal: 'Añadir comida',
    addItem: 'Añadir',
    generateList: 'Generar de comidas',
    filterAll: 'Todas',
    filterPending: 'Pendientes',
    filterCompleted: 'Completadas',
    shoppingEmpty: 'Tu lista de la compra está vacía. Genera desde las comidas o añade items manualmente.',
    navDiet: 'Mi Dieta',
    navImport: 'Importar Dieta',
    navShopping: 'Lista de la Compra',
    navAssistant: 'Asistente IA',
    navImportMobile: 'Importar',
    navShoppingMobile: 'Compra',
    navAssistantMobile: 'IA'
  },
  pt: {
    dietSectionTitle: 'Minha Dieta',
    dietViewName: 'Minha Dieta',
    shoppingTitle: 'Lista de Compras',
    emptyTitle: 'Bem-vindo!',
    emptyLine1: 'Você ainda não tem nenhuma dieta planejada.',
    emptyLine2: 'Importe seu plano alimentar semanal para começar.',
    emptyButton: 'Importar Dieta',
    addMeal: 'Adicionar refeição',
    addItem: 'Adicionar',
    generateList: 'Gerar de refeições',
    filterAll: 'Todas',
    filterPending: 'Pendentes',
    filterCompleted: 'Concluídas',
    shoppingEmpty: 'Sua lista de compras está vazia. Gere a partir das refeições ou adicione itens manualmente.',
    navDiet: 'Minha Dieta',
    navImport: 'Importar Dieta',
    navShopping: 'Lista de Compras',
    navAssistant: 'Assistente IA',
    navImportMobile: 'Importar',
    navShoppingMobile: 'Compras',
    navAssistantMobile: 'IA'
  },
  fr: {
    dietSectionTitle: 'Mon Régime',
    dietViewName: 'Mon Régime',
    shoppingTitle: 'Liste de Courses',
    emptyTitle: 'Bienvenue !',
    emptyLine1: "Vous n'avez pas encore de régime planifié.",
    emptyLine2: 'Importez votre plan alimentaire hebdomadaire pour commencer.',
    emptyButton: 'Importer un Régime',
    addMeal: 'Ajouter un repas',
    addItem: 'Ajouter',
    generateList: 'Générer depuis les repas',
    filterAll: 'Toutes',
    filterPending: 'En attente',
    filterCompleted: 'Terminées',
    shoppingEmpty: 'Votre liste de courses est vide. Générez-la depuis les repas ou ajoutez des articles manuellement.',
    navDiet: 'Mon Régime',
    navImport: 'Importer un Régime',
    navShopping: 'Liste de Courses',
    navAssistant: 'Assistant IA',
    navImportMobile: 'Importer',
    navShoppingMobile: 'Courses',
    navAssistantMobile: 'IA'
  },
  de: {
    dietSectionTitle: 'Meine Diät',
    dietViewName: 'Meine Diät',
    shoppingTitle: 'Einkaufsliste',
    emptyTitle: 'Willkommen!',
    emptyLine1: 'Sie haben noch keine Diät geplant.',
    emptyLine2: 'Importieren Sie Ihren wöchentlichen Ernährungsplan, um zu beginnen.',
    emptyButton: 'Diät importieren',
    addMeal: 'Mahlzeit hinzufügen',
    addItem: 'Hinzufügen',
    generateList: 'Aus Mahlzeiten generieren',
    filterAll: 'Alle',
    filterPending: 'Ausstehend',
    filterCompleted: 'Abgeschlossen',
    shoppingEmpty: 'Ihre Einkaufsliste ist leer. Generieren Sie sie aus Mahlzeiten oder fügen Sie Artikel manuell hinzu.',
    navDiet: 'Meine Diät',
    navImport: 'Diät importieren',
    navShopping: 'Einkaufsliste',
    navAssistant: 'KI-Assistent',
    navImportMobile: 'Importieren',
    navShoppingMobile: 'Einkauf',
    navAssistantMobile: 'KI'
  },
  it: {
    dietSectionTitle: 'La Mia Dieta',
    dietViewName: 'La Mia Dieta',
    shoppingTitle: 'Lista della Spesa',
    emptyTitle: 'Benvenuto!',
    emptyLine1: 'Non hai ancora nessuna dieta pianificata.',
    emptyLine2: 'Importa il tuo piano alimentare settimanale per iniziare.',
    emptyButton: 'Importa Dieta',
    addMeal: 'Aggiungi pasto',
    addItem: 'Aggiungi',
    generateList: 'Genera dai pasti',
    filterAll: 'Tutte',
    filterPending: 'In attesa',
    filterCompleted: 'Completate',
    shoppingEmpty: 'La tua lista della spesa è vuota. Generala dai pasti o aggiungi articoli manualmente.',
    navDiet: 'La Mia Dieta',
    navImport: 'Importa Dieta',
    navShopping: 'Lista della Spesa',
    navAssistant: 'Assistente IA',
    navImportMobile: 'Importa',
    navShoppingMobile: 'Spesa',
    navAssistantMobile: 'IA'
  },
  nl: {
    dietSectionTitle: 'Mijn Dieet',
    dietViewName: 'Mijn Dieet',
    shoppingTitle: 'Boodschappenlijst',
    emptyTitle: 'Welkom!',
    emptyLine1: 'Je hebt nog geen dieet gepland.',
    emptyLine2: 'Importeer je wekelijkse voedingsplan om te beginnen.',
    emptyButton: 'Dieet importeren',
    addMeal: 'Maaltijd toevoegen',
    addItem: 'Toevoegen',
    generateList: 'Genereren van maaltijden',
    filterAll: 'Alle',
    filterPending: 'In behandeling',
    filterCompleted: 'Voltooid',
    shoppingEmpty: 'Je boodschappenlijst is leeg. Genereer vanuit maaltijden of voeg items handmatig toe.',
    navDiet: 'Mijn Dieet',
    navImport: 'Dieet importeren',
    navShopping: 'Boodschappenlijst',
    navAssistant: 'AI-assistent',
    navImportMobile: 'Importeren',
    navShoppingMobile: 'Boodschappen',
    navAssistantMobile: 'AI'
  }
};

function updateUILanguage() {
  const lang = getLanguage();
  const labels = UI_LABELS[lang] || UI_LABELS.en;

  const setText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setText('diet-section-title', labels.dietSectionTitle);
  setText('diet-view-name', labels.dietViewName);
  setText('shopping-title', labels.shoppingTitle);
  setText('diet-empty-title', labels.emptyTitle);
  setText('diet-empty-line1', labels.emptyLine1);
  setText('diet-empty-line2', labels.emptyLine2);
  setText('diet-empty-import-btn', labels.emptyButton);
  setText('diet-add-meal-btn', labels.addMeal);
  setText('add-item-btn', labels.addItem);
  setText('generate-list-btn', labels.generateList);
  setText('filter-all', labels.filterAll);
  setText('filter-pending', labels.filterPending);
  setText('filter-completed', labels.filterCompleted);
  setText('shopping-empty', labels.shoppingEmpty);
  setText('nav-label-diet-desktop', labels.navDiet);
  setText('nav-label-diet-mobile', labels.navDiet);
  setText('nav-label-import-desktop', labels.navImport);
  setText('nav-label-import-mobile', labels.navImportMobile);
  setText('nav-label-shopping-desktop', labels.navShopping);
  setText('nav-label-shopping-mobile', labels.navShoppingMobile);
  setText('nav-label-assistant-desktop', labels.navAssistant);
  setText('nav-label-assistant-mobile', labels.navAssistantMobile);
}

// =====================
// Utility Functions
// =====================
function $(selector) {
  return document.querySelector(selector);
}

function $$(selector) {
  return document.querySelectorAll(selector);
}

function showToast(message, type = 'info') {
  const container = $('#toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatDate(date) {
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function getCurrentDayOfWeek() {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

// =====================
// Authentication
// =====================
async function initAuth() {
  const { data: { session } } = await supabase.auth.getSession();

  if (session?.user) {
    currentUser = session.user;
    showMainApp();
  }

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session?.user) {
      currentUser = session.user;
      showMainApp();
    } else if (event === 'SIGNED_OUT') {
      currentUser = null;
      showAuthModal();
    }
  });
}

function showAuthModal() {
  $('#auth-modal').classList.remove('hidden');
  $('#main-app').classList.add('hidden');
}

function showMainApp() {
  $('#auth-modal').classList.add('hidden');
  $('#main-app').classList.remove('hidden');

  const displayName = currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User';
  $('#user-name').textContent = `Hi, ${displayName}`;

  loadAllData();
}

async function handleLogin(e) {
  e.preventDefault();
  const email = $('#login-email').value;
  const password = $('#login-password').value;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    showToast(error.message, 'error');
  }
}

async function handleRegister(e) {
  e.preventDefault();
  const email = $('#register-email').value;
  const password = $('#register-password').value;
  const fullName = $('#register-name').value;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  });

  if (error) {
    showToast(error.message, 'error');
  } else {
    showToast('Account created! Please check your email to confirm.', 'success');
  }
}

async function handleLogout() {
  await supabase.auth.signOut();
}

function setupAuthForms() {
  $('#login-form').addEventListener('submit', handleLogin);
  $('#register-form').addEventListener('submit', handleRegister);
  $('#logout-btn').addEventListener('click', handleLogout);

  $('#show-register').addEventListener('click', (e) => {
    e.preventDefault();
    $('#login-form').classList.remove('active');
    $('#register-form').classList.add('active');
  });

  $('#show-login').addEventListener('click', (e) => {
    e.preventDefault();
    $('#register-form').classList.remove('active');
    $('#login-form').classList.add('active');
  });
}

// =====================
// Navigation
// =====================
function setupNavigation() {
  const mobileNavItems = $$('.mobile-nav-item');
  const desktopNavItems = $$('.desktop-nav-item');
  const sections = $$('.section');

  window.switchSection = function(sectionId) {
    mobileNavItems.forEach(nav => nav.classList.remove('active'));
    desktopNavItems.forEach(nav => nav.classList.remove('active'));

    mobileNavItems.forEach(nav => {
      if (nav.dataset.section === sectionId) {
        nav.classList.add('active');
      }
    });

    desktopNavItems.forEach(nav => {
      if (nav.dataset.section === sectionId) {
        nav.classList.add('active');
      }
    });

    sections.forEach(section => {
      section.classList.remove('active');
      if (section.id === `${sectionId}-section`) {
        section.classList.add('active');
      }
    });
  }

  mobileNavItems.forEach(item => {
    item.addEventListener('click', () => {
      window.switchSection(item.dataset.section);
    });
  });

  desktopNavItems.forEach(item => {
    item.addEventListener('click', () => {
      window.switchSection(item.dataset.section);
    });
  });

  // Quick Actions from empty state
  $('#diet-empty-import-btn')?.addEventListener('click', () => {
    window.switchSection('import');
  });

  // Add meal button from Mi Dieta
  $('#diet-add-meal-btn')?.addEventListener('click', () => {
    $('#meal-modal').classList.remove('hidden');
  });
}

// =====================
// Data Loading
// =====================
async function loadAllData() {
  await Promise.all([
    loadMeals(),
    loadShoppingItems()
  ]);

  updateDietView();
  renderShoppingList();
}

async function loadMeals() {
  const { data, error } = await supabase
    .from('meals')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: true });

  if (!error && data) {
    meals = data;
    // Detect language from meal data
    if (data.length > 0) {
      const lang = data[0].language;
      if (lang && DAY_LABELS[lang]) {
        currentLanguage = lang;
      } else {
        // Try to auto-detect from meal descriptions
        currentLanguage = detectLanguage(data.map(m => m.name + ' ' + (m.description || '')).join(' '));
      }
    }
  }
}

async function loadShoppingItems() {
  const { data, error } = await supabase
    .from('shopping_items')
    .select('*')
    .eq('user_id', currentUser.id)
    .order('created_at', { ascending: false });

  if (!error && data) {
    shoppingItems = data;
  }
}

// =====================
// Mi Dieta (Main View)
// =====================
function updateDietView() {
  updateUILanguage();
  $('#current-date').textContent = formatDate(new Date());

  const emptyView = $('#diet-empty');
  const dietView = $('#diet-view');

  if (meals.length === 0) {
    emptyView.classList.remove('hidden');
    dietView.classList.add('hidden');
    return;
  }

  emptyView.classList.add('hidden');
  dietView.classList.remove('hidden');

  const daysWithMeals = new Set(meals.map(m => m.day_of_week));
  const metaLabels = {
    en: `${meals.length} meals this week (${daysWithMeals.size} days)`,
    es: `${meals.length} comidas esta semana (${daysWithMeals.size} días)`,
    pt: `${meals.length} refeições esta semana (${daysWithMeals.size} dias)`,
    fr: `${meals.length} repas cette semaine (${daysWithMeals.size} jours)`,
    de: `${meals.length} Mahlzeiten diese Woche (${daysWithMeals.size} Tage)`,
    it: `${meals.length} pasti questa settimana (${daysWithMeals.size} giorni)`,
    nl: `${meals.length} maaltijden deze week (${daysWithMeals.size} dagen)`
  };
  $('#diet-view-meta').textContent = metaLabels[lang] || metaLabels.en;

  const container = $('#diet-days-grid');
  const todayName = getCurrentDayOfWeek();

  const mealTypeLabels = {
    breakfast: 'Desayuno',
    lunch: 'Almuerzo',
    dinner: 'Cena',
    snack: 'Colacion'
  };

  const mealTypeIcons = {
    breakfast: '\ud83c\udf05',
    lunch: '\ud83c\udf1e',
    dinner: '\ud83c\udf19',
    snack: '\ud83e\udd51'
  };

  container.innerHTML = DAYS.map(day => {
    const dayMeals = meals.filter(m => m.day_of_week === day)
      .sort((a, b) => {
        const order = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };
        return (order[a.meal_type] || 3) - (order[b.meal_type] || 3);
      });

    const isToday = day === todayName;
    const mealCount = dayMeals.length;

    const mealsHtml = dayMeals.map(meal => `
      <div class="diet-meal" data-id="${meal.id}" onclick="window.editMeal('${meal.id}')">
        <span class="diet-meal-type">${mealTypeIcons[meal.meal_type] || '\u2022'} ${mealTypeLabels[meal.meal_type] || meal.meal_type}</span>
        <span class="diet-meal-name">${meal.name}</span>
      </div>
    `).join('');

    const emptyTexts = {
      en: 'No meals planned',
      es: 'Sin comidas planificadas',
      pt: 'Sem refeições planificadas',
      fr: 'Aucun repas planifié',
      de: 'Keine Mahlzeiten geplant',
      it: 'Nessun pasto pianificato',
      nl: 'Geen maaltijden gepland'
    };
    const emptySlot = mealCount === 0 ? `<div class="diet-meal empty-slot">${emptyTexts[lang] || emptyTexts.en}</div>` : '';

    return `
      <div class="diet-day-card ${isToday ? 'today' : ''}">
        <div class="diet-day-header">
          <span class="diet-day-name">${dayLabels[day] || day}</span>
          ${mealCount > 0 ? `<span class="diet-day-count">${mealCount}</span>` : ''}
        </div>
        <div class="diet-day-meals">
          ${mealsHtml || emptySlot}
        </div>
      </div>
    `;
  }).join('');
}

// =====================
// Meal Modal
// =====================
function setupMealModal() {
  const modal = $('#meal-modal');
  const form = $('#meal-form');

  $('#add-meal-btn')?.addEventListener('click', () => {
    $('#meal-modal-title').textContent = 'Add Meal';
    $('#meal-id').value = '';
    form.reset();
    $('#meal-day').value = getCurrentDayOfWeek();
    modal.classList.remove('hidden');
  });

  $$('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  $('.modal-overlay', modal)?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const mealId = $('#meal-id').value;
    const mealData = {
      user_id: currentUser.id,
      name: $('#meal-name').value,
      day_of_week: $('#meal-day').value,
      meal_type: $('#meal-type').value,
      description: $('#meal-description').value || null,
      ingredients: $('#meal-ingredients').value
        ? $('#meal-ingredients').value.split(',').map(i => i.trim()).filter(Boolean)
        : [],
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0
    };

    let error;
    if (mealId) {
      ({ error } = await supabase
        .from('meals')
        .update(mealData)
        .eq('id', mealId));
    } else {
      ({ error } = await supabase
        .from('meals')
        .insert(mealData));
    }

    if (error) {
      showToast('Failed to save meal', 'error');
      console.error(error);
    } else {
      showToast(mealId ? 'Meal updated!' : 'Meal added!', 'success');
      modal.classList.add('hidden');
      await loadMeals();
      updateDietView();
    }
  });

  window.deleteMeal = async (id) => {
    if (!confirm('Are you sure you want to delete this meal?')) return;

    const { error } = await supabase.from('meals').delete().eq('id', id);

    if (error) {
      showToast('Failed to delete meal', 'error');
    } else {
      showToast('Meal deleted', 'success');
      await loadMeals();
      updateDietView();
    }
  };

  window.editMeal = async (id) => {
    const meal = meals.find(m => m.id === id);
    if (!meal) return;

    $('#meal-modal-title').textContent = 'Edit Meal';
    $('#meal-id').value = meal.id;
    $('#meal-name').value = meal.name;
    $('#meal-day').value = meal.day_of_week;
    $('#meal-type').value = meal.meal_type;
    $('#meal-description').value = meal.description || '';
    $('#meal-ingredients').value = (meal.ingredients || []).join(', ');

    modal.classList.remove('hidden');
  };
}

// =====================
// Shopping List
// =====================
function renderShoppingList(filter = 'all') {
  const container = $('#shopping-list');
  let filteredItems = shoppingItems;

  if (filter === 'pending') {
    filteredItems = shoppingItems.filter(i => !i.completed);
  } else if (filter === 'completed') {
    filteredItems = shoppingItems.filter(i => i.completed);
  }

  if (filteredItems.length === 0) {
    const lang = getLanguage();
    const labels = UI_LABELS[lang] || UI_LABELS.en;
    container.innerHTML = `<p class="empty-state" id="shopping-empty">${labels.shoppingEmpty}</p>`;
    return;
  }

  container.innerHTML = filteredItems.map(item => `
    <div class="shopping-item ${item.completed ? 'completed' : ''}" data-id="${item.id}">
      <div class="shopping-checkbox" onclick="window.toggleShoppingItem('${item.id}', ${!item.completed})">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div class="shopping-item-content">
        <span class="shopping-item-name">${item.name}</span>
        ${item.quantity ? `<span class="shopping-item-quantity">${item.quantity}</span>` : ''}
      </div>
      <div class="shopping-item-actions">
        <button class="item-delete-btn" onclick="window.deleteShoppingItem('${item.id}')" title="Delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  `).join('');
}

function setupShoppingList() {
  const filters = $$('.filter-btn');
  filters.forEach(btn => {
    btn.addEventListener('click', () => {
      filters.forEach(f => f.classList.remove('active'));
      btn.classList.add('active');
      renderShoppingList(btn.dataset.filter);
    });
  });

  $('#generate-list-btn').addEventListener('click', generateShoppingList);
  $('#add-item-btn').addEventListener('click', () => {
    $('#item-modal').classList.remove('hidden');
  });

  window.toggleShoppingItem = async (id, completed) => {
    const { error } = await supabase
      .from('shopping_items')
      .update({ completed })
      .eq('id', id);

    if (!error) {
      await loadShoppingItems();
      const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
      renderShoppingList(activeFilter);
    }
  };

  window.deleteShoppingItem = async (id) => {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', id);

    if (!error) {
      showToast('Item removed', 'success');
      await loadShoppingItems();
      const activeFilter = $('.filter-btn.active')?.dataset.filter || 'all';
      renderShoppingList(activeFilter);
    }
  };
}

async function generateShoppingList() {
  const allIngredients = new Map();

  meals.forEach(meal => {
    (meal.ingredients || []).forEach(ingredient => {
      const key = ingredient.toLowerCase().trim();
      if (key) {
        allIngredients.set(key, (allIngredients.get(key) || 0) + 1);
      }
    });
  });

  const existingNames = new Set(shoppingItems.map(i => i.name.toLowerCase()));
  const newItems = [];

  for (const [name, count] of allIngredients) {
    if (!existingNames.has(name)) {
      newItems.push({
        user_id: currentUser.id,
        name: name.charAt(0).toUpperCase() + name.slice(1),
        quantity: count > 1 ? `${count}x` : '1',
        completed: false,
        is_custom: false
      });
    }
  }

  if (newItems.length === 0) {
    showToast('No new items to add from meals', 'info');
    return;
  }

  const { error } = await supabase
    .from('shopping_items')
    .insert(newItems);

  if (error) {
    showToast('Failed to generate list', 'error');
  } else {
    showToast(`Added ${newItems.length} items!`, 'success');
    await loadShoppingItems();
    renderShoppingList();
  }
}

function setupItemModal() {
  const modal = $('#item-modal');
  const form = $('#item-form');

  $$('.modal-close, .modal-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
  });

  $('.modal-overlay', modal)?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const { error } = await supabase
      .from('shopping_items')
      .insert({
        user_id: currentUser.id,
        name: $('#item-name').value,
        quantity: $('#item-quantity').value || '1',
        completed: false,
        is_custom: true
      });

    if (error) {
      showToast('Failed to add item', 'error');
    } else {
      showToast('Item added!', 'success');
      modal.classList.add('hidden');
      form.reset();
      await loadShoppingItems();
      renderShoppingList();
    }
  });
}

// =====================
// AI Food Substitute
// =====================
const FOOD_SUBSTITUTES = {
  butter: [
    { name: 'Olive Oil', ratio: '3/4 cup for 1 cup butter', notes: 'Great for cooking, adds healthy fats' },
    { name: 'Greek Yogurt', ratio: '1/2 cup for 1 cup butter', notes: 'Lower calorie, higher protein option' },
    { name: 'Applesauce', ratio: '1/2 cup for 1 cup butter', notes: 'Best for baking, reduces fat' },
    { name: 'Avocado', ratio: '1 cup mashed for 1 cup butter', notes: 'Rich in healthy monounsaturated fats' },
    { name: 'Coconut Oil', ratio: '1:1 ratio', notes: 'Good for baking, adds slight coconut flavor' }
  ],
  sugar: [
    { name: 'Stevia', ratio: '1 tsp for 1 cup sugar', notes: 'Zero calories, natural sweetener' },
    { name: 'Honey', ratio: '3/4 cup for 1 cup sugar', notes: 'Natural, reduces liquid in recipe by 1/4' },
    { name: 'Maple Syrup', ratio: '3/4 cup for 1 cup sugar', notes: 'Natural alternative with antioxidants' },
    { name: 'Applesauce', ratio: '1 cup for 1 cup sugar', notes: 'Reduces calories, adds moisture' },
    { name: 'Monk Fruit', ratio: '3/4 cup for 1 cup sugar', notes: 'Zero calorie natural sweetener' }
  ],
  milk: [
    { name: 'Almond Milk', ratio: '1:1 ratio', notes: 'Lower calorie, dairy-free alternative' },
    { name: 'Oat Milk', ratio: '1:1 ratio', notes: 'Creamy texture, good for coffee and baking' },
    { name: 'Coconut Milk', ratio: '1:1 ratio', notes: 'Rich and creamy, higher in fat' },
    { name: 'Soy Milk', ratio: '1:1 ratio', notes: 'Similar protein content to dairy milk' },
    { name: 'Greek Yogurt', ratio: '3/4 cup + 1/4 cup water', notes: 'Higher protein, tangy flavor' }
  ],
  eggs: [
    { name: 'Flax Egg', ratio: '1 tbsp ground flax + 3 tbsp water', notes: 'Best for baking, adds omega-3s' },
    { name: 'Chia Egg', ratio: '1 tbsp chia seeds + 3 tbsp water', notes: 'Similar to flax, adds fiber' },
    { name: 'Applesauce', ratio: '1/4 cup per egg', notes: 'Reduces fat, works in baking' },
    { name: 'Banana', ratio: '1/2 mashed banana per egg', notes: 'Adds sweetness and moisture' },
    { name: 'Silken Tofu', ratio: '1/4 cup blended per egg', notes: 'High protein, neutral flavor' }
  ],
  flour: [
    { name: 'Almond Flour', ratio: '1:1 ratio', notes: 'Gluten-free, lower carb, nutty flavor' },
    { name: 'Oat Flour', ratio: '1:1 ratio', notes: 'Made from ground oats, more fiber' },
    { name: 'Coconut Flour', ratio: '1/4 cup for 1 cup flour', notes: 'Absorbs more liquid, gluten-free' },
    { name: 'Whole Wheat Flour', ratio: '1:1 ratio', notes: 'More fiber and nutrients than white flour' },
    { name: 'Chickpea Flour', ratio: '1:1 ratio', notes: 'High protein, gluten-free alternative' }
  ],
  cream: [
    { name: 'Coconut Cream', ratio: '1:1 ratio', notes: 'Dairy-free, rich and creamy' },
    { name: 'Cashew Cream', ratio: '1:1 ratio', notes: 'Made from soaked cashews, versatile' },
    { name: 'Silken Tofu', ratio: 'Blend with water', notes: 'Lower fat, higher protein option' },
    { name: 'Greek Yogurt', ratio: 'Substitute directly', notes: 'Tangy, high protein alternative' }
  ],
  mayonnaise: [
    { name: 'Greek Yogurt', ratio: '1:1 ratio', notes: 'Lower calorie, higher protein' },
    { name: 'Avocado', ratio: 'Mashed avocado', notes: 'Healthy fats, creamy texture' },
    { name: 'Hummus', ratio: '1:1 ratio', notes: 'Adds flavor and fiber' },
    { name: 'Olive Oil', ratio: 'Use in dressings', notes: 'Healthy fat for vinaigrettes' }
  ],
  breadcrumbs: [
    { name: 'Crushed Almonds', ratio: '1:1 ratio', notes: 'Low carb, crunchy texture' },
    { name: 'Oatmeal', ratio: '1:1 ratio', notes: 'Whole grain, fiber-rich' },
    { name: 'Crushed Crackers', ratio: '1:1 ratio', notes: 'Similar texture, various flavors' },
    { name: 'Parmesan Cheese', ratio: '1:1 ratio', notes: 'Low carb, adds flavor' }
  ],
  rice: [
    { name: 'Cauliflower Rice', ratio: '1:1 ratio', notes: 'Low carb, fewer calories' },
    { name: 'Quinoa', ratio: '1:1 ratio', notes: 'Complete protein, more fiber' },
    { name: 'Brown Rice', ratio: '1:1 ratio', notes: 'More fiber and nutrients than white rice' },
    { name: 'Farro', ratio: '1:1 ratio', notes: 'Nutty flavor, high fiber' }
  ],
  pasta: [
    { name: 'Zucchini Noodles', ratio: '1:1 ratio', notes: 'Very low calorie, gluten-free' },
    { name: 'Spaghetti Squash', ratio: '1:1 ratio', notes: 'Natural noodle texture, low carb' },
    { name: 'Chickpea Pasta', ratio: '1:1 ratio', notes: 'Higher protein and fiber' },
    { name: 'Lentil Pasta', ratio: '1:1 ratio', notes: 'High protein, gluten-free' }
  ],
  oil: [
    { name: 'Applesauce', ratio: '1/2 cup for 1/2 cup oil', notes: 'Reduces fat and calories' },
    { name: 'Greek Yogurt', ratio: '3/4 amount', notes: 'Works in baking, adds protein' },
    { name: 'Mashed Banana', ratio: '1/2 cup for 1/2 cup oil', notes: 'Natural sweetness, moisture' },
    { name: 'Pumpkin Puree', ratio: '1:1 ratio', notes: 'Adds nutrients and moisture' }
  ]
};

function getSubstitutes(ingredient) {
  const normalizedIngredient = ingredient.toLowerCase().trim();

  for (const [key, subs] of Object.entries(FOOD_SUBSTITUTES)) {
    if (normalizedIngredient.includes(key) || key.includes(normalizedIngredient)) {
      return { ingredient: key.charAt(0).toUpperCase() + key.slice(1), substitutes: subs };
    }
  }

  return null;
}

function setupAssistant() {
  const input = $('#ingredient-input');
  const searchBtn = $('#search-substitute-btn');

  searchBtn.addEventListener('click', () => {
    const ingredient = input.value.trim();
    if (!ingredient) {
      showToast('Please enter an ingredient', 'error');
      return;
    }

    showSubstitutes(ingredient);
  });

  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      searchBtn.click();
    }
  });

  $$('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ingredient = chip.dataset.ingredient;
      input.value = ingredient;
      showSubstitutes(ingredient);
    });
  });
}

function showSubstitutes(ingredient) {
  const result = getSubstitutes(ingredient);

  if (!result) {
    showToast(`No substitutes found for "${ingredient}". Try: butter, sugar, milk, eggs, or flour.`, 'info');
    return;
  }

  $('#substitute-title').textContent = `Alternatives for ${result.ingredient}`;
  $('#substitutes-list').innerHTML = result.substitutes.map(sub => `
    <div class="substitute-card">
      <h4 class="substitute-name">${sub.name}</h4>
      <p class="substitute-ratio">${sub.ratio}</p>
      <p class="substitute-notes">${sub.notes}</p>
    </div>
  `).join('');

  $('#substitute-results').classList.remove('hidden');
  $('#assistant-placeholder').classList.add('hidden');
}

// =====================
// Import Diet (Multilingual)
// =====================
let parsedMeals = [];
const parseLog = [];

function logParse(level, message) {
  const entry = { level, message, time: new Date().toISOString() };
  parseLog.push(entry);
  if (level === 'error') {
    console.error(`[DietParser] ${message}`);
  } else if (level === 'warn') {
    console.warn(`[DietParser] ${message}`);
  } else {
    console.log(`[DietParser] ${message}`);
  }
}

const MULTILANG_DAYS = {
  'monday': {
    en: ['monday', 'mon'],
    es: ['lunes', 'lu'],
    pt: ['segunda-feira', 'segunda', 'seg'],
    fr: ['lundi', 'lun'],
    de: ['montag', 'mo'],
    it: ['luned\u00ec', 'lunedi'],
    nl: ['maandag', 'ma'],
  },
  'tuesday': {
    en: ['tuesday', 'tue', 'tues'],
    es: ['martes'],
    pt: ['ter\u00e7a-feira', 'ter\u00e7a', 'terca', 'ter'],
    fr: ['mardi'],
    de: ['dienstag', 'di'],
    it: ['marted\u00ec', 'martedi'],
    nl: ['dinsdag', 'di'],
  },
  'wednesday': {
    en: ['wednesday', 'wed'],
    es: ['mi\u00e9rcoles', 'miercoles'],
    pt: ['quarta-feira', 'quarta', 'qua'],
    fr: ['mercredi', 'mer'],
    de: ['mittwoch', 'mi'],
    it: ['mercoled\u00ec', 'mercoledi'],
    nl: ['woensdag', 'wo'],
  },
  'thursday': {
    en: ['thursday', 'thu', 'thurs'],
    es: ['jueves'],
    pt: ['quinta-feira', 'quinta', 'qui'],
    fr: ['jeudi'],
    de: ['donnerstag', 'do'],
    it: ['gioved\u00ec', 'giovedi'],
    nl: ['donderdag', 'do'],
  },
  'friday': {
    en: ['friday', 'fri'],
    es: ['viernes'],
    pt: ['sexta-feira', 'sexta', 'sex'],
    fr: ['vendredi'],
    de: ['freitag', 'fr'],
    it: ['venerd\u00ec', 'venerdi'],
    nl: ['vrijdag', 'vr'],
  },
  'saturday': {
    en: ['saturday', 'sat'],
    es: ['s\u00e1bado', 'sabado'],
    pt: ['s\u00e1bado', 'sabado'],
    fr: ['samedi', 'sam'],
    de: ['samstag', 'sa'],
    it: ['sabato'],
    nl: ['zaterdag', 'za'],
  },
  'sunday': {
    en: ['sunday', 'sun'],
    es: ['domingo', 'dom'],
    pt: ['domingo'],
    fr: ['dimanche', 'dim'],
    de: ['sonntag', 'so'],
    it: ['domenica'],
    nl: ['zondag', 'zo'],
  }
};

const MULTILANG_MEAL_TYPES = {
  'breakfast': {
    en: ['breakfast', 'break fast', 'morning meal', 'morning'],
    es: ['desayuno', 'desayuno:', 'almuerzo temprano'],
    pt: ['caf\u00e9 da manh\u00e3', 'cafe da manha', 'caf\u00e9 da manha', 'desjejum', 'pequeno almo\u00e7o', 'pequeno almoco'],
    fr: ['petit d\u00e9jeuner', 'petit dejeuner', 'd\u00e9jeuner'],
    de: ['fr\u00fchst\u00fcck', 'fruhstuck'],
    it: ['colazione'],
    nl: ['ontbijt'],
  },
  'morning_snack': {
    en: ['morning snack', 'mid-morning', 'mid morning', 'morning break', 'media ma\u00f1ana'],
    es: ['media ma\u00f1ana', 'media manana', 'colaci\u00f3n de la ma\u00f1ana', 'colacion de la manana', 'merienda de la ma\u00f1ana'],
    pt: ['lanche da manh\u00e3', 'lanche da manha'],
    fr: ['collation du matin'],
    de: ['vormittagssnack', 'zweites fr\u00fchst\u00fcck'],
    it: ['spuntino del mattino'],
    nl: ['tussendoortje ochtend'],
  },
  'lunch': {
    en: ['lunch', 'lunch:', 'noon meal', 'midday'],
    es: ['almuerzo', 'almuerzo:', 'comida', 'comida:'],
    pt: ['almo\u00e7o', 'almoco', 'almo\u00e7o:', 'almoco:'],
    fr: ['d\u00e9jeuner', 'dejeuner', 'd\u00e9jeuner:', 'dejeuner:'],
    de: ['mittagessen', 'mittag', 'mittagessen:'],
    it: ['pranzo', 'pranzo:'],
    nl: ['lunch', 'lunch:', 'middageten'],
  },
  'afternoon_snack': {
    en: ['afternoon snack', 'afternoon break', 'tea time', 'merienda'],
    es: ['merienda', 'merienda:', 'colaci\u00f3n', 'colacion', 'media tarde'],
    pt: ['lanche da tarde', 'merenda'],
    fr: ['go\u00fbter', 'gouter', 'collation de l\'apr\u00e8s-midi'],
    de: ['nachmittags-snack', 'kaffee und kuchen', 'vesper'],
    it: ['merenda', 'spuntino del pomeriggio'],
    nl: ['tussendoortje middag'],
  },
  'dinner': {
    en: ['dinner', 'dinner:', 'supper', 'evening meal', 'evening'],
    es: ['cena', 'cena:', 'comida de la noche', 'cena de la noche'],
    pt: ['jantar', 'jantar:', 'ceia'],
    fr: ['d\u00eener', 'diner', 'd\u00eener:', 'diner:', 'souper'],
    de: ['abendessen', 'abendbrot', 'abendessen:'],
    it: ['cena', 'cena:'],
    nl: ['diner', 'avondeten', 'diner:', 'avondeten:'],
  },
  'snack': {
    en: ['snack', 'snack:', 'snacks', 'snack time'],
    es: ['snack', 'colaci\u00f3n', 'colacion', 'tentempi\u00e9', 'tentempie', 'picoteo'],
    pt: ['snack', 'lanche', 'petisco'],
    fr: ['collation', 'encas', 'snack'],
    de: ['snack', 'imbiss', 'zwischenmahlzeit'],
    it: ['spuntino', 'snack'],
    nl: ['snack', 'tussendoortje'],
  }
};

const MEAL_TYPE_CANONICAL = {
  'breakfast': 'breakfast',
  'morning_snack': 'snack',
  'lunch': 'lunch',
  'afternoon_snack': 'snack',
  'dinner': 'dinner',
  'snack': 'snack'
};

function detectLanguage(text) {
  const lower = text.toLowerCase();
  const scores = {};
  const langCodes = ['en', 'es', 'pt', 'fr', 'de', 'it', 'nl'];

  for (const dayData of Object.values(MULTILANG_DAYS)) {
    for (const lang of langCodes) {
      const terms = dayData[lang];
      if (!terms) continue;
      for (const term of terms) {
        const regex = term.length <= 3
          ? new RegExp(`\\b${escapeRegex(term)}\\b`, 'i')
          : new RegExp(escapeRegex(term), 'i');
        if (regex.test(lower)) {
          scores[lang] = (scores[lang] || 0) + 1;
        }
      }
    }
  }

  for (const typeData of Object.values(MULTILANG_MEAL_TYPES)) {
    for (const lang of langCodes) {
      const terms = typeData[lang];
      if (!terms) continue;
      for (const term of terms) {
        if (term.length <= 2) continue;
        const regex = new RegExp(escapeRegex(term), 'i');
        if (regex.test(lower)) {
          scores[lang] = (scores[lang] || 0) + 1;
        }
      }
    }
  }

  let bestLang = 'en';
  let bestScore = 0;
  for (const [lang, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestLang = lang;
    }
  }

  logParse('info', `Detected language: ${bestLang} (score: ${bestScore})`);
  return bestLang;
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDay(text, lang) {
  const lower = text.toLowerCase().replace(/[.:;\-]/g, '').trim();
  const langOrder = [lang, ...Object.keys(MULTILANG_DAYS['monday']).filter(l => l !== lang)];

  for (const day of DAYS) {
    const dayData = MULTILANG_DAYS[day];
    for (const l of langOrder) {
      const terms = dayData[l];
      if (!terms) continue;
      for (const term of terms) {
        const escaped = escapeRegex(term);
        const regex = term.length <= 3
          ? new RegExp(`^${escaped}\\b`)
          : new RegExp(escaped, 'i');
        if (regex.test(lower)) {
          return day;
        }
      }
    }
  }
  return null;
}

function normalizeMealType(text, lang) {
  const lower = text.toLowerCase().replace(/[.:;\-]/g, '').trim();
  const typeOrder = ['afternoon_snack', 'morning_snack', 'dinner', 'lunch', 'breakfast', 'snack'];
  const langOrder = [lang, ...Object.keys(MULTILANG_MEAL_TYPES['breakfast']).filter(l => l !== lang)];

  for (const type of typeOrder) {
    const typeData = MULTILANG_MEAL_TYPES[type];
    for (const l of langOrder) {
      const terms = typeData[l];
      if (!terms) continue;
      for (const term of terms) {
        if (term.length <= 2) continue;
        const escaped = escapeRegex(term);
        const regex = new RegExp(escaped, 'i');
        if (regex.test(lower)) {
          return type;
        }
      }
    }
  }
  return null;
}

function extractCalories(text) {
  const patterns = [
    /(\d+)\s*kcal/i,
    /(\d+)\s*cal(?!orie)/i,
    /(\d+)\s*calor\u00edas/i,
    /(\d+)\s*calorias/i,
    /(\d+)\s*calories/i,
    /-\s*(\d+)\s*(?:kcal|cal|$)/i,
    /\((\d+)\s*(?:k?cal)?\)/i,
    /(\d+)\s*kcals/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseInt(match[1]);
    }
  }
  return 0;
}

function extractMacros(text) {
  const protein = extractMacro(text, ['prote\u00edna', 'proteina', 'protein', 'proteine', 'prote\u00edna:', 'protein:', 'p:', 'prote\u00edna g', 'protein g']);
  const carbs = extractMacro(text, ['carbohidrato', 'carbohidratos', 'carboidrato', 'carboidratos', 'carbs', 'carbohydrate', 'carbohydrates', 'glucides', 'c:', 'carbs:', 'carboidratos g', 'carbs g']);
  const fat = extractMacro(text, ['grasa', 'grasas', 'gordura', 'gorduras', 'fat', 'lipides', 'lipidi', 'f:', 'fat:', 'grasas g', 'fat g']);
  return { protein, carbs, fat };
}

function extractMacro(text, terms) {
  for (const term of terms) {
    const escaped = escapeRegex(term);
    const regex = new RegExp(`${escaped}\s*[=:]?\s*(\d+(?:[.,]\d+)?)\s*g`, 'i');
    const match = text.match(regex);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  return 0;
}

function extractIngredients(text) {
  const patterns = [
    /(?:ingredientes|ingredients|ingr\u00e9dients|zutaten|ingredi\u00ebnten|ingredienti)\s*[:\-]?\s*(.+)/i,
    /\(([^)]{10,})\)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const raw = match[1].trim();
      return raw
        .split(/[,;\u2022\-\u2013\u2014]/)
        .map(i => i.trim())
        .filter(i => i.length > 1 && i.length < 50);
    }
  }
  return [];
}

function cleanMealName(text) {
  return text
    .replace(/\s*[-\u2013\u2014]\s*\d+\s*kcal.*$/i, '')
    .replace(/\s*\d+\s*kcal.*$/i, '')
    .replace(/\s*\(\d+\s*(?:k?cal)?\)\s*$/, '')
    .replace(/\s*[-\u2013\u2014]\s*\d+\s*cal(?!or).*$/i, '')
    .replace(/\s*\d+\s*calor\u00edas.*$/i, '')
    .replace(/\s*\d+\s*calorias.*$/i, '')
    .replace(/\s*\d+\s*calories.*$/i, '')
    .replace(/\s*prote[i\u00ed]na\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*carbohidratos?\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*carboidratos?\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*carbs\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*grasas?\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*fat\s*[:=]?\s*\d+.*$/i, '')
    .replace(/\s*\([^)]*\d+g[^)]*\)\s*$/, '')
    .trim();
}

function parseMealLine(line, currentDay, lang) {
  const trimmed = line.trim();
  if (!trimmed) return null;

  let mealType = null;
  let mealName = trimmed;
  let matchedTerm = '';

  const separatorMatch = trimmed.match(/^([^:;\-\u2013\u2014]+?)\s*[:;\-\u2013\u2014]\s*(.+)$/);
  if (separatorMatch) {
    const possibleType = normalizeMealType(separatorMatch[1], lang);
    if (possibleType) {
      mealType = possibleType;
      matchedTerm = separatorMatch[1].trim();
      mealName = separatorMatch[2];
    }
  }

  if (!mealType) {
    mealType = normalizeMealType(trimmed, lang);
    if (mealType) {
      const typeData = MULTILANG_MEAL_TYPES[mealType];
      const langOrder = [lang, ...Object.keys(typeData).filter(l => l !== lang)];
      for (const l of langOrder) {
        const terms = typeData[l];
        if (!terms) continue;
        for (const term of terms) {
          if (term.length <= 2) continue;
          const idx = trimmed.toLowerCase().indexOf(term.toLowerCase());
          if (idx !== -1) {
            matchedTerm = trimmed.substring(idx, idx + term.length);
            break;
          }
        }
        if (matchedTerm) break;
      }

      mealName = trimmed.replace(new RegExp(escapeRegex(matchedTerm), 'i'), '').replace(/^[:;\-\s]+/, '').trim();
      if (!mealName) {
        mealName = `${mealType} meal`;
      }
    }
  }

  if (!mealType || !currentDay) {
    logParse('warn', `Skipping line (no meal type or day): "${trimmed}"`);
    return null;
  }

  const canonicalType = MEAL_TYPE_CANONICAL[mealType] || mealType;
  const calories = extractCalories(mealName);
  const macros = extractMacros(mealName);
  const ingredients = extractIngredients(mealName);
  const cleanName = cleanMealName(mealName);

  logParse('info', `Parsed: ${currentDay}/${canonicalType} -> "${cleanName}" (${calories} kcal, P:${macros.protein}g C:${macros.carbs}g F:${macros.fat}g)`);

  return {
    name: cleanName || `${canonicalType} meal`,
    day_of_week: currentDay,
    meal_type: canonicalType,
    calories,
    protein: macros.protein,
    carbs: macros.carbs,
    fat: macros.fat,
    ingredients,
    description: mealType !== canonicalType ? matchedTerm : ''
  };
}

function parseDietPlan(text) {
  parseLog.length = 0;
  logParse('info', 'Starting diet plan parsing...');
  logParse('info', `Input length: ${text.length} chars`);

  const lang = detectLanguage(text);
  currentLanguage = lang;
  const lines = text.split('\n');
  const parsedMealsList = [];
  let currentDay = null;
  let dayCount = 0;

  logParse('info', `Processing ${lines.length} lines...`);

  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    if (/^(dieta|diet|plan|men\u00fa|menu|plan\s+alimenticio|meal\s+plan|semana|week)/i.test(trimmed) && trimmed.length < 40) {
      logParse('info', `Skipping title/header line ${i + 1}: "${trimmed}"`);
      continue;
    }

    const day = normalizeDay(trimmed, lang);
    if (day) {
      currentDay = day;
      dayCount++;
      logParse('info', `Day detected on line ${i + 1}: ${day} ("${trimmed}")`);
      continue;
    }

    if (currentDay) {
      const meal = parseMealLine(trimmed, currentDay, lang);
      if (meal) {
        parsedMealsList.push(meal);
      }
    } else {
      logParse('warn', `Line ${i + 1} skipped (no day context yet): "${trimmed}"`);
    }
  }

  logParse('info', `Parsing complete: ${parsedMealsList.length} meals from ${dayCount} days (language: ${lang})`);

  if (parsedMealsList.length === 0) {
    logParse('warn', 'No meals parsed. Possible causes: missing day headers, unrecognized meal type keywords, or unexpected format.');
  }

  return parsedMealsList;
}

const LANGUAGE_LABELS = {
  en: 'English',
  es: 'Espa\u00f1ol',
  pt: 'Portugu\u00eas',
  fr: 'Fran\u00e7ais',
  de: 'Deutsch',
  it: 'Italiano',
  nl: 'Nederlands'
};

function renderPreview(mealsList) {
  const container = $('#preview-content');

  if (mealsList.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>No meals could be parsed from the text.</p>
        <p class="empty-hint">Make sure to include day names and meal types in a supported language (EN, ES, PT, FR, DE, IT, NL)</p>
      </div>
    `;
    return;
  }

  const lang = getLanguage();
  const dayLabels = DAY_LABELS[lang] || DAY_LABELS.en;
  const mealTypeLabels = MEAL_TYPE_LABELS[lang] || MEAL_TYPE_LABELS.en;

  const mealsByDay = {};
  DAYS.forEach(day => mealsByDay[day] = []);
  mealsList.forEach(meal => {
    if (mealsByDay[meal.day_of_week]) {
      mealsByDay[meal.day_of_week].push(meal);
    }
  });

  const html = Object.entries(mealsByDay)
    .filter(([day, dayMeals]) => dayMeals.length > 0)
    .map(([day, dayMeals]) => `
      <div class="preview-day">
        <div class="preview-day-header">
          <h4>${dayLabels[day] || day}</h4>
          <span class="preview-day-count">${dayMeals.length} meal${dayMeals.length !== 1 ? 's' : ''}</span>
        </div>
        <div class="preview-meals">
          ${dayMeals.map(meal => `
            <div class="preview-meal">
              <span class="preview-meal-type ${meal.meal_type}">${mealTypeLabels[meal.meal_type] || meal.meal_type}</span>
              <span class="preview-meal-name">${meal.name}</span>
              ${meal.calories ? `<span class="preview-meal-calories">${meal.calories} kcal</span>` : ''}
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

  container.innerHTML = html;
}

function renderParseLog() {
  const logContainer = $('#parse-log');
  if (!logContainer) return;

  logContainer.classList.remove('hidden');

  const errorCount = parseLog.filter(e => e.level === 'error').length;
  const warnCount = parseLog.filter(e => e.level === 'warn').length;

  logContainer.innerHTML = `
    <div class="parse-log-header">
      <span>Parse Log</span>
      <span class="log-stats">${parseLog.length} entries | ${warnCount} warnings | ${errorCount} errors</span>
      <button type="button" class="btn btn-sm btn-outline" id="toggle-log-btn">Show Details</button>
    </div>
    <div class="parse-log-entries hidden" id="parse-log-entries">
      ${parseLog.map(entry => `
        <div class="log-entry log-${entry.level}">
          <span class="log-level">${entry.level.toUpperCase()}</span>
          <span class="log-message">${entry.message}</span>
        </div>
      `).join('')}
    </div>
  `;

  $('#toggle-log-btn').addEventListener('click', () => {
    const entries = $('#parse-log-entries');
    const btn = $('#toggle-log-btn');
    entries.classList.toggle('hidden');
    btn.textContent = entries.classList.contains('hidden') ? 'Show Details' : 'Hide Details';
  });
}

function setupImport() {
  const dietText = $('#diet-text');
  const parseBtn = $('#parse-diet-btn');
  const clearBtn = $('#clear-diet-btn');
  const importBtn = $('#import-meals-btn');
  const importShoppingBtn = $('#import-shopping-btn');
  const cancelBtn = $('#cancel-import-btn');
  const helpToggle = $('#format-help-toggle');

  helpToggle.addEventListener('click', () => {
    $('#format-help').classList.toggle('hidden');
  });

  parseBtn.addEventListener('click', () => {
    const text = dietText.value.trim();
    if (!text) {
      showToast('Please enter a diet plan to parse', 'error');
      return;
    }

    parsedMeals = parseDietPlan(text);

    const lang = detectLanguage(text);
    const langBadge = $('#detected-language');
    if (langBadge) {
      langBadge.textContent = LANGUAGE_LABELS[lang] || lang;
      langBadge.classList.remove('hidden');
    }

    if (parsedMeals.length === 0) {
      showToast('No meals could be parsed. Check the format help for guidance.', 'warning');
      renderParseLog();
      return;
    }

    $('#meals-count').textContent = `${parsedMeals.length} meals`;
    renderPreview(parsedMeals);
    renderParseLog();
    $('#import-preview').classList.remove('hidden');
    $('#import-placeholder').classList.add('hidden');
    importBtn.disabled = false;
    importShoppingBtn.disabled = false;

    showToast(`Parsed ${parsedMeals.length} meals from your diet plan (${LANGUAGE_LABELS[lang] || lang})`, 'success');
  });

  clearBtn.addEventListener('click', () => {
    dietText.value = '';
    parsedMeals = [];
    parseLog.length = 0;
    $('#import-preview').classList.add('hidden');
    $('#import-placeholder').classList.remove('hidden');
    $('#parse-log').classList.add('hidden');
    importBtn.disabled = true;
    importShoppingBtn.disabled = true;
    const langBadge = $('#detected-language');
    if (langBadge) langBadge.classList.add('hidden');
  });

  cancelBtn.addEventListener('click', () => {
    $('#import-preview').classList.add('hidden');
    $('#import-placeholder').classList.remove('hidden');
    importBtn.disabled = true;
    importShoppingBtn.disabled = true;
  });

  importBtn.addEventListener('click', async () => {
    if (parsedMeals.length === 0) return;

    importBtn.disabled = true;
    importBtn.innerHTML = '<span>\u23f3</span> Importing...';

    try {
      const mealsToInsert = parsedMeals.map(meal => ({
        ...meal,
        user_id: currentUser.id,
        language: currentLanguage
      }));

      const { error } = await supabase
        .from('meals')
        .insert(mealsToInsert);

      if (error) throw error;

      showToast(`Successfully imported ${parsedMeals.length} meals!`, 'success');

      dietText.value = '';
      parsedMeals = [];
      parseLog.length = 0;
      $('#import-preview').classList.add('hidden');
      $('#import-placeholder').classList.remove('hidden');
      importBtn.innerHTML = '<span>\ud83d\udce5</span> Import Meals';
      importShoppingBtn.disabled = true;
      const langBadge = $('#detected-language');
      if (langBadge) langBadge.classList.add('hidden');

      await loadMeals();
      updateDietView();
      window.switchSection('diet');

    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import meals. Please try again.', 'error');
      importBtn.disabled = false;
      importBtn.innerHTML = '<span>\ud83d\udce5</span> Import Meals';
    }
  });

  importShoppingBtn.addEventListener('click', async () => {
    if (parsedMeals.length === 0) return;

    importShoppingBtn.disabled = true;
    importShoppingBtn.innerHTML = '<span>\u23f3</span> Importing...';

    try {
      const mealsToInsert = parsedMeals.map(meal => ({
        ...meal,
        user_id: currentUser.id,
        language: currentLanguage
      }));

      const { error: mealError } = await supabase
        .from('meals')
        .insert(mealsToInsert);

      if (mealError) throw mealError;

      await loadMeals();
      updateDietView();
      window.switchSection('diet');

      const allIngredients = new Map();
      parsedMeals.forEach(meal => {
        (meal.ingredients || []).forEach(ingredient => {
          const key = ingredient.toLowerCase().trim();
          if (key) {
            allIngredients.set(key, (allIngredients.get(key) || 0) + 1);
          }
        });
      });

      const existingNames = new Set(shoppingItems.map(i => i.name.toLowerCase()));
      const newItems = [];

      for (const [name, count] of allIngredients) {
        if (!existingNames.has(name)) {
          newItems.push({
            user_id: currentUser.id,
            name: name.charAt(0).toUpperCase() + name.slice(1),
            quantity: count > 1 ? `${count}x` : '1',
            completed: false,
            is_custom: false
          });
        }
      }

      if (newItems.length > 0) {
        const { error: shopError } = await supabase
          .from('shopping_items')
          .insert(newItems);
        if (shopError) logParse('warn', `Shopping list insert failed: ${shopError.message}`);
      }

      await loadShoppingItems();
      renderShoppingList();

      showToast(`Imported ${parsedMeals.length} meals + ${newItems.length} shopping items!`, 'success');

      dietText.value = '';
      parsedMeals = [];
      parseLog.length = 0;
      $('#import-preview').classList.add('hidden');
      $('#import-placeholder').classList.remove('hidden');
      importShoppingBtn.innerHTML = '<span>\ud83d\udce5</span> Import + Shopping List';
      importBtn.disabled = true;
      const langBadge = $('#detected-language');
      if (langBadge) langBadge.classList.add('hidden');

    } catch (error) {
      console.error('Import error:', error);
      showToast('Failed to import. Please try again.', 'error');
      importShoppingBtn.disabled = false;
      importShoppingBtn.innerHTML = '<span>\ud83d\udce5</span> Import + Shopping List';
    }
  });
}

// =====================
// Initialization
// =====================
async function init() {
  setupAuthForms();
  setupNavigation();
  setupMealModal();
  setupShoppingList();
  setupItemModal();
  setupAssistant();
  setupImport();

  await initAuth();
}

document.addEventListener('DOMContentLoaded', init);
