/* =========================================================
   CONTA FÁCIL — JAVASCRIPT PRINCIPAL
   Código simples e comentado para facilitar o aprendizado.

   IMPORTANTE:
   - As movimentações continuam na chave antiga do localStorage:
     "contaFacilTransactions". Assim, os registros existentes
     no navegador são preservados nesta atualização.
   - Cada movimentação tem uma data. As telas semanal e mensal
     apenas filtram os mesmos registros, sem duplicá-los.
   ========================================================= */

// Categorias disponíveis em cada tipo de conta.
const categories = {
  pf: {
    income: ['Salário', 'Trabalho extra', 'Rendimentos', 'Outras receitas'],
    expense: ['Alimentação', 'Moradia', 'Transporte', 'Saúde', 'Educação', 'Lazer', 'Assinaturas', 'Contas', 'Outras despesas'],
    investment: ['Renda fixa', 'Ações', 'Fundos', 'Criptomoedas', 'Outros investimentos'],
    saving: ['Reserva de emergência', 'Viagem', 'Objetivo pessoal', 'Outras economias']
  },
  pj: {
    income: ['Vendas', 'Prestação de serviços', 'Contratos', 'Outras receitas'],
    expense: ['Fornecedores', 'Folha de pagamento', 'Aluguel', 'Impostos', 'Marketing', 'Operacional', 'Contabilidade', 'Outras despesas'],
    investment: ['Equipamentos', 'Expansão', 'Tecnologia', 'Aplicações', 'Outros investimentos'],
    saving: ['Capital de giro', 'Reserva empresarial', 'Expansão', 'Outras reservas']
  }
};

const typeNames = {
  income: 'Receita',
  expense: 'Despesa',
  investment: 'Investimento',
  saving: 'Economia'
};

const typeSymbols = {
  income: '↗',
  expense: '↘',
  investment: '◇',
  saving: '◎'
};

// Elementos do formulário e das listas.
const form = document.getElementById('transactionForm');
const descriptionInput = document.getElementById('description');
const amountInput = document.getElementById('amount');
const typeInput = document.getElementById('type');
const categoryInput = document.getElementById('category');
const dateInput = document.getElementById('date');
const transactionList = document.getElementById('transactionList');
const toast = document.getElementById('toast');

// Lê informações salvas. O nome da chave das movimentações é mantido
// para que os dados da versão anterior continuem aparecendo.
let currentMode = readMode();
if (!['pf', 'pj'].includes(currentMode)) currentMode = 'pf';
let transactions = readStorage('contaFacilTransactions', []);
// Confere os registros carregados antes de usá-los na interface.
// A chave original é mantida para preservar os dados das versões anteriores.
transactions = Array.isArray(transactions) ? transactions.filter(isValidTransaction) : [];
let goal = loadGoalForMode(currentMode);
let selectedWeekOffset = 0;
let selectedMonth = currentMonthISO();
let editingTransactionId = null; // ID do registro que está sendo editado.

// Lê o localStorage com proteção contra dados inválidos.
function readStorage(key, fallback) {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch (error) {
    console.warn('Não foi possível ler os dados salvos:', error);
    return fallback;
  }
}

// Lê tanto o formato antigo (pf/pj sem aspas) quanto o formato JSON novo.
function readMode() {
  try {
    const saved = localStorage.getItem('contaFacilMode');
    if (!saved) return 'pf';
    try { return JSON.parse(saved); } catch { return saved; }
  } catch (error) {
    console.warn('Não foi possível ler o modo da conta:', error);
    return 'pf';
  }
}

// Centraliza as gravações e informa quando o navegador bloqueia o armazenamento.
function safeWriteStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error('Não foi possível salvar no navegador:', error);
    showToast('Não foi possível salvar. Verifique o espaço e as permissões do navegador.');
    return false;
  }
}

// Confere se uma movimentação tem formato e valores esperados.
function isValidISODate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00`);
  return !Number.isNaN(parsed.getTime()) && dateToISO(parsed) === value;
}

function isValidTransaction(item) {
  if (!item || typeof item !== 'object') return false;
  const validTypes = ['income', 'expense', 'investment', 'saving'];
  const validModes = ['pf', 'pj'];
  const validDate = isValidISODate(item.date);
  const amount = Number(item.amount);
  return (typeof item.id === 'string' || typeof item.id === 'number')
    && validModes.includes(item.mode)
    && typeof item.description === 'string'
    && item.description.trim().length > 0
    && item.description.length <= 70
    && Number.isFinite(amount) && amount > 0 && amount <= 1000000000000
    && validTypes.includes(item.type)
    && typeof item.category === 'string'
    && categories[item.mode][item.type].includes(item.category)
    && validDate;
}

// Salva todas as movimentações na mesma chave usada pelas versões anteriores.
function saveTransactions() {
  return safeWriteStorage('contaFacilTransactions', transactions);
}

// Cada tipo de conta possui sua própria meta.
function loadGoalForMode(mode) {
  const allGoals = readStorage('contaFacilGoals', null);
  if (allGoals && typeof allGoals === 'object' && !Array.isArray(allGoals) && allGoals[mode]) return allGoals[mode];

  // Compatibilidade com a meta única usada na versão anterior.
  const oldGoal = readStorage('contaFacilGoal', { name: '', target: 0 });
  if (oldGoal && (!oldGoal.mode || oldGoal.mode === mode)) return oldGoal;
  return { name: '', target: 0 };
}

function saveGoalForMode(mode, newGoal) {
  const storedGoals = readStorage('contaFacilGoals', {});
  const allGoals = storedGoals && typeof storedGoals === 'object' && !Array.isArray(storedGoals)
    ? storedGoals : {};
  allGoals[mode] = newGoal;
  return safeWriteStorage('contaFacilGoals', allGoals);
}

// Formata um valor no padrão monetário brasileiro.
function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Formata uma data local como YYYY-MM-DD sem erros de fuso horário.
function dateToISO(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function todayISO() {
  return dateToISO(new Date());
}

function currentMonthISO() {
  return todayISO().slice(0, 7);
}

function parseISODate(value) {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  if (!value) return '';
  return parseISODate(value).toLocaleDateString('pt-BR');
}

function formatMonth(value) {
  const [year, month] = value.split('-').map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric'
  });
}

// Mostra mensagens curtas na parte inferior da tela.
function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2600);
}

// Cria as opções de categoria de acordo com PF/PJ e tipo de registro.
function updateCategories() {
  const options = categories[currentMode][typeInput.value];
  categoryInput.innerHTML = options
    .map(category => `<option value="${category}">${category}</option>`)
    .join('');
}

// Restaura o formulário para o modo de cadastro de uma nova movimentação.
function resetTransactionForm() {
  editingTransactionId = null;
  form.reset();
  typeInput.value = 'income';
  updateCategories();
  dateInput.value = todayISO();
  document.getElementById('transactionSubmitButton').innerHTML = '<span>＋</span> Adicionar registro';
  document.getElementById('cancelEditButton').hidden = true;
  form.classList.remove('is-editing');
}

// Carrega os dados de uma movimentação no formulário para permitir alterações.
function startEditingTransaction(id) {
  const item = transactions.find(transaction => String(transaction.id) === String(id));
  if (!item || item.mode !== currentMode) {
    showToast('Não foi possível localizar essa movimentação.');
    return;
  }

  editingTransactionId = String(item.id);
  descriptionInput.value = item.description || '';
  amountInput.value = Number(item.amount || 0);
  typeInput.value = item.type || 'income';
  updateCategories();

  // Mantém a categoria existente quando ela ainda estiver disponível.
  if ([...categoryInput.options].some(option => option.value === item.category)) {
    categoryInput.value = item.category;
  }

  dateInput.value = item.date || todayISO();
  document.getElementById('transactionSubmitButton').innerHTML = '<span>✓</span> Salvar alterações';
  document.getElementById('cancelEditButton').hidden = false;
  form.classList.add('is-editing');
  openView('transactions');
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
  descriptionInput.focus({ preventScroll: true });
  showToast('Edite os campos e salve as alterações.');
}

// Exclui um registro somente após a confirmação do usuário.
function deleteTransaction(id) {
  const item = transactions.find(transaction => String(transaction.id) === String(id));
  if (!item) return;

  const confirmed = confirm(`Deseja realmente excluir a movimentação "${item.description}"?`);
  if (!confirmed) return;

  const previousTransactions = transactions;
  transactions = transactions.filter(transaction => String(transaction.id) !== String(id));
  if (!saveTransactions()) {
    transactions = previousTransactions;
    return;
  }
  if (editingTransactionId === String(id)) resetTransactionForm();
  refreshAll();
  showToast('Movimentação excluída.');
}

// Trata os botões de editar e excluir das listas semanal e completa.
function handleTransactionActions(event) {
  const editButton = event.target.closest('[data-edit]');
  if (editButton) {
    startEditingTransaction(editButton.dataset.edit);
    return;
  }

  const deleteButton = event.target.closest('[data-delete]');
  if (deleteButton) deleteTransaction(deleteButton.dataset.delete);
}

// Retorna apenas os registros do ambiente atual (PF ou PJ).
function getModeTransactions() {
  return transactions.filter(item => item.mode === currentMode);
}

// Segunda-feira é considerada o primeiro dia da semana.
function getSelectedWeekRange() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const monday = new Date(today);
  const dayOfWeek = (monday.getDay() + 6) % 7;
  monday.setDate(monday.getDate() - dayOfWeek + (selectedWeekOffset * 7));
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { start: dateToISO(monday), end: dateToISO(sunday), monday, sunday };
}

function getWeekTransactions() {
  const range = getSelectedWeekRange();
  return getModeTransactions().filter(item => item.date >= range.start && item.date <= range.end);
}

function getMonthTransactions(monthValue) {
  const month = monthValue || selectedMonth;
  return getModeTransactions().filter(item => item.date && item.date.startsWith(month));
}

function sumByType(items, type) {
  return items
    .filter(item => item.type === type)
    .reduce((total, item) => total + Number(item.amount || 0), 0);
}

// Calcula o resultado líquido do período: receitas - despesas - investimentos - economias.
function calculatePeriodBalance(items) {
  return sumByType(items, 'income')
    - sumByType(items, 'expense')
    - sumByType(items, 'investment')
    - sumByType(items, 'saving');
}

// Atualiza os cartões e o gráfico da visão semanal.
function updateWeeklyDashboard() {
  const range = getSelectedWeekRange();
  const items = getWeekTransactions();
  const income = sumByType(items, 'income');
  const expense = sumByType(items, 'expense');
  const investment = sumByType(items, 'investment');

  document.getElementById('weeklyBalance').textContent = money(calculatePeriodBalance(items));
  document.getElementById('weeklyIncome').textContent = money(income);
  document.getElementById('weeklyExpense').textContent = money(expense);
  document.getElementById('weeklyInvestment').textContent = money(investment);

  const startText = range.monday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  const endText = range.sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  document.getElementById('weekLabel').textContent = `${startText} – ${endText}`;
  document.getElementById('weeklyChartChip').textContent = `${items.length} registros`;

  renderWeeklyChart(range.monday, items);
  renderSmallTransactionList('weeklyTransactions', items, 'Nenhuma movimentação nesta semana');
  document.getElementById('weeklyCount').textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'}`;
}

// Desenha as barras de receitas e despesas para cada um dos sete dias.
function renderWeeklyChart(monday, items) {
  const chart = document.getElementById('weeklyChart');
  const dailyTotals = [];
  let maxValue = 0;

  for (let index = 0; index < 7; index++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + index);
    const iso = dateToISO(day);
    const dayItems = items.filter(item => item.date === iso);
    const income = sumByType(dayItems, 'income');
    const expense = sumByType(dayItems, 'expense');
    maxValue = Math.max(maxValue, income, expense);
    dailyTotals.push({ day, income, expense });
  }

  if (maxValue === 0) {
    chart.innerHTML = '<div class="chart-placeholder">Adicione movimentações para visualizar o gráfico.</div>';
    return;
  }

  chart.innerHTML = dailyTotals.map(item => {
    const incomeHeight = item.income > 0 ? Math.max((item.income / maxValue) * 100, 4) : 0;
    const expenseHeight = item.expense > 0 ? Math.max((item.expense / maxValue) * 100, 4) : 0;
    const dayName = item.day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
    return `
      <div class="day-column">
        <div class="day-bars">
          <div class="day-bar income-bar" style="height:${incomeHeight}%" title="Receitas: ${money(item.income)}"></div>
          <div class="day-bar expense-bar" style="height:${expenseHeight}%" title="Despesas: ${money(item.expense)}"></div>
        </div>
        <span class="day-label">${dayName}</span>
      </div>`;
  }).join('');
}

// Atualiza os indicadores e gráficos do Dashboard Elite (mês selecionado).
function updateMonthlyDashboard() {
  const items = getMonthTransactions(selectedMonth);
  const income = sumByType(items, 'income');
  const expense = sumByType(items, 'expense');
  const investment = sumByType(items, 'investment');
  const saving = sumByType(items, 'saving');
  const operatingResult = income - expense;

  document.getElementById('monthlyBalance').textContent = money(calculatePeriodBalance(items));
  document.getElementById('monthlyIncome').textContent = money(income);
  document.getElementById('monthlyExpense').textContent = money(expense);
  document.getElementById('monthlyInvestment').textContent = money(investment);
  document.getElementById('monthlySaving').textContent = money(saving);
  document.getElementById('monthlyOperatingResult').textContent = money(operatingResult);
  document.getElementById('monthlyTransactionsCount').textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'}`;
  document.getElementById('monthlyChartChip').textContent = formatMonth(selectedMonth);

  renderMonthlyChart(items);
  renderCategoryBreakdown(items);
}

// Agrupa o mês em semanas de calendário (dias 1–7, 8–14 etc.).
function renderMonthlyChart(items) {
  const chart = document.getElementById('monthlyChart');
  const weeks = Array.from({ length: 5 }, () => ({ income: 0, expense: 0 }));

  items.forEach(item => {
    const day = Number(item.date.slice(8, 10));
    const weekIndex = Math.min(Math.floor((day - 1) / 7), 4);
    if (item.type === 'income') weeks[weekIndex].income += Number(item.amount);
    if (item.type === 'expense') weeks[weekIndex].expense += Number(item.amount);
  });

  const maxValue = Math.max(1, ...weeks.flatMap(week => [week.income, week.expense]));
  if (!items.some(item => item.type === 'income' || item.type === 'expense')) {
    chart.innerHTML = '<div class="chart-placeholder">Adicione receitas ou despesas para visualizar o gráfico.</div>';
    return;
  }

  chart.innerHTML = weeks.map((week, index) => {
    const incomeHeight = week.income > 0 ? Math.max((week.income / maxValue) * 100, 4) : 0;
    const expenseHeight = week.expense > 0 ? Math.max((week.expense / maxValue) * 100, 4) : 0;
    return `
      <div class="month-column">
        <div class="month-bars">
          <div class="month-bar income-bar" style="height:${incomeHeight}%" title="Receitas: ${money(week.income)}"></div>
          <div class="month-bar expense-bar" style="height:${expenseHeight}%" title="Despesas: ${money(week.expense)}"></div>
        </div>
        <span class="month-label">${index + 1}ª sem.</span>
      </div>`;
  }).join('');
}

// Agrupa as despesas do mês por categoria.
function renderCategoryBreakdown(items) {
  const container = document.getElementById('categoryBreakdown');
  const expenses = items.filter(item => item.type === 'expense');
  const totals = {};

  expenses.forEach(item => {
    totals[item.category] = (totals[item.category] || 0) + Number(item.amount);
  });

  const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
  const totalExpenses = sorted.reduce((sum, item) => sum + item[1], 0);

  if (sorted.length === 0 || totalExpenses === 0) {
    container.innerHTML = '<div class="empty-state"><strong>Sem despesas no período</strong><span>As categorias aparecerão quando houver registros.</span></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 7).map(([category, value]) => {
    const percent = (value / totalExpenses) * 100;
    return `
      <div class="category-row">
        <div class="category-row-top"><span>${escapeHTML(category)}</span><strong>${money(value)}</strong></div>
        <div class="category-track"><div class="category-fill" style="width:${percent}%"></div></div>
      </div>`;
  }).join('');
}

// Atualiza a meta com o total de economias acumuladas no histórico do modo atual.
function updateGoal() {
  const savedAmount = sumByType(getModeTransactions(), 'saving');
  const target = Number(goal.target) || 0;
  const percent = target > 0 ? Math.min((savedAmount / target) * 100, 100) : 0;

  document.getElementById('goalName').value = goal.name || '';
  document.getElementById('goalTarget').value = target || '';
  document.getElementById('goalSaved').textContent = money(savedAmount);
  document.getElementById('goalPercent').textContent = `${Math.round(percent)}% concluído`;
  document.getElementById('goalProgress').style.width = `${percent}%`;
}

// Protege textos digitados pelo usuário antes de inseri-los no HTML.
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

// Desenha uma lista de registros em qualquer uma das telas.
function renderSmallTransactionList(elementId, items, emptyMessage) {
  const container = document.getElementById(elementId);
  const sorted = [...items].sort((a, b) => b.date.localeCompare(a.date));

  if (sorted.length === 0) {
    container.innerHTML = `<div class="empty-state"><strong>${emptyMessage}</strong><span>Os registros aparecerão aqui automaticamente.</span></div>`;
    return;
  }

  container.innerHTML = sorted.slice(0, 8).map(item => `
    <div class="transaction-item">
      <div class="transaction-symbol symbol-${item.type}">${typeSymbols[item.type] || '•'}</div>
      <div class="transaction-info">
        <strong>${escapeHTML(item.description)}</strong>
        <small>${typeNames[item.type] || 'Registro'} · ${escapeHTML(item.category)} · ${formatDate(item.date)}</small>
      </div>
      <div class="transaction-amount amount-${item.type}">${item.type === 'income' ? '+' : '−'} ${money(item.amount)}</div>
      <div class="transaction-actions">
        <button class="edit-button" type="button" data-edit="${escapeHTML(item.id)}" aria-label="Editar ${escapeHTML(item.description)}" title="Editar registro">✎</button>
        <button class="delete-button" type="button" data-delete="${escapeHTML(item.id)}" aria-label="Excluir ${escapeHTML(item.description)}" title="Excluir registro">×</button>
      </div>
    </div>`).join('');
}

// Atualiza o histórico completo de movimentações.
function renderTransactions() {
  const items = [...getModeTransactions()].sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById('transactionCount').textContent = `${items.length} ${items.length === 1 ? 'registro' : 'registros'}`;

  if (items.length === 0) {
    transactionList.innerHTML = '<div class="empty-state"><span class="empty-icon">↗</span><strong>Nenhuma movimentação por aqui</strong><span>Adicione seu primeiro registro usando o formulário acima.</span></div>';
    return;
  }

  transactionList.innerHTML = items.map(item => `
    <div class="transaction-item">
      <div class="transaction-symbol symbol-${item.type}">${typeSymbols[item.type] || '•'}</div>
      <div class="transaction-info">
        <strong>${escapeHTML(item.description)}</strong>
        <small>${typeNames[item.type] || 'Registro'} · ${escapeHTML(item.category)} · ${formatDate(item.date)}</small>
      </div>
      <div class="transaction-amount amount-${item.type}">${item.type === 'income' ? '+' : '−'} ${money(item.amount)}</div>
      <div class="transaction-actions">
        <button class="edit-button" type="button" data-edit="${escapeHTML(item.id)}" aria-label="Editar ${escapeHTML(item.description)}" title="Editar registro">✎</button>
        <button class="delete-button" type="button" data-delete="${escapeHTML(item.id)}" aria-label="Excluir ${escapeHTML(item.description)}" title="Excluir registro">×</button>
      </div>
    </div>`).join('');
}

// Atualiza todas as telas. Isso mantém os dois dashboards sincronizados.
function refreshAll() {
  updateWeeklyDashboard();
  updateMonthlyDashboard();
  renderTransactions();
  updateGoal();
}

// Abre uma das quatro telas pelo menu lateral.
function openView(viewName) {
  document.querySelectorAll('[data-view-panel]').forEach(section => {
    const isActive = section.dataset.viewPanel === viewName;
    section.classList.toggle('active', isActive);
    section.hidden = !isActive;
  });

  document.querySelectorAll('.nav-link').forEach(button => {
    button.classList.toggle('active', button.dataset.view === viewName);
  });

  const titles = {
    weekly: 'Visão semanal',
    monthly: 'Dashboard Elite',
    transactions: 'Movimentações',
    planning: 'Planejamento'
  };
  document.getElementById('breadcrumbCurrent').textContent = titles[viewName] || 'Visão semanal';
}

// Formulário: cadastra uma nova movimentação ou atualiza uma já existente.
form.addEventListener('submit', event => {
  event.preventDefault();

  const description = descriptionInput.value.trim();
  const amount = Number(amountInput.value);
  const date = dateInput.value;

  const selectedType = typeInput.value;
  const selectedCategory = categoryInput.value;
  const validDate = isValidISODate(date);
  const validType = Object.prototype.hasOwnProperty.call(categories[currentMode], selectedType);
  const validCategory = validType && categories[currentMode][selectedType].includes(selectedCategory);

  if (!description || description.length > 70 || !Number.isFinite(amount)
      || amount <= 0 || amount > 1000000000000 || !validDate
      || !validType || !validCategory) {
    showToast('Confira a descrição, o valor, a categoria e a data.');
    return;
  }

  if (editingTransactionId) {
    // Atualiza o mesmo registro, preservando seu ID e o ambiente PF/PJ.
    const index = transactions.findIndex(item => String(item.id) === editingTransactionId);
    if (index === -1) {
      resetTransactionForm();
      showToast('Esse registro não foi encontrado. Atualize a lista e tente novamente.');
      return;
    }

    const previousTransaction = transactions[index];
    transactions[index] = {
      ...previousTransaction,
      description,
      amount,
      type: selectedType,
      category: selectedCategory,
      date
    };

    if (!saveTransactions()) {
      transactions[index] = previousTransaction;
      return;
    }
    resetTransactionForm();
    refreshAll();
    showToast('Alterações salvas. As dashboards foram atualizadas.');
    return;
  }

  // Se não existe um ID em edição, cria um registro novo.
  const newTransaction = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2, 7)}`,
    mode: currentMode,
    description,
    amount,
    type: selectedType,
    category: selectedCategory,
    date
  };

  transactions.push(newTransaction);
  if (!saveTransactions()) {
    transactions.pop();
    return;
  }
  resetTransactionForm();
  refreshAll();
  showToast('Movimentação adicionada. As dashboards foram atualizadas.');
});

// Atualiza as categorias quando o tipo Receita/Despesa/etc. é alterado.
typeInput.addEventListener('change', updateCategories);

// Cancela a edição sem modificar o registro original.
document.getElementById('cancelEditButton').addEventListener('click', () => {
  resetTransactionForm();
  showToast('Edição cancelada. Nenhum dado foi alterado.');
});

// Alterna a área Pessoa Física / Pessoa Jurídica.
document.querySelectorAll('.mode-button').forEach(button => {
  button.addEventListener('click', () => {
    if (editingTransactionId) resetTransactionForm();
    currentMode = button.dataset.mode;
    safeWriteStorage('contaFacilMode', currentMode);
    goal = loadGoalForMode(currentMode);

    document.querySelectorAll('.mode-button').forEach(item => {
      item.classList.toggle('active', item.dataset.mode === currentMode);
    });

    const incomeText = currentMode === 'pf' ? 'RECEITAS' : 'FATURAMENTO';
    const expenseText = currentMode === 'pf' ? 'DESPESAS' : 'CUSTOS';
    document.getElementById('weeklyIncomeLabel').textContent = `${incomeText} DA SEMANA`;
    document.getElementById('weeklyExpenseLabel').textContent = `${expenseText} DA SEMANA`;
    document.getElementById('monthlyIncomeLabel').textContent = `${incomeText} DO MÊS`;
    document.getElementById('monthlyExpenseLabel').textContent = `${expenseText} DO MÊS`;

    updateCategories();
    refreshAll();
    showToast(currentMode === 'pf' ? 'Ambiente Pessoa Física selecionado.' : 'Ambiente Pessoa Jurídica selecionado.');
  });
});

// Menu de navegação e botão da marca.
document.querySelectorAll('.nav-link').forEach(button => {
  button.addEventListener('click', () => openView(button.dataset.view));
});
document.querySelectorAll('[data-open-view]').forEach(link => {
  link.addEventListener('click', event => {
    event.preventDefault();
    openView(link.dataset.openView);
  });
});

// Navega entre as semanas sem alterar nem apagar os registros.
document.getElementById('previousWeek').addEventListener('click', () => {
  selectedWeekOffset--;
  updateWeeklyDashboard();
});
document.getElementById('nextWeek').addEventListener('click', () => {
  selectedWeekOffset++;
  updateWeeklyDashboard();
});
document.getElementById('currentWeek').addEventListener('click', () => {
  selectedWeekOffset = 0;
  updateWeeklyDashboard();
});

// Escolhe outro mês no Dashboard Elite.
document.getElementById('monthPicker').addEventListener('change', event => {
  if (!event.target.value) return;
  selectedMonth = event.target.value;
  updateMonthlyDashboard();
});

// Os botões funcionam tanto na lista completa quanto na lista semanal.
transactionList.addEventListener('click', handleTransactionActions);
document.getElementById('weeklyTransactions').addEventListener('click', handleTransactionActions);

// Salva a meta do ambiente atualmente selecionado.
document.getElementById('saveGoalButton').addEventListener('click', () => {
  const name = document.getElementById('goalName').value.trim();
  const target = Number(document.getElementById('goalTarget').value);

  if (!name || name.length > 50 || !Number.isFinite(target) || target <= 0 || target > 1000000000000) {
    showToast('Informe um nome e um valor válido para a meta.');
    return;
  }

  goal = { name, target };
  if (!saveGoalForMode(currentMode, goal)) return;
  showToast('Meta salva com sucesso.');
});

// Exporta o histórico do ambiente atual para abrir no Excel ou LibreOffice.
document.getElementById('exportButton').addEventListener('click', () => {
  const items = getModeTransactions();
  if (items.length === 0) {
    showToast('Não existem registros para exportar.');
    return;
  }

  const rows = [
    ['Descrição', 'Tipo', 'Categoria', 'Valor', 'Data', 'Ambiente'],
    ...items.map(item => [item.description, typeNames[item.type] || item.type, item.category, Number(item.amount).toFixed(2), item.date, item.mode.toUpperCase()])
  ];
  // Neutraliza fórmulas quando o CSV for aberto em programas de planilha.
  const csvCell = value => {
    let safeValue = String(value);
    if (/^[\s]*[=+@\-]/.test(safeValue)) safeValue = `'${safeValue}`;
    return `"${safeValue.replace(/"/g, '""')}"`;
  };
  const csv = rows.map(row => row.map(csvCell).join(';')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `conta-facil-${currentMode}-${todayISO()}.csv`;
  link.click();
  URL.revokeObjectURL(url);
  showToast('Arquivo CSV exportado.');
});

// Inicialização: configura a data, o mês, as categorias e os dados da tela.
document.getElementById('todayLabel').textContent = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
});
document.getElementById('monthPicker').value = selectedMonth;
dateInput.value = todayISO();
document.querySelectorAll('.mode-button').forEach(button => {
  button.classList.toggle('active', button.dataset.mode === currentMode);
});

const initialIncomeText = currentMode === 'pf' ? 'RECEITAS' : 'FATURAMENTO';
const initialExpenseText = currentMode === 'pf' ? 'DESPESAS' : 'CUSTOS';
document.getElementById('weeklyIncomeLabel').textContent = `${initialIncomeText} DA SEMANA`;
document.getElementById('weeklyExpenseLabel').textContent = `${initialExpenseText} DA SEMANA`;
document.getElementById('monthlyIncomeLabel').textContent = `${initialIncomeText} DO MÊS`;
document.getElementById('monthlyExpenseLabel').textContent = `${initialExpenseText} DO MÊS`;

updateCategories();
refreshAll();
openView('weekly');